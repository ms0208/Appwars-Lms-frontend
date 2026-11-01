import express from "express";

import {
  getSchedule,
  getSingleSchedule,
  createSchedule,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
} from "../controllers/scheduleController.js";

import  protect  from "../middleware/authMiddleware.js";


const router = express.Router();

// Only Admin and Counsellor can manage schedules
router.use(protect);

router.get("/", getSchedule);
router.get("/:id", getSingleSchedule);
router.post("/", createSchedule);
router.patch("/:id", updateSchedule);
router.patch("/:id/status", updateScheduleStatus);
router.delete("/:id", deleteSchedule);

export default router;