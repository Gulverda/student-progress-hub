import { Router } from "express";
import {
  createAssignment,
  getAssignmentsByTopic,
  getAdaptiveAssignment,
} from "../controllers/assignmentController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.post("/", protect, createAssignment);
router.get("/topic/:topic_id", protect, getAssignmentsByTopic);

// აი ეს არის ჩვენი მთავარი როუტი სტუდენტისთვის:
router.get("/adaptive/:topic_id", protect, getAdaptiveAssignment);

export default router;
