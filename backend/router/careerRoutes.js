
import express from "express";

import  protect from "../middleware/authMiddleware.js";

import careerUpload from "../middleware/careerUpload.js";

import {
  createCareerTask,
  getTrainerCareerTasks,
  updateCareerTask,
  deleteCareerTask,
  getStudentCareerTasks,
  submitCareerTask,
  getCareerSubmissions,
  reviewCareerSubmission,
  getStudentCareerOverview,

  createMockInterview,
  getTrainerMockInterviews,
  updateMockInterview,
  deleteMockInterview,
  getStudentMockInterviews,

  createPortfolioProject,
  getTrainerPortfolioProjects,
  updatePortfolioProject,
  deletePortfolioProject,
  reviewPortfolioProject,
  getStudentPortfolioProjects,
  submitPortfolioProject,

  getStudentResume,
  uploadStudentResume,
  getTrainerResumes,
  reviewStudentResume,
} from "../controllers/careerController.js";

const router = express.Router();

router.use(protect);

// ======================================================
// TRAINER + ADMIN ROUTES
// ======================================================

// Career tasks
router.post(
  "/trainer/career/tasks",
  protect,
  createCareerTask
);

router.get(
  "/trainer/career/tasks",
  protect,
  getTrainerCareerTasks
);

router.put(
  "/trainer/career/tasks/:id",
  protect,
  updateCareerTask
);

router.delete(
  "/trainer/career/tasks/:id",
  protect,
  deleteCareerTask
);

// Student submissions
router.get(
  "/trainer/career/submissions",
  protect,
  getCareerSubmissions
);

router.get(
  "/trainer/career/tasks/:taskId/submissions",
  protect,
  getCareerSubmissions
);

router.put(
  "/trainer/career/submissions/:submissionId/review",
  protect,
  reviewCareerSubmission
);

// Mock interviews
router.post(
  "/trainer/mock-interviews",
  protect,
  createMockInterview
);

router.get(
  "/trainer/mock-interviews",
  protect,
  getTrainerMockInterviews
);

router.put(
  "/trainer/mock-interviews/:id",
  protect,
  updateMockInterview
);

router.delete(
  "/trainer/mock-interviews/:id",
  protect,
  deleteMockInterview
);

// Portfolio projects
router.post(
  "/trainer/portfolio-projects",
  protect,
  createPortfolioProject
);

router.get(
  "/trainer/portfolio-projects",
  protect,
  getTrainerPortfolioProjects
);

router.put(
  "/trainer/portfolio-projects/:id",
  protect,
  updatePortfolioProject
);

router.delete(
  "/trainer/portfolio-projects/:id",
  protect,
  deletePortfolioProject
);

router.put(
  "/trainer/portfolio-projects/:id/review",
  protect,
  reviewPortfolioProject
);

// Resume review
router.get(
  "/trainer/resumes",
  protect,
  getTrainerResumes
);

router.put(
  "/trainer/resumes/:id/review",
  protect,
  reviewStudentResume
);

// ======================================================
// STUDENT ROUTES
// ======================================================

// Career overview
router.get(
  "/student/career",
  protect,
  getStudentCareerOverview
);

// Aptitude and coding
router.get(
  "/student/career/tasks",
  protect,
  getStudentCareerTasks
);

router.post(
  "/student/career/tasks/:id/submit",
  protect,
  submitCareerTask
);

// Mock interviews
router.get(
  "/student/mock-interviews",
  protect,
  getStudentMockInterviews
);

// Portfolio projects
router.get(
  "/student/portfolio-projects",
  protect,
  getStudentPortfolioProjects
);

router.post(
  "/student/portfolio-projects/:id/submit",
  protect,
  submitPortfolioProject
);

// Resume
router.get(
  "/student/resume",
  protect,
  getStudentResume
);

router.post(
  "/student/resume",
  protect,
  careerUpload.single("resume"),
  uploadStudentResume
);

export default router;
