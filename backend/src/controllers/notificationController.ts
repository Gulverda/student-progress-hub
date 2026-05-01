import { Request, Response } from "express";
import { query } from "../config/db";

// ─────────────────────────────────────────────
// GET /api/notifications  (current user)
// ─────────────────────────────────────────────
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET_NOTIFICATIONS_ERROR:", err);
    res.status(500).json({ message: "შეტყობინებების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/notifications/:id/read
// ─────────────────────────────────────────────
export const markOneRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    await query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    res.json({ message: "წაკითხულია" });
  } catch (err) {
    console.error("MARK_READ_ERROR:", err);
    res.status(500).json({ message: "შეცდომა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/notifications/read-all
// ─────────────────────────────────────────────
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [
      userId,
    ]);

    res.json({ message: "ყველა წაკითხულია" });
  } catch (err) {
    console.error("MARK_ALL_READ_ERROR:", err);
    res.status(500).json({ message: "შეცდომა" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/notifications/:id
// ─────────────────────────────────────────────
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);

    res.json({ message: "წაიშალა" });
  } catch (err) {
    console.error("DELETE_NOTIFICATION_ERROR:", err);
    res.status(500).json({ message: "წაშლა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// helper: სხვა controller-ებიდან გამოძახება
// ─────────────────────────────────────────────
export const createNotification = async ({
  userId,
  type,
  title,
  message,
}: {
  userId: number;
  type: "homework" | "grade" | "evaluation" | "general";
  title: string;
  message: string;
}) => {
  await query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES ($1, $2, $3, $4)`,
    [userId, type, title, message],
  );
};
