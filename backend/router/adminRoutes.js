
import express from "express";
import protect from "../middleware/authMiddleware.js";

import {
  getDashboard,

  // User management
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,

  // Generic resources
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,

  // Courses
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,

  // Payments
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentReport,

  // Settings
  getSettings,
  updateSettings,
} from "../controllers/admincontroller.js";

import {
  getResults,
  createResult,
  getResultById,
  updateResult,
  deleteResult,
} from "../controllers/adminResultController.js";
import {
  getTrainerAttendance,
  createTrainerAttendance,
  updateTrainerAttendance,
  deleteTrainerAttendance,

  getCounsellorAttendance,
  createCounsellorAttendance,
  updateCounsellorAttendance,
  deleteCounsellorAttendance,
} from "../controllers/adminEmployeeAttendanceController.js";

import {
  getBatchStats,
  getBatches,
  updateBatch,
  deleteBatch,
  assignTrainerToBatch,
  createBatch,
  getBatchById,
} from "../controllers/batchController.js";
import {
  getAllAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from "../controllers/admincontroller.js";


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

router.route("/courses")
  .get(getCourses)
  .post(createCourse);

router.route("/courses/:id")
  .get(getCourseById)
  .patch(updateCourse)
  .delete(deleteCourse);

// --------------------------------------------------
// 4. BATCHES
// --------------------------------------------------

// Keep stats before /:id.
router.get("/batches/stats", getBatchStats);

router.route("/batches")
  .get(getBatches)
  .post(createBatch);

router.get("/batches/:id", getBatchById);
router.patch("/batches/:id", updateBatch);
router.patch("/batches/:id/assign-trainer", assignTrainerToBatch);
router.delete("/batches/:id", deleteBatch);

// --------------------------------------------------
// 5. ATTENDANCE
// --------------------------------------------------

router.get("/attendance", getAllAttendance);
router.post("/attendance", createAttendance);
router.patch("/attendance/:attendanceId", updateAttendance);
router.delete("/attendance/:attendanceId", deleteAttendance);
// --------------------------------------------------

// --------------------------------------------------
// 7. ASSIGNMENTS
// --------------------------------------------------

router.route("/assignments")
  .get((req, res, next) => {
    req.params.resource = "assignments";
    return listResource(req, res, next);
  })
  .post((req, res, next) => {
    req.params.resource = "assignments";
    return createResource(req, res, next);
  });

router.route("/assignments/:id")
  .get((req, res, next) => {
    req.params.resource = "assignments";
    return getResource(req, res, next);
  })
  .patch((req, res, next) => {
    req.params.resource = "assignments";
    return updateResource(req, res, next);
  })
  .delete((req, res, next) => {
    req.params.resource = "assignments";
    return deleteResource(req, res, next);
  });

// --------------------------------------------------
// 8. LIVE CLASSES
// --------------------------------------------------

router.route("/live-classes")
  .get((req, res, next) => {
    req.params.resource = "liveClasses";
    return listResource(req, res, next);
  })
  .post((req, res, next) => {
    req.params.resource = "liveClasses";
    return createResource(req, res, next);
  });

router.route("/live-classes/:id")
  .get((req, res, next) => {
    req.params.resource = "liveClasses";
    return getResource(req, res, next);
  })
  .patch((req, res, next) => {
    req.params.resource = "liveClasses";
    return updateResource(req, res, next);
  })
  .delete((req, res, next) => {
    req.params.resource = "liveClasses";
    return deleteResource(req, res, next);
  });

// ==========================================
// 6. RESULTS MANAGEMENT
// ==========================================

// GET all results
// POST create result

router.route("/results")
  .get(getResults)
  .post(createResult);

// GET single result
// PATCH update result
// DELETE result

router.route("/results/:id")
  .get(getResultById)
  .patch(updateResult)
  .delete(deleteResult);

// --------------------------------------------------
// 9. ANNOUNCEMENTS
// --------------------------------------------------

router.route("/announcements")
  .get((req, res, next) => {
    req.params.resource = "announcements";
    return listResource(req, res, next);
  })
  .post((req, res, next) => {
    req.params.resource = "announcements";
    return createResource(req, res, next);
  });

router.route("/announcements/:id")
  .get((req, res, next) => {
    req.params.resource = "announcements";
    return getResource(req, res, next);
  })
  .patch((req, res, next) => {
    req.params.resource = "announcements";
    return updateResource(req, res, next);
  })
  .delete((req, res, next) => {
    req.params.resource = "announcements";
    return deleteResource(req, res, next);
  });

// --------------------------------------------------
// 10. DOUBTS / SUPPORT
// --------------------------------------------------

router.route("/doubts")
  .get((req, res, next) => {
    req.params.resource = "doubts";
    return listResource(req, res, next);
  })
  .post((req, res, next) => {
    req.params.resource = "doubts";
    return createResource(req, res, next);
  });

router.route("/doubts/:id")
  .get((req, res, next) => {
    req.params.resource = "doubts";
    return getResource(req, res, next);
  })
  .patch((req, res, next) => {
    req.params.resource = "doubts";
    return updateResource(req, res, next);
  })
  .delete((req, res, next) => {
    req.params.resource = "doubts";
    return deleteResource(req, res, next);
  });

// --------------------------------------------------
// 11. PAYMENTS
// Supports multiple instalments / partial payments.
// --------------------------------------------------

// Get all payments, including summary.
router.get("/payments", getPayments);

// Create a payment / instalment.
router.post("/payments", createPayment);

// Get one payment.

// Update a payment / instalment.
router.patch("/payments/:id", updatePayment);

// Delete a payment.
router.delete("/payments/:id", deletePayment);

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

// ==========================================
// STUDENT CLASS ATTENDANCE
// Keep your existing student attendance routes
// ==========================================

// GET    /api/admin/attendance
// POST   /api/admin/attendance
// PATCH  /api/admin/attendance/:attendanceId
// DELETE /api/admin/attendance/:attendanceId


// ==========================================
// TRAINER EMPLOYEE ATTENDANCE
// ==========================================

router.get(
  "/trainer-attendance",
  protect,
  getTrainerAttendance
);

router.post(
  "/trainer-attendance",
  protect,
  createTrainerAttendance
);

router.patch(
  "/trainer-attendance/:attendanceId",
  protect,
  updateTrainerAttendance
);

router.delete(
  "/trainer-attendance/:attendanceId",
  protect,
  deleteTrainerAttendance
);


// ==========================================
// COUNSELLOR EMPLOYEE ATTENDANCE
// ==========================================

router.get(
  "/counsellor-attendance",
  protect,
  getCounsellorAttendance
);

router.post(
  "/counsellor-attendance",
  protect,
  createCounsellorAttendance
);

router.patch(
  "/counsellor-attendance/:attendanceId",
  protect,
  updateCounsellorAttendance
);

router.delete(
  "/counsellor-attendance/:attendanceId",
  protect,
  deleteCounsellorAttendance
);

export default router;
