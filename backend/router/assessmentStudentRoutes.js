import express from "express";

import {
  getStudentAssessments,
  startAssessment,
  saveAssessmentAnswer,
  submitAssessment,
  getStudentAssessmentResult,
  getAllStudentAssessmentResults
} from "../controllers/assessmentStudentController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getStudentAssessments);

router.post("/:id/start", startAssessment);

router.patch("/:id/save-answer", saveAssessmentAnswer);

router.post("/:id/submit", submitAssessment);

router.get("/:id/result", getStudentAssessmentResult);

// All assessment results
router.get("/results",protect,getAllStudentAssessmentResults);
export default router;