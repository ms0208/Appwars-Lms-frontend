
import User from "../models/user.js";
import Batch from "../models/Batch.js";
import generateToken from "../utils/generateToken.js";
import { generateUserId } from "../utils/generateCredentials.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// ==========================================
// STUDENT BATCH DETAILS
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

  if (!batchDetails) return null;

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
// REGISTER ADMIN
// POST /api/auth/register-admin
// ==========================================

export const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    // const existingAdmin = await User.findOne({
    //   role: "Admin",
    // });

    // if (existingAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Admin account already exists.",
    //   });
    // }

    const emailExists = await User.findOne({
      email: normalizedEmail,
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const admin = await User.create({
      userId: generateUserId("Admin"),
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: "Admin",
      isActive: true,
      mustChangePassword: false,
    });

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
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

export const login = async (req, res, next) => {
  try {
    const { userId, password } = req.body ?? {};

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: "User ID and password are required.",
      });
    }

    const user = await User.findOne({
      userId: String(userId).trim().toUpperCase(),
    }).select("+password");

    if (!user || String(password) !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid ID or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact administrator.",
      });
    }

    const token = generateToken(user);
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
// GET CURRENT USER
// GET /api/auth/me
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
// UPDATE CURRENT USER
// PATCH /api/auth/me
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

    const currentUser = await User.findById(databaseUserId);

    if (!currentUser || !currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive.",
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

    if (fullName !== undefined) {
      if (
        typeof fullName !== "string" ||
        fullName.trim().length < 2
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid name.",
        });
      }

      currentUser.name = fullName.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email.",
        });
      }

      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: currentUser._id },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered.",
        });
      }

      currentUser.email = normalizedEmail;
    }

    const optionalFields = [
      "phone",
      "designation",
      "department",
      "timezone",
      "language",
    ];

    for (const field of optionalFields) {
      if (req.body[field] !== undefined) {
        currentUser[field] = String(req.body[field]).trim();
      }
    }

    await currentUser.save();

    const updatedUser = await User.findById(currentUser._id)
      .select("-password")
      .lean();

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

// ==========================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================

export const forgotPassword = async (req, res, next) => {
  try {
    const userId = String(req.body?.userId || "")
      .trim()
      .toUpperCase();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const user = await User.findOne({
      userId,
      isActive: true,
    }).select("+resetOtpSentAt");

    const genericMessage =
      "If an active account exists, an OTP has been sent to its registered email.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "No registered email found for this account.",
      });
    }

    // 60-second resend cooldown
    if (
      user.resetOtpSentAt &&
      Date.now() - new Date(user.resetOtpSentAt).getTime() < 60000
    ) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP.",
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = new Date();

    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "APPWARS LMS - Password Reset OTP",
        text: `Hello ${user.name}, your password reset OTP is ${otp}. It expires in 5 minutes.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172554">
            <h2>APPWARS LMS</h2>
            <p>Hello ${String(user.name).replace(/[&<>"']/g, "")},</p>
            <p>Your password reset OTP is:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:18px;background:#eff6ff;text-align:center;border-radius:8px">
              ${otp}
            </div>
            <p>This OTP expires in 5 minutes.</p>
            <p>Do not share this OTP with anyone.</p>
            <p>APPWARS TECHNOLOGIES PVT. LTD.</p>
          </div>
        `,
      });
    } catch (emailError) {
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
      user.resetOtpSentAt = undefined;
      await user.save();
      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY RESET OTP
// POST /api/auth/verify-otp
// ==========================================

export const verifyResetOtp = async (req, res, next) => {
  try {
    const userId = String(req.body?.userId || "")
      .trim()
      .toUpperCase();

    const otp = String(req.body?.otp || "").trim();

    if (!userId || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter your User ID and 6-digit OTP.",
      });
    }

    const user = await User.findOne({
      userId,
      isActive: true,
    }).select("+resetOtp +resetOtpExpires +resetOtpAttempts");

    if (
      !user ||
      !user.resetOtp ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP is invalid or expired. Request a new OTP.",
      });
    }

    if ((user.resetOtpAttempts || 0) >= 5) {
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
      await user.save();

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    if (otp !== user.resetOtp) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ==========================================

export const resetPassword = async (req, res, next) => {
  try {
    const userId = String(req.body?.userId || "")
      .trim()
      .toUpperCase();

    const resetToken = String(req.body?.resetToken || "").trim();
    const newPassword = req.body?.newPassword;

    if (!userId || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "User ID, reset token, and new password are required.",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 8–128 characters.",
      });
    }

    const user = await User.findOne({
      userId,
      isActive: true,
    }).select("+resetToken +resetTokenExpires +password");

    if (
      !user ||
      !user.resetToken ||
      !user.resetTokenExpires ||
      user.resetTokenExpires.getTime() < Date.now() ||
      resetToken !== user.resetToken
    ) {
      return res.status(400).json({
        success: false,
        message: "Reset session is invalid or expired. Start again.",
      });
    }

    // Direct password storage. No bcrypt or hashing.
    user.password = newPassword;
    user.mustChangePassword = false;

    // Clear reset information
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = undefined;

    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};
