import { Response } from "express";
import { query } from "../config/db";
import { AuthenticatedRequest } from "../types/express";

// GET /api/attendance/course/:courseId
export const getCourseAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { courseId } = req.params;
  const lecturerId = req.user?.id;
  const userRole = (req.user as any)?.role;

  try {
    const courseCheck =
      userRole === "admin"
        ? await query("SELECT id, title FROM courses WHERE id = $1", [courseId])
        : await query(
            "SELECT id, title FROM courses WHERE id = $1 AND lecturer_id = $2",
            [courseId, lecturerId],
          );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ message: "წვდომა აკრძალულია" });
    }

    // სტუდენტები + მათი დასწრება
    const result = await query(
      `
      SELECT
        u.id          AS student_id,
        u.full_name,
        u.email,
        COALESCE(
          json_object_agg(a.week_number, a.is_present)
          FILTER (WHERE a.week_number IS NOT NULL),
          '{}'
        ) AS attendance
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN attendances a
        ON a.student_id = u.id AND a.course_id = $1
      WHERE e.course_id = $1
      GROUP BY u.id, u.full_name, u.email
      ORDER BY u.full_name ASC
      `,
      [courseId],
    );

    res.json({ course: courseCheck.rows[0], students: result.rows });
  } catch (err) {
    console.error("GET_ATTENDANCE_ERROR:", err);
    res.status(500).json({ message: "დასწრების წამოღება ვერ მოხერხდა" });
  }
};

// POST /api/attendance/save
// body: { course_id, student_id, week, is_present }
export const saveAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { course_id, student_id, week, is_present } = req.body;

  if (!course_id || !student_id || week == null || is_present == null) {
    return res.status(400).json({ message: "მონაცემები არასრულია" });
  }

  try {
    await query(
      `
      INSERT INTO attendances (student_id, course_id, week_number, is_present)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, course_id, week_number)
      DO UPDATE SET is_present = $4, created_at = NOW()
      `,
      [student_id, course_id, week, is_present],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("SAVE_ATTENDANCE_ERROR:", err);
    res.status(500).json({ message: "შენახვა ვერ მოხერხდა" });
  }
};

// POST /api/attendance/save-batch
// body: { course_id, week, records: [{student_id, is_present}] }
export const saveBatchAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { course_id, week, records } = req.body;

  if (!course_id || week == null || !Array.isArray(records)) {
    return res.status(400).json({ message: "მონაცემები არასრულია" });
  }

  try {
    await Promise.all(
      records.map((r: { student_id: number; is_present: boolean }) =>
        query(
          `
          INSERT INTO attendances (student_id, course_id, week_number, is_present)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (student_id, course_id, week_number)
          DO UPDATE SET is_present = $4, created_at = NOW()
          `,
          [r.student_id, course_id, week, r.is_present],
        ),
      ),
    );

    res.json({ ok: true, saved: records.length });
  } catch (err) {
    console.error("BATCH_ATTENDANCE_ERROR:", err);
    res.status(500).json({ message: "batch შენახვა ვერ მოხერხდა" });
  }
};
