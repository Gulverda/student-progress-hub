"""
seed_ml_data.py
---------------
გაუშვი: python seed_ml_data.py
შეავსებს: users, enrollments, homeworks, homework_submissions,
          evaluations, attendances (თუ არ არსებობს — შექმნის)
"""

import os
import random
import bcrypt
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

random.seed(99)

# ─── კონფიგი ──────────────────────────────────────────
COURSE_IDS    = [1, 2, 3, 4, 5, 6]
LECTURER_MAP  = {1: 13, 2: 13, 3: 13, 4: 16, 5: 16, 6: 16}
HW_PER_COURSE = 12
WEEKS         = 16
PASSWORD_HASH = bcrypt.hashpw(b"Password123!", bcrypt.gensalt()).decode()

# overlapping ranges — კლასებს შორის boundary ბუნდოვანია
PROFILES = {
    "easy": {
        "hw_score_range":      (72, 100),
        "submission_rate":     (0.70, 1.0),
        "understanding_range": (3, 5),
        "attendance_rate":     (0.75, 1.0),
    },
    "medium": {
        "hw_score_range":      (55, 85),
        "submission_rate":     (0.50, 0.90),
        "understanding_range": (2, 5),
        "attendance_rate":     (0.55, 0.85),
    },
    "hard": {
        "hw_score_range":      (35, 68),
        "submission_rate":     (0.30, 0.70),
        "understanding_range": (1, 4),
        "attendance_rate":     (0.40, 0.70),
    },
    "complex": {
        "hw_score_range":      (0, 55),
        "submission_rate":     (0.0, 0.55),
        "understanding_range": (1, 3),
        "attendance_rate":     (0.20, 0.55),
    },
}

GEORGIAN_FIRST = [
    "გიორგი", "ნიკა", "დავით", "ლუკა", "სანდრო", "ლევანი", "ზურა", "ბექა",
    "ანა", "მარიამ", "სალომე", "ნინო", "თამარ", "ელენე", "ნათია", "მაია",
    "ირაკლი", "გაგა", "ვახო", "შოთა", "მერაბ", "გოგი", "თემო", "არჩილი",
    "ქეთი", "ლიკა", "სოფო", "ნანა", "ეკა", "რუსუდან", "ბაკური", "გვანცა",
    "ია", "ნინელი", "ხათუნა", "ლელა", "მზია", "თინა", "ციცი", "მანანა",
]
GEORGIAN_LAST = [
    "გელაშვილი", "კვარაცხელია", "მიქელაძე", "ჩიქოვანი", "ბერიძე", "კობახიძე",
    "ჯაფარიძე", "ცხოვრებაშვილი", "ნიჟარაძე", "ლომიძე", "გაბელია", "ხუბუა",
    "ტყეშელაშვილი", "გოგოლაძე", "მამულაშვილი", "სამხარაძე", "ბახტაძე",
    "ასათიანი", "ხარაძე", "შენგელია", "ქობულაძე", "მჭედლიძე", "ფარჩუქიძე",
    "დვალი", "ჩხეიძე", "ჯიქია", "კიკნაძე", "ჩხარტიშვილი", "ღვინიაშვილი",
]

print("🚀 Seed დაიწყო...")

# ─── 1. attendances ცხრილი ────────────────────────────
cur.execute("""
    CREATE TABLE IF NOT EXISTS attendances (
        id          SERIAL PRIMARY KEY,
        student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 16),
        is_present  BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (student_id, course_id, week_number)
    )
""")
conn.commit()
print("✅ attendances ცხრილი მზადაა")

# ─── 2. სტუდენტები — 50 თითო კლასზე = 200 სულ ────────
profiles_cycle = (
    ["easy"] * 50 + ["medium"] * 50 +
    ["hard"] * 50 + ["complex"] * 50
)
random.shuffle(profiles_cycle)

student_ids = []
for i, profile_name in enumerate(profiles_cycle):
    first = random.choice(GEORGIAN_FIRST)
    last  = random.choice(GEORGIAN_LAST)
    name  = f"{first} {last}"
    email = f"seed_student_{i+1}_{random.randint(1000,9999)}@edu.ge"
    course_id = random.choice(COURSE_IDS)

    cur.execute("""
        INSERT INTO users (full_name, email, password_hash, role, current_course)
        VALUES (%s, %s, %s, 'student', %s)
        RETURNING id
    """, (name, email, PASSWORD_HASH, course_id))
    sid = cur.fetchone()[0]
    student_ids.append((sid, profile_name, course_id))

conn.commit()
print(f"✅ {len(student_ids)} სტუდენტი დაემატა")

