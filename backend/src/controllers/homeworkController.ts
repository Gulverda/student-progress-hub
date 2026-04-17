import { Request, Response } from "express";
import { query } from "../config/db";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────────
// GET /api/homeworks/my-homeworks  (teacher/admin)
// ─────────────────────────────────────────────
export const getMyHomeworks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;

    let result;

    if (role === "admin") {
      result = await query(`
        SELECT h.*, c.title AS course_title,
               u.full_name AS created_by_name
        FROM homeworks h
        JOIN courses c ON c.id = h.course_id
        JOIN users   u ON u.id = h.created_by
        ORDER BY h.due_date DESC
      `);
    } else {
      result = await query(
        `
        SELECT h.*, c.title AS course_title,
               u.full_name AS created_by_name
        FROM homeworks h
        JOIN courses c ON c.id = h.course_id
        JOIN users   u ON u.id = h.created_by
        WHERE h.created_by = $1
        ORDER BY h.due_date DESC
        `,
        [userId],
      );
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 GET_MY_HOMEWORKS_ERROR:", err);
    res.status(500).json({ message: "დავალებების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/homeworks/student  (student)
// ─────────────────────────────────────────────
export const getStudentHomeworks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const result = await query(
      `
      SELECT
        h.*,
        c.title                    AS course_title,
        u.full_name                AS created_by_name,
        sub.id                     AS submission_id,
        sub.submitted_at,
        sub.file_url,
        sub.score,
        sub.feedback
      FROM homeworks h
      JOIN courses c ON c.id = h.course_id
      JOIN users   u ON u.id = h.created_by
      JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
      LEFT JOIN homework_submissions sub
             ON sub.homework_id = h.id AND sub.student_id = $1
      ORDER BY h.due_date ASC
      `,
      [userId],
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 GET_STUDENT_HOMEWORKS_ERROR:", err);
    res.status(500).json({ message: "დავალებების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/homeworks  (teacher)
// ─────────────────────────────────────────────
export const createHomework = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { course_id, title, description, due_date, max_score } = req.body;

    // 1. ვალიდაცია
    if (!course_id || !title || !due_date || !max_score) {
      return res
        .status(400)
        .json({ message: "ყველა სავალდებულო ველი შეავსეთ" });
    }

    // 2. შემოწმება: არსებობს თუ არა ეს კურსი საერთოდ?
    const courseCheck = await query("SELECT id FROM courses WHERE id = $1", [
      course_id,
    ]);
    if (courseCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "ასეთი კურსი არ არსებობს. დავალებას ვერ შექმნით." });
    }

    const result = await query(
      `
      INSERT INTO homeworks (course_id, title, description, due_date, max_score, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [course_id, title, description || "", due_date, max_score, userId],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 CREATE_HOMEWORK_ERROR:", err); // შეხედეთ ტერმინალს, აქ დაწერს ზუსტ მიზეზს
    res
      .status(500)
      .json({ message: "სერვერის შეცდომა: დარწმუნდით რომ მონაცემები სწორია" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/homeworks/:id  (teacher/admin)
// ─────────────────────────────────────────────
export const deleteHomework = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    if (role !== "admin") {
      const check = await query(
        "SELECT id FROM homeworks WHERE id = $1 AND created_by = $2",
        [id, userId],
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "წვდომა აკრძალულია" });
      }
    }

    const subs = await query(
      "SELECT file_url FROM homework_submissions WHERE homework_id = $1",
      [id],
    );
    for (const sub of subs.rows) {
      if (sub.file_url?.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), sub.file_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await query("DELETE FROM homework_submissions WHERE homework_id = $1", [
      id,
    ]);
    await query("DELETE FROM homeworks WHERE id = $1", [id]);

    res.status(200).json({ message: "წაიშალა" });
  } catch (err) {
    console.error("🔥 DELETE_HOMEWORK_ERROR:", err);
    res.status(500).json({ message: "წაშლა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/homeworks/:id/submissions  (teacher)
// ─────────────────────────────────────────────
export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT
        sub.*,
        u.full_name AS student_name
      FROM homework_submissions sub
      JOIN users u ON u.id = sub.student_id
      WHERE sub.homework_id = $1
      ORDER BY sub.submitted_at ASC
      `,
      [id],
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 GET_SUBMISSIONS_ERROR:", err);
    res.status(500).json({ message: "სუბმისიების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/homeworks/submit  (student, multipart/form-data)
// ─────────────────────────────────────────────
export const submitHomework = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user?.id;
    const { homework_id, file_url: linkUrl } = req.body;
    const uploadedFile = (req as any).file;

    if (!homework_id) {
      return res.status(400).json({ message: "homework_id აკლია" });
    }

    const hwResult = await query(
      "SELECT due_date FROM homeworks WHERE id = $1",
      [homework_id],
    );
    if (hwResult.rows.length === 0) {
      return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });
    }
    if (new Date() > new Date(hwResult.rows[0].due_date)) {
      return res.status(400).json({ message: "ჩაბარების ვადა გასულია" });
    }

    const existing = await query(
      "SELECT id FROM homework_submissions WHERE homework_id = $1 AND student_id = $2",
      [homework_id, studentId],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "უკვე ჩაბარებულია" });
    }

    const fileUrl = uploadedFile
      ? `/uploads/${uploadedFile.filename}`
      : linkUrl || null;

    if (!fileUrl) {
      return res.status(400).json({ message: "ფაილი ან ლინკი საჭიროა" });
    }

    const result = await query(
      `
      INSERT INTO homework_submissions (homework_id, student_id, file_url, submitted_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
      `,
      [homework_id, studentId, fileUrl],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 SUBMIT_HOMEWORK_ERROR:", err);
    res.status(500).json({ message: "ჩაბარება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/homeworks/submissions/:id/grade  (teacher)
// ─────────────────────────────────────────────
export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({ message: "ქულა სავალდებულოა" });
    }

    const subResult = await query(
      `
      SELECT h.max_score
      FROM homework_submissions sub
      JOIN homeworks h ON h.id = sub.homework_id
      WHERE sub.id = $1
      `,
      [id],
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: "სუბმისია ვერ მოიძებნა" });
    }
    if (Number(score) > subResult.rows[0].max_score) {
      return res.status(400).json({
        message: `ქულა არ შეიძლება აღემატებოდეს ${subResult.rows[0].max_score}-ს`,
      });
    }

    const result = await query(
      `
      UPDATE homework_submissions
      SET score = $1, feedback = $2
      WHERE id = $3
      RETURNING *
      `,
      [Number(score), feedback || null, id],
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 GRADE_SUBMISSION_ERROR:", err);
    res.status(500).json({ message: "შეფასება ვერ მოხერხდა" });
  }
};
