import { Router } from "express";
import {
  getMyCourses,
  createCourse,
  enrollInCourse,
  unenrollFromCourse,
  getAvailableCourses,
  getLecturerCourses,
  getAllCourses,
} from "../controllers/courseController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

// სტატიკური გზები (ჯერ ესენი!)
router.get("/my-courses", protect, getMyCourses);
router.get("/available", protect, authorize("student"), getAvailableCourses);
router.get(
  "/lecturer-courses",
  protect,
  authorize("teacher"),
  getLecturerCourses,
);
router.get("/all", protect, authorize("admin"), getAllCourses); // 👈 "/all" და არა "/"

// მოქმედებები
router.post("/enroll", protect, authorize("student"), enrollInCourse);
router.post("/create", protect, authorize("admin"), createCourse);

// დინამიური გზები (ბოლოში!)
router.delete(
  "/unenroll/:course_id",
  protect,
  authorize("student"),
  unenrollFromCourse,
);

export default router;
