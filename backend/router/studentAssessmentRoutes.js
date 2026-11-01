import express from "express";

import {
  getAssignments,
  getAssignmentById,
  submitAssignment,
  getTests,
  getTestById,
  startTest,
  submitTest,
  getTestResults,
} from "../controllers/studentAssessmentController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require an authenticated student.
router.use(protect);

// Assignments
router.get("/assignments", getAssignments);
router.get("/assignments/:id", getAssignmentById);
router.post("/assignments/:id/submit", submitAssignment);

// Tests
router.get("/tests", getTests);
router.get("/tests/:id", getTestById);
router.post("/tests/:id/start", startTest);
router.post("/tests/:id/submit", submitTest);
router.get("/tests/:id/results", getTestResults);

export default router;