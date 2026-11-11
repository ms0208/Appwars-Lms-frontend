
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/user.js";

import {
  generateUserId,
  generateTemporaryPassword,
} from "../utils/generateCredentials.js";
import Attendance from "../models/Attendance.js";
import {
  Course,
  Batch,
  Assignment,
  LiveClass,
  Announcement,
  Doubt,
  Payment,
  Settings,
} from "../models/AdminModels.js";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const allowedRoles = ["Student", "Trainer", "Counsellor"];

const resourceConfig = {
  courses: {
    model: Course,
    fields: [
      "title",
      "courseName",
      "code",
      "description",
      "duration",
      "fee",
      "status",
      "trainer",
      "batchId",
      "thumbnail",
      "isPublished",
    ],
    searchFields: ["courseName", "code", "description"],
    populate: ["trainer", "batchId"],
  },

  batches: {
    model: Batch,
    fields: [
      "name",
      "code",
      "course",
      "trainer",
      "students",
      "startDate",
      "endDate",
      "capacity",
      "status",
    ],
    searchFields: ["name", "code"],
    populate: ["course", "trainer", "students"],
  },

  attendance: {
    model: Attendance,
    fields: [
      "user",
      "role",
      "batch",
      "date",
      "status",
      "checkIn",
      "checkOut",
      "remarks",
    ],
    searchFields: [],
    populate: ["user", "batch", "recordedBy"],
  },

  // results: {
  //   model: Result,
  //   fields: [
  //     "student",
  //     "batch",
  //     "title",
  //     "totalMarks",
  //     "marksObtained",
  //     "examDate",
  //     "remarks",
  //     "published",
  //   ],
  //   searchFields: ["title"],
  //   populate: ["student", "batch"],
  // },

  assignments: {
    model: Assignment,
    fields: [
      "title",
      "description",
      "batch",
      "course",
      "trainer",
      "dueDate",
      "attachmentUrl",
      "status",
    ],
    searchFields: ["title", "description"],
    populate: ["batch", "course", "trainer"],
  },

  liveClasses: {
    model: LiveClass,
    fields: [
      "title",
      "batch",
      "trainer",
      "meetingUrl",
      "startTime",
      "endTime",
      "status",
    ],
    searchFields: ["title"],
    populate: ["batch", "trainer"],
  },

  announcements: {
    model: Announcement,
    fields: [
      "title",
      "message",
      "audience",
      "publishAt",
      "isPublished",
    ],
    searchFields: ["title", "message"],
    populate: [],
  },

  doubts: {
    model: Doubt,
    fields: [
      "title",
      "message",
      "student",
      "assignedTo",
      "batch",
      "status",
      "priority",
      "response",
    ],
    searchFields: ["title", "message"],
    populate: ["student", "assignedTo", "batch"],
  },

  payments: {
    model: Payment,
    fields: [
      "student",
      "batch",
      "amount",
      "currency",
      "dueDate",
      "paidAt",
      "method",
      "reference",
      "status",
      "notes",
    ],
    searchFields: ["reference", "notes"],
    populate: ["student", "batch", "recordedBy"],
  },
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const pickFields = (body, allowedFields) =>
  Object.fromEntries(
    Object.entries(body || {}).filter(([key]) =>
      allowedFields.includes(key)
    )
  );

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validObjectId = (id) =>
  mongoose.isValidObjectId(id);

const sendNotFound = (res) =>
  res.status(404).json({
    success: false,
    message: "Record not found.",
  });

// Accept frontend title while storing courseName.
const normalizeCourseData = (data) => {
  if (data.title !== undefined && data.courseName === undefined) {
    data.courseName = data.title;
  }

  delete data.title;

  return data;
};

const validateTrainer = async (trainerId) => {
  if (trainerId === null || trainerId === "") {
    return { valid: true, trainer: null };
  }

  if (!validObjectId(trainerId)) {
    return {
      valid: false,
      message: "Invalid trainer ID.",
    };
  }

  const trainer = await User.findOne({
    _id: trainerId,
    role: "Trainer",
    isActive: true,
  });

  if (!trainer) {
    return {
      valid: false,
      message: "Selected trainer does not exist or is inactive.",
    };
  }

  return { valid: true, trainer };
};

// --------------------------------------------------
// BATCH MANAGEMENT
// --------------------------------------------------

// GET /api/admin/batches
export const getBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find()
      .populate("course", "courseName title code")
      .populate("trainer", "name userId email")
      .populate("students", "name userId email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    next(error);
  }
};



// --------------------------------------------------
// 1. ADMIN DASHBOARD
// GET /api/admin/dashboard
// --------------------------------------------------