# ─── 3. homeworks ──────────────────────────────────────
hw_ids_by_course = {}
for cid in COURSE_IDS:
    cur.execute("""
        SELECT id, week_number FROM homeworks
        WHERE course_id = %s AND is_template = FALSE
        ORDER BY week_number
    """, (cid,))
    existing = cur.fetchall()
    existing_weeks = {row[1] for row in existing}
    hw_list = list(existing)

    for week in range(1, HW_PER_COURSE + 1):
        if week not in existing_weeks:
            lecturer = LECTURER_MAP.get(cid, 13)
            cur.execute("""
                INSERT INTO homeworks
                    (course_id, created_by, title, description,
                     difficulty, is_template, due_date, max_score, week_number)
                VALUES (%s, %s, %s, %s, 'medium', FALSE,
                        NOW() + INTERVAL '30 days', 100, %s)
                RETURNING id, week_number
            """, (
                cid, lecturer,
                f"კვირა {week} — დავალება (კურსი {cid})",
                f"სემინარის დავალება კვირა {week}",
                week,
            ))
            hw_list.append(cur.fetchone())

    hw_ids_by_course[cid] = hw_list

conn.commit()
print("✅ homeworks მზადაა")

# ─── 4. enrollments + submissions + evaluations + attendances ──
sub_rows    = []
eval_rows   = []
att_rows    = []
enroll_rows = []

for (sid, profile_name, primary_course) in student_ids:
    n_courses = random.randint(1, 2)
    enrolled_courses = random.sample(COURSE_IDS, n_courses)
    if primary_course not in enrolled_courses:
        enrolled_courses[0] = primary_course

    p = PROFILES[profile_name]

    for cid in enrolled_courses:
        enroll_rows.append((sid, cid))
        hws = hw_ids_by_course.get(cid, [])
        sub_rate = random.uniform(*p["submission_rate"])

        # ── submissions: noise ±15, ზოგჯერ ±25 ──
        for (hw_id, week_num) in hws:
            if random.random() < sub_rate:
                score = random.randint(*p["hw_score_range"])
                noise = (
                    random.randint(-25, 25)
                    if random.random() < 0.15
                    else random.randint(-15, 15)
                )
                score = max(0, min(100, score + noise))
                submitted_at = datetime.now() - timedelta(days=random.randint(1, 90))
                sub_rows.append((sid, hw_id, score, submitted_at))

        # ── evaluations: trend + 20% random noise ──
        for week in range(3, WEEKS + 1, 2):
            if random.random() < 0.75:
                level = random.randint(*p["understanding_range"])

                if profile_name == "easy" and week > 8:
                    level = min(5, level + random.choice([0, 1]))
                elif profile_name == "complex" and week > 8:
                    level = max(1, level - random.choice([0, 1]))

                if random.random() < 0.20:
                    level = max(1, min(5, level + random.choice([-1, 1])))

                ts = datetime(2026, 1, 1) + timedelta(
                    weeks=week, days=random.randint(0, 5)
                )
                lecturer = LECTURER_MAP.get(cid, 13)
                eval_rows.append((sid, cid, str(level), lecturer, None, ts))

        # ── attendances: ზოგს ერთი ცუდი კვირა ──
        att_rate = random.uniform(*p["attendance_rate"])
        bad_week = random.randint(1, 16) if random.random() < 0.3 else None
        for week in range(1, WEEKS + 1):
            is_present = False if week == bad_week else random.random() < att_rate
            att_rows.append((sid, cid, week, is_present))

# ── DB-ში ჩაწერა ──────────────────────────────────────
execute_values(cur, """
    INSERT INTO enrollments (student_id, course_id)
    VALUES %s ON CONFLICT DO NOTHING
""", enroll_rows)

execute_values(cur, """
    INSERT INTO homework_submissions (student_id, homework_id, score, submitted_at)
    VALUES %s ON CONFLICT DO NOTHING
""", sub_rows)

execute_values(cur, """
    INSERT INTO evaluations
        (student_id, course_id, understanding_level, lecturer_id, teacher_feedback, created_at)
    VALUES %s
""", eval_rows)

execute_values(cur, """
    INSERT INTO attendances (student_id, course_id, week_number, is_present)
    VALUES %s ON CONFLICT DO NOTHING
""", att_rows)

conn.commit()
cur.close()
conn.close()

print(f"""
✅ Seed დასრულდა!
   👤 სტუდენტები:   {len(student_ids)}
   📝 Submissions:  {len(sub_rows)}
   🧠 Evaluations:  {len(eval_rows)}
   📅 Attendances:  {len(att_rows)}
   📚 Enrollments:  {len(enroll_rows)}

ახლა გაუშვი: python train.py
""")