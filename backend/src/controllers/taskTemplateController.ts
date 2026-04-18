import { Request, Response } from "express";
import { query } from "../config/db";

// GET /api/task-templates
export const getTaskTemplates = async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT t.*, u.full_name AS created_by_name
      FROM task_templates t
      LEFT JOIN users u ON u.id = t.created_by
      ORDER BY t.level ASC, t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET_TEMPLATES_ERROR:", err);
    res.status(500).json({ message: "შაბლონების წამოღება ვერ მოხერხდა" });
  }
};

// POST /api/task-templates
export const createTaskTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, description, level, max_score } = req.body;

    if (!title || !level) {
      return res.status(400).json({ message: "სათაური და დონე სავალდებულოა" });
    }

    const result = await query(
      `INSERT INTO task_templates (title, description, level, max_score, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || "", level, max_score || 100, userId],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE_TEMPLATE_ERROR:", err);
    res.status(500).json({ message: "შაბლონის შექმნა ვერ მოხერხდა" });
  }
};

// DELETE /api/task-templates/:id
export const deleteTaskTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    if (role !== "admin") {
      const check = await query(
        "SELECT id FROM task_templates WHERE id = $1 AND created_by = $2",
        [id, userId],
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "წვდომა აკრძალულია" });
      }
    }

    await query("DELETE FROM task_templates WHERE id = $1", [id]);
    res.json({ message: "წაიშალა" });
  } catch (err) {
    console.error("DELETE_TEMPLATE_ERROR:", err);
    res.status(500).json({ message: "წაშლა ვერ მოხერხდა" });
  }
};