export const getDashboard = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalTrainers,
      activeCourses,
      pendingPaymentResult,
      runningBatches,
      pendingAssignments,
      upcomingClasses,
      openDoubts,
      recentUsers,
      recentAnnouncements,
    ] = await Promise.all([
      User.countDocuments({
        role: "Student",
        isActive: true,
      }),

      User.countDocuments({
        role: "Trainer",
        isActive: true,
      }),

      Course.countDocuments({
        status: "Active",
      }),

      Payment.aggregate([
        { $match: { status: "Pending" } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      Batch.countDocuments({
        status: "Running",
      }),

      Assignment.countDocuments({
        status: "Published",
      }),

      LiveClass.countDocuments({
        status: "Scheduled",
        startTime: { $gte: new Date() },
      }),

      Doubt.countDocuments({
        status: { $in: ["Open", "In Progress"] },
      }),

      User.find()
        .select("userId name role createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Announcement.find({ isPublished: true })
        .sort({ publishAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.status(200).json({
      success: true,

      stats: {
        totalStudents,
        totalTrainers,
        activeCourses,
        pendingPayments: pendingPaymentResult[0]?.total || 0,
        runningBatches,
        pendingAssignments,
        upcomingClasses,
        openDoubts,
      },

      recentActivity: recentUsers.map((user) => ({
        type: "user_registered",
        text: `${user.role} registered: ${user.name}`,
        date: user.createdAt,
        userId: user.userId,
      })),

      recentAnnouncements,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// 2. CREATE STUDENT / TRAINER / COUNSELLOR
// POST /api/admin/users
// --------------------------------------------------



export const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      role,
      batch = "",
      phone = "",
    } = req.body ?? {};

    // Support different frontend field names
    const referredByRole =
      req.body.referredByRole ||
      req.body.referredBy?.role ||
      "Admin";

    const counsellorIdentifier =
      req.body.referredByCounsellorId ||
      req.body.counsellorId ||
      req.body.referrerId ||
      req.body.referrerUserId ||
      req.body.referredBy?.counsellor ||
      req.body.referredBy?.userId ||
      null;

    // BASIC VALIDATION
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof role !== "string" ||
      !name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and role are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 2–100 characters.",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role.",
      });
    }

    if (typeof batch !== "string" || batch.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch.",
      });
    }

    if (role === "Student" && !batch.trim()) {
      return res.status(400).json({
        success: false,
        message: "Batch is required for students.",
      });
    }

    if (
      phone &&
      (typeof phone !== "string" || phone.trim().length > 25)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
    }

    // CHECK DUPLICATE EMAIL
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ==========================================
    // REFERRAL MANAGEMENT
    // ==========================================

    let referral = {
      role: "Admin",
      counsellor: null,
    };

    let selectedCounsellor = null;

    if (role === "Student") {
      if (!["Admin", "Counsellor"].includes(referredByRole)) {
        return res.status(400).json({
          success: false,
          message: "Referral role must be Admin or Counsellor.",
        });
      }

      if (referredByRole === "Counsellor") {
        if (
          !counsellorIdentifier ||
          typeof counsellorIdentifier !== "string"
        ) {
          return res.status(400).json({
            success: false,
            message: "Counsellor ID is required.",
          });
        }

        const identifier = counsellorIdentifier.trim();

        // Accept MongoDB _id OR generated userId
        const conditions = [
          { userId: identifier.toUpperCase() },
        ];

        if (mongoose.isValidObjectId(identifier)) {
          conditions.push({ _id: identifier });
        }

        selectedCounsellor = await User.findOne({
          role: "Counsellor",
          isActive: true,
          $or: conditions,
        }).select("_id userId name email");

        if (!selectedCounsellor) {
          return res.status(404).json({
            success: false,
            message: `Active counsellor not found: ${identifier}`,
          });
        }

        // IMPORTANT:
        // Store MongoDB ObjectId, NOT generated userId
        referral = {
          role: "Counsellor",
          counsellor: selectedCounsellor._id,
        };
      }
    }

    // ==========================================
    // GENERATE CREDENTIALS
    // ==========================================

    const temporaryPassword = generateTemporaryPassword(16);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    let user = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        user = await User.create({
          userId: generateUserId(role),
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          role,

          batch: role === "Student" ? batch.trim() : "",

          phone: typeof phone === "string" ? phone.trim() : "",

          referredBy:
            role === "Student"
              ? referral
              : {
                role: "Admin",
                counsellor: null,
              },

          isActive: true,
          mustChangePassword: true,
          createdBy: req.user?._id || null,
        });

        break;
      } catch (error) {
        if (
          error.code === 11000 &&
          error.keyPattern?.userId &&
          attempt < 2
        ) {
          continue;
        }

        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message: "Duplicate email or ID.",
          });
        }

        throw error;
      }
    }

    if (!user) {
      return res.status(503).json({
        success: false,
        message: "Unable to generate a unique user ID.",
      });
    }

    // ==========================================
    // POPULATE REFERRAL
    // ==========================================

    await user.populate({
      path: "referredBy.counsellor",
      select: "name userId email role",
    });

    const populatedCounsellor = user.referredBy?.counsellor;

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,

      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        phone: user.phone,

        referredBy: {
          role: user.referredBy?.role || "Admin",
          counsellor: populatedCounsellor || null,
        },

        referredByName:
          populatedCounsellor?.name || "Admin",

        referrerId:
          populatedCounsellor?.userId || null,

        status: user.isActive ? "Active" : "Inactive",
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },

      credentials: {
        userId: user.userId,
        temporaryPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};



// --------------------------------------------------
// 3. LIST USERS
// GET /api/admin/users
// --------------------------------------------------


export const getAllUsers = async (req, res, next) => {
  try {
    const {
      role,
      search,
      active,
      page = "1",
      limit = "50",
    } = req.query;

    const filter = {};

    if (role && role !== "All") {
      if (![...allowedRoles, "Admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter.",
        });
      }

      filter.role = role;
    }

    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    if (typeof search === "string" && search.trim()) {
      const pattern = escapeRegex(search.trim().slice(0, 100));

      filter.$or = [
        { userId: { $regex: pattern, $options: "i" } },
        { name: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } },
      ];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .populate("referredBy.counsellor", "name userId email")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      User.countDocuments(filter),
    ]);

    res.json({
      success: true,

      users: users.map((user) => ({
        ...user,
        status: user.isActive ? "Active" : "Inactive",
      })),

      count: users.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// 4. GET USER BY GENERATED ID
// GET /api/admin/users/:userId
// --------------------------------------------------


export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({
      userId: req.params.userId.trim().toUpperCase(),
    })
      .select("-password")
      .populate("referredBy.counsellor", "name userId email")
      .lean();

    if (!user) return sendNotFound(res);

    res.json({
      success: true,
      user: {
        ...user,
        status: user.isActive ? "Active" : "Inactive",
      },
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// 5. UPDATE USER
// PATCH /api/admin/users/:userId
// --------------------------------------------------


export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      userId: req.params.userId.trim().toUpperCase(),
    });

    if (!user) return sendNotFound(res);

    const {
      name,
      email,
      role,
      batch,
      phone,
      isActive,
      counsellorId,
    } = req.body;

    if (role !== undefined && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "This endpoint cannot change a user's role to Admin.",
      });
    }

    if (user.role === "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified here.",
      });
    }

    // UPDATE NAME
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid name.",
        });
      }

      user.name = name.trim();
    }

    // UPDATE EMAIL
    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid email.",
        });
      }

      const normalized = email.trim().toLowerCase();

      const duplicate = await User.exists({
        email: normalized,
        _id: { $ne: user._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Email already belongs to another account.",
        });
      }

      user.email = normalized;
    }

    // UPDATE ROLE
    if (role !== undefined) {
      user.role = role;
    }

    // UPDATE BATCH
    if (batch !== undefined) {
      if (typeof batch !== "string" || batch.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch.",
        });
      }

      user.batch = user.role === "Student" ? batch.trim() : "";
    }

    // VALIDATE STUDENT BATCH
    if (user.role === "Student" && !user.batch.trim()) {
      return res.status(400).json({
        success: false,
        message: "Batch is required for students.",
      });
    }

    // UPDATE PHONE
    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.length > 25) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone.",
        });
      }

      user.phone = phone.trim();
    }

    // UPDATE ACTIVE STATUS
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }

      user.isActive = isActive;
    }

    // UPDATE COUNSELLOR REFERRAL

    // UPDATE COUNSELLOR REFERRAL
    if (counsellorId !== undefined) {
      if (user.role !== "Student") {
        return res.status(400).json({
          success: false,
          message: "Counsellor referral can only be assigned to students.",
        });
      }

      if (counsellorId === null || counsellorId === "") {
        user.referredBy = {
          role: "Admin",
          counsellor: null,
        };
      } else {
        const identifier = String(counsellorId).trim();

        const conditions = [
          { userId: identifier.toUpperCase() },
        ];

        if (mongoose.isValidObjectId(identifier)) {
          conditions.push({ _id: identifier });
        }

        const counsellor = await User.findOne({
          role: "Counsellor",
          isActive: true,
          $or: conditions,
        }).select("_id userId name email");

        if (!counsellor) {
          return res.status(404).json({
            success: false,
            message: "Active counsellor not found.",
          });
        }

        user.referredBy = {
          role: "Counsellor",
          counsellor: counsellor._id,
        };
      }
    }


    await user.save();

    // RETURN UPDATED USER WITH COUNSELLOR DETAILS
    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("referredBy.counsellor", "name userId email")
      .lean();

    res.json({
      success: true,
      message: "User updated successfully.",
      user: {
        ...updatedUser,
        status: updatedUser.isActive ? "Active" : "Inactive",
      },
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// 6. DEACTIVATE / REACTIVATE USER
// --------------------------------------------------


export const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      userId: req.params.userId.trim().toUpperCase(),
    });

    if (!user) return sendNotFound(res);

    if (user.role === "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be deactivated here.",
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: "User is already deactivated.",
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully.",
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        status: "Inactive",
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// REACTIVATE USER
// --------------------------------------------------

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      userId: req.params.userId.trim().toUpperCase(),
    });

    if (!user) return sendNotFound(res);

    if (user.role === "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be reactivated here.",
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: "User is already active.",
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: "User reactivated successfully.",
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        status: "Active",
      },
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// 7. COURSE MANAGEMENT
// --------------------------------------------------

