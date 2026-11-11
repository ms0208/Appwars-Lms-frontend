import express from "express";

import protect from "../middleware/authMiddleware.js";

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

  // Assignments
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment,

  // Submissions and grading
  getSubmissions,
  gradeSubmission,

  getStudentPerformance,
  getOpenDoubts,
  replyToDoubt,
} from "../controllers/trainercontroller.js";
import {
  getResults,
  createResult,
  getResultById,
  updateResult,
  deleteResult,
} from "../controllers/adminResultController.js";
import uploadAssignment from "../middleware/assignmentUpload.js";
const router = express.Router();

// All Trainer routes require authentication.
router.use(protect);

// ==========================================
// DASHBOARD
// ==========================================

router.get("/dashboard", getDashboard);

// ==========================================
// TRAINER PROFILE
// ==========================================

router.get("/profile", getTrainerProfile);
router.put("/profile", updateTrainerProfile);

// ==========================================
// ASSIGNED BATCHES
// ==========================================

router.get("/batches", getAssignedBatches);
router.get("/batches/:batchId", getBatchDetails);
router.get("/batches/:batchId/students", getBatchStudents);

// ==========================================
// ASSIGNMENTS
// Trainer creates, views, updates and deletes
// ==========================================

router.get("/assignments", getAssignments);
router.post(
  "/assignments",
  uploadAssignment.single("attachment"),
  createAssignment
);
router.patch("/assignments/:assignmentId", updateAssignment);
router.delete("/assignments/:assignmentId", deleteAssignment);

// ==========================================
// ANNOUNCEMENTS
// ==========================================

router.get("/announcements", getAnnouncements);
router.post("/announcements", createAnnouncement);

// ==========================================
// ATTENDANCE
// ==========================================

router.get("/attendance", getAttendance);
router.put("/attendance", saveAttendance);

// ==========================================
// ASSIGNMENT SUBMISSIONS & GRADING
// ==========================================

router.get("/submissions", getSubmissions);

router.patch(
  "/submissions/:submissionId/grade",
  gradeSubmission
);

// ==========================================
// STUDENT PERFORMANCE
// ==========================================

router.get("/performance", getStudentPerformance);

// ==========================================
// STUDENT DOUBTS
// ==========================================

router.get("/doubts", getOpenDoubts);

router.post("/doubts/:doubtId/replies", replyToDoubt);

// TRAINER STUDENT RESULTS
// ==========================================

// GET ALL RESULTS OF TRAINER'S ASSIGNED BATCHES
router.get("/results", getResults);

// CREATE RESULT
router.post("/results", createResult);

// GET SINGLE RESULT
router.get("/results/:id", getResultById);

// UPDATE RESULT
router.patch("/results/:id", updateResult);

// DELETE RESULT
router.delete("/results/:id", deleteResult);
export default router;