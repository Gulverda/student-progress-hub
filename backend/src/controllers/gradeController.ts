import { Response } from "express";
import { query } from "../config/db";
import { AuthenticatedRequest } from "../types/express";
import { createNotification } from "./notificationController";

export const calculateLetterGrade = (score: number): string => {
  if (score >= 91) {
    if (score >= 97) return "A+";
    if (score >= 94) return "A";
    return "A-";
  }
  if (score >= 81) {
    if (score >= 87) return "B+";
    if (score >= 84) return "B";
    return "B-";
  }
  if (score >= 71) {
    if (score >= 77) return "C+";
    if (score >= 74) return "C";
    return "C-";
  }
  if (score >= 61) {
    if (score >= 67) return "D+";
    if (score >= 64) return "D";
    return "D-";
  }
  if (score >= 51) {
    if (score >= 57) return "E+";
    if (score >= 54) return "E";
    return "E-";
  }
  return "F";
};

export const submitGrade = async (req: AuthenticatedRequest, res: Response) => {
  const lecturer_id = req.user?.id;
  const { student_id, course_id, week, score, type } = req.body;

  if (!student_id || !course_id || score === undefined || score === null) {
    return res.status(400).json({ message: "მონაცემები არასრულია" });
  }

  try {
    const midtermVal = type === "midterm" ? score : null;
    const finalVal = type === "final" ? score : null;
    const weeklyVal = type !== "midterm" && type !== "final" ? score : null;
    const weekKey = week?.toString() ?? null;

    const sql = `
      INSERT INTO grades
        (student_id, course_id, lecturer_id, midterm_score, final_score, weekly_scores)
      VALUES (
        $1, $2, $3, $4, $5,
        CASE
          WHEN $7::numeric IS NOT NULL
            THEN jsonb_build_object($6::text, $7::numeric)
          ELSE '{}'::jsonb
        END
      )
      ON CONFLICT (student_id, course_id)
      DO UPDATE SET
        midterm_score = CASE
          WHEN $4::numeric IS NOT NULL THEN $4::numeric
          ELSE grades.midterm_score
        END,
        final_score = CASE
          WHEN $5::numeric IS NOT NULL THEN $5::numeric
          ELSE grades.final_score
        END,
        weekly_scores = CASE
          WHEN $7::numeric IS NOT NULL
            THEN COALESCE(grades.weekly_scores, '{}'::jsonb)
                 || jsonb_build_object($6::text, $7::numeric)
          ELSE COALESCE(grades.weekly_scores, '{}'::jsonb)
        END,
        lecturer_id = EXCLUDED.lecturer_id,
        total_score = LEAST(100, (
          COALESCE(
            CASE WHEN $4::numeric IS NOT NULL THEN $4::numeric ELSE grades.midterm_score END, 0
          ) +
          COALESCE(
            CASE WHEN $5::numeric IS NOT NULL THEN $5::numeric ELSE grades.final_score END, 0
          ) +
          (
            SELECT COALESCE(SUM(val.value::numeric), 0)
            FROM jsonb_each(
              CASE
                WHEN $7::numeric IS NOT NULL
                  THEN COALESCE(grades.weekly_scores, '{}'::jsonb)
                       || jsonb_build_object($6::text, $7::numeric)
                ELSE COALESCE(grades.weekly_scores, '{}'::jsonb)
              END
            ) AS val
          )
        )),
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await query(sql, [
      student_id,
      course_id,
      lecturer_id,
      midtermVal,
      finalVal,
      weekKey,
      weeklyVal,
    ]);

    // 🔔 კურსის სახელი notification-ისთვის
    const meta = await query(
      `SELECT c.title AS course_title FROM courses c WHERE c.id = $1`,
      [course_id],
    );
    const courseTitle = meta.rows[0]?.course_title ?? "კურსი";

    // ტიპის მიხედვით message
    let notifMsg = "";
    if (type === "midterm") {
      notifMsg = `შუალედური გამოცდა შეფასდა — ${score} ქ. · ${courseTitle}`;
    } else if (type === "final") {
      notifMsg = `დასკვნითი გამოცდა შეფასდა — ${score} ქ. · ${courseTitle}`;
    } else {
      notifMsg = `კვირა ${week}-ის ქულა დაემატა — ${score} ქ. · ${courseTitle}`;
    }

    // 🔔 სტუდენტს
    await createNotification({
      userId: Number(student_id),
      type: "grade",
      title: "ქულა დაემატა",
      message: notifMsg,
    });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Grade submission error:", error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

export const getMyGrades = async (req: AuthenticatedRequest, res: Response) => {
  const student_id = req.user?.id;
  try {
    const sql = `
      SELECT g.*, c.title as course_title, c.course_code, u.full_name as lecturer_name
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN users u ON g.lecturer_id = u.id
      WHERE g.student_id = $1
      ORDER BY g.updated_at DESC
    `;
    const result = await query(sql, [student_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("getMyGrades ERROR:", error);
    res.status(500).json({ message: "ქულების წამოღება ვერ მოხერხდა" });
  }
};

export const getCourseGrades = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const lecturer_id = req.user?.id;
  const { course_id } = req.params;

  try {
    const courseCheck = await query(
      "SELECT id FROM courses WHERE id = $1 AND lecturer_id = $2",
      [course_id, lecturer_id],
    );
    if (courseCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "ამ კურსის ქულებზე წვდომა არ გაქვთ" });
    }

    const sql = `
      SELECT g.*, u.full_name as student_name, u.email as student_email
      FROM grades g
      JOIN users u ON g.student_id = u.id
      WHERE g.course_id = $1
      ORDER BY g.total_score DESC NULLS LAST
    `;
    const result = await query(sql, [course_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("getCourseGrades ERROR:", error);
    res.status(500).json({ message: "ქულების წამოღება ვერ მოხერხდა" });
  }
};

export const getCourseStudentsWithGrades = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const lecturer_id = req.user?.id;
  const { course_id } = req.params;
  const userRole = (req.user as any)?.role;

  try {
    const courseCheck =
      userRole === "admin"
        ? await query("SELECT id, title FROM courses WHERE id = $1", [
            course_id,
          ])
        : await query(
            "SELECT id, title FROM courses WHERE id = $1 AND lecturer_id = $2",
            [course_id, lecturer_id],
          );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ message: "წვდომა აკრძალულია" });
    }

    const sql = `
      SELECT
        u.id          AS student_id,
        u.full_name,
        u.email,
        g.midterm_score,
        g.final_score,
        g.total_score,
        g.letter_grade,
        g.notes,
        COALESCE(g.weekly_scores, '{}'::jsonb) AS weekly_scores,
        g.updated_at  AS graded_at
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN grades g ON g.student_id = u.id AND g.course_id = $1
      WHERE e.course_id = $1
      ORDER BY u.full_name ASC
    `;

    const result = await query(sql, [course_id]);
    res.json({ course: courseCheck.rows[0], students: result.rows });
  } catch (error) {
    console.error("getCourseStudentsWithGrades ERROR:", error);
    res.status(500).json({ message: "მონაცემების წამოღება ვერ მოხერხდა" });
  }
};

export const getAllGrades = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const sql = `
      SELECT
        g.*,
        u_s.full_name AS student_name,
        u_s.email     AS student_email,
        u_l.full_name AS lecturer_name,
        c.title       AS course_title,
        c.course_code
      FROM grades g
      JOIN users u_s ON g.student_id = u_s.id
      LEFT JOIN users u_l ON g.lecturer_id = u_l.id
      JOIN courses c ON g.course_id = c.id
      ORDER BY g.updated_at DESC
    `;
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error("getAllGrades ERROR:", error);
    res.status(500).json({ message: "მონაცემების წამოღება ვერ მოხერხდა" });
  }
};
