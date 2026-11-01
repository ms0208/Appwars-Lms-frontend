import express from "express";

import {
  getDashboard,
  getAdmissions,
  createAdmission,
  getAdmissionById,
  updateAdmission,
  getStudents,
  getBatches,
  getTrainers,
  getSchedule,
  getFees,
  recordPayment,
} from "../controllers/counsellorController.js";

import {
  getCounsellorSettings,
} from "../controllers/counsellorSettingsController.js";

import protect from "../middleware/authmiddleware.js";

const router = express.Router();

// Local async handler
const asyncHandler = (controller) => (req, res, next) =>
  Promise.resolve(controller(req, res, next)).catch(next);

// Protect all Counsellor routes
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getDashboard));

// Admissions
router.get("/admissions", asyncHandler(getAdmissions));
router.post("/admissions", asyncHandler(createAdmission));
router.get("/admissions/:id", asyncHandler(getAdmissionById));
router.patch("/admissions/:id", asyncHandler(updateAdmission));

// Students
router.get("/students", asyncHandler(getStudents));

// Batches and trainers
router.get("/batches", asyncHandler(getBatches));
router.get("/trainers", asyncHandler(getTrainers));

// Batch schedule
router.get("/schedule", asyncHandler(getSchedule));

// Fees and payments
router.get("/fees", asyncHandler(getFees));
router.post("/fees", asyncHandler(recordPayment));

// Counsellor Settings
router.get("/settings", asyncHandler(getCounsellorSettings));

export default router;