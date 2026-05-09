import { Request, Response } from "express";
import { query } from "../config/db";
import {
  predictStudent,
  getCourseStudentPredictions,
  retrainModel,
} from "../services/mlService";
import { generateCatchupTasks as geminiGenerate } from "../services/geminiService"; // ← alias
import { createNotification } from "./notificationController";

// ─────────────────────────────────────────────
// GET /api/catchup/course/:courseId/students
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
// POST /api/catchup/generate  ← მხოლოდ ეს რჩება
// ML + Gemini ერთად
// ─────────────────────────────────────────────
export const generateCatchupTasksHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { student_id, course_id } = req.body;
    const lecturerId = (req as any).user?.id;

    // 1. ML პრედიქცია
    const prediction = await predictStudent(
      Number(course_id),
      Number(student_id),
    );
    const difficulty = prediction.recommended_difficulty;

    // 2. გავლილი შაბლონები — Gemini-სთვის მაგალითები
    const templates = await query(
      `SELECT title, description FROM homeworks
       WHERE course_id = $1 AND is_template = TRUE AND difficulty = $2
       ORDER BY week_number LIMIT 5`,
      [course_id, difficulty],
    );

    // 3. სუსტი თემები
    const feedbacks = await query(
      `SELECT teacher_feedback FROM evaluations
       WHERE student_id = $1 AND course_id = $2
         AND teacher_feedback IS NOT NULL
       ORDER BY created_at DESC LIMIT 3`,
      [student_id, course_id],
    );
    const weakTopics = feedbacks.rows
      .map((r: any) => r.teacher_feedback)
      .filter(Boolean);

    // 4. Groq — 3 AI დავალების გენერაცია
    const generated = await geminiGenerate({
      studentName: prediction.student_name,
      courseTitle: prediction.course_title,
      difficulty,
      weakTopics,
      currentWeek: prediction.profile.current_week,
      missedHw: prediction.profile.missed_homeworks,
      exampleTasks: templates.rows,
    });

    // 5. AI დავალებები DB-ში Draft სახით
    const aiDrafts = [];
    for (const task of generated) {
      const r = await query(
        `INSERT INTO homeworks
           (course_id, created_by, title, description, difficulty,
            is_template, due_date, max_score)
         VALUES ($1, $2, $3, $4, $5, FALSE, '2099-01-01', 100)
         RETURNING *`,
        [
          course_id,
          lecturerId,
          task.title,
          `${task.description}\n\n💡 მინიშნება: ${task.hint}`,
          task.difficulty,
        ],
      );
      aiDrafts.push({ ...r.rows[0], source: "ai" }); // ✅ source tag
    }

    // 6. ✅ არსებული 2 შაბლონი პირდაპირ DB-დან
    const existing = await query(
      `SELECT * FROM homeworks
       WHERE course_id = $1
         AND is_template = TRUE
         AND difficulty = $2
       ORDER BY RANDOM()
       LIMIT 2`,
      [course_id, difficulty],
    );
    const existingDrafts = existing.rows.map((r: any) => ({
      ...r,
      source: "existing", // ✅ source tag
    }));

    res.status(201).json({
      prediction,
      drafts: [...aiDrafts, ...existingDrafts], // ✅ ორივე ერთად
      message: `${aiDrafts.length} AI + ${existingDrafts.length} არსებული დავალება`,
    });
  } catch (err: any) {
    console.error("GENERATE_CATCHUP_ERROR:", err);
    res.status(500).json({ message: err.message ?? "გენერაცია ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/catchup/send/:homeworkId
// ─────────────────────────────────────────────
export const sendCatchupTask = async (req: Request, res: Response) => {
  try {
    const { homeworkId } = req.params;
    const { student_id, due_date } = req.body;

    const hw = await query(
      `UPDATE homeworks 
   SET due_date = $1,
       assigned_student_id = $2  -- ✅ სტუდენტს მიაბი
   WHERE id = $3
   RETURNING *`,
      [due_date, student_id, homeworkId],
    );

    if (hw.rows.length === 0) {
      return res.status(404).json({ message: "დავალება ვერ მოიძებნა" });
    }

    // ✅ სტუდენტი კურსზე enrolled უნდა იყოს რომ დავალება დაინახოს
    await query(
      `INSERT INTO enrollments (student_id, course_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [student_id, hw.rows[0].course_id],
    );

    await createNotification({
      userId: student_id,
      type: "homework",
      title: "📚 Catch-up დავალება",
      message: `"${hw.rows[0].title}" — ${hw.rows[0].difficulty} სირთულე`,
    });

    res.json({ message: "დავალება გაიგზავნა", homework: hw.rows[0] });
  } catch (err) {
    console.error("SEND_CATCHUP_ERROR:", err);
    res.status(500).json({ message: "გაგზავნა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/catchup/retrain  (admin only)
// ─────────────────────────────────────────────
export const triggerRetrain = async (req: Request, res: Response) => {
  try {
    await retrainModel();
    res.json({ message: "მოდელი განახლდა ✅" });
  } catch (err) {
    res.status(500).json({ message: "დატრენინგება ვერ მოხერხდა" });
  }
};
