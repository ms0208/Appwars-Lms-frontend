
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import {
  generateUserId,
  generateTemporaryPassword,
} from "../utils/generateCredentials.js";

import {
  Course,
  Batch,
  Attendance,
  Result,
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
      "title", "code", "description", "duration", "fee", "status",
    ],
    searchFields: ["title", "code"],
    populate: [],
  },

  batches: {
    model: Batch,
    fields: [
      "name", "code", "course", "trainer", "students",
      "startDate", "endDate", "capacity", "status",
    ],
    searchFields: ["name", "code"],
    populate: ["course", "trainer", "students"],
  },

  attendance: {
    model: Attendance,
    fields: [
      "user", "role", "batch", "date", "status",
      "checkIn", "checkOut", "remarks",
    ],
    searchFields: [],
    populate: ["user", "batch", "recordedBy"],
  },

  results: {
    model: Result,
    fields: [
      "student", "batch", "title", "totalMarks",
      "marksObtained", "examDate", "remarks", "published",
    ],
    searchFields: ["title"],
    populate: ["student", "batch"],
  },

  assignments: {
    model: Assignment,
    fields: [
      "title", "description", "batch", "course", "trainer",
      "dueDate", "attachmentUrl", "status",
    ],
    searchFields: ["title", "description"],
    populate: ["batch", "course", "trainer"],
  },

  liveClasses: {
    model: LiveClass,
    fields: [
      "title", "batch", "trainer", "meetingUrl",
      "startTime", "endTime", "status",
    ],
    searchFields: ["title"],
    populate: ["batch", "trainer"],
  },

  announcements: {
    model: Announcement,
    fields: [
      "title", "message", "audience", "publishAt", "isPublished",
    ],
    searchFields: ["title", "message"],
    populate: [],
  },

  doubts: {
    model: Doubt,
    fields: [
      "title", "message", "student", "assignedTo",
      "batch", "status", "priority", "response",
    ],
    searchFields: ["title", "message"],
    populate: ["student", "assignedTo", "batch"],
  },

  payments: {
    model: Payment,
    fields: [
      "student", "batch", "amount", "currency", "dueDate",
      "paidAt", "method", "reference", "status", "notes",
    ],
    searchFields: ["reference", "notes"],
    populate: ["student", "batch", "recordedBy"],
  },
};

// Only allow known fields to be changed by each resource endpoint.
const pickFields = (body, allowedFields) =>
  Object.fromEntries(
    Object.entries(body || {}).filter(([key]) =>
      allowedFields.includes(key)
    )
  );

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validObjectId = (id) =>
  mongoose.isValidObjectId(id);

const sendNotFound = (res) =>
  res.status(404).json({
    success: false,
    message: "Record not found.",
  });

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
      User.countDocuments({ role: "Student", isActive: true }),
      User.countDocuments({ role: "Trainer", isActive: true }),
      Course.countDocuments({ status: "Active" }),

      Payment.aggregate([
        { $match: { status: "Pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      Batch.countDocuments({ status: "Running" }),
      Assignment.countDocuments({ status: "Published" }),

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

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      normalizedEmail.length > 254
    ) {
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
        message: "Role must be Student, Trainer, or Counsellor.",
      });
    }

    if (
      typeof batch !== "string" ||
      batch.trim().length > 100
    ) {
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

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const temporaryPassword = generateTemporaryPassword(16);
    const password = await bcrypt.hash(temporaryPassword, 12);

    let user = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        user = await User.create({
          userId: generateUserId(role),
          name: trimmedName,
          email: normalizedEmail,
          password,
          role,
          batch: role === "Student" ? batch.trim() : "",
          phone: typeof phone === "string" ? phone.trim() : "",
          isActive: true,
          mustChangePassword: true,
          createdBy: req.user._id,
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
            message: "Duplicate email or ID. Please try again.",
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

    res.status(201).json({
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
        status: "Active",
        isActive: true,
        mustChangePassword: true,
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
// 3. LIST USERS, SEARCH AND FILTER
// GET /api/admin/users?role=Student&search=manav
// --------------------------------------------------

export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, active, page = "1", limit = "50" } =
      req.query;

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

    const { name, email, role, batch, phone, isActive } = req.body;

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

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid name.",
        });
      }
      user.name = name.trim();
    }

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

    if (role !== undefined) user.role = role;

    if (batch !== undefined) {
      if (typeof batch !== "string" || batch.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch.",
        });
      }
      user.batch = user.role === "Student" ? batch.trim() : "";
    }

    if (user.role === "Student" && !user.batch.trim()) {
      return res.status(400).json({
        success: false,
        message: "Batch is required for students.",
      });
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.length > 25) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone.",
        });
      }
      user.phone = phone.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }
      user.isActive = isActive;
    }

    await user.save();

    res.json({
      success: true,
      message: "User updated successfully.",
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        phone: user.phone,
        isActive: user.isActive,
        status: user.isActive ? "Active" : "Inactive",
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

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully.",
      userId: user.userId,
    });
  } catch (error) {
    next(error);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      userId: req.params.userId.trim().toUpperCase(),
    });

    if (!user) return sendNotFound(res);

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: "User reactivated successfully.",
      userId: user.userId,
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// COURSE MANAGEMENT
// --------------------------------------------------

