import { Router } from "express";
import {
  getSemesterStart,
  setSemesterStart,
  getWeekMaxScores,
  setWeekMaxScores,
} from "../controllers/settingsController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

router.get("/semester-start", protect, getSemesterStart);
router.post(
  "/semester-start",
  protect,
  authorize("admin", "teacher"),
  setSemesterStart,
);

router.get("/week-scores", protect, getWeekMaxScores);
router.post(
  "/week-scores",
  protect,
  authorize("admin", "teacher"),
  setWeekMaxScores,
);

export default router;
