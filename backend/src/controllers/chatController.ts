import { Request, Response } from "express";
import { query } from "../config/db";
import { createNotification } from "./notificationController";

// ─────────────────────────────────────────────
// DB Migration (auto-creates tables on first run)
// ─────────────────────────────────────────────
export const ensureChatTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id           SERIAL PRIMARY KEY,
      type         VARCHAR(30) NOT NULL,  -- 'course' | 'homework' | 'evaluation' | 'direct'
      context_id   INTEGER,               -- course_id / homework_id / evaluation_id
      name         VARCHAR(200),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         SERIAL PRIMARY KEY,
      room_id    INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chat_room_members (
      room_id    INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room
    ON chat_messages(room_id, created_at DESC)
  `);
};

// chatController.ts-ში დაამატე:
export const getDirectChatUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;

    let targetRole: string;
    if (role === "student") targetRole = "teacher";
    else if (role === "teacher") targetRole = "student";
    else return res.json([]); // admin — არ სჭირდება

    const result = await query(
      `SELECT id, full_name, email FROM users WHERE role = $1 AND id != $2 ORDER BY full_name`,
      [targetRole, userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET_DIRECT_CHAT_USERS_ERROR:", err);
    res.status(500).json({ message: "მომხმარებლების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/chat/rooms  — rooms the current user belongs to
// ─────────────────────────────────────────────
export const getMyRooms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const result = await query(
      `
      SELECT
        r.id, r.type, r.context_id, r.name, r.created_at,
        (
          SELECT json_build_object(
            'id',         m.id,
            'message',    m.message,
            'sender_id',  m.sender_id,
            'created_at', m.created_at
          )
          FROM chat_messages m
          WHERE m.room_id = r.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT COUNT(*)
          FROM chat_messages m2
          WHERE m2.room_id = r.id
        ) AS message_count
      FROM chat_rooms r
      JOIN chat_room_members rm ON rm.room_id = r.id AND rm.user_id = $1
      ORDER BY r.created_at DESC
      `,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET_MY_ROOMS_ERROR:", err);
    res.status(500).json({ message: "ოთახების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/chat/rooms/:id/messages
// ─────────────────────────────────────────────
export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined; // ISO timestamp for pagination

    // Access check
    const access = await query(
      "SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2",
      [id, userId],
    );
    if (access.rows.length === 0) {
      return res.status(403).json({ message: "წვდომა აკრძალულია" });
    }

    const params: any[] = [id, limit];
    let timeFilter = "";
    if (before) {
      params.push(before);
      timeFilter = `AND m.created_at < $${params.length}`;
    }

    const result = await query(
      `
      SELECT
        m.id, m.message, m.created_at,
        u.id   AS sender_id,
        u.full_name AS sender_name,
        u.role AS sender_role,
        u.avatar_url AS sender_avatar
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = $1 ${timeFilter}
      ORDER BY m.created_at DESC
      LIMIT $2
      `,
      params,
    );

    // Return in chronological order
    res.json(result.rows.reverse());
  } catch (err) {
    console.error("GET_ROOM_MESSAGES_ERROR:", err);
    res.status(500).json({ message: "შეტყობინებების წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/chat/rooms  — create or get existing room
// ─────────────────────────────────────────────
// POST /api/chat/rooms
export const createOrGetRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { type, context_id, name, participant_ids } = req.body;

    if (!type) {
      return res.status(400).json({ message: "type სავალდებულოა" });
    }

    // Context-based rooms — reuse existing
    if (context_id && type !== "direct") {
      const existing = await query(
        "SELECT id FROM chat_rooms WHERE type = $1 AND context_id = $2",
        [type, context_id],
      );
      if (existing.rows.length > 0) {
        const roomId = existing.rows[0].id;
        await query(
          `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roomId, userId],
        );
        const room = await query("SELECT * FROM chat_rooms WHERE id = $1", [
          roomId,
        ]);
        return res.json(room.rows[0]);
      }
    }

    // ✅ Direct 1v1 — reuse existing room between the same two users
    if (type === "direct") {
      const otherUserId = (participant_ids ?? []).find(
        (id: number) => id !== userId,
      );
      if (otherUserId) {
        const existing = await query(
          `
          SELECT r.id FROM chat_rooms r
          WHERE r.type = 'direct'
            AND (SELECT COUNT(*) FROM chat_room_members m WHERE m.room_id = r.id) = 2
            AND EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = r.id AND m.user_id = $1)
            AND EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = r.id AND m.user_id = $2)
          LIMIT 1
          `,
          [userId, otherUserId],
        );
        if (existing.rows.length > 0) {
          const room = await query("SELECT * FROM chat_rooms WHERE id = $1", [
            existing.rows[0].id,
          ]);
          return res.json(room.rows[0]);
        }
      }
    }

    // Build room name
    let roomName = name;
    if (!roomName && context_id) {
      if (type === "course") {
        const c = await query("SELECT title FROM courses WHERE id = $1", [
          context_id,
        ]);
        roomName = c.rows[0]?.title ?? "კურსი";
      } else if (type === "homework") {
        const h = await query("SELECT title FROM homeworks WHERE id = $1", [
          context_id,
        ]);
        roomName = h.rows[0]?.title ?? "დავალება";
      } else if (type === "evaluation") {
        const e = await query(
          `SELECT c.title FROM evaluations ev JOIN courses c ON c.id = ev.course_id WHERE ev.id = $1`,
          [context_id],
        );
        roomName = e.rows[0]?.title
          ? `შეფასება — ${e.rows[0].title}`
          : "შეფასება";
      }
    }

    // Create room
    const newRoom = await query(
      "INSERT INTO chat_rooms (type, context_id, name) VALUES ($1, $2, $3) RETURNING *",
      [type, context_id ?? null, roomName ?? null],
    );
    const roomId = newRoom.rows[0].id;

    const allMembers = [...new Set([userId, ...(participant_ids ?? [])])];
    for (const uid of allMembers) {
      await query(
        `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roomId, uid],
      );
    }

    res.status(201).json(newRoom.rows[0]);
  } catch (err) {
    console.error("CREATE_ROOM_ERROR:", err);
    res.status(500).json({ message: "ოთახის შექმნა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// POST /api/chat/rooms/:id/messages  — REST fallback (Socket.io is primary)
// ─────────────────────────────────────────────
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id: roomId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "შეტყობინება ცარიელია" });
    }

    const access = await query(
      "SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2",
      [roomId, userId],
    );
    if (access.rows.length === 0) {
      return res.status(403).json({ message: "წვდომა აკრძალულია" });
    }

    const result = await query(
      `INSERT INTO chat_messages (room_id, sender_id, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [roomId, userId, message.trim()],
    );

    // Notify other room members
    const members = await query(
      "SELECT user_id FROM chat_room_members WHERE room_id = $1 AND user_id != $2",
      [roomId, userId],
    );
    const sender = await query("SELECT full_name FROM users WHERE id = $1", [
      userId,
    ]);
    const senderName = sender.rows[0]?.full_name ?? "მომხმარებელი";

    await Promise.allSettled(
      members.rows.map((m) =>
        createNotification({
          userId: m.user_id,
          type: "general",
          title: "ახალი შეტყობინება",
          message: `${senderName}: ${message.trim().slice(0, 80)}`,
        }),
      ),
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("SEND_MESSAGE_ERROR:", err);
    res.status(500).json({ message: "შეტყობინების გაგზავნა ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// GET /api/chat/suggestions  — context-aware smart suggestions
// Returns recent homeworks, evaluations, courses relevant to the user
// ─────────────────────────────────────────────
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;

    const suggestions: any[] = [];

    if (role === "student") {
      // Last 3 homeworks with submission status
      const homeworks = await query(
        `
        SELECT h.id, h.title, c.title AS course_title, h.due_date,
               sub.id AS submission_id, sub.score
        FROM homeworks h
        JOIN courses c ON c.id = h.course_id
        JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
        LEFT JOIN homework_submissions sub ON sub.homework_id = h.id AND sub.student_id = $1
        ORDER BY h.due_date ASC
        LIMIT 3
        `,
        [userId],
      );
      for (const hw of homeworks.rows) {
        suggestions.push({
          type: "homework",
          id: hw.id,
          label: hw.title,
          sublabel: hw.course_title,
          meta: hw.submission_id
            ? `შეფასება: ${hw.score ?? "მოლოდინში"}`
            : `ბოლო ვადა: ${new Date(hw.due_date).toLocaleDateString("ka-GE")}`,
        });
      }

      // Last 3 evaluations
      const evals = await query(
        `
        SELECT e.id, c.title AS course_title,
               e.understanding_level, e.teacher_feedback, e.created_at,
               u.full_name AS lecturer_name
        FROM evaluations e
        JOIN courses c ON c.id = e.course_id
        JOIN users u ON u.id = e.lecturer_id
        WHERE e.student_id = $1
        ORDER BY e.created_at DESC
        LIMIT 3
        `,
        [userId],
      );
      for (const ev of evals.rows) {
        suggestions.push({
          type: "evaluation",
          id: ev.id,
          label: `შეფასება — ${ev.course_title}`,
          sublabel: ev.lecturer_name,
          meta: `დონე ${ev.understanding_level}${ev.teacher_feedback ? ` · "${ev.teacher_feedback.slice(0, 40)}"` : ""}`,
          lecturer_id: ev.lecturer_id,
        });
      }

      // Enrolled courses
      const courses = await query(
        `
        SELECT c.id, c.title, u.full_name AS lecturer_name, u.id AS lecturer_id
        FROM courses c
        JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
        LEFT JOIN users u ON u.id = c.lecturer_id
        ORDER BY c.id DESC
        LIMIT 3
        `,
        [userId],
      );
      for (const co of courses.rows) {
        suggestions.push({
          type: "course",
          id: co.id,
          label: co.title,
          sublabel: co.lecturer_name,
          meta: "კურსის chat",
          lecturer_id: co.lecturer_id,
        });
      }
    }

    if (role === "teacher") {
      // Teacher's courses with student count
      const courses = await query(
        `
        SELECT c.id, c.title, COUNT(e.id) AS student_count
        FROM courses c
        LEFT JOIN enrollments e ON e.course_id = c.id
        WHERE c.lecturer_id = $1
        GROUP BY c.id
        ORDER BY c.id DESC
        LIMIT 4
        `,
        [userId],
      );
      for (const co of courses.rows) {
        suggestions.push({
          type: "course",
          id: co.id,
          label: co.title,
          sublabel: `${co.student_count} სტუდენტი`,
          meta: "კურსის chat",
        });
      }

      // Recent homeworks with ungraded submissions
      const hws = await query(
        `
        SELECT h.id, h.title, c.title AS course_title,
               COUNT(sub.id) FILTER (WHERE sub.score IS NULL) AS ungraded
        FROM homeworks h
        JOIN courses c ON c.id = h.course_id
        LEFT JOIN homework_submissions sub ON sub.homework_id = h.id
        WHERE h.created_by = $1
        GROUP BY h.id, c.title
        ORDER BY h.due_date DESC
        LIMIT 3
        `,
        [userId],
      );
      for (const hw of hws.rows) {
        suggestions.push({
          type: "homework",
          id: hw.id,
          label: hw.title,
          sublabel: hw.course_title,
          meta:
            hw.ungraded > 0
              ? `${hw.ungraded} შეუფასებელი`
              : "ყველა შეფასებულია",
        });
      }
    }

    res.json(suggestions);
  } catch (err) {
    console.error("GET_SUGGESTIONS_ERROR:", err);
    res.status(500).json({ message: "suggestions-ის წამოღება ვერ მოხერხდა" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/chat/rooms/:id  (admin or room creator)
// ─────────────────────────────────────────────
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    if (role !== "admin") {
      // Only members can delete rooms they are part of
      const check = await query(
        "SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2",
        [id, userId],
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "წვდომა აკრძალულია" });
      }
    }

    await query("DELETE FROM chat_rooms WHERE id = $1", [id]);
    res.json({ message: "ოთახი წაიშალა" });
  } catch (err) {
    console.error("DELETE_ROOM_ERROR:", err);
    res.status(500).json({ message: "ოთახის წაშლა ვერ მოხერხდა" });
  }
};
