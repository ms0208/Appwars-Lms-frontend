import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import protect from "../middleware/authMiddleware.js";
import {
  getProfile,
  updateProfile,
  getCourses,
  getResources,
  getLiveClasses,
  setLiveClassReminder,
  getDoubts,
  createDoubt,
  getNotifications,
  markNotificationRead,
  getRank,
  getProgress,
  getPayments,
  getCareer,
  getResume,
  uploadResume,
  getMockInterviews,
  mockInterviewAction,
  getJobs
} from "../controllers/studentController.js";

const router = Router();
router.use(protect);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../..", process.env.UPLOAD_DIR || "uploads/resumes");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeBase || "resume"}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const uploadResumeFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf" || path.extname(file.originalname).toLowerCase() !== ".pdf") {
      return cb(new Error("Only PDF resumes are allowed."));
    }
    cb(null, true);
  }
});

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

router.get("/courses", getCourses);
router.get("/resources", getResources);
router.get("/live-classes", getLiveClasses);
router.patch("/live-classes/:id/reminder", setLiveClassReminder);

router.get("/doubts", getDoubts);
router.post("/doubts", createDoubt);

router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

router.get("/progress", getProgress);
router.get("/rank", getRank);
router.get("/payments", getPayments);

router.get("/career", getCareer);
router.get("/resume", getResume);
router.post("/resume", uploadResumeFile.single("resume"), uploadResume);
router.get("/mock-interviews", getMockInterviews);
router.post("/mock-interviews/:id/action", mockInterviewAction);
router.get("/jobs", getJobs);

export default router;