// GET /api/admin/courses

export const getCourses = async (req, res, next) => {
  try {
    const {
      search,
      status,
      page = "1",
      limit = "50",
    } = req.query;

    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const pattern = escapeRegex(
        String(search).trim().slice(0, 100)
      );

      filter.$or = [
        { courseName: { $regex: pattern, $options: "i" } },
        { code: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
      ];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("trainer", "name userId email")
        .populate("batchId", "batch course")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      Course.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,

      courses: courses.map((course) => ({
        ...course,
        title: course.courseName,
      })),

      count: courses.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/courses/:id

export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findById(id)
      .populate("trainer", "name userId email")
      .populate("batchId", "batch course")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.status(200).json({
      success: true,
      course: {
        ...course,
        title: course.courseName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/courses

export const createCourse = async (req, res, next) => {
  try {
    const {
      title,
      courseName,
      code,
      description = "",
      duration,
      fee,
      status = "Active",
      trainer = null,
      thumbnail = "",
    } = req.body || {};

    const finalTitle = courseName ?? title;

    if (
      typeof finalTitle !== "string" ||
      !finalTitle.trim() ||
      typeof code !== "string" ||
      !code.trim() ||
      typeof duration !== "string" ||
      !duration.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Course title, code and duration are required.",
      });
    }

    const normalizedTitle = finalTitle.trim();
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedTitle.length < 2 || normalizedTitle.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Course title must contain 2–150 characters.",
      });
    }

    if (!/^[A-Z0-9_-]{2,30}$/.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course code.",
      });
    }

    if (duration.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid course duration.",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 3000 characters.",
      });
    }

    if (typeof thumbnail !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid thumbnail.",
      });
    }

    const courseFee = Number(fee);

    if (
      fee === undefined ||
      fee === null ||
      fee === "" ||
      !Number.isFinite(courseFee) ||
      courseFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid course fee.",
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course status.",
      });
    }

    const trainerCheck = await validateTrainer(trainer);

    if (!trainerCheck.valid) {
      return res.status(400).json({
        success: false,
        message: trainerCheck.message,
      });
    }

    const existingCourse = await Course.findOne({
      code: {
        $regex: `^${escapeRegex(normalizedCode)}$`,
        $options: "i",
      },
    });

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: "A course with this code already exists.",
      });
    }

    const course = await Course.create({
      courseName: normalizedTitle,
      code: normalizedCode,
      description: description.trim(),
      duration: duration.trim(),
      fee: courseFee,
      status,
      trainer: trainerCheck.trainer?._id || null,
      thumbnail: thumbnail.trim(),
      createdBy: req.user._id,
    });

    await course.populate("trainer", "name userId email");

    res.status(201).json({
      success: true,
      message: "Course created successfully.",

      course: {
        ...course.toObject(),
        title: course.courseName,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A course with this code already exists.",
      });
    }

    next(error);
  }
};

// PATCH /api/admin/courses/:id

