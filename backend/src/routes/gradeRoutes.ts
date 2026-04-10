import { Router } from "express";
import {
  submitGrade,
  getMyGrades,
  getCourseGrades,
  getCourseStudentsWithGrades,
  getAllGrades,
} from "../controllers/gradeController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

router.post("/submit", protect, authorize("teacher"), submitGrade);

router.get(
  "/course/:course_id/students",
  protect,
  authorize("teacher", "lecturer", "admin"),
  getCourseStudentsWithGrades,
);
router.get(
  "/course/:course_id",
  protect,
  authorize("teacher"),
  getCourseGrades,
);
router.get("/my-grades", protect, getMyGrades);
router.get("/all", protect, authorize("admin"), getAllGrades);

export default router;
