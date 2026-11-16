
import express from "express";

import  protect  from "../middleware/authMiddleware.js";

import {
  getStudentBatchProgress,
  updateStudentTopicProgress,
  getTrainerBatchProgress,
  addBatchSyllabusTopic,
  updateBatchSyllabusTopic,
  deleteBatchSyllabusTopic,
  getStudentTrainerBatchProgress
} from "../controllers/progressController.js";

const router = express.Router();

// ==========================================
// ROLE MIDDLEWARE
// ==========================================

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    next();
  };
};

// ==========================================
// STUDENT ROUTES
// ==========================================

// Fetch student self-assessment progress
router.get(
  "/student/:batchId",
  protect,
  authorizeRole("Student"),
  getStudentBatchProgress
);

// Update student knowledge percentage
router.put(
  "/student/:batchId/:topicId",
  protect,
  authorizeRole("Student"),
  updateStudentTopicProgress
);

// ==========================================
// TRAINER ROUTES
// ==========================================

// Fetch trainer syllabus progress
router.get(
  "/trainer/:batchId",
  protect,
  authorizeRole("Trainer"),
  getTrainerBatchProgress
);

// Add syllabus topic
router.post(
  "/trainer/:batchId/topics",
  protect,
  authorizeRole("Trainer"),
  addBatchSyllabusTopic
);

// Update syllabus topic completion
router.put(
  "/trainer/:batchId/topics/:topicId",
  protect,
  authorizeRole("Trainer"),
  updateBatchSyllabusTopic
);

// Delete syllabus topic
router.delete(
  "/trainer/:batchId/topics/:topicId",
  protect,
  authorizeRole("Trainer"),
  deleteBatchSyllabusTopic
);
router.get(
  "/student/:batchId/trainer",
  protect,
  authorizeRole("Student"),
  getStudentTrainerBatchProgress
);

export default router;

