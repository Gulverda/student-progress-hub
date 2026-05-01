import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { query } from "./config/db";
import { ensureChatTables } from "./controllers/chatController";

interface AuthSocket {
  userId: number;
  userRole: string;
  userName: string;
}

export const initSocket = (httpServer: HttpServer) => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*", // tighten in production
      methods: ["GET", "POST"],
    },
  });

  // ── Auth middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("ავტორიზაცია საჭიროა"));

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as any;
      (socket as any).user = {
        userId: decoded.id,
        userRole: decoded.role,
        userName: decoded.full_name ?? "მომხმარებელი",
      } satisfies AuthSocket;
      next();
    } catch {
      next(new Error("ტოქენი არასწორია"));
    }
  });

  // ── Connection ───────────────────────────────────────────
  io.on("connection", async (socket) => {
    const { userId, userRole, userName } = (socket as any).user as AuthSocket;

    console.log(`🟢 Chat connected: user=${userId} role=${userRole}`);

    // Auto-join all rooms the user belongs to
    try {
      const rooms = await query(
        "SELECT room_id FROM chat_room_members WHERE user_id = $1",
        [userId],
      );
      for (const r of rooms.rows) {
        socket.join(`room:${r.room_id}`);
      }
    } catch (err) {
      console.error("Socket room join error:", err);
    }

    // ── join_room ────────────────────────────────────────
    // Client emits this after creating/getting a room
    socket.on("join_room", async ({ roomId }: { roomId: number }) => {
      try {
        const access = await query(
          "SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2",
          [roomId, userId],
        );
        if (access.rows.length === 0) {
          socket.emit("error", { message: "წვდომა აკრძალულია" });
          return;
        }
        socket.join(`room:${roomId}`);
        socket.emit("joined_room", { roomId });
      } catch (err) {
        socket.emit("error", { message: "ოთახში შესვლის შეცდომა" });
      }
    });

    // ── send_message ─────────────────────────────────────
    socket.on(
      "send_message",
      async ({ roomId, message }: { roomId: number; message: string }) => {
        if (!message?.trim()) return;

        try {
          // Verify membership
          const access = await query(
            "SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2",
            [roomId, userId],
          );
          if (access.rows.length === 0) {
            socket.emit("error", { message: "წვდომა აკრძალულია" });
            return;
          }

          // Persist
          const result = await query(
            `INSERT INTO chat_messages (room_id, sender_id, message)
             VALUES ($1, $2, $3) RETURNING *`,
            [roomId, userId, message.trim()],
          );

          const savedMsg = result.rows[0];

          // Fetch sender info
          const senderRes = await query(
            "SELECT full_name, role, avatar_url FROM users WHERE id = $1",
            [userId],
          );
          const sender = senderRes.rows[0];

          // Broadcast to ALL in the room (including sender for confirmation)
          io.to(`room:${roomId}`).emit("new_message", {
            id: savedMsg.id,
            room_id: roomId,
            message: savedMsg.message,
            created_at: savedMsg.created_at,
            sender_id: userId,
            sender_name: sender?.full_name ?? userName,
            sender_role: sender?.role ?? userRole,
            sender_avatar: sender?.avatar_url ?? null,
          });

          // Push notification to offline members (they won't be in socket room)
          const members = await query(
            "SELECT user_id FROM chat_room_members WHERE room_id = $1 AND user_id != $2",
            [roomId, userId],
          );

          // Get online socket user IDs in this room
          const socketsInRoom = await io.in(`room:${roomId}`).allSockets();
          const onlineUserIds = new Set<number>();
          for (const sid of socketsInRoom) {
            const s = io.sockets.sockets.get(sid);
            if (s) {
              const u = (s as any).user as AuthSocket;
              if (u) onlineUserIds.add(u.userId);
            }
          }

          // Notify offline members via DB notification
          for (const m of members.rows) {
            if (!onlineUserIds.has(m.user_id)) {
              await query(
                `INSERT INTO notifications (user_id, type, title, message)
                 VALUES ($1, 'general', $2, $3)`,
                [
                  m.user_id,
                  "ახალი შეტყობინება",
                  `${sender?.full_name ?? userName}: ${message.trim().slice(0, 80)}`,
                ],
              ).catch(() => {}); // non-critical
            }
          }
        } catch (err) {
          console.error("send_message error:", err);
          socket.emit("error", {
            message: "შეტყობინების გაგზავნა ვერ მოხერხდა",
          });
        }
      },
    );

    // ── typing indicator ──────────────────────────────────
    socket.on("typing", ({ roomId }: { roomId: number }) => {
      socket.to(`room:${roomId}`).emit("user_typing", {
        userId,
        userName,
      });
    });

    socket.on("stop_typing", ({ roomId }: { roomId: number }) => {
      socket.to(`room:${roomId}`).emit("user_stop_typing", { userId });
    });

    // ── disconnect ────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`🔴 Chat disconnected: user=${userId}`);
    });
  });

  return io;
};
