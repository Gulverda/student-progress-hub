import { Request, Response } from "express";
import { query } from "../config/db";
import { AuthenticatedRequest } from "../types/express";

export const createTopic = async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, resources, week } = req.body;
  const lecturer_id = req.user?.id;

  try {
    const result = await query(
      "INSERT INTO topics (title, description, resources, week, lecturer_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, description, resources, week, lecturer_id],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ createTopic ERROR:", error);
    res.status(500).json({ message: "თემის შექმნისას მოხდა შეცდომა" });
  }
};

export const getTopics = async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM topics ORDER BY week ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "თემების წამოღება ვერ მოხერხდა" });
  }
};