export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const allowedFields = [
      "title",
      "courseName",
      "code",
      "description",
      "duration",
      "fee",
      "status",
      "trainer",
      "thumbnail",
      "isPublished",
    ];

    const data = normalizeCourseData(
      pickFields(req.body, allowedFields)
    );

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid course fields provided.",
      });
    }

    if (data.courseName !== undefined) {
      if (
        typeof data.courseName !== "string" ||
        data.courseName.trim().length < 2 ||
        data.courseName.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid course title.",
        });
      }

      data.courseName = data.courseName.trim();
    }

    if (data.code !== undefined) {
      if (typeof data.code !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid course code.",
        });
      }

      data.code = data.code.trim().toUpperCase();

      if (!/^[A-Z0-9_-]{2,30}$/.test(data.code)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course code.",
        });
      }

      const duplicate = await Course.findOne({
        code: {
          $regex: `^${escapeRegex(data.code)}$`,
          $options: "i",
        },
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another course already uses this code.",
        });
      }
    }

    if (data.description !== undefined) {
      if (
        typeof data.description !== "string" ||
        data.description.length > 3000
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid course description.",
        });
      }

      data.description = data.description.trim();
    }

    if (data.duration !== undefined) {
      if (
        typeof data.duration !== "string" ||
        !data.duration.trim() ||
        data.duration.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid course duration.",
        });
      }

      data.duration = data.duration.trim();
    }

    if (data.fee !== undefined) {
      data.fee = Number(data.fee);

      if (!Number.isFinite(data.fee) || data.fee < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid course fee.",
        });
      }
    }

    if (data.status !== undefined) {
      if (!["Active", "Inactive"].includes(data.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course status.",
        });
      }
    }

    if (data.trainer !== undefined) {
      const trainerCheck = await validateTrainer(data.trainer);

      if (!trainerCheck.valid) {
        return res.status(400).json({
          success: false,
          message: trainerCheck.message,
        });
      }

      data.trainer = trainerCheck.trainer?._id || null;
    }

    if (data.thumbnail !== undefined) {
      if (typeof data.thumbnail !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid thumbnail.",
        });
      }

      data.thumbnail = data.thumbnail.trim();
    }

    if (
      data.isPublished !== undefined &&
      typeof data.isPublished !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isPublished must be true or false.",
      });
    }

    Object.assign(course, data);

    await course.save();

    await course.populate("trainer", "name userId email");

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",

      course: {
        ...course.toObject(),
        title: course.courseName,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another course already uses this code.",
      });
    }

    next(error);
  }
};

// DELETE /api/admin/courses/:id

export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const [assignedBatch, assignedAssignment] = await Promise.all([
      Batch.exists({ course: course._id }),
      Assignment.exists({ course: course._id }),
    ]);

    if (assignedBatch || assignedAssignment) {
      return res.status(409).json({
        success: false,
        message:
          "This course is assigned to a batch or assignment and cannot be deleted.",
      });
    }

    await Course.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
      id: course._id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ALL ATTENDANCE
// GET /api/admin/attendance
// ==========================================

export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({})
      .populate("student", "userId name email")
      .populate("batch", "batch course")
      .populate("trainer", "userId name email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "All attendance fetched successfully.",
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    console.error("Admin getAllAttendance:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch attendance.",
      error: error.message,
    });
  }
};
// ==========================================
// CREATE ATTENDANCE
// POST /api/admin/attendance
// ==========================================

export const createAttendance = async (req, res) => {
  try {
    const {
      batchId,
      studentId,
      trainerId,
      date,
      status,
      remarks,
    } = req.body;

    if (!batchId || !studentId || !trainerId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Batch, student, trainer, date and status are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(batchId) ||
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(trainerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch, student or trainer ID.",
      });
    }

    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Present or Absent.",
      });
    }

    const attendanceDate = parseAttendanceDate(date);

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD format.",
      });
    }

    const [batch, student, trainer] = await Promise.all([
      Batch.findById(batchId),
      User.findOne({ _id: studentId, role: "Student" }),
      User.findOne({ _id: trainerId, role: "Trainer" }),
    ]);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found.",
      });
    }

    const attendance = await Attendance.create({
      batch: batchId,
      student: studentId,
      trainer: trainerId,
      date: attendanceDate,
      status,
      remarks: remarks ? String(remarks).trim() : "",
    });

    await attendance.populate([
      { path: "student", select: "userId name email" },
      { path: "batch", select: "batch course" },
      { path: "trainer", select: "userId name email" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Attendance created successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error("Admin createAttendance:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this student, batch and date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create attendance.",
      error: error.message,
    });
  }
};
// ==========================================
// UPDATE ATTENDANCE
// PATCH /api/admin/attendance/:attendanceId
// ==========================================

export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, date, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID.",
      });
    }

    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    if (
      status !== undefined &&
      !["Present", "Absent"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Status must be Present or Absent.",
      });
    }

    if (date !== undefined) {
      const updatedDate = parseAttendanceDate(date);

      if (!updatedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date. Use YYYY-MM-DD format.",
        });
      }

      const end = new Date(updatedDate);
      end.setDate(end.getDate() + 1);

      const duplicate = await Attendance.findOne({
        _id: { $ne: attendanceId },
        batch: attendance.batch,
        student: attendance.student,
        date: {
          $gte: updatedDate,
          $lt: end,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Attendance already exists for this date.",
        });
      }

      attendance.date = updatedDate;
    }

    if (status !== undefined) {
      attendance.status = status;
    }

    if (remarks !== undefined) {
      attendance.remarks = String(remarks).trim();
    }

    await attendance.save();

    await attendance.populate([
      { path: "student", select: "userId name email" },
      { path: "batch", select: "batch course" },
      { path: "trainer", select: "userId name email" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error("Admin updateAttendance:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update attendance.",
      error: error.message,
    });
  }
};
// ==========================================
// DELETE ATTENDANCE
// DELETE /api/admin/attendance/:attendanceId
// ==========================================

export const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID.",
      });
    }

    const attendance = await Attendance.findByIdAndDelete(attendanceId);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance deleted successfully.",
    });
  } catch (error) {
    console.error("Admin deleteAttendance:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete attendance.",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// 8. REUSABLE ADMIN CRUD
// --------------------------------------------------

export const listResource = async (req, res, next) => {
  try {
    const config = resourceConfig[req.params.resource];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Unknown resource.",
      });
    }

    const {
      search,
      status,
      page = "1",
      limit = "50",
    } = req.query;

    const filter = {};

    if (status && config.model.schema.path("status")) {
      filter.status = status;
    }

    if (search && config.searchFields.length) {
      const pattern = escapeRegex(String(search).slice(0, 100));

      filter.$or = config.searchFields.map((field) => ({
        [field]: { $regex: pattern, $options: "i" },
      }));
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));

    let query = config.model
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    for (const path of config.populate) {
      query = query.populate(path);
    }

    const [items, total] = await Promise.all([
      query.lean(),
      config.model.countDocuments(filter),
    ]);

    const formattedItems =
      req.params.resource === "courses"
        ? items.map((item) => ({
          ...item,
          title: item.courseName,
        }))
        : items;

    res.json({
      success: true,
      items: formattedItems,
      count: items.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    next(error);
  }
};

export const getResource = async (req, res, next) => {
  try {
    const config = resourceConfig[req.params.resource];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Unknown resource.",
      });
    }

    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid record ID.",
      });
    }

    let query = config.model.findById(req.params.id);

    for (const path of config.populate) {
      query = query.populate(path);
    }

    const item = await query.lean();

    if (!item) return sendNotFound(res);

    const formattedItem =
      req.params.resource === "courses"
        ? { ...item, title: item.courseName }
        : item;

    res.json({
      success: true,
      item: formattedItem,
    });
  } catch (error) {
    next(error);
  }
};

