import { Request, Response } from "express";
import { query } from "../config/db";
import { createNotification } from "./notificationController";

export const submitEvaluation = async (req: any, res: Response) => {
  const {
    student_id,
    topic_id,
    understanding_level,
    teacher_feedback,
    file_url,
  } = req.body;

  const lecturer_id = req.user.id;
  const finalFileUrl = req.file
    ? `/uploads/${req.file.filename}`
    : file_url || null;

  const parsedLevel = parseInt(understanding_level) || understanding_level;

  if (!student_id || !topic_id) {
    return res
      .status(400)
      .json({ message: "student_id და course_id აუცილებელია" });
  }

  try {
    const sql = `
      INSERT INTO evaluations (student_id, course_id, lecturer_id, understanding_level, teacher_feedback, file_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await query(sql, [
      student_id,
      topic_id,
      lecturer_id,
      parsedLevel,
      teacher_feedback,
      finalFileUrl,
    ]);

    // 🔔 კურსის სახელი + ლექტორის სახელი notification-ისთვის
    const meta = await query(
      `SELECT c.title AS course_title, u.full_name AS lecturer_name
       FROM courses c
       JOIN users u ON u.id = $1
       WHERE c.id = $2`,
      [lecturer_id, topic_id],
    );

    const levelLabel: Record<number, string> = { 1: "I", 2: "II", 3: "III" };
    const lvl = levelLabel[parsedLevel] ?? parsedLevel;
    const courseTitle = meta.rows[0]?.course_title ?? "კურსი";
    const lecturerName = meta.rows[0]?.lecturer_name ?? "ლექტორი";

    // 🔔 სტუდენტს
    await createNotification({
      userId: Number(student_id),
      type: "evaluation",
      title: "ახალი შეფასება",
      message: `${lecturerName}-მა შეაფასა — ${courseTitle} · დონე ${lvl}${teacher_feedback ? ` · "${teacher_feedback}"` : ""}`,
    });

    res.status(200).json({
      message: "შეფასება შენახულია",
      evaluation: result.rows[0],
    });
  } catch (error: any) {
    console.error("DATABASE ERROR:", error.message);
    res.status(500).json({ message: "ბაზის შეცდომა", error: error.message });
  }
};

export const getMyEvaluations = async (req: any, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "ავტორიზაცია საჭიროა" });
  }

  const userId = req.user.id;
  const role = req.user.role;

  try {
    let sql = "";

    if (role === "teacher") {
      sql = `
        SELECT e.*, c.title as course_title, u.full_name as student_name
        FROM evaluations e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON e.student_id = u.id
        WHERE e.lecturer_id = $1
        ORDER BY e.created_at DESC`;
    } else {
      sql = `
        SELECT e.*, c.title as course_title, u.full_name as lecturer_name
        FROM evaluations e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON e.lecturer_id = u.id
        WHERE e.student_id = $1
        ORDER BY e.created_at DESC`;
    }

    const result = await query(sql, [userId]);
    res.json(result.rows || []);
  } catch (error: any) {
    console.error("SQL ERROR:", error.message);
    res
      .status(500)
      .json({
        message: "მონაცემების წამოღება ვერ მოხერხდა",
        error: error.message,
      });
  }
};

export const getStudentProgress = async (req: Request, res: Response) => {
  const { student_id } = req.params;
  try {
    const result = await query(
      `SELECT c.title, e.understanding_level, e.teacher_feedback, e.created_at
       FROM evaluations e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = $1
       ORDER BY e.created_at DESC`,
      [student_id],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "პროგრესის წამოღება ვერ მოხერხდა" });
  }
};
