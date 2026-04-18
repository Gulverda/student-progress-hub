import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  getTaskTemplates,
  createTaskTemplate,
  deleteTaskTemplate,
} from "../controllers/taskTemplateController";

const router = Router();

router.get("/", protect, getTaskTemplates);
router.post("/", protect, authorize("teacher", "admin"), createTaskTemplate);
router.delete(
  "/:id",
  protect,
  authorize("teacher", "admin"),
  deleteTaskTemplate,
);

export default router;
