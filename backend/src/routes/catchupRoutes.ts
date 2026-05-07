import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  getCourseStudents,
  getStudentPrediction,
  generateCatchupTasksHandler,
  sendCatchupTask,
  triggerRetrain,
} from "../controllers/catchupController";

const router = Router();

// ლექტორი
router.get(
  "/course/:courseId/students",
  protect,
  authorize("teacher"),
  getCourseStudents,
);
router.get(
  "/predict/:courseId/:studentId",
  protect,
  authorize("teacher"),
  getStudentPrediction,
);
router.post(
  "/generate",
  protect,
  authorize("teacher"),
  generateCatchupTasksHandler,
);
router.post(
  "/send/:homeworkId",
  protect,
  authorize("teacher"),
  sendCatchupTask,
);

// ადმინი
router.post("/retrain", protect, authorize("admin"), triggerRetrain);

export default router;
