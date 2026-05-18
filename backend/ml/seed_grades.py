"""
seed_grades.py
--------------
გაუშვი: python seed_grades.py
შეავსებს grades ცხრილს week_max-ის მიხედვით:
  - კვირა 8  → midterm_score  (max 20)
  - კვირა 16 → final_score    (max 30)
  - დანარჩენი → weekly_scores  (max 2 ან 10)
  - total_score = ჯამი (max 100)
"""

import os
import random
import json
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()
random.seed(42)

# ─── კვირების მაქსიმუმები (settings-დან) ─────────────
WEEK_MAX = {
    1:  0,   # არ ითვლება
    2:  2,
    3:  2,
    4:  10,
    5:  2,
    6:  2,
    7:  10,
    8:  20,  # midterm
    9:  2,
    10: 2,
    11: 2,
    12: 10,
    13: 2,
    14: 2,
    15: 2,
    16: 30,  # final
}

# ─── სტუდენტ-კურს წყვილები enrollments-დან ──────────
cur.execute("""
    SELECT e.student_id, e.course_id, c.lecturer_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
""")
raw = cur.fetchall()
# Python-ში deduplicate — (student_id, course_id) უნიკალური
seen = {}
for row in raw:
    key = (row[0], row[1])
    if key not in seen:
        seen[key] = row
enrollments = list(seen.values())
print(f"📋 Enrollments (deduplicated): {len(enrollments)}")

# ─── პროფილები (ქულების დიაპაზონი პროცენტებში) ───────
PROFILES = [
    (0.85, 1.00),   # A სტუდენტი
    (0.65, 0.88),   # B/C სტუდენტი
    (0.45, 0.68),   # D/E სტუდენტი
    (0.10, 0.48),   # F სტუდენტი
]
PROFILE_WEIGHTS = [0.30, 0.35, 0.25, 0.10]

grade_rows = []

for (student_id, course_id, lecturer_id) in enrollments:
    profile = random.choices(PROFILES, weights=PROFILE_WEIGHTS, k=1)[0]
    lo, hi = profile

    weekly_scores = {}
    midterm_score = None
    final_score   = None

    for week, max_score in WEEK_MAX.items():
        if max_score == 0 or week > 10:
            continue

        # ±10% noise
        pct   = random.uniform(lo, hi)
        noise = random.uniform(-0.10, 0.10)
        pct   = max(0.0, min(1.0, pct + noise))
        score = round(pct * max_score, 1)

        # 15% chance სტუდენტმა გააცდინა ამ კვირას
        if random.random() < 0.15:
            score = 0.0

        if week == 8:
            midterm_score = score
        elif week == 16:
            final_score = score
        else:
            weekly_scores[str(week)] = score

    # total_score
    weekly_sum  = sum(weekly_scores.values())
    total_score = round(
        (midterm_score or 0) + (final_score or 0) + weekly_sum, 1
    )
    total_score = min(100.0, total_score)

    grade_rows.append((
        student_id,
        course_id,
        lecturer_id,
        midterm_score,
        final_score,
        json.dumps(weekly_scores),
        total_score,
    ))

# ─── DB-ში ჩაწერა ─────────────────────────────────────
execute_values(cur, """
    INSERT INTO grades
        (student_id, course_id, lecturer_id,
         midterm_score, final_score, weekly_scores, total_score)
    VALUES %s
    ON CONFLICT (student_id, course_id) DO UPDATE SET
        midterm_score  = EXCLUDED.midterm_score,
        final_score    = EXCLUDED.final_score,
        weekly_scores  = EXCLUDED.weekly_scores,
        total_score    = EXCLUDED.total_score,
        lecturer_id    = EXCLUDED.lecturer_id,
        updated_at     = NOW()
""", grade_rows)

conn.commit()
cur.close()
conn.close()

print(f"""
✅ Grades seed დასრულდა!
   📊 ჩაწერილი ჩანაწერები: {len(grade_rows)}
""")