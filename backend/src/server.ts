import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import topicRoutes from "./routes/topicRoutes";
import courseRoutes from "./routes/courseRoutes";
import gradeRoutes from "./routes/gradeRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import evaluationsRoutes from "./routes/evaluationRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import homeworkRoutes from "./routes/homeworkRoutes";
import taskTemplateRoutes from "./routes/tasktemplateRoutes";
import path from "path";
import fs from "fs";

const app: Application = express();
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

app.get("/", (req: Request, res: Response) => {
  res.send("Utopia API is Running! 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
