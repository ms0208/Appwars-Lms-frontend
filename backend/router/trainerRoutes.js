import express from "express";

import protect  from "../middleware/authMiddleware.js";

import {
  getDashboard,
  getTrainerProfile,
  updateTrainerProfile,
  getAssignedBatches,
  getBatchStudents,
  getBatchDetails,
  createAnnouncement,
  getAnnouncements,
  saveAttendance,
  getAttendance,
  getSubmissions,
  gradeSubmission,
  getStudentPerformance,
  getOpenDoubts,
  replyToDoubt,
} from "../controllers/trainercontroller.js";

const router = express.Router();

// Every endpoint requires authentication and the Trainer role.
router.use(protect);

// Dashboard and batch management
router.get("/dashboard", getDashboard);
router.get("/profile", getTrainerProfile);
router.put("/profile", updateTrainerProfile);
router.get("/batches", getAssignedBatches);
router.get("/batches/:batchId", getBatchDetails);
router.get("/batches/:batchId/students", getBatchStudents);

// Announcements
router.get("/announcements", getAnnouncements);
router.post("/announcements", createAnnouncement);

// Attendance
router.get("/attendance", getAttendance);
router.put("/attendance", saveAttendance);

// Assignment submissions and grading
router.get("/submissions", getSubmissions);
router.patch("/submissions/:submissionId/grade", gradeSubmission);

// Student performance
router.get("/performance", getStudentPerformance);

// Student doubts
router.get("/doubts", getOpenDoubts);
router.post("/doubts/:doubtId/replies", replyToDoubt);

export default router;