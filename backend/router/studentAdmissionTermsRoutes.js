
import express from "express";

import protect, {
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  getStudentAdmissionTerms,
  downloadStudentAdmissionTerms,
} from "../controllers/admissionTermsController.js";

const router = express.Router();

router.use(protect, authorizeRoles("Student"));

router.get("/", getStudentAdmissionTerms);

router.get("/download", downloadStudentAdmissionTerms);

export default router;
