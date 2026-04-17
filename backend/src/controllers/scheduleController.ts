import { Request, Response } from "express";
import { query } from "../config/db"; // იმპორტი შენი ფაილის მიხედვით

export const getSchedule = async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        s.*, 
        c.title AS course_title, 
        u.full_name AS lecturer_name
      FROM schedule s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.lecturer_id = u.id
      ORDER BY s.day_of_week, s.start_time
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 GET_SCHEDULE_ERROR:", err);
    res.status(500).json({ message: "განრიგის წამოღება ვერ მოხერხდა" });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  const { course_id, day_of_week, start_time, end_time, room, color_index } =
    req.body;

  try {
    const result = await query(
      `INSERT INTO schedule (course_id, day_of_week, start_time, end_time, room, color_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [course_id, day_of_week, start_time, end_time, room, color_index],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("🔥 CREATE_SCHEDULE_ERROR:", err);
    res.status(500).json({ message: "განრიგის შენახვის შეცდომა" });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM schedule WHERE id = $1", [id]);
    res.status(200).json({ message: "ჩანაწერი წაიშალა" });
  } catch (err) {
    console.error("🔥 DELETE_SCHEDULE_ERROR:", err);
    res.status(500).json({ message: "წაშლის შეცდომა" });
  }
};
