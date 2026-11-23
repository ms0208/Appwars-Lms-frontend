
import express from "express";

import protect, {
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import uploadAdmissionTerms from "../middleware/admissionTermsUpload.js";

import {
  getAdminAdmissionTerms,
  uploadAdmissionTerms as uploadTerms,
} from "../controllers/admissionTermsController.js";
import {
  downloadStudentAdmissionTerms,
} from "../controllers/admissionTermsController.js";


const router = express.Router();

router.use(protect, authorizeRoles("Admin"));

router.get("/", getAdminAdmissionTerms);

router.post(
  "/upload",
  uploadAdmissionTerms.single("pdf"),
  uploadTerms
);
router.get("/download", downloadStudentAdmissionTerms);
export default router;
