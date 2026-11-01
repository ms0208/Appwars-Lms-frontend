import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Batch from "../models/Batch.js";
import Course from "../models/Course.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeSearch = (value) => new RegExp(escapeRegex(value), "i");

const getMonthRange = () => {
  const now = new Date();

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
};

const getAdmissionDetails = (details = {}) => {
  const allowed = [
    "course",
    "totalFee",
    "registrationFee",
    "installment0",
    "installment1",
    "installment2",
    "installment3",
    "bajajFinance",
    "paymentMode",
    "feeStatus",
    "trainer",
    "mode",
    "batchType",
    "batchStartDate",
    "time",
    "batchEndDate",
    "videoAccess",
    "notes",
  ];

  const result = {};

  for (const field of allowed) {
    if (details[field] !== undefined) {
      result[field] = details[field];
    }
  }

  return result;
};

const normalizeBatch = (batch) =>
  typeof batch === "string" ? batch.trim() : "";

const getPaymentTotals = (payments) => {
  const paid = payments
    .filter((payment) => payment.status === "Paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const pending = payments
    .filter((payment) => payment.status === "Pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 1000), 1000);

  return { paid, pending };
};

// ======================================================
// 1. COUNSELLOR DASHBOARD
// GET /api/counsellor/dashboard
// ======================================================

export const getDashboard = async (req, res) => {
  const { start, end } = getMonthRange();

  const [
    monthlyAdmissions,
    totalStudents,
    activeStudents,
    activeBatches,
    activeTrainers,
    monthlyPayments,
    allPayments,
    recentStudents,
  ] = await Promise.all([
    User.countDocuments({
      role: "Student",
      createdAt: { $gte: start, $lt: end },
    }),

    User.countDocuments({ role: "Student" }),

    User.countDocuments({
      role: "Student",
      isActive: true,
    }),

    Batch.countDocuments({
      isActive: true,
      status: { $in: ["Running", "Upcoming"] },
    }),

    User.countDocuments({
      role: "Trainer",
      isActive: true,
    }),

    Payment.find({
      createdAt: { $gte: start, $lt: end },
      status: "Paid",
    })
      .select("amount")
      .lean(),

    Payment.find()
      .select("student amount status")
      .lean(),

    User.find({ role: "Student" })
      .select("userId name email batch createdAt isActive admissionDetails")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const totalCourseFees = monthlyPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const registrationFees = monthlyPayments.reduce(
    (sum, payment) => sum,
    0
  );

  const pendingPayments = allPayments.filter(
    (payment) => payment.status === "Pending"
  );

  const pendingStudentIds = new Set(
    pendingPayments.map((payment) => String(payment.student))
  );

  const { paid: paidTotal, pending: pendingTotal } =
    getPaymentTotals(allPayments);

  const recentStudentIds = recentStudents.map((student) => student._id);

  const recentPayments = await Payment.find({
    student: { $in: recentStudentIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const admissions = recentStudents.map((student) => {
    const studentPayments = recentPayments.filter(
      (payment) => String(payment.student) === String(student._id)
    );

    const { paid, pending } = getPaymentTotals(studentPayments);

    return {
      _id: student._id,
      studentId: student.userId,
      student: student.name,
      email: student.email,
      course:
        student.admissionDetails?.course ||
        studentPayments[0]?.courseName ||
        "",
      batch: student.batch || "",
      admissionDate: student.createdAt,
      paidAmount: paid,
      pendingAmount: pending,
      feeStatus:
        pending > 0
          ? "Pending"
          : paid > 0
            ? "Clear"
            : student.admissionDetails?.feeStatus || "Unpaid",
    };
  });

  const currentMonthLabel = start.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  res.status(200).json({
    success: true,
    data: {
      month: currentMonthLabel,
      metrics: {
        monthlyAdmissions,
        totalStudents,
        activeStudents,
        totalCourseFees,
        registrationFees,
        pendingFeeAccounts: pendingStudentIds.size,
        activeBatches,
        activeTrainers,
      },
      recentAdmissions: admissions,
      feeStatus: {
        clear: admissions.filter((item) => item.feeStatus === "Clear").length,
        pending: admissions.filter((item) => item.feeStatus === "Pending").length,
        totalCollected: paidTotal,
        totalPending: pendingTotal,
      },
    },
  });
};

// ======================================================
// 2. GET ADMISSIONS
// GET /api/counsellor/admissions
// ======================================================

export const getAdmissions = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit || "10", 10))
  );

  const filter = { role: "Student" };

  if (req.query.status === "Active") {
    filter.isActive = true;
  } else if (req.query.status === "Inactive") {
    filter.isActive = false;
  }

  if (req.query.q) {
    const search = escapeSearch(req.query.q);

    filter.$or = [
      { name: search },
      { email: search },
      { userId: search },
      { batch: search },
      { "admissionDetails.course": search },
    ];
  }

  if (req.query.from || req.query.to) {
    filter.createdAt = {};

    if (req.query.from) {
      const from = new Date(req.query.from);

      if (Number.isNaN(from.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date.",
        });
      }

      filter.createdAt.$gte = from;
    }

    if (req.query.to) {
      const to = new Date(req.query.to);

      if (Number.isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date.",
        });
      }

      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  const [admissions, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  const studentIds = admissions.map((student) => student._id);

  const payments = await Payment.find({
    student: { $in: studentIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const data = admissions.map((student) => {
    const studentPayments = payments.filter(
      (payment) => String(payment.student) === String(student._id)
    );

    const { paid, pending } = getPaymentTotals(studentPayments);

    return {
      ...student,
      admissionDetails: student.admissionDetails || {},
      payments: studentPayments,
      totalPaid: paid,
      totalPending: pending,
      feeStatus:
        pending > 0
          ? "Pending"
          : paid > 0
            ? "Clear"
            : student.admissionDetails?.feeStatus || "Unpaid",
    };
  });

  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// ======================================================
// 3. CREATE ADMISSION / STUDENT
// POST /api/counsellor/admissions
// ======================================================

export const createAdmission = async (req, res) => {
  const {
    name,
    email,
    batch = "",
    admissionDetails = {},
  } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Student name and email are required.",
    });
  }

  if (
    !admissionDetails ||
    typeof admissionDetails !== "object" ||
    Array.isArray(admissionDetails)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid admission details.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedBatch = normalizeBatch(batch);

  const existingUser = await User.findOne({
    email: normalizedEmail,
  }).select("_id");

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  if (normalizedBatch) {
    const batchExists = await Batch.exists({
      batch: normalizedBatch,
      isActive: true,
    });

    if (!batchExists) {
      return res.status(400).json({
        success: false,
        message: "The selected batch does not exist or is inactive.",
      });
    }
  }

  const temporaryPassword = randomBytes(12).toString("base64url");
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

  const student = await User.create({
    userId: `STU${randomBytes(5).toString("hex").toUpperCase()}`,
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "Student",
    batch: normalizedBatch,
    isActive: true,
    mustChangePassword: true,
    createdBy: req.user._id,
    admissionDetails: getAdmissionDetails(admissionDetails),
  });

  res.status(201).json({
    success: true,
    message: "Student admission created successfully.",
    data: {
      student: {
        _id: student._id,
        userId: student.userId,
        name: student.name,
        email: student.email,
        role: student.role,
        batch: student.batch,
        admissionDetails: student.admissionDetails,
        createdAt: student.createdAt,
      },
      temporaryPassword,
    },
  });
};

// ======================================================
// 4. GET ADMISSION DETAILS
// GET /api/counsellor/admissions/:id
// ======================================================

export const getAdmissionById = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID.",
    });
  }

  const student = await User.findOne({
    _id: req.params.id,
    role: "Student",
  })
    .select("-password")
    .lean();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student admission not found.",
    });
  }

  const [payments, batches, courses] = await Promise.all([
    Payment.find({ student: student._id })
      .sort({ createdAt: -1 })
      .lean(),

    Batch.find({ batch: student.batch })
      .select("batch course trainer status startDate durationMonths")
      .populate("trainer", "name userId email trainerDetails")
      .lean(),

    Course.find({
      students: student._id,
    })
      .select("courseName description isPublished")
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      student: {
        ...student,
        admissionDetails: student.admissionDetails || {},
      },
      payments,
      batches,
      courses,
    },
  });
};