export const createResource = async (req, res, next) => {
  try {
    const config = resourceConfig[req.params.resource];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Unknown resource.",
      });
    }

    let data = pickFields(req.body, config.fields);

    if (req.params.resource === "courses") {
      data = normalizeCourseData(data);

      if (
        data.trainer !== undefined &&
        data.trainer !== null &&
        data.trainer !== ""
      ) {
        const trainerCheck = await validateTrainer(data.trainer);

        if (!trainerCheck.valid) {
          return res.status(400).json({
            success: false,
            message: trainerCheck.message,
          });
        }

        data.trainer = trainerCheck.trainer._id;
      } else if (data.trainer === "") {
        data.trainer = null;
      }
    }

    if ("createdBy" in config.model.schema.paths) {
      data.createdBy = req.user._id;
    }

    if ("recordedBy" in config.model.schema.paths) {
      data.recordedBy = req.user._id;
    }

    if (req.params.resource === "attendance") {
      const person = await User.findById(data.user);

      if (!person || !["Student", "Trainer"].includes(person.role)) {
        return res.status(400).json({
          success: false,
          message: "Attendance must belong to a student or trainer.",
        });
      }

      data.role = person.role;

      if (person.role === "Student" && !data.batch) {
        return res.status(400).json({
          success: false,
          message: "Batch is required for student attendance.",
        });
      }

      if (
        data.checkIn &&
        data.checkOut &&
        new Date(data.checkOut) < new Date(data.checkIn)
      ) {
        return res.status(400).json({
          success: false,
          message: "Check-out cannot be before check-in.",
        });
      }
    }

    if (req.params.resource === "results") {
      if (Number(data.marksObtained) > Number(data.totalMarks)) {
        return res.status(400).json({
          success: false,
          message: "Marks obtained cannot exceed total marks.",
        });
      }
    }

    if (
      req.params.resource === "payments" &&
      data.status === "Paid" &&
      !data.paidAt
    ) {
      data.paidAt = new Date();
    }

    const item = await config.model.create(data);

    if (req.params.resource === "courses") {
      await item.populate("trainer", "name userId email");
    }

    res.status(201).json({
      success: true,
      message: "Record created successfully.",
      item:
        req.params.resource === "courses"
          ? { ...item.toObject(), title: item.courseName }
          : item,
    });
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req, res, next) => {
  try {
    const config = resourceConfig[req.params.resource];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Unknown resource.",
      });
    }

    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid record ID.",
      });
    }

    let data = pickFields(req.body, config.fields);

    if (req.params.resource === "courses") {
      data = normalizeCourseData(data);

      if (data.trainer !== undefined) {
        const trainerCheck = await validateTrainer(data.trainer);

        if (!trainerCheck.valid) {
          return res.status(400).json({
            success: false,
            message: trainerCheck.message,
          });
        }

        data.trainer = trainerCheck.trainer?._id || null;
      }
    }

    if (
      req.params.resource === "results" &&
      data.marksObtained !== undefined
    ) {
      const existing = await config.model.findById(req.params.id);

      if (!existing) return sendNotFound(res);

      const total = data.totalMarks ?? existing.totalMarks;

      if (Number(data.marksObtained) > Number(total)) {
        return res.status(400).json({
          success: false,
          message: "Marks obtained cannot exceed total marks.",
        });
      }
    }

    if (
      req.params.resource === "payments" &&
      data.status === "Paid"
    ) {
      data.paidAt = data.paidAt || new Date();
    }

    const item = await config.model.findByIdAndUpdate(
      req.params.id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) return sendNotFound(res);

    if (req.params.resource === "courses") {
      await item.populate("trainer", "name userId email");
    }

    res.json({
      success: true,
      message: "Record updated successfully.",
      item:
        req.params.resource === "courses"
          ? { ...item.toObject(), title: item.courseName }
          : item,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const config = resourceConfig[req.params.resource];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Unknown resource.",
      });
    }

    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid record ID.",
      });
    }

    const item = await config.model.findByIdAndDelete(req.params.id);

    if (!item) return sendNotFound(res);

    res.json({
      success: true,
      message: "Record deleted successfully.",
      id: item._id,
    });
  } catch (error) {
    next(error);
  }
};
// --------------------------------------------------
// PAYMENT MANAGEMENT
// --------------------------------------------------
// PAYMENT MANAGEMENT
// --------------------------------------------------

// ======================================================
// PAYMENT HELPERS
// ======================================================

const paymentPopulate = [
  {
    path: "student",
    select: "userId name email phone batch",
  },
  {
    path: "batch",
    select: "batch name code course trainer",
    populate: {
      path: "trainer",
      select: "userId name email phone",
    },
  },
  {
    path: "recordedBy",
    select: "userId name email",
  },
];

const allowedPaymentStatuses = [
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

const allowedPaymentMethods = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Cash",
];

const parsePaymentDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? false : date;
};

// Search students, payment references and notes.
const getPaymentSearchFilter = async (searchValue) => {
  if (!searchValue) return null;

  const pattern = escapeRegex(
    String(searchValue).trim().slice(0, 100)
  );

  const searchRegex = new RegExp(pattern, "i");

  const matchingStudents = await User.find({
    role: "Student",
    $or: [
      { name: searchRegex },
      { email: searchRegex },
      { userId: searchRegex },
    ],
  })
    .select("_id")
    .lean();

  const searchConditions = [
    { reference: searchRegex },
    { notes: searchRegex },
  ];

  if (matchingStudents.length > 0) {
    searchConditions.push({
      student: {
        $in: matchingStudents.map(
          (student) => student._id
        ),
      },
    });
  }

  return {
    $or: searchConditions,
  };
};

