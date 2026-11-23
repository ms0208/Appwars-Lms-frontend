
import express from "express";

import {
  login,
  registerAdmin,
  getCurrentUser,
  updateCurrentUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/authController.js";

import protect, {
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Admin registration
router.post("/register-admin", registerAdmin);

// Login
router.post("/login", login);

// Forgot password - send OTP to registered email
router.post("/forgot-password", forgotPassword);

// Verify email OTP
router.post("/verify-otp", verifyResetOtp);

// Reset password
router.post("/reset-password", resetPassword);

// ==========================================
// PRIVATE ROUTES
// ==========================================

// Get logged-in user
router.get("/me", protect, getCurrentUser);

// Update logged-in user
router.patch("/me", protect, updateCurrentUser);

// Admin-only test route
router.get(
  "/admin-only",
  protect,
  authorizeRoles("Admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin",
      user: req.user,
    });
  }
);

export default router;
