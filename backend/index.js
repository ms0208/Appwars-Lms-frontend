
import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./router/authRoutes.js";
import adminRoutes from "./router/adminRoutes.js";
import studentRoutes from "./router/studentRoutes.js";
import counsellorRoutes from "./router/counsellorRoutes.js";
import trainerRoutes from "./router/trainerRoutes.js";
import scheduleRoutes from "./router/scheduleRoutes.js";
import studentAssessmentRoutes from "./router/studentAssessmentRoutes.js";
import studentAttendanceRoutes from "./router/studentAttendanceRoutes.js";
import assessmentTrainerRoutes from "./router/assessmentTrainerRoutes.js";
import assessmentStudentRoutes from "./router/assessmentStudentRoutes.js";
import learningResourceRoutes from "./router/learningResourceRoutes.js";
import adminAdmissionTermsRoutes from "./router/adminAdmissionTermsRoutes.js";
import studentAdmissionTermsRoutes from "./router/studentAdmissionTermsRoutes.js";
import progressRoutes from "./router/progressRoutes.js";
import careerRoutes from "./router/careerRoutes.js";

// ES Module __dirname configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

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
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (videos, PDFs, assignments, etc.)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
      );
    },
  })
);

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

// Admin routes
app.use("/api/admin", adminRoutes);

// Student routes
app.use("/api/student", studentRoutes);
app.use("/api/studentassignments", studentAssessmentRoutes);
app.use("/api/student", studentAttendanceRoutes);

// Trainer routes
app.use("/api/trainer", trainerRoutes);

// Counsellor routes
app.use("/api/counsellor", counsellorRoutes);
app.use("/api/counsellor/schedule", scheduleRoutes);

// Progress routes
app.use("/api/progress", progressRoutes);

// Learning resources routes
app.use("/api/learning-resources", learningResourceRoutes);

// Assessment APIs
app.use(
  "/api/trainer/assessments",
  assessmentTrainerRoutes
);

app.use(
  "/api/student/assessments",
  assessmentStudentRoutes
);

// Admission terms routes
app.use(
  "/api/admin/admission-terms",
  adminAdmissionTermsRoutes
);

app.use(
  "/api/student/admission-terms",
  studentAdmissionTermsRoutes
);

// Career & Placement APIs
app.use("/api", careerRoutes);

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

      console.log(
        `Uploaded files: http://localhost:${PORT}/uploads/`
      );
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