// ======================================================
// 5. UPDATE ADMISSION / STUDENT
// PATCH /api/counsellor/admissions/:id
// ======================================================

export const updateAdmission = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID.",
    });
  }

  const allowedFields = ["name", "email", "batch", "isActive"];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (updates.name !== undefined) {
    if (
      typeof updates.name !== "string" ||
      !updates.name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Student name cannot be empty.",
      });
    }

    updates.name = updates.name.trim();
  }

  if (updates.email !== undefined) {
    if (
      typeof updates.email !== "string" ||
      !updates.email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid student email is required.",
      });
    }

    updates.email = updates.email.trim().toLowerCase();

    const duplicate = await User.findOne({
      email: updates.email,
      _id: { $ne: req.params.id },
    }).select("_id");

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }
  }

  if (updates.batch !== undefined) {
    updates.batch = normalizeBatch(updates.batch);

    if (updates.batch) {
      const batchExists = await Batch.exists({
        batch: updates.batch,
        isActive: true,
      });

      if (!batchExists) {
        return res.status(400).json({
          success: false,
          message: "The selected batch does not exist or is inactive.",
        });
      }
    }
  }

  if (
    updates.isActive !== undefined &&
    typeof updates.isActive !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "isActive must be true or false.",
    });
  }

  if (req.body.admissionDetails !== undefined) {
    if (
      !req.body.admissionDetails ||
      typeof req.body.admissionDetails !== "object" ||
      Array.isArray(req.body.admissionDetails)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission details.",
      });
    }

    updates.admissionDetails = getAdmissionDetails(
      req.body.admissionDetails
    );
  }

  const student = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      role: "Student",
    },
    { $set: updates },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password");

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student admission not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Student admission updated successfully.",
    data: student,
  });
};

