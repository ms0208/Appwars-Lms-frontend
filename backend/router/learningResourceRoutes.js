
import express from "express";

import protect from "../middleware/authMiddleware.js";

import {
  createResource,
  getBatchResources,
  updateResource,
  deleteResource,
  saveVideoProgress,
  getMyBatchProgress,
  getBatchStudentProgress,
} from "../controllers/learningResourceController.js";
import {
  uploadLearningResource,
} from "../middleware/learningResourceUpload.js";

const router = express.Router();

// All routes require login
router.use(protect);

// Create resource
router.post(
  "/",
  protect,
  uploadLearningResource,
  createResource
);

router.put(
  "/:id",
  protect,
  uploadLearningResource,
  updateResource
);
// Get resources of a batch
router.get("/batch/:batchId", getBatchResources);

// Student's own batch progress
router.get("/my-progress", getMyBatchProgress);

// Batch progress for Admin / Trainer
router.get("/batch/:batchId/progress", getBatchStudentProgress);

// Edit resource
router.put("/:id", updateResource);

// Delete resource
router.delete("/:id", deleteResource);

// Save watch progress
router.post("/:id/progress", saveVideoProgress);

export default router;
