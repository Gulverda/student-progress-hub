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
import path from "path";

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - სახელები უნდა ემთხვეოდეს ფრონტენდის API გამოძახებებს
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/evaluations", evaluationsRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/settings", settingsRoutes);
// server.ts-ში დაამატე ეს ხაზი, რომ ატვირთული ფაილები ხელმისაწვდომი იყოს
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req: Request, res: Response) => {
  res.send("Utopia API is Running! 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
