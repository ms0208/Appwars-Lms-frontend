
import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./router/authRoutes.js";
import adminRoutes from "./router/adminRoutes.js";
import studentRoutes from "./router/studentRoutes.js";
import counsellorRoutes from "./router/counsellorRoutes.js";
import trainerRoutes from "./router/trainerRoutes.js";
import scheduleRoutes from "./router/scheduleRoutes.js";
import studentAssessmentRoutes from "./router/studentAssessmentRoutes.js";

const app = express();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: "10kb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "APPWARS LMS API is running",
  });
});

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication requests. Please try again later.",
  },
});

// Authentication routes
app.use("/api/auth", authLimiter, authRoutes);

// Admin user management routes
app.use("/api/admin", adminRoutes);

// Student routes
app.use("/api/student", studentRoutes);
app.use("/api/studentassignments", studentAssessmentRoutes);
// Trainer Routes 
app.use("/api/trainer", trainerRoutes)

// Counsellor Routes 
app.use("/api/counsellor", counsellorRoutes);
app.use("/api/counsellor/schedule", scheduleRoutes);
// Handle unknown API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in your .env file");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in your .env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(
        `APPWARS LMS backend running on port ${PORT}`
      );
      console.log(
        `Health check: http://localhost:${PORT}/api/health`
      );
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