// Validate a student and optionally check the selected batch.
const validatePaymentStudentBatch = async (
  studentId,
  batchId
) => {
  if (!studentId || !validObjectId(studentId)) {
    return {
      error: {
        status: 400,
        message: "A valid student ID is required.",
      },
    };
  }

  const student = await User.findOne({
    _id: studentId,
    role: "Student",
  });

  if (!student) {
    return {
      error: {
        status: 404,
        message: "Student not found.",
      },
    };
  }

  let batch = null;

  if (batchId) {
    if (!validObjectId(batchId)) {
      return {
        error: {
          status: 400,
          message: "Invalid batch ID.",
        },
      };
    }

    batch = await Batch.findById(batchId);

    if (!batch) {
      return {
        error: {
          status: 404,
          message: "Batch not found.",
        },
      };
    }

    // User model stores the batch name as a string.
    if (
      student.batch &&
      String(student.batch).trim() !==
      String(batch.batch).trim()
    ) {
      return {
        error: {
          status: 400,
          message:
            "The selected batch does not belong to this student.",
        },
      };
    }
  }

  return {
    student,
    batch,
  };
};

// ======================================================
// 1. GET PAYMENTS
// GET /api/admin/payments
// ======================================================

export const getPayments = async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit || "50", 10) || 50
      )
    );

    const conditions = [];

    // ------------------------------------------
    // STATUS FILTER
    // ------------------------------------------

    const status = req.query.status;

    if (status && status !== "All") {
      if (!allowedPaymentStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      conditions.push({
        status,
      });
    }

    // ------------------------------------------
    // PAYMENT METHOD FILTER
    // ------------------------------------------

    const method =
      req.query.method || req.query.paymentMethod;

    if (method && method !== "All") {
      if (!allowedPaymentMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method.",
        });
      }

      conditions.push({
        method,
      });
    }

    // ------------------------------------------
    // STUDENT FILTER
    // ------------------------------------------

    const studentId =
      req.query.studentId || req.query.student;

    if (studentId) {
      if (!validObjectId(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      conditions.push({
        student: new mongoose.Types.ObjectId(studentId),
      });
    }

    // ------------------------------------------
    // DATE FILTER
    // Filters payment creation date
    // ------------------------------------------

    if (req.query.from || req.query.to) {
      const createdAt = {};

      if (req.query.from) {
        const from = parsePaymentDate(req.query.from);

        if (from === false || !from) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date.",
          });
        }

        from.setHours(0, 0, 0, 0);
        createdAt.$gte = from;
      }

      if (req.query.to) {
        const to = parsePaymentDate(req.query.to);

        if (to === false || !to) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date.",
          });
        }

        to.setHours(23, 59, 59, 999);
        createdAt.$lte = to;
      }

      if (
        createdAt.$gte &&
        createdAt.$lte &&
        createdAt.$gte > createdAt.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date.",
        });
      }

      conditions.push({
        createdAt,
      });
    }

    // ------------------------------------------
    // SEARCH FILTER
    // ------------------------------------------

    const searchValue = String(
      req.query.search || req.query.q || ""
    ).trim();

    if (searchValue) {
      const searchFilter =
        await getPaymentSearchFilter(searchValue);

      if (searchFilter) {
        conditions.push(searchFilter);
      }
    }

    const filter = conditions.length
      ? { $and: conditions }
      : {};

    // ------------------------------------------
    // FETCH PAYMENTS + SUMMARY
    // ------------------------------------------

    const [
      payments,
      total,
      groupedTotals,
    ] = await Promise.all([
      Payment.find(filter)
        .populate(paymentPopulate)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Payment.countDocuments(filter),

      Payment.aggregate([
        {
          $match: filter,
        },
        {
          $group: {
            _id: "$status",

            amount: {
              $sum: {
                $ifNull: ["$amount", 0],
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    // ------------------------------------------
    // BUILD SUMMARY
    // ------------------------------------------

    const byStatus = new Map(
      groupedTotals.map((item) => [
        item._id,
        item,
      ])
    );

    const summary = {
      totalPayments: groupedTotals.reduce(
        (sum, item) =>
          sum + Number(item.count || 0),
        0
      ),

      paidTotal: Number(
        byStatus.get("Paid")?.amount || 0
      ),

      pendingTotal: Number(
        byStatus.get("Pending")?.amount || 0
      ),

      failedTotal: Number(
        byStatus.get("Failed")?.amount || 0
      ),

      refundedTotal: Number(
        byStatus.get("Refunded")?.amount || 0
      ),

      currency: "INR",
    };

    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Payment records fetched successfully.",

      summary,
      payments,

      count: total,
      total,
      page,
      pages,

      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 2. GET SINGLE PAYMENT
// GET /api/admin/payments/:id
// ======================================================

export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findById(id)
      .populate(paymentPopulate)
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment record fetched successfully.",
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 3. CREATE / RECORD PAYMENT
// POST /api/admin/payments
// ======================================================

export const createPayment = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Support both frontend payload formats.
    const studentId =
      body.student || body.studentId;

    const batchId =
      body.batch || body.batchId;

    const amount = Number(body.amount);

    const currency = body.currency || "INR";

    const method =
      body.method ||
      body.paymentMethod ||
      "UPI";

    const status = body.status || "Pending";

    const reference =
      body.reference ||
      body.transactionId ||
      body.providerReference ||
      "";

    const {
      dueDate,
      paidAt,
      notes = "",
    } = body;

    // ------------------------------------------
    // VALIDATE STUDENT AND BATCH
    // ------------------------------------------

    const validation =
      await validatePaymentStudentBatch(
        studentId,
        batchId
      );

    if (validation.error) {
      return res.status(validation.error.status).json({
        success: false,
        message: validation.error.message,
      });
    }

    const { student, batch } = validation;

    // ------------------------------------------
    // VALIDATE AMOUNT
    // ------------------------------------------

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount must be greater than zero.",
      });
    }

    // ------------------------------------------
    // VALIDATE STATUS
    // ------------------------------------------

    if (!allowedPaymentStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    // ------------------------------------------
    // VALIDATE PAYMENT METHOD
    // ------------------------------------------

    if (!allowedPaymentMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    // ------------------------------------------
    // VALIDATE CURRENCY
    // ------------------------------------------

    if (currency !== "INR") {
      return res.status(400).json({
        success: false,
        message:
          "Only INR currency is currently supported.",
      });
    }

    // ------------------------------------------
    // VALIDATE REFERENCE AND NOTES
    // ------------------------------------------

    if (
      typeof reference !== "string" ||
      reference.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment reference.",
      });
    }

    if (
      typeof notes !== "string" ||
      notes.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment notes.",
      });
    }

    // ------------------------------------------
    // VALIDATE DATES
    // ------------------------------------------

    const parsedDueDate = parsePaymentDate(dueDate);
    const parsedPaidAt = parsePaymentDate(paidAt);

    if (parsedDueDate === false) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date.",
      });
    }

    if (parsedPaidAt === false) {
      return res.status(400).json({
        success: false,
        message: "Invalid paid date.",
      });
    }

    // ------------------------------------------
    // CREATE PAYMENT
    // ------------------------------------------

    const payment = await Payment.create({
      student: student._id,
      batch: batch ? batch._id : null,

      amount,
      currency,

      dueDate: parsedDueDate,

      paidAt:
        status === "Paid"
          ? parsedPaidAt || new Date()
          : null,

      method,

      reference: reference.trim(),

      status,

      notes: notes.trim(),

      recordedBy: req.user?._id,
    });

    // ------------------------------------------
    // FETCH POPULATED PAYMENT
    // ------------------------------------------

    const populatedPayment = await Payment.findById(
      payment._id
    )
      .populate(paymentPopulate)
      .lean();

    return res.status(201).json({
      success: true,
      message: "Payment record created successfully.",
      payment: populatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 4. UPDATE PAYMENT
// PATCH /api/admin/payments/:id
// ======================================================


export const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // ------------------------------------------
    // VALIDATE PAYMENT ID
    // ------------------------------------------

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    const updates = {};

    // ------------------------------------------
    // UPDATE STUDENT
    // ------------------------------------------

    const studentId = body.student ?? body.studentId;

    if (studentId !== undefined) {
      if (!validObjectId(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      const student = await User.findOne({
        _id: studentId,
        role: "Student",
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      updates.student = student._id;

      const existingBatchId =
        body.batch !== undefined
          ? body.batch
          : payment.batch;

      if (existingBatchId) {
        const batch = await Batch.findById(existingBatchId);

        if (!batch) {
          return res.status(404).json({
            success: false,
            message: "Batch not found.",
          });
        }

        if (
          student.batch &&
          String(student.batch).trim() !==
          String(batch.batch).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "The selected batch does not belong to this student.",
          });
        }
      }
    }

    // ------------------------------------------
    // UPDATE BATCH
    // ------------------------------------------

    const batchId =
      body.batch !== undefined
        ? body.batch
        : body.batchId;

    if (batchId !== undefined) {
      if (batchId === "" || batchId === null) {
        updates.batch = null;
      } else {
        if (!validObjectId(batchId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid batch ID.",
          });
        }

        const batch = await Batch.findById(batchId);

        if (!batch) {
          return res.status(404).json({
            success: false,
            message: "Batch not found.",
          });
        }

        const finalStudentId =
          updates.student || payment.student;

        const student = await User.findOne({
          _id: finalStudentId,
          role: "Student",
        });

        if (
          student?.batch &&
          String(student.batch).trim() !==
          String(batch.batch).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "The selected batch does not belong to this student.",
          });
        }

        updates.batch = batch._id;
      }
    }

    // ------------------------------------------
    // UPDATE TOTAL FEES
    // UPDATE COLLECTED FEES
    // AUTO CALCULATE PENDING FEES
    // ------------------------------------------

    if (
      body.totalFees !== undefined ||
      body.collectedFees !== undefined
    ) {
      const totalFees =
        body.totalFees !== undefined
          ? Number(body.totalFees)
          : Number(payment.totalFees ?? payment.amount ?? 0);

      const collectedFees =
        body.collectedFees !== undefined
          ? Number(body.collectedFees)
          : Number(payment.collectedFees ?? 0);

      if (
        !Number.isFinite(totalFees) ||
        totalFees < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Total fees must be a valid non-negative amount.",
        });
      }

      if (
        !Number.isFinite(collectedFees) ||
        collectedFees < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Collected fees must be a valid non-negative amount.",
        });
      }

      if (collectedFees > totalFees) {
        return res.status(400).json({
          success: false,
          message:
            "Collected fees cannot exceed total fees.",
        });
      }

      const pendingFees = totalFees - collectedFees;

      updates.totalFees = totalFees;
      updates.collectedFees = collectedFees;
      updates.pendingFees = pendingFees;
    }

    // ------------------------------------------
    // UPDATE INDIVIDUAL PAYMENT AMOUNT
    // ------------------------------------------

    if (body.amount !== undefined) {
      const amount = Number(body.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than zero.",
        });
      }

      updates.amount = amount;
    }

    // ------------------------------------------
    // UPDATE DUE DATE
    // ------------------------------------------

    if (body.dueDate !== undefined) {
      const dueDate = parsePaymentDate(body.dueDate);

      if (dueDate === false) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date.",
        });
      }

      updates.dueDate = dueDate;
    }

    // ------------------------------------------
    // UPDATE STATUS
    // ------------------------------------------

    if (body.status !== undefined) {
      if (
        !allowedPaymentStatuses.includes(body.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      updates.status = body.status;
    }

    // ------------------------------------------
    // UPDATE PAID DATE
    // ------------------------------------------

    if (body.paidAt !== undefined) {
      const paidAt = parsePaymentDate(body.paidAt);

      if (paidAt === false) {
        return res.status(400).json({
          success: false,
          message: "Invalid paid date.",
        });
      }

      updates.paidAt = paidAt;
    }

    const finalStatus =
      updates.status || payment.status;

    if (finalStatus === "Paid") {
      if (
        updates.paidAt === undefined &&
        !payment.paidAt
      ) {
        updates.paidAt = new Date();
      }
    } else if (
      updates.status &&
      updates.status !== "Paid"
    ) {
      updates.paidAt = null;
    }

    // ------------------------------------------
    // UPDATE PAYMENT METHOD
    // ------------------------------------------

    const method =
      body.method !== undefined
        ? body.method
        : body.paymentMethod;

    if (method !== undefined) {
      if (!allowedPaymentMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method.",
        });
      }

      updates.method = method;
    }

    // ------------------------------------------
    // UPDATE CURRENCY
    // ------------------------------------------

    if (body.currency !== undefined) {
      if (body.currency !== "INR") {
        return res.status(400).json({
          success: false,
          message:
            "Only INR currency is currently supported.",
        });
      }

      updates.currency = body.currency;
    }

    // ------------------------------------------
    // UPDATE REFERENCE
    // ------------------------------------------

    const reference =
      body.reference ??
      body.transactionId ??
      body.providerReference;

    if (reference !== undefined) {
      if (
        typeof reference !== "string" ||
        reference.length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment reference.",
        });
      }

      updates.reference = reference.trim();
    }

    // ------------------------------------------
    // UPDATE NOTES
    // ------------------------------------------

    if (body.notes !== undefined) {
      if (
        typeof body.notes !== "string" ||
        body.notes.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment notes.",
        });
      }

      updates.notes = body.notes.trim();
    }

    // ------------------------------------------
    // CHECK EMPTY UPDATE
    // ------------------------------------------

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields were provided for update.",
      });
    }

    // ------------------------------------------
    // SAVE PAYMENT
    // ------------------------------------------

    Object.assign(payment, updates);

    await payment.save();

    // ------------------------------------------
    // FETCH UPDATED PAYMENT
    // ------------------------------------------

    const updatedPayment = await Payment.findById(
      payment._id
    )
      .populate(paymentPopulate)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Payment record updated successfully.",
      payment: updatedPayment,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// 5. DELETE PAYMENT