// GET /api/admin/courses
// Get all courses with search, status filter and pagination.

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
        { title: { $regex: pattern, $options: "i" } },
        { code: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
      ];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      Course.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      courses,
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
// Get one course.

export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findById(id).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};


// POST /api/admin/courses
// Create a new course.

export const createCourse = async (req, res, next) => {
  try {
    const {
      title,
      code,
      description = "",
      duration,
      fee,
      status = "Active",
    } = req.body || {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof code !== "string" ||
      !code.trim() ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message: "Course title, code and duration are required.",
      });
    }

    const normalizedTitle = title.trim();
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

    if (
      typeof duration !== "string" ||
      !duration.trim() ||
      duration.trim().length > 100
    ) {
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

    const courseFee = Number(fee);

    if (fee === undefined || fee === null || fee === "" ||
        !Number.isFinite(courseFee) || courseFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid course fee.",
      });
    }

    const allowedStatuses =
      Course.schema.path("status")?.enumValues?.length
        ? Course.schema.path("status").enumValues
        : ["Active", "Inactive"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course status.",
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
      title: normalizedTitle,
      code: normalizedCode,
      description: description.trim(),
      duration: duration.trim(),
      fee: courseFee,
      status,
      ...(Course.schema.path("createdBy")
        ? { createdBy: req.user._id }
        : {}),
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      course,
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
// Update an existing course.

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
      "code",
      "description",
      "duration",
      "fee",
      "status",
    ];

    const data = pickFields(req.body, allowedFields);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid course fields provided.",
      });
    }

    if (data.title !== undefined) {
      if (
        typeof data.title !== "string" ||
        data.title.trim().length < 2 ||
        data.title.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid course title.",
        });
      }

      data.title = data.title.trim();
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
      const allowedStatuses =
        Course.schema.path("status")?.enumValues?.length
          ? Course.schema.path("status").enumValues
          : ["Active", "Inactive"];

      if (!allowedStatuses.includes(data.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course status.",
        });
      }
    }

    Object.assign(course, data);

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      course,
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


// DELETE /api/admin/courses/:id
// Delete a course only when it is not being used.

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


// --------------------------------------------------
// 7. REUSABLE ADMIN CRUD
// Courses, batches, attendance, results, assignments,
// live classes, announcements, doubts and payments.
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

    const { search, status, page = "1", limit = "50" } = req.query;
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

    for (const path of config.populate) query = query.populate(path);

    const [items, total] = await Promise.all([
      query.lean(),
      config.model.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
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

    for (const path of config.populate) query = query.populate(path);

    const item = await query;

    if (!item) return sendNotFound(res);

    res.json({ success: true, item });
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

    const data = pickFields(req.body, config.fields);

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

      if (data.checkIn && data.checkOut && new Date(data.checkOut) < new Date(data.checkIn)) {
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

    if (req.params.resource === "payments" && data.status === "Paid" && !data.paidAt) {
      data.paidAt = new Date();
    }

    const item = await config.model.create(data);

    res.status(201).json({
      success: true,
      message: "Record created successfully.",
      item,
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

    const data = pickFields(req.body, config.fields);

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

    if (req.params.resource === "payments" && data.status === "Paid") {
      data.paidAt = data.paidAt || new Date();
    }

    const item = await config.model.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!item) return sendNotFound(res);

    res.json({
      success: true,
      message: "Record updated successfully.",
      item,
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
// 8. PAYMENT REPORT
// GET /api/admin/reports/payments
// --------------------------------------------------

export const getPaymentReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    // Validate and apply date filters.
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

    const [report, totals, paymentCount] = await Promise.all([
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            collectedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Paid"] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Pending"] },
                  "$amount",
                  0,
                ],
              },
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Refunded"] },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),

      Payment.countDocuments(filter),
    ]);

    const summary = totals[0] || {
      totalPayments: 0,
      totalAmount: 0,
      collectedAmount: 0,
      pendingAmount: 0,
      refundedAmount: 0,
    };

    return res.status(200).json({
      success: true,
      period: {
        from: from || null,
        to: to || null,
      },
      summary: {
        totalPayments: summary.totalPayments,
        totalAmount: summary.totalAmount,
        collectedAmount: summary.collectedAmount,
        pendingAmount: summary.pendingAmount,
        refundedAmount: summary.refundedAmount,
        paymentCount,
      },
      report,
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// 9. SETTINGS
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

    res.json({ success: true, settings });
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
