import { Router } from "express";
import {
  submitEvaluation,
  getStudentProgress,
  getMyEvaluations, // 👈 დარწმუნდი, რომ ეს იმპორტირებულია კონტროლერიდან
} from "../controllers/evaluationController";
import { upload } from "../middleware/uploadMiddleware";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

// 1. ლექტორი აგზავნის შეფასებას
router.post(
  "/submit",
  protect,
  authorize("teacher"),
  upload.single("attachment"),
  submitEvaluation,
);

router.get("/my-evaluations", protect, getMyEvaluations);

// 2. ლექტორი ნახულობს კონკრეტული სტუდენტის პროგრესს ID-ით
router.get(
  "/progress/:student_id",
  protect,
  authorize("teacher"),
  getStudentProgress,
);

// 3. ⭐ აი ეს აკლდა! სტუდენტი ნახულობს თავის შეფასებებს
// მისამართი: GET http://localhost:5000/api/evaluations/my-evaluations

export default router;
