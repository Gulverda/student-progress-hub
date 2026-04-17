import { Router } from "express";
import {
  getSchedule,
  createSchedule,
  deleteSchedule,
} from "../controllers/scheduleController";

const router = Router();

// GET /api/schedule
router.get("/", getSchedule);

// POST /api/schedule
router.post("/", createSchedule);

// DELETE /api/schedule/:id
router.delete("/:id", deleteSchedule);

export default router;
