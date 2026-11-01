import express from "express";
import {
  login,
  registerAdmin,
  getCurrentUser,
  updateCurrentUser,
} from "../controllers/authController.js";
import protect, {
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route
router.post("/register-admin", registerAdmin);

router.post("/login", login);

// Private route: any authenticated, active user
router.get("/me", protect, getCurrentUser);
router.patch("/me", protect, updateCurrentUser);

// Admin-only example
router.get(
  "/admin-only",
  protect,
  authorizeRoles("Admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome to the Admin area.",
      user: req.user,
    });
  }
);

export default router;