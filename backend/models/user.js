
import mongoose from "mongoose";

// ==========================================
// ADMISSION DETAILS SCHEMA
// ==========================================
const admissionDetailsSchema = new mongoose.Schema(
  {
    course: {
      type: String,
      trim: true,
      default: "",
    },

    totalFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    registrationFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    installment0: {
      type: Number,
      min: 0,
      default: 0,
    },

    installment1: {
      type: Number,
      min: 0,
      default: 0,
    },

    installment2: {
      type: Number,
      min: 0,
      default: 0,
    },

    installment3: {
      type: Number,
      min: 0,
      default: 0,
    },

    bajajFinance: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },

    paymentMode: {
      type: String,
      default: "UPI",
      trim: true,
    },

    feeStatus: {
      type: String,
      enum: ["Pending", "Clear"],
      default: "Pending",
    },

    trainer: {
      type: String,
      trim: true,
      default: "",
    },

    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Online",
    },

    batchType: {
      type: String,
      default: "Mon-Th",
      trim: true,
    },

    batchStartDate: {
      type: Date,
      default: null,
    },

    time: {
      type: String,
      trim: true,
      default: "",
    },

    batchEndDate: {
      type: Date,
      default: null,
    },

    videoAccess: {
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// ==========================================
// TRAINER DETAILS SCHEMA
// ==========================================
const trainerDetailsSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      trim: true,
      default: "",
    },

    expertise: {
      type: String,
      trim: true,
      default: "",
    },

    courses: {
      type: [String],
      default: [],
    },

    joiningDate: {
      type: Date,
      default: null,
    },

    availability: {
      type: String,
      enum: ["Available", "Busy", "Unavailable"],
      default: "Available",
    },

    experience: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

// ==========================================
// MAIN USER SCHEMA
// ==========================================
const userSchema = new mongoose.Schema(
  {
    // User ID
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Full name
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // Email
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    // Password
    password: {
      type: String,
      required: true,
      select: false,
    },

    // User role
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Student", "Trainer", "Counsellor"],
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Assigned batch name (mainly for students)
    batch: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    // ======================================
    // PROFILE SETTINGS
    // ======================================

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    designation: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    timezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
    },

    language: {
      type: String,
      trim: true,
      default: "English",
    },

    photo: {
      type: String,
      trim: true,
      default: "",
    },

    // Counsellor admission information
    admissionDetails: {
      type: admissionDetailsSchema,
      default: () => ({}),
    },

    // Trainer profile information
    trainerDetails: {
      type: trainerDetailsSchema,
      default: () => ({}),
    },

    // Require password change on first login
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    // User who created this account
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// USER MODEL
// ==========================================
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;
