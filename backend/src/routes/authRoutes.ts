import { Router } from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  deleteUser,
  getTeachers,
} from "../controllers/authController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", protect, authorize("admin"), registerUser);
router.post("/login", loginUser);
router.get("/users", protect, authorize("admin"), getAllUsers);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);
router.get("/teachers", protect, authorize("admin"), getTeachers);

export default router;
