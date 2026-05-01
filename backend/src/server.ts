import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response } from "express";
import http from "http"; // ← NEW: needed for Socket.io
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import topicRoutes from "./routes/topicRoutes";
import courseRoutes from "./routes/courseRoutes";
import gradeRoutes from "./routes/gradeRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import evaluationsRoutes from "./routes/evaluationRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import homeworkRoutes from "./routes/homeworkRoutes";
import taskTemplateRoutes from "./routes/taskTemplateRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import chatRoutes from "./routes/chatRoutes"; // ← NEW
import { initSocket } from "./socket"; // ← NEW
import { ensureChatTables } from "./controllers/chatController"; // ← NEW
import path from "path";
import fs from "fs";

const app: Application = express();
// ── Create HTTP server (required for Socket.io) ─────────────
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;

// uploads დირექტორია უნდა არსებობდეს
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(uploadsDir));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/evaluations", evaluationsRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/homeworks", homeworkRoutes);
app.use("/api/task-templates", taskTemplateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes); // ← NEW

app.get("/", (req: Request, res: Response) => {
  res.send("Utopia API is Running! 🚀");
});

// ── Init Socket.io ───────────────────────────────────────────
const io = initSocket(httpServer); // ← NEW

// ── Ensure chat DB tables exist ──────────────────────────────
ensureChatTables() // ← NEW
  .then(() => console.log("✅ Chat tables ready"))
  .catch((err) => console.error("❌ Chat table init error:", err));

// ── Listen on httpServer instead of app ─────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
