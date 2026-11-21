import express from "express";

import {
  createAssessment,
  getTrainerAssessments,
  getTrainerAssessmentById,
  updateAssessment,
  publishAssessment,
  closeAssessment,
  deleteAssessment,
  getAssessmentResults,
  getStudentAssessmentResult,
} from "../controllers/assessmentTrainerController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createAssessment);

router.get("/", getTrainerAssessments);

router.get("/:id", getTrainerAssessmentById);

router.put("/:id", updateAssessment);

router.patch("/:id/publish", publishAssessment);

router.patch("/:id/close", closeAssessment);

router.delete("/:id", deleteAssessment);

router.get("/:id/results", getAssessmentResults);

router.get(
  "/:id/results/:studentId",
  getStudentAssessmentResult
);

export default router;