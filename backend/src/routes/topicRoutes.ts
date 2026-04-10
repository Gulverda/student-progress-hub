import { Router } from "express";
import { getTopics, createTopic } from "../controllers/topicController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

// ახლა 'protect' დაემატა, რაც ნიშნავს რომ Valid Token-ის გარეშე აქ ვერავინ შევა
router.get("/", protect, getTopics);

// აქ კი მხოლოდ ლექტორს შეუძლია პოსტვა
router.post("/", protect, authorize("teacher"), createTopic);

export default router;
