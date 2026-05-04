import os
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def load_student_data(course_id: int = None) -> pd.DataFrame:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    course_filter = "AND e.course_id = %(course_id)s" if course_id else ""

    query = f"""
        SELECT DISTINCT ON (e.student_id, e.course_id)
            e.student_id,
            e.course_id,
            c.title                          AS course_title,

            COALESCE(AVG(sub.score), 0)      AS avg_hw_score,
            COUNT(sub.id)                    AS submitted_count,
            COUNT(DISTINCT h.id)             AS total_homeworks,
            COUNT(DISTINCT h.id) - COUNT(sub.id) AS missed_homeworks,

            -- ✅ ev.week_number არ არსებობს — created_at გამოვიყენოთ
           COALESCE(AVG(
                CASE
                    WHEN EXTRACT(WEEK FROM ev.created_at) >= 3
                    THEN CAST(ev.understanding_level AS INTEGER)
                END
            ), 0)                            AS avg_understanding,

            COALESCE((
                SELECT CAST(understanding_level AS INTEGER)
                FROM evaluations
                WHERE student_id = e.student_id
                  AND course_id  = e.course_id
                ORDER BY created_at DESC
                LIMIT 1
            ), 0)                            AS last_understanding,

            COALESCE((
                SELECT CAST(understanding_level AS INTEGER)
                FROM evaluations
                WHERE student_id = e.student_id
                  AND course_id  = e.course_id
                ORDER BY created_at ASC
                LIMIT 1
            ), 0)                            AS first_understanding,

            COUNT(DISTINCT ev.id)            AS eval_count,
            COALESCE(MAX(h.week_number), 1)  AS current_week

        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN homework_submissions sub ON sub.student_id = e.student_id
        LEFT JOIN homeworks h ON h.id = sub.homework_id
                             AND h.course_id = e.course_id
                             AND h.is_template = FALSE
        LEFT JOIN evaluations ev ON ev.student_id = e.student_id
                                AND ev.course_id  = e.course_id
        WHERE 1=1 {course_filter}
        GROUP BY e.student_id, e.course_id, c.title
    """

    params = {"course_id": course_id} if course_id else {}
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    # ✅ psycopg2 cursor → DataFrame (pandas warning გაქრება)
    df = pd.DataFrame([dict(r) for r in rows])
    
    # ✅ Decimal → float (PostgreSQL NUMERIC/DECIMAL ტიპები)
    numeric_cols = [
        "avg_hw_score", "avg_understanding", 
        "last_understanding", "first_understanding",
        "submitted_count", "total_homeworks", 
        "missed_homeworks", "eval_count", "current_week"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    
    return df