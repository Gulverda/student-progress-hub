import { Request, Response } from "express";
import { query } from "../config/db";
import {
  predictStudent,
  getCourseStudentPredictions,
  retrainModel,
} from "../services/mlService";
import { createNotification } from "./notificationController";

// ─────────────────────────────────────────────
// GET /api/catchup/course/:courseId/students
// კურსის სტუდენტები ML პრედიქციით (ლექტორისთვის)
// ─────────────────────────────────────────────
export const getCourseStudents = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const predictions = await getCourseStudentPredictions(Number(courseId));
    res.json(predictions);
  } catch (err) {
    console.error("GET_COURSE_STUDENTS_ERROR:", err);
    res.status(500).json({ message: "სტუდენტების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/catchup/predict/:courseId/:studentId
// ერთი სტუდენტის პრედიქცია
// ─────────────────────────────────────────────
export const getStudentPrediction = async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;
    const prediction = await predictStudent(
      Number(courseId),
      Number(studentId),
    );
    res.json(prediction);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return res.status(404).json({ message: "სტუდენტი ვერ მოიძებნა" });
    }
    res.status(500).json({ message: "პრედიქცია ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/catchup/generate
// AI დავალებების გენერაცია შაბლონებიდან
// ─────────────────────────────────────────────
export const generateCatchupTasks = async (req: Request, res: Response) => {
  try {
    const { student_id, course_id } = req.body;
    const lecturerId = (req as any).user?.id;

    // ML-დან სტუდენტის პრედიქცია
    const prediction = await predictStudent(
      Number(course_id),
      Number(student_id),
    );
    const difficulty = prediction.recommended_difficulty;

    // შაბლონებიდან ამ სირთულის დავალებები
    const templates = await query(
      `SELECT * FROM homeworks
       WHERE course_id = $1
         AND difficulty = $2
         AND is_template = TRUE
       ORDER BY week_number, id
       LIMIT 5`,
      [course_id, difficulty],
    );

    if (templates.rows.length === 0) {
      return res.status(404).json({
        message: `${difficulty} სირთულის შაბლონები ვერ მოიძებნა`,
      });
    }

    // Draft სახით შენახვა (is_template=FALSE, status='draft')
    const drafts = [];
    for (const tmpl of templates.rows) {
      const result = await query(
        `INSERT INTO homeworks
           (course_id, created_by, title, description, difficulty,
            week_number, is_template, due_date, max_score)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, '2099-01-01', $7)
         RETURNING *`,
        [
          course_id,
          lecturerId,
          tmpl.title,
          tmpl.description,
          tmpl.difficulty,
          tmpl.week_number,
          tmpl.max_score,
        ],
      );
      drafts.push(result.rows[0]);
    }

    res.status(201).json({
      prediction,
      drafts,
      message: `${drafts.length} დავალება გენერირდა — ${difficulty} სირთულე`,
    });
  } catch (err) {
    console.error("GENERATE_CATCHUP_ERROR:", err);
    res.status(500).json({ message: "გენერაცია ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/catchup/send/:homeworkId
// ლექტორი ადასტურებს და სტუდენტს უგზავნის
// ─────────────────────────────────────────────
export const sendCatchupTask = async (req: Request, res: Response) => {
  try {
    const { homeworkId } = req.params;
    const { student_id, due_date } = req.body;

    // Draft → რეალური დავალება
    const hw = await query(
      `UPDATE homeworks
       SET due_date = $1
       WHERE id = $2
       RETURNING *`,
      [due_date, homeworkId],
    );

    if (hw.rows.length === 0) {
      return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });
    }

    // სტუდენტს notification
    await createNotification({
      userId: student_id,
      type: "homework",
      title: "📚 Catch-up დავალება",
      message: `"${hw.rows[0].title}" — ${hw.rows[0].difficulty} სირთულე`,
    });

    res.json({
      message: "დავალება გაიგზავნა",
      homework: hw.rows[0],
    });
  } catch (err) {
    console.error("SEND_CATCHUP_ERROR:", err);
    res.status(500).json({ message: "გაგზავნა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/catchup/retrain  (admin only)
// მოდელის ხელახლა დატრენინგება
// ─────────────────────────────────────────────
export const triggerRetrain = async (req: Request, res: Response) => {
  try {
    await retrainModel();
    res.json({ message: "მოდელი განახლდა ✅" });
  } catch (err) {
    res.status(500).json({ message: "დატრენინგება ვერ მოხერხდა" });
  }
};
