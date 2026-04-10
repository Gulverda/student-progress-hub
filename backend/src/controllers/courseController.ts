import { Request, Response } from "express";
import { query } from "../config/db";

// 1. სტუდენტის მიმდინარე კურსების წამოღება
export const getMyCourses = async (req: any, res: Response) => {
  const student_id = req.user.id;
  try {
    const sql = `
      SELECT c.*, u.full_name as professor_name
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN users u ON c.lecturer_id = u.id
      WHERE e.student_id = $1
    `;
    const result = await query(sql, [student_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ getMyCourses ERROR:", error);
    res.status(500).json({ message: "კურსების წამოღება ვერ მოხერხდა" });
  }
};

// 2. ადმინისთვის: კურსის შექმნა + ავტომატური მიბმა იმ კურსის სტუდენტებზე
export const createCourse = async (req: any, res: Response) => {
  const { title, course_code, lecturer_id, target_course } = req.body;
  try {
    // ვქმნით საგანს
    const sql = `
      INSERT INTO courses (title, course_code, lecturer_id, target_course)
      VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await query(sql, [
      title,
      course_code,
      lecturer_id,
      target_course || 1,
    ]);

    const newCourse = result.rows[0];

    // ავტომატურად ჩავყაროთ ყველა სტუდენტი, რომელიც ამ აკადემიურ წელზეა
    await query(
      `
      INSERT INTO enrollments (student_id, course_id)
      SELECT id, $1 FROM users 
      WHERE role = 'student' AND current_course = $2
      ON CONFLICT DO NOTHING
    `,
      [newCourse.id, target_course || 1],
    );

    res.status(201).json(newCourse);
  } catch (error) {
    console.error("❌ createCourse ERROR:", error);
    res.status(500).json({ message: "კურსის შექმნა ვერ მოხერხდა" });
  }
};

// 3. ხელით რეგისტრაცია (თუ სტუდენტს დამატებითი საგანი უნდა)
export const enrollInCourse = async (req: any, res: Response) => {
  const student_id = req.user.id;
  const { course_id } = req.body;
  try {
    const sql = `INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *`;
    await query(sql, [student_id, course_id]);
    res.json({ message: "წარმატებით დარეგისტრირდით კურსზე!" });
  } catch (error) {
    res.status(400).json({ message: "თქვენ უკვე ხართ ამ კურსზე" });
  }
};

// 4. კურსიდან მოხსნა (7 დღიანი ვადა)
export const unenrollFromCourse = async (req: any, res: Response) => {
  const student_id = req.user.id;
  const { course_id } = req.params;
  try {
    const checkSql = `SELECT enrolled_at FROM enrollments WHERE student_id = $1 AND course_id = $2`;
    const checkResult = await query(checkSql, [student_id, course_id]);

    if (checkResult.rows.length === 0)
      return res.status(404).json({ message: "რეგისტრაცია ვერ მოიძებნა" });

    const enrolledAt = new Date(checkResult.rows[0].enrolled_at);
    const now = new Date();
    const diffDays = Math.ceil(
      (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 7) {
      return res
        .status(403)
        .json({ message: "მოხსნის ვადა (7 დღე) ამოიწურა!" });
    }

    await query(
      `DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2`,
      [student_id, course_id],
    );
    res.json({ message: "კურსი წარმატებით მოიხსნა." });
  } catch (error) {
    res.status(500).json({ message: "შეცდომა კურსის მოხსნისას" });
  }
};

// 5. სხვა კურსები, სადაც სტუდენტი არ არის (არჩევითისთვის)
export const getAvailableCourses = async (req: any, res: Response) => {
  const student_id = req.user.id;
  try {
    const sql = `
      SELECT c.*, u.full_name as professor_name 
      FROM courses c
      LEFT JOIN users u ON c.lecturer_id = u.id
      WHERE c.id NOT IN (
        SELECT course_id FROM enrollments WHERE student_id = $1
      )
    `;
    const result = await query(sql, [student_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "მონაცემების წამოღება ვერ მოხერხდა" });
  }
};

// 6. ლექტორის საგნები
export const getLecturerCourses = async (req: any, res: Response) => {
  const lecturer_id = req.user.id;
  try {
    const sql = `
      SELECT c.*, COUNT(e.id) as student_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.lecturer_id = $1
      GROUP BY c.id
    `;
    const result = await query(sql, [lecturer_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "მონაცემების წამოღება ვერ მოხერხდა" });
  }
};

export const getAllCourses = async (req: any, res: Response) => {
  try {
    const sql = `
      SELECT 
        c.id, 
        c.title, 
        c.course_code, 
        c.target_course, 
        c.lecturer_id,
        u.full_name as professor_name 
      FROM courses c
      LEFT JOIN users u ON c.lecturer_id = u.id
      ORDER BY c.target_course ASC, c.id DESC
    `;
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error("🔥 GET ALL COURSES ERROR:", error); // ეს ტერმინალში დაგიწერს ზუსტ მიზეზს
    res.status(500).json({ message: "საგნების წამოღება ვერ მოხერხდა ბაზიდან" });
  }
};

// 8. კურსის წაშლა
export const deleteCourse = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM courses WHERE id = $1", [id]);
    res.json({ message: "კურსი წაიშალა" });
  } catch (error) {
    res.status(500).json({ message: "წაშლა ვერ მოხერხდა" });
  }
};
