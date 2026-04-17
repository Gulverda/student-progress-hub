import { Router } from "express";
import multer from "multer";
import path from "path";
import { protect as verifyToken } from "../middleware/authMiddleware";

import {
  getMyHomeworks,
  getStudentHomeworks,
  createHomework,
  deleteHomework,
  getSubmissions,
  submitHomework,
  gradeSubmission,
} from "../controllers/homeworkController";

const router = Router();

// ── Multer (ფაილების ატვირთვა) ────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Teacher / Admin ───────────────────────────
router.get("/my-homeworks", verifyToken, getMyHomeworks);
router.post("/", verifyToken, createHomework);
router.delete("/:id", verifyToken, deleteHomework);
router.get("/:id/submissions", verifyToken, getSubmissions);
router.post("/submissions/:id/grade", verifyToken, gradeSubmission);

// ── Student ───────────────────────────────────
router.get("/student", verifyToken, getStudentHomeworks);
router.post("/submit", verifyToken, upload.single("file"), submitHomework);

export default router;