// ======================================================
// 6. DELETE / DEACTIVATE ADMISSION
// DELETE /api/counsellor/admissions/:id
// ======================================================

export const deleteAdmission = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID.",
    });
  }

  const student = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      role: "Student",
    },
    {
      $set: { isActive: false },
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password");

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student admission not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Student admission deactivated successfully.",
    data: student,
  });
};

// ======================================================
// 7. GET STUDENTS
// GET /api/counsellor/students
// ======================================================

export const getStudents = async (req, res) => {
  const filter = { role: "Student" };

  if (req.query.active === "true") filter.isActive = true;
  if (req.query.active === "false") filter.isActive = false;

  if (req.query.batch) {
    filter.batch = String(req.query.batch).trim();
  }

  if (req.query.q) {
    const search = escapeSearch(req.query.q);

    filter.$or = [
      { name: search },
      { email: search },
      { userId: search },
      { batch: search },
      { "admissionDetails.course": search },
    ];
  }

  const students = await User.find(filter)
    .select("-password")
    .sort({ name: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
};

// ======================================================
// 8. GET BATCHES
// GET /api/counsellor/batches
// ======================================================

export const getBatches = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.status) {
      const allowedStatuses = [
        "Upcoming",
        "Running",
        "Completed",
        "Cancelled",
      ];

      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch status.",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.course) {
      filter.course = escapeSearch(req.query.course);
    }

    if (req.query.trainerId) {
      if (!isValidId(req.query.trainerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trainer ID.",
        });
      }

      filter.trainer = req.query.trainerId;
    }

    const [batches, studentCounts] = await Promise.all([
      Batch.find(filter)
        .populate("trainer", "userId name email trainerDetails")
        .sort({ startDate: 1 })
        .lean(),

      User.aggregate([
        {
          $match: {
            role: "Student",
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$batch",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = new Map(
      studentCounts.map((item) => [item._id, item.count])
    );

    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches.map((batch) => ({
        ...batch,
        studentCount: counts.get(batch.batch) || 0,
      })),
    });
  } catch (error) {
    console.error("Get batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batches.",
    });
  }
};