// DELETE /api/admin/payments/:id
// ======================================================

export const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findByIdAndDelete(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment record deleted successfully.",
      paymentId: id,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// 9. PAYMENT REPORT
// GET /api/admin/reports/payments
// --------------------------------------------------


export const getPaymentReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    // --------------------------------------------------
    // DATE FILTER VALIDATION
    // --------------------------------------------------

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        if (
          typeof from !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(from)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date. Use YYYY-MM-DD.",
          });
        }

        const fromDate = new Date(`${from}T00:00:00.000Z`);

        if (
          Number.isNaN(fromDate.getTime()) ||
          fromDate.toISOString().slice(0, 10) !== from
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date.",
          });
        }

        filter.createdAt.$gte = fromDate;
      }

      if (to) {
        if (
          typeof to !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(to)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date. Use YYYY-MM-DD.",
          });
        }

        const toDate = new Date(`${to}T00:00:00.000Z`);

        if (
          Number.isNaN(toDate.getTime()) ||
          toDate.toISOString().slice(0, 10) !== to
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date.",
          });
        }

        toDate.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }

      if (
        from &&
        to &&
        new Date(`${from}T00:00:00.000Z`) >
        new Date(`${to}T23:59:59.999Z`)
      ) {
        return res.status(400).json({
          success: false,
          message: "'from' date cannot be after 'to' date.",
        });
      }
    }

    // --------------------------------------------------
    // COMMON FEE CALCULATION
    // Supports both new and old payment records.
    // --------------------------------------------------

    const feeCalculation = [
      {
        $addFields: {
          reportTotalFees: {
            $ifNull: ["$totalFees", { $ifNull: ["$amount", 0] }],
          },

          reportCollectedFees: {
            $ifNull: [
              "$collectedFees",
              {
                $cond: [
                  { $eq: ["$status", "Paid"] },
                  { $ifNull: ["$amount", 0] },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          reportPendingFees: {
            $ifNull: [
              "$pendingFees",
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      "$reportTotalFees",
                      "$reportCollectedFees",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ];

    // --------------------------------------------------
    // REPORT GROUPED BY STATUS
    // --------------------------------------------------

    const reportPipeline = [
      { $match: filter },
      ...feeCalculation,
      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },

          totalFees: {
            $sum: "$reportTotalFees",
          },

          collectedFees: {
            $sum: "$reportCollectedFees",
          },

          pendingFees: {
            $sum: "$reportPendingFees",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ];

    // --------------------------------------------------
    // OVERALL PAYMENT SUMMARY
    // --------------------------------------------------

    const summaryPipeline = [
      { $match: filter },
      ...feeCalculation,
      {
        $group: {
          _id: null,

          totalPayments: {
            $sum: 1,
          },

          totalFees: {
            $sum: "$reportTotalFees",
          },

          collectedFees: {
            $sum: "$reportCollectedFees",
          },

          pendingFees: {
            $sum: "$reportPendingFees",
          },

          paidCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Paid"] }, 1, 0],
            },
          },

          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },

          failedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Failed"] }, 1, 0],
            },
          },

          refundedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Refunded"] }, 1, 0],
            },
          },

          failedTotal: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Failed"] },
                "$reportTotalFees",
                0,
              ],
            },
          },

          refundedTotal: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Refunded"] },
                "$reportTotalFees",
                0,
              ],
            },
          },
        },
      },
    ];

    // --------------------------------------------------
    // EXECUTE AGGREGATIONS
    // --------------------------------------------------

    const [report, totals, paymentCount] = await Promise.all([
      Payment.aggregate(reportPipeline),
      Payment.aggregate(summaryPipeline),
      Payment.countDocuments(filter),
    ]);

    const summary = totals[0] || {
      totalPayments: 0,
      totalFees: 0,
      collectedFees: 0,
      pendingFees: 0,
      paidCount: 0,
      pendingCount: 0,
      failedCount: 0,
      refundedCount: 0,
      failedTotal: 0,
      refundedTotal: 0,
    };

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Payment report fetched successfully.",

      period: {
        from: from || null,
        to: to || null,
      },

      summary: {
        totalPayments: summary.totalPayments,

        totalFees: summary.totalFees,

        collectedFees: summary.collectedFees,

        pendingFees: summary.pendingFees,

        // Backward-compatible aliases:
        totalAmount: summary.totalFees,
        collectedAmount: summary.collectedFees,
        pendingAmount: summary.pendingFees,

        // Status-wise record counts:
        paidCount: summary.paidCount,
        pendingCount: summary.pendingCount,
        failedCount: summary.failedCount,
        refundedCount: summary.refundedCount,

        // Backward-compatible status totals:
        paidTotal: summary.collectedFees,
        pendingTotal: summary.pendingFees,
        failedTotal: summary.failedTotal,
        refundedTotal: summary.refundedTotal,

        currency: "INR",
        paymentCount,
      },

      report,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// 10. SETTINGS
// GET /api/admin/settings
// PATCH /api/admin/settings
// --------------------------------------------------

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        updatedBy: req.user._id,
      });
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const allowedFields = [
      "companyName",
      "platformName",
      "companyEmail",
      "adminEmail",
      "supportEmail",
      "theme",
      "trainerCheckIn",
      "trainerCheckOut",
    ];

    const data = pickFields(req.body, allowedFields);
    data.updatedBy = req.user._id;

    const settings = await Settings.findOneAndUpdate(
      {},
      data,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Settings updated successfully.",
      settings,
    });
  } catch (error) {
    next(error);
  }
};
