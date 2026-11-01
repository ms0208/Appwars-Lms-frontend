
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Batch from "../models/Batch.js";

import generateToken from "../utils/generateToken.js";
import { generateUserId } from "../utils/generateCredentials.js";

// ==========================================
// Helper: Get Student Batch Details
// ==========================================

const getStudentBatchDetails = async (user) => {
  if (user.role !== "Student" || !user.batch) {
    return null;
  }

  const batchDetails = await Batch.findOne({
    batch: user.batch,
  })
    .populate("trainer", "userId name email phone")
    .lean();

  if (!batchDetails) {
    return null;
  }

  return {
    _id: batchDetails._id,
    batch: batchDetails.batch,
    course: batchDetails.course,

    trainer: batchDetails.trainer
      ? {
          userId: batchDetails.trainer.userId,
          name: batchDetails.trainer.name,
          email: batchDetails.trainer.email,
          phone: batchDetails.trainer.phone || "",
        }
      : null,

    startDate: batchDetails.startDate,
    endDate: batchDetails.endDate,
    durationMonths: batchDetails.durationMonths,
    status: batchDetails.status,
    mode: batchDetails.mode,
    batchType: batchDetails.batchType,
    time: batchDetails.time,
    days: batchDetails.days,
    capacity: batchDetails.capacity,
    meetingLink: batchDetails.meetingLink,
    isActive: batchDetails.isActive,
  };
};

// ==========================================
// POST /api/auth/register-admin
// Creates the initial Admin account.
// ==========================================

export const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validate name
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 2–100 characters.",
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      normalizedEmail.length > 254 ||
      !emailRegex.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Validate password
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 12–128 characters.",
      });
    }

    // Check whether an Admin already exists
    const existingAdmin = await User.exists({
      role: "Admin",
    });

    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Admin registration is closed. Contact your administrator.",
      });
    }

    // Check duplicate email
    const emailExists = await User.exists({
      email: normalizedEmail,
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let admin = null;

    // Generate unique Admin ID
    for (let attempt = 0; attempt < 3; attempt++) {
      const userId = generateUserId("Admin");

      try {
        admin = await User.create({
          userId,
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          role: "Admin",
          batch: "",
          isActive: true,
          mustChangePassword: false,
        });

        break;
      } catch (error) {
        const isDuplicateId =
          error.code === 11000 &&
          (error.keyPattern?.userId ||
            error.keyValue?.userId);

        if (isDuplicateId && attempt < 2) {
          continue;
        }

        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message: "A duplicate ID or email was detected.",
          });
        }

        throw error;
      }
    }

    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Unable to generate an Admin ID. Try again.",
      });
    }

    const token = generateToken(admin);

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully.",
      token,
      user: {
        id: admin._id,
        userId: admin.userId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// POST /api/auth/login
// Authenticates users using generated ID.
// Includes Student batch details.
// ==========================================

export const login = async (req, res, next) => {
  try {
    const { userId, password } = req.body ?? {};

    if (
      typeof userId !== "string" ||
      typeof password !== "string" ||
      !userId.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "ID and password are required.",
      });
    }

    const normalizedUserId = userId.trim().toUpperCase();

    const user = await User.findOne({
      userId: normalizedUserId,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid ID or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid ID or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive. Contact your administrator.",
      });
    }

    const token = generateToken(user);

    // Fetch batch information for Students
    const batchDetails = await getStudentBatchDetails(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,

      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,

        batch: user.batch || "",
        batchDetails,

        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/auth/me
// Returns currently authenticated user.
// Includes Student batch details.
// ==========================================

export const getCurrentUser = async (req, res, next) => {
  try {
    const databaseUserId = req.user?.sub ?? req.user?.id;

    if (!databaseUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const currentUser = await User.findById(databaseUserId)
      .select("-password")
      .lean();

    if (!currentUser || !currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account is inactive.",
      });
    }

    const batchDetails = await getStudentBatchDetails(currentUser);

    return res.status(200).json({
      success: true,

      user: {
        id: currentUser._id,
        userId: currentUser.userId,
        name: currentUser.name,
        fullName: currentUser.name,
        email: currentUser.email,

        phone: currentUser.phone || "",
        designation: currentUser.designation || "",
        department: currentUser.department || "",
        timezone: currentUser.timezone || "Asia/Kolkata",
        language: currentUser.language || "English",
        photo: currentUser.photo || "",

        role: currentUser.role,

        batch: currentUser.batch || "",
        batchDetails,

        mustChangePassword: currentUser.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PATCH /api/auth/me
// Updates currently authenticated user.
// Returns updated Student batch details.
// ==========================================

export const updateCurrentUser = async (req, res, next) => {
  try {
    const databaseUserId = req.user?.sub ?? req.user?.id;

    if (!databaseUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      fullName,
      email,
      phone,
      designation,
      department,
      timezone,
      language,
    } = req.body ?? {};

    const currentUser = await User.findById(databaseUserId);

    if (!currentUser || !currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account is inactive.",
      });
    }

    // Update full name
    if (fullName !== undefined) {
      if (
        typeof fullName !== "string" ||
        !fullName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Full name is required.",
        });
      }

      if (
        fullName.trim().length < 2 ||
        fullName.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Name must contain 2–100 characters.",
        });
      }

      currentUser.name = fullName.trim();
    }

    // Update email
    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid email is required.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        normalizedEmail.length > 254 ||
        !emailRegex.test(normalizedEmail)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      const emailExists = await User.exists({
        email: normalizedEmail,
        _id: { $ne: currentUser._id },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "This email is already registered.",
        });
      }

      currentUser.email = normalizedEmail;
    }

    // Update optional profile fields
    const optionalFields = [
      "phone",
      "designation",
      "department",
      "timezone",
      "language",
    ];

    for (const field of optionalFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string.`,
          });
        }

        currentUser.set(field, req.body[field].trim());
      }
    }

    await currentUser.save();

    // Fetch updated user without password
    const updatedUser = await User.findById(currentUser._id)
      .select("-password")
      .lean();

    // Fetch updated batch information
    const batchDetails = await getStudentBatchDetails(updatedUser);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",

      user: {
        id: updatedUser._id,
        userId: updatedUser.userId,
        name: updatedUser.name,
        fullName: updatedUser.name,
        email: updatedUser.email,

        phone: updatedUser.phone || "",
        designation: updatedUser.designation || "",
        department: updatedUser.department || "",
        timezone: updatedUser.timezone || "Asia/Kolkata",
        language: updatedUser.language || "English",
        photo: updatedUser.photo || "",

        role: updatedUser.role,

        batch: updatedUser.batch || "",
        batchDetails,

        mustChangePassword: updatedUser.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};
