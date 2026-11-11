
import express from "express";

import { getMyAttendance } from "../controllers/studentAttendanceController.js";

import protect  from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// STUDENT ATTENDANCE ROUTES
// ==========================================

// GET /api/student/attendance
// Logged-in student can view their own attendance

router.get("/attendance", protect, getMyAttendance);

export default router;
