import express from "express";
import { protect as authenticate } from "../middleware/authMiddleware"; // adjust path as needed
import {
  getMyRooms,
  getRoomMessages,
  createOrGetRoom,
  sendMessage,
  getSuggestions,
  deleteRoom,
  getDirectChatUsers,
} from "../controllers/chatController";

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);
router.get("/direct-users", getDirectChatUsers);

// Rooms
router.get("/rooms", getMyRooms);
router.post("/rooms", createOrGetRoom);
router.delete("/rooms/:id", deleteRoom);

// Messages
router.get("/rooms/:id/messages", getRoomMessages);
router.post("/rooms/:id/messages", sendMessage);

// Smart suggestions (context-aware)
router.get("/suggestions", getSuggestions);

export default router;
