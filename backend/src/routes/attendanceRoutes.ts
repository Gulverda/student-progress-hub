import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  getCourseAttendance,
  saveAttendance,
  saveBatchAttendance,
} from "../controllers/attendanceController";

const router = Router();

router.get(
  "/course/:courseId",
  protect,
  authorize("teacher", "admin"),
  getCourseAttendance,
);

router.post("/save", protect, authorize("teacher", "admin"), saveAttendance);

router.post(
  "/save-batch",
  protect,
  authorize("teacher", "admin"),
  saveBatchAttendance,
);

export default router;
