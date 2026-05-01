import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
} from "../controllers/notificationController";

const router = Router();

router.get("/", protect, getNotifications);
router.post("/read-all", protect, markAllRead);
router.post("/:id/read", protect, markOneRead);
router.delete("/:id", protect, deleteNotification);

export default router;