// ======================================================
// 9. GET TRAINERS
// GET /api/counsellor/trainers
// ======================================================

export const getTrainers = async (req, res) => {
  try {
    const filter = {
      role: "Trainer",
      isActive: true,
    };

    if (req.query.q) {
      const search = escapeSearch(req.query.q);

      filter.$or = [
        { name: search },
        { email: search },
        { userId: search },
        { "trainerDetails.expertise": search },
      ];
    }

    if (req.query.availability) {
      const allowedAvailability = [
        "Available",
        "Busy",
        "Unavailable",
      ];

      if (!allowedAvailability.includes(req.query.availability)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trainer availability.",
        });
      }

      filter["trainerDetails.availability"] =
        req.query.availability;
    }

    const trainers = await User.find(filter)
      .select("userId name email batch createdAt trainerDetails")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: trainers.length,
      data: trainers,
    });
  } catch (error) {
    console.error("Get trainers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trainers.",
    });
  }
};

// ======================================================
// 10. BATCH SCHEDULE
// GET /api/counsellor/schedule
// ======================================================

export const getSchedule = async (req, res) => {
  const filter = { isActive: true };

  if (req.query.batch) {
    filter.batch = String(req.query.batch).trim();
  }

  if (req.query.from || req.query.to) {
    filter.startDate = {};

    if (req.query.from) {
      const from = new Date(req.query.from);

      if (Number.isNaN(from.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date.",
        });
      }

      filter.startDate.$gte = from;
    }

    if (req.query.to) {
      const to = new Date(req.query.to);

      if (Number.isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date.",
        });
      }

      to.setHours(23, 59, 59, 999);
      filter.startDate.$lte = to;
    }
  }

  const schedules = await Batch.find(filter)
    .populate("trainer", "userId name email trainerDetails")
    .sort({ startDate: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: schedules,
  });
};

// ======================================================
// 11. GET FEES / PAYMENTS
// GET /api/counsellor/fees
// ======================================================

export const getFees = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit || "20", 10))
  );

  const filter = {};

  if (req.query.status) {
    const allowedStatuses = [
      "Pending",
      "Paid",
      "Failed",
      "Refunded",
    ];

    if (!allowedStatuses.includes(req.query.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    filter.status = req.query.status;
  }

  if (req.query.studentId) {
    if (!isValidId(req.query.studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    filter.student = req.query.studentId;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("student", "userId name email batch")
      .populate("course", "courseName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Payment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// ======================================================
// 12. RECORD PAYMENT
// POST /api/counsellor/fees
// ======================================================

export const recordPayment = async (req, res) => {
  const {
    studentId,
    courseId,
    amount,
    status = "Pending",
    paymentMethod = "UPI",
    paymentDate,
    providerReference = "",
  } = req.body;

  const numericAmount = Number(amount);

  if (!studentId || !isValidId(studentId)) {
    return res.status(400).json({
      success: false,
      message: "A valid student ID is required.",
    });
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Payment amount must be greater than zero.",
    });
  }

  if (!["Pending", "Paid"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "New payments can only be Pending or Paid.",
    });
  }

  const allowedMethods = [
    "UPI",
    "Credit Card",
    "Debit Card",
    "Net Banking",
    "Cash",
  ];

  if (!allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment method.",
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

  let course = null;

  if (courseId) {
    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }
  }

  if (paymentDate && Number.isNaN(new Date(paymentDate).getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment date.",
    });
  }

  const payment = await Payment.create({
    student: student._id,
    course: course?._id || null,
    courseName:
      course?.courseName ||
      student.admissionDetails?.course ||
      "",
    transactionId: `PAY-${randomBytes(8).toString("hex").toUpperCase()}`,
    amount: numericAmount,
    currency: "INR",
    status,
    paymentMethod,
    paymentDate: paymentDate
      ? new Date(paymentDate)
      : status === "Paid"
        ? new Date()
        : null,
    providerReference:
      typeof providerReference === "string"
        ? providerReference.trim()
        : "",
  });

  res.status(201).json({
    success: true,
    message: "Payment record created successfully.",
    data: payment,
  });
};