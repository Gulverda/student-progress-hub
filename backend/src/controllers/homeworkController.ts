import { Request, Response } from "express";
import { query } from "../config/db";
import { createNotification } from "./notificationController";
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

    if (!course_id || !title || !due_date || !max_score) {
      return res
        .status(400)
        .json({ message: "ყველა სავალდებულო ველი შეავსეთ" });
    }

    const courseCheck = await query(
      "SELECT id, title FROM courses WHERE id = $1",
      [course_id],
    );
    if (courseCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "ასეთი კურსი არ არსებობს. დავალებას ვერ შექმნით." });
    }

    const result = await query(
      `INSERT INTO homeworks (course_id, title, description, due_date, max_score, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [course_id, title, description || "", due_date, max_score, userId],
    );
    const newHomework = result.rows[0];

    // Auto-save to task_templates
    await query(
      `INSERT INTO task_templates (title, description, level, max_score, created_by)
       SELECT $1, $2, 'beginner', $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM task_templates WHERE title = $1 AND created_by = $4
       )`,
      [title, description || "", max_score, userId],
    );

    // 🔔 Notification — კურსზე ჩარიცხულ სტუდენტებს
    const enrolled = await query(
      `SELECT student_id FROM enrollments WHERE course_id = $1`,
      [course_id],
    );
    const courseTitle = courseCheck.rows[0].title;
    await Promise.allSettled(
      enrolled.rows.map((r) =>
        createNotification({
          userId: r.student_id,
          type: "homework",
          title: "ახალი დავალება",
          message: `"${title}" დაემატა — ${courseTitle}`,
        }),
      ),
    );

    res.status(201).json(newHomework);
  } catch (err) {
    console.error("🔥 CREATE_HOMEWORK_ERROR:", err);
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
      SELECT sub.*, u.full_name AS student_name
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
// POST /api/homeworks/submit  (student)
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
      "SELECT h.due_date, h.title, h.created_by, c.title AS course_title FROM homeworks h JOIN courses c ON c.id = h.course_id WHERE h.id = $1",
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
      `INSERT INTO homework_submissions (homework_id, student_id, file_url, submitted_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [homework_id, studentId, fileUrl],
    );

    // 🔔 Notification — სტუდენტს დასტური + ლექტორს შეტყობინება
    const hw = hwResult.rows[0];

    await Promise.allSettled([
      // სტუდენტს
      createNotification({
        userId: studentId,
        type: "homework",
        title: "დავალება ჩაბარდა",
        message: `"${hw.title}" წარმატებით ჩაბარდა`,
      }),
      // ლექტორს
      createNotification({
        userId: hw.created_by,
        type: "homework",
        title: "ახალი ჩაბარება",
        message: `სტუდენტმა ჩააბარა "${hw.title}" — ${hw.course_title}`,
      }),
    ]);

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
      `SELECT sub.student_id, h.max_score, h.title
       FROM homework_submissions sub
       JOIN homeworks h ON h.id = sub.homework_id
       WHERE sub.id = $1`,
      [id],
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: "სუბმისია ვერ მოიძებნა" });
    }

    const { max_score, student_id, title } = subResult.rows[0];

    if (Number(score) > max_score) {
      return res.status(400).json({
        message: `ქულა არ შეიძლება აღემატებოდეს ${max_score}-ს`,
      });
    }

    const result = await query(
      `UPDATE homework_submissions SET score = $1, feedback = $2
       WHERE id = $3 RETURNING *`,
      [Number(score), feedback || null, id],
    );

    // 🔔 Notification — სტუდენტს ქულის შესახებ
    await createNotification({
      userId: student_id,
      type: "grade",
      title: "დავალება შეფასდა",
      message: `"${title}" — ${score}/${max_score}${feedback ? ` · "${feedback}"` : ""}`,
    });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 GRADE_SUBMISSION_ERROR:", err);
    res.status(500).json({ message: "შეფასება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/homeworks/templates/:courseId
// ლექტორის საწყობი — 40 დავალება სირთულეების მიხედვით
// ─────────────────────────────────────────────
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { difficulty } = req.query;

    let sql = `
      SELECT h.*, t.title AS topic_title
      FROM homeworks h
      LEFT JOIN topics t ON t.id = h.topic_id
      WHERE h.course_id = $1 AND h.is_template = TRUE
    `;
    const params: any[] = [courseId];

    if (difficulty) {
      params.push(difficulty);
      sql += ` AND h.difficulty = $${params.length}`;
    }

    sql += ` ORDER BY
      CASE h.difficulty
        WHEN 'easy'    THEN 1
        WHEN 'medium'  THEN 2
        WHEN 'hard'    THEN 3
        WHEN 'complex' THEN 4
      END, h.week_number, h.id`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET_TEMPLATES_ERROR:", err);
    res.status(500).json({ message: "შაბლონების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/homeworks/templates/:courseId/stats
// Progress: რამდენი გაქვს თითო სირთულეში (X/10)
// ─────────────────────────────────────────────
export const getTemplateStats = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const result = await query(
      `SELECT difficulty, COUNT(*) AS count
       FROM homeworks
       WHERE course_id = $1 AND is_template = TRUE
       GROUP BY difficulty`,
      [courseId],
    );

    const levels = ["easy", "medium", "hard", "complex"] as const;
    const map = Object.fromEntries(
      result.rows.map((r) => [r.difficulty, Number(r.count)]),
    );

    const stats = levels.map((d) => ({
      difficulty: d,
      count: map[d] ?? 0,
      remaining: 10 - (map[d] ?? 0),
      full: (map[d] ?? 0) >= 10,
    }));

    res.json({
      stats,
      total: stats.reduce((s, r) => s + r.count, 0),
      target: 40,
      complete: stats.every((s) => s.full),
    });
  } catch (err) {
    res.status(500).json({ message: "სტატისტიკის წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/homeworks/templates
// შაბლონის შექმნა (საწყობში ჩამატება)
// ─────────────────────────────────────────────
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { course_id, title, description, difficulty, week_number } = req.body;

    if (!course_id || !title || !difficulty) {
      return res
        .status(400)
        .json({ message: "course_id, title, difficulty სავალდებულოა" });
    }

    if (!["easy", "medium", "hard", "complex"].includes(difficulty)) {
      return res
        .status(400)
        .json({ message: "difficulty: easy | medium | hard | complex" });
    }

    // ≤10 per difficulty per course
    const { rows } = await query(
      `SELECT COUNT(*) FROM homeworks 
       WHERE course_id = $1 AND difficulty = $2 AND is_template = TRUE`,
      [course_id, difficulty],
    );
    if (Number(rows[0].count) >= 10) {
      return res.status(400).json({
        message: `${difficulty} სირთულეში უკვე 10 შაბლონია. ლიმიტი ამოიწურა.`,
      });
    }

    const result = await query(
      `INSERT INTO homeworks 
         (course_id, created_by, title, description, difficulty, week_number, is_template, due_date, max_score)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, '2099-01-01', 100)
       RETURNING *`,
      [
        course_id,
        userId,
        title,
        description ?? null,
        difficulty,
        week_number ?? null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE_TEMPLATE_ERROR:", err);
    res.status(500).json({ message: "შაბლონის შექმნა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/homeworks/templates/bulk
// ერთბაშად მრავალი შაბლონის იმპორტი
// ─────────────────────────────────────────────
export const bulkCreateTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { course_id, homeworks } = req.body;

    if (!Array.isArray(homeworks) || !course_id) {
      return res
        .status(400)
        .json({ message: "course_id და homeworks[] სავალდებულოა" });
    }

    const inserted: any[] = [];
    const errors: string[] = [];

    for (const hw of homeworks) {
      const { title, description, difficulty, week_number } = hw;

      if (!title || !difficulty) {
        errors.push(
          `გამოტოვდა (title/difficulty აკლია): ${JSON.stringify(hw)}`,
        );
        continue;
      }

      const { rows } = await query(
        `SELECT COUNT(*) FROM homeworks 
         WHERE course_id = $1 AND difficulty = $2 AND is_template = TRUE`,
        [course_id, difficulty],
      );
      if (Number(rows[0].count) >= 10) {
        errors.push(
          `"${title}" გამოტოვდა — ${difficulty} ლიმიტი (10) ამოიწურა`,
        );
        continue;
      }

      const r = await query(
        `INSERT INTO homeworks
           (course_id, created_by, title, description, difficulty, week_number, is_template, due_date, max_score)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, '2099-01-01', 100)
         RETURNING *`,
        [
          course_id,
          userId,
          title,
          description ?? null,
          difficulty,
          week_number ?? null,
        ],
      );
      inserted.push(r.rows[0]);
    }

    res.status(201).json({ inserted: inserted.length, errors, data: inserted });
  } catch (err) {
    console.error("BULK_CREATE_TEMPLATES_ERROR:", err);
    res.status(500).json({ message: "ჩაწერა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/homeworks/templates/:id/assign
// შაბლონიდან → სტუდენტებზე გაგზავნა (due_date + notification)
// ─────────────────────────────────────────────
export const assignTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { due_date, max_score } = req.body;
    const userId = (req as any).user?.id;

    const tmpl = await query(
      `SELECT * FROM homeworks WHERE id = $1 AND is_template = TRUE`,
      [id],
    );
    if (tmpl.rows.length === 0) {
      return res.status(404).json({ message: "შაბლონი ვერ მოიძებნა" });
    }
    const t = tmpl.rows[0];

    // ახალი "რეალური" დავალება შაბლონის საფუძველზე
    const result = await query(
      `INSERT INTO homeworks
         (course_id, created_by, title, description, difficulty, week_number, is_template, due_date, max_score)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8)
       RETURNING *`,
      [
        t.course_id,
        userId,
        t.title,
        t.description,
        t.difficulty,
        t.week_number,
        due_date,
        max_score ?? t.max_score,
      ],
    );
    const newHw = result.rows[0];

    // Notification — კურსზე ჩარიცხულ სტუდენტებს
    const enrolled = await query(
      `SELECT student_id FROM enrollments WHERE course_id = $1`,
      [t.course_id],
    );
    const courseRes = await query(`SELECT title FROM courses WHERE id = $1`, [
      t.course_id,
    ]);

    await Promise.allSettled(
      enrolled.rows.map((r) =>
        createNotification({
          userId: r.student_id,
          type: "homework",
          title: "ახალი დავალება",
          message: `"${t.title}" დაემატა — ${courseRes.rows[0]?.title}`,
        }),
      ),
    );

    res.status(201).json(newHw);
  } catch (err) {
    console.error("ASSIGN_TEMPLATE_ERROR:", err);
    res.status(500).json({ message: "გაგზავნა ვერ მოხერხდა" });
  }
};
