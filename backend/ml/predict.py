import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from db import load_student_data, get_connection
from features import build_features, get_feature_columns
from psycopg2.extras import RealDictCursor

MODELS_DIR = Path(__file__).parent / "models"

# მოდელების ჩატვირთვა (ერთხელ — სერვერის გაშვებისას)
dt_model = joblib.load(MODELS_DIR / "difficulty_tree.pkl")
lr_model = joblib.load(MODELS_DIR / "score_regression.pkl")

DIFFICULTY_MAP = {0: "easy", 1: "medium", 2: "hard", 3: "complex"}
DIFFICULTY_LABELS = {v: k for k, v in DIFFICULTY_MAP.items()}


def predict_student(student_id: int, course_id: int) -> dict:
    """
    სტუდენტის პროფილი + ML პრედიქცია
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # სტუდენტის მონაცემები
    cur.execute("""
        SELECT
            e.student_id,
            e.course_id,
            c.title                              AS course_title,
            u.full_name                          AS student_name,
            COALESCE(AVG(sub.score), 0)          AS avg_hw_score,
            COUNT(sub.id)                        AS submitted_count,
            COUNT(DISTINCT h.id)                 AS total_homeworks,
            COUNT(DISTINCT h.id) - COUNT(sub.id) AS missed_homeworks,
            COALESCE(AVG(
                CASE
                    WHEN EXTRACT(WEEK FROM ev.created_at) >= 3
                    THEN CAST(ev.understanding_level AS INTEGER)
                END
            ), 0)                                AS avg_understanding,
            COALESCE((
                SELECT CAST(understanding_level AS INTEGER)
                FROM evaluations
                WHERE student_id = e.student_id
                  AND course_id  = e.course_id
                ORDER BY created_at DESC LIMIT 1
            ), 0)                                AS last_understanding,
            COALESCE((
                SELECT CAST(understanding_level AS INTEGER)
                FROM evaluations
                WHERE student_id = e.student_id
                  AND course_id  = e.course_id
                ORDER BY created_at ASC LIMIT 1
            ), 0)                                AS first_understanding,
            COUNT(DISTINCT ev.id)                AS eval_count,
            COALESCE(MAX(h.week_number), 1)      AS current_week
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        JOIN users u ON u.id = e.student_id
        LEFT JOIN homework_submissions sub ON sub.student_id = e.student_id
        LEFT JOIN homeworks h ON h.id = sub.homework_id
                             AND h.course_id = e.course_id
                             AND h.is_template = FALSE
        LEFT JOIN evaluations ev ON ev.student_id = e.student_id
                                AND ev.course_id  = e.course_id
        WHERE e.student_id = %(student_id)s
          AND e.course_id  = %(course_id)s
        GROUP BY e.student_id, e.course_id, c.title, u.full_name
    """, {"student_id": student_id, "course_id": course_id})

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"error": "სტუდენტი ან კურსი ვერ მოიძებნა"}

    # DataFrame → features
    df = pd.DataFrame([dict(row)])
    numeric_cols = [
        "avg_hw_score", "avg_understanding", "last_understanding",
        "first_understanding", "submitted_count", "total_homeworks",
        "missed_homeworks", "eval_count", "current_week"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df = build_features(df)
    features = get_feature_columns()
    X = df[features].fillna(0)

    # პრედიქცია
    difficulty_num  = int(dt_model.predict(X)[0])
    predicted_score = float(lr_model.predict(X)[0])
    predicted_score = round(max(0, min(100, predicted_score)), 1)

    # რისკის დონე
    risk = float(df["risk_score"].iloc[0])
    if risk >= 75:
        risk_level = "high"
    elif risk >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    # შემდეგი milestone
    week = int(df["current_week"].iloc[0])
    if week <= 8:
        milestone = {"name": "შუალედური", "week": 8, "weeks_left": 8 - week}
    else:
        milestone = {"name": "ფინალური", "week": 16, "weeks_left": 16 - week}

    return {
        "student_id":   student_id,
        "course_id":    course_id,
        "student_name": row["student_name"],
        "course_title": row["course_title"],

        # ML output
        "recommended_difficulty": DIFFICULTY_MAP[difficulty_num],
        "predicted_score":        predicted_score,
        "risk_level":             risk_level,
        "risk_score":             round(risk, 1),

        # პროფილი
        "profile": {
            "avg_hw_score":       round(float(df["avg_hw_score"].iloc[0]), 1),
            "submission_rate":    round(float(df["submission_rate"].iloc[0]) * 100, 1),
            "avg_understanding":  round(float(df["avg_understanding"].iloc[0]), 2),
            "understanding_trend": int(df["understanding_trend"].iloc[0]),
            "missed_homeworks":   int(df["missed_homeworks"].iloc[0]),
            "eval_count":         int(df["eval_count"].iloc[0]),
            "current_week":       week,
        },

        "milestone": milestone,
    }


def get_course_students(course_id: int) -> list:
    """
    კურსის ყველა სტუდენტის პრედიქცია სიაში
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        "SELECT student_id FROM enrollments WHERE course_id = %s",
        (course_id,)
    )
    students = cur.fetchall()
    cur.close()
    conn.close()

    results = []
    for s in students:
        result = predict_student(s["student_id"], course_id)
        if "error" not in result:
            results.append(result)

    # რისკის მიხედვით დალაგება (high პირველი)
    risk_order = {"high": 0, "medium": 1, "low": 2}
    results.sort(key=lambda x: risk_order.get(x["risk_level"], 9))

    return results