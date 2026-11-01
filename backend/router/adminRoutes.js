
import express from "express";

import protect from "../middleware/authMiddleware.js";

import {
  getDashboard,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  getPaymentReport,
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getSettings,
  updateSettings,
} from "../controllers/admincontroller.js";
import {
  getBatchStats,
  getBatches,
  updateBatch,
  deleteBatch,
  createBatch,
  getBatchById,   
} from "../controllers/batchController.js";

const router = express.Router();

// All admin routes require authentication.
router.use(protect);

// --------------------------------------------------
// 1. ADMIN DASHBOARD
// Base: /api/admin
// --------------------------------------------------

router.get("/dashboard", getDashboard);

// --------------------------------------------------
// 2. USER MANAGEMENT
// --------------------------------------------------

router.route("/users")
  .get(getAllUsers)
  .post(createUser);

router.get("/users/:userId", getUserById);

router.patch("/users/:userId", updateUser);

router.delete("/users/:userId", deactivateUser);

router.patch("/users/:userId/reactivate", reactivateUser);

// --------------------------------------------------
// 3. COURSES
// --------------------------------------------------

router.get("/courses", getCourses);
router.post("/courses", createCourse);
router.get("/courses/:id", getCourseById);
router.patch("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

// --------------------------------------------------
// 4. BATCHES
// --------------------------------------------------

// Statistics (keep before /:id)
router.get("/batches/stats", getBatchStats);

// Get all batches
router.get("/batches", getBatches);

// Create batch
router.post("/batches", createBatch);

// Get single batch
router.get("/batches/:id", getBatchById);

// Update batch
router.patch("/batches/:id", updateBatch);

// Deactivate batch
router.delete("/batches/:id", deleteBatch);
// --------------------------------------------------
// 5. ATTENDANCE
// --------------------------------------------------

router.get("/attendance", (req, res, next) => {
  req.params.resource = "attendance";
  return listResource(req, res, next);
});

router.post("/attendance", (req, res, next) => {
  req.params.resource = "attendance";
  return createResource(req, res, next);
});

router.get("/attendance/:id", (req, res, next) => {
  req.params.resource = "attendance";
  return getResource(req, res, next);
});

router.patch("/attendance/:id", (req, res, next) => {
  req.params.resource = "attendance";
  return updateResource(req, res, next);
});

router.delete("/attendance/:id", (req, res, next) => {
  req.params.resource = "attendance";
  return deleteResource(req, res, next);
});

// --------------------------------------------------
// 6. RESULTS
// --------------------------------------------------

router.get("/results", (req, res, next) => {
  req.params.resource = "results";
  return listResource(req, res, next);
});

router.post("/results", (req, res, next) => {
  req.params.resource = "results";
  return createResource(req, res, next);
});

router.get("/results/:id", (req, res, next) => {
  req.params.resource = "results";
  return getResource(req, res, next);
});

router.patch("/results/:id", (req, res, next) => {
  req.params.resource = "results";
  return updateResource(req, res, next);
});

router.delete("/results/:id", (req, res, next) => {
  req.params.resource = "results";
  return deleteResource(req, res, next);
});

// --------------------------------------------------
// 7. ASSIGNMENTS
// --------------------------------------------------

router.get("/assignments", (req, res, next) => {
  req.params.resource = "assignments";
  return listResource(req, res, next);
});

router.post("/assignments", (req, res, next) => {
  req.params.resource = "assignments";
  return createResource(req, res, next);
});

router.get("/assignments/:id", (req, res, next) => {
  req.params.resource = "assignments";
  return getResource(req, res, next);
});

router.patch("/assignments/:id", (req, res, next) => {
  req.params.resource = "assignments";
  return updateResource(req, res, next);
});

router.delete("/assignments/:id", (req, res, next) => {
  req.params.resource = "assignments";
  return deleteResource(req, res, next);
});

// --------------------------------------------------
// 8. LIVE CLASSES
// --------------------------------------------------

router.get("/live-classes", (req, res, next) => {
  req.params.resource = "liveClasses";
  return listResource(req, res, next);
});

router.post("/live-classes", (req, res, next) => {
  req.params.resource = "liveClasses";
  return createResource(req, res, next);
});

router.get("/live-classes/:id", (req, res, next) => {
  req.params.resource = "liveClasses";
  return getResource(req, res, next);
});

router.patch("/live-classes/:id", (req, res, next) => {
  req.params.resource = "liveClasses";
  return updateResource(req, res, next);
});

router.delete("/live-classes/:id", (req, res, next) => {
  req.params.resource = "liveClasses";
  return deleteResource(req, res, next);
});

// --------------------------------------------------
// 9. ANNOUNCEMENTS
// --------------------------------------------------

router.get("/announcements", (req, res, next) => {
  req.params.resource = "announcements";
  return listResource(req, res, next);
});

router.post("/announcements", (req, res, next) => {
  req.params.resource = "announcements";
  return createResource(req, res, next);
});

router.get("/announcements/:id", (req, res, next) => {
  req.params.resource = "announcements";
  return getResource(req, res, next);
});

router.patch("/announcements/:id", (req, res, next) => {
  req.params.resource = "announcements";
  return updateResource(req, res, next);
});

router.delete("/announcements/:id", (req, res, next) => {
  req.params.resource = "announcements";
  return deleteResource(req, res, next);
});

// --------------------------------------------------
// 10. DOUBTS / SUPPORT
// --------------------------------------------------

router.get("/doubts", (req, res, next) => {
  req.params.resource = "doubts";
  return listResource(req, res, next);
});

router.post("/doubts", (req, res, next) => {
  req.params.resource = "doubts";
  return createResource(req, res, next);
});

router.get("/doubts/:id", (req, res, next) => {
  req.params.resource = "doubts";
  return getResource(req, res, next);
});

router.patch("/doubts/:id", (req, res, next) => {
  req.params.resource = "doubts";
  return updateResource(req, res, next);
});

router.delete("/doubts/:id", (req, res, next) => {
  req.params.resource = "doubts";
  return deleteResource(req, res, next);
});

// --------------------------------------------------
// 11. PAYMENTS
// --------------------------------------------------

// router.route("/payments")
//   .get(getPayments)
//   .post(createPayment);

// router.route("/payments/:id")
//   .get(getPaymentById)
//   .patch(updatePayment)
//   .delete(deletePayment);
// --------------------------------------------------
// 12. PAYMENT REPORTS
// --------------------------------------------------

router.get("/reports/payments", getPaymentReport);

// --------------------------------------------------
// 13. SETTINGS
// --------------------------------------------------

router.route("/settings")
  .get(getSettings)
  .patch(updateSettings);

export default router;
