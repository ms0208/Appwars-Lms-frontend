
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import User from "../models/user.js";
import { Payment, Batch } from "../models/AdminModels.js";
import Course from "../models/Course.js";

// ======================================================
// COMMON HELPERS
// ======================================================

const isValidId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeSearch = (value = "") =>
  new RegExp(escapeRegex(String(value).trim()), "i");

const getMonthRange = () => {
  const now = new Date();

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
};

const normalizeBatch = (batch) =>
  typeof batch === "string" ? batch.trim() : "";

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

const sendError = (res, error, message) => {
  console.error(message, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.statusCode === 401
        ? "Counsellor authentication required."
        : message,
    error: error.message,
  });
};

// ======================================================
// COUNSELLOR OWNERSHIP HELPERS
// ======================================================

// Resolve the logged-in counsellor's MongoDB ID.
const getCounsellorId = (req) => {
  const counsellorId = req.user?._id || req.user?.id;

  if (!counsellorId || !isValidId(counsellorId)) {
    const error = new Error("Invalid counsellor authentication.");
    error.statusCode = 401;
    throw error;
  }

  return new mongoose.Types.ObjectId(counsellorId);
};

// ONLY students referred by the logged-in counsellor.
const getCounsellorStudentFilter = (req) => ({
  role: "Student",
  "referredBy.role": "Counsellor",
  "referredBy.counsellor": getCounsellorId(req),
});

// Get IDs of only this counsellor's students.
const getCounsellorStudentIds = async (req) => {
  const students = await User.find(
    getCounsellorStudentFilter(req)
  )
    .select("_id")
    .lean();

  return students.map((student) => student._id);
};

// Find a student only if that student belongs to this counsellor.
const findCounsellorStudent = (req, studentId) => {
  if (!isValidId(studentId)) {
    return null;
  }

  return User.findOne({
    _id: studentId,
    ...getCounsellorStudentFilter(req),
  });
};

// Verify a student ID belongs to the counsellor.
const isCounsellorStudent = (studentIds, studentId) => {
  if (!studentId || !isValidId(studentId)) {
    return false;
  }

  return studentIds.some(
    (id) => String(id) === String(studentId)
  );
};

// Every payment query must use this filter.
const getCounsellorPaymentFilter = async (req) => {
  const studentIds = await getCounsellorStudentIds(req);

  return {
    studentIds,
    paymentFilter: {
      student: { $in: studentIds },
    },
  };
};

// ======================================================
// PAYMENT HELPERS
// ======================================================

const getPaymentBreakdown = (payment = {}) => {
  const rawTotal = Number(
    payment.totalFees ?? payment.amount ?? 0
  );

  const totalFees = Math.max(
    0,
    Number.isFinite(rawTotal) ? rawTotal : 0
  );

  let collectedFees;

  if (
    payment.collectedFees !== undefined &&
    payment.collectedFees !== null
  ) {
    collectedFees = Number(payment.collectedFees);
  } else if (
    payment.pendingFees !== undefined &&
    payment.pendingFees !== null
  ) {
    collectedFees =
      totalFees - Number(payment.pendingFees);
  } else {
    collectedFees =
      payment.status === "Paid" ? totalFees : 0;
  }

  if (!Number.isFinite(collectedFees)) {
    collectedFees = 0;
  }

  collectedFees = Math.min(
    totalFees,
    Math.max(0, collectedFees)
  );

  const pendingFees = Math.max(
    0,
    totalFees - collectedFees
  );

  return {
    totalFees,
    collectedFees,
    pendingFees,
  };
};

const getPaymentTotals = (payments = []) =>
  payments.reduce(
    (totals, payment) => {
      const breakdown = getPaymentBreakdown(payment);

      totals.totalFees += breakdown.totalFees;
      totals.paid += breakdown.collectedFees;
      totals.pending += breakdown.pendingFees;

      return totals;
    },
    {
      totalFees: 0,
      paid: 0,
      pending: 0,
    }
  );

const validateFeeAmounts = ({
  totalFees,
  collectedFees,
  pendingFees,
}) => {
  if (
    !Number.isFinite(totalFees) ||
    !Number.isFinite(collectedFees) ||
    !Number.isFinite(pendingFees)
  ) {
    return "All fee amounts must be valid numbers.";
  }

  if (
    totalFees <= 0 ||
    collectedFees < 0 ||
    pendingFees < 0
  ) {
    return "Total fees must be greater than zero and collected/remaining fees cannot be negative.";
  }

  if (
    collectedFees > totalFees ||
    pendingFees > totalFees
  ) {
    return "Collected and remaining fees cannot exceed total fees.";
  }

  if (
    Math.abs(
      totalFees - collectedFees - pendingFees
    ) > 0.01
  ) {
    return "Total fees must equal collected fees plus remaining fees.";
  }

  return null;
};

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

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? false : date;
};

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

// ======================================================
// PAYMENT SEARCH HELPER
// ======================================================

const getPaymentSearchFilter = async (
  searchValue,
  studentIds
) => {
  if (!searchValue || !String(searchValue).trim()) {
    return null;
  }

  const searchRegex = escapeSearch(
    String(searchValue).trim().slice(0, 100)
  );

  // Search student details only within the authorized IDs.
  const matchingStudents = studentIds.length
    ? await User.find({
        _id: { $in: studentIds },
        role: "Student",
        "referredBy.role": "Counsellor",
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { userId: searchRegex },
        ],
      })
        .select("_id")
        .lean()
    : [];

  const searchConditions = [
    { reference: searchRegex },
    { notes: searchRegex },
  ];

  if (matchingStudents.length) {
    searchConditions.push({
      student: {
        $in: matchingStudents.map((student) => student._id),
      },
    });
  }

  return {
    $or: searchConditions,
  };
};

// ======================================================
// 1. COUNSELLOR DASHBOARD
// GET /api/counsellor/dashboard
// ======================================================

export const getDashboard = async (req, res) => {
  try {
    const studentFilter = getCounsellorStudentFilter(req);
    const studentIds = await getCounsellorStudentIds(req);

    const { start, end } = getMonthRange();

    const paymentFilter = {
      student: { $in: studentIds },
    };

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
        ...studentFilter,
        createdAt: { $gte: start, $lt: end },
      }),

      User.countDocuments(studentFilter),

      User.countDocuments({
        ...studentFilter,
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
        ...paymentFilter,
        createdAt: { $gte: start, $lt: end },
      }).lean(),

      Payment.find(paymentFilter).lean(),

      User.find(studentFilter)
        .select(
          "userId name email batch createdAt isActive admissionDetails referredBy"
        )
        .populate(
          "referredBy.counsellor",
          "name userId email"
        )
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const monthlyTotals = getPaymentTotals(monthlyPayments);
    const allPaymentTotals = getPaymentTotals(allPayments);

    const pendingPayments = allPayments.filter(
      (payment) =>
        getPaymentBreakdown(payment).pendingFees > 0
    );

    const pendingStudentIds = new Set(
      pendingPayments.map((payment) =>
        String(payment.student)
      )
    );

    const recentStudentIds = recentStudents.map(
      (student) => student._id
    );

    // Recent payments are restricted to recent authorized students.
    const recentPayments = recentStudentIds.length
      ? await Payment.find({
          student: { $in: recentStudentIds },
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const recentAdmissions = recentStudents.map((student) => {
      const studentPayments = recentPayments.filter(
        (payment) =>
          String(payment.student) === String(student._id)
      );

      const { paid, pending } =
        getPaymentTotals(studentPayments);

      return {
        _id: student._id,
        studentId: student.userId,
        student: student.name,
        email: student.email,
        counsellor: student.referredBy?.counsellor || null,
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
              : student.admissionDetails?.feeStatus ||
                "Unpaid",
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        month: start.toLocaleString("en-IN", {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }),

        metrics: {
          monthlyAdmissions,
          totalStudents,
          activeStudents,
          totalCourseFees: monthlyTotals.totalFees,
          registrationFees: monthlyTotals.paid,
          pendingFeeAccounts: pendingStudentIds.size,
          activeBatches,
          activeTrainers,
        },

        recentAdmissions,

        feeStatus: {
          clear: recentAdmissions.filter(
            (item) => item.feeStatus === "Clear"
          ).length,

          pending: recentAdmissions.filter(
            (item) => item.feeStatus === "Pending"
          ).length,

          totalCollected: allPaymentTotals.paid,
          totalPending: allPaymentTotals.pending,
        },
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch counsellor dashboard."
    );
  }
};

// ======================================================
// 2. GET ADMISSIONS
// GET /api/counsellor/admissions
// ======================================================

export const getAdmissions = async (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(req.query.limit || "10", 10) || 10
      )
    );

    const filter = getCounsellorStudentFilter(req);

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
        .populate(
          "referredBy.counsellor",
          "name userId email"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const studentIds = admissions.map(
      (student) => student._id
    );

    const payments = studentIds.length
      ? await Payment.find({
          student: { $in: studentIds },
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const data = admissions.map((student) => {
      const studentPayments = payments.filter(
        (payment) =>
          String(payment.student) === String(student._id)
      );

      const { paid, pending, totalFees } =
        getPaymentTotals(studentPayments);

      return {
        ...student,
        admissionDetails: student.admissionDetails || {},
        referredBy: {
          ...(student.referredBy || {}),
          counsellor:
            student.referredBy?.counsellor || null,
        },
        payments: studentPayments.map((payment) => ({
          ...payment,
          ...getPaymentBreakdown(payment),
        })),
        totalFees,
        totalPaid: paid,
        totalPending: pending,
        feeStatus:
          pending > 0
            ? "Pending"
            : paid > 0
              ? "Clear"
              : student.admissionDetails?.feeStatus ||
                "Unpaid",
      };
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch admissions."
    );
  }
};

// ======================================================
// 3. CREATE ADMISSION / STUDENT
// POST /api/counsellor/admissions
// ======================================================

export const createAdmission = async (req, res) => {
  try {
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

    const counsellorId = getCounsellorId(req);

    const counsellor = await User.findOne({
      _id: counsellorId,
      role: "Counsellor",
      isActive: true,
    }).select("_id name userId email");

    if (!counsellor) {
      return res.status(403).json({
        success: false,
        message: "Active counsellor account not found.",
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
          message:
            "The selected batch does not exist or is inactive.",
        });
      }
    }

    const temporaryPassword = randomBytes(12).toString(
      "base64url"
    );

    const hashedPassword = await bcrypt.hash(
      temporaryPassword,
      12
    );

    const student = await User.create({
      userId: `STU${randomBytes(5)
        .toString("hex")
        .toUpperCase()}`,

      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "Student",
      batch: normalizedBatch,
      isActive: true,
      mustChangePassword: true,

      createdBy: counsellor._id,

      referredBy: {
        role: "Counsellor",
        counsellor: counsellor._id,
      },

      admissionDetails: getAdmissionDetails(
        admissionDetails
      ),
    });

    const populatedStudent = await User.findById(student._id)
      .select("-password")
      .populate(
        "referredBy.counsellor",
        "name userId email"
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Student admission created successfully.",
      data: {
        student: populatedStudent,
        temporaryPassword,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to create admission."
    );
  }
};

// ======================================================
// 4. GET ADMISSION DETAILS
// GET /api/counsellor/admissions/:id
// ======================================================

export const getAdmissionById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await User.findOne({
      _id: req.params.id,
      ...getCounsellorStudentFilter(req),
    })
      .select("-password")
      .populate(
        "referredBy.counsellor",
        "name userId email"
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student admission not found.",
      });
    }

    const [payments, batches, courses] = await Promise.all([
      Payment.find({
        student: student._id,
      })
        .sort({ createdAt: -1 })
        .lean(),

      Batch.find({
        batch: student.batch,
      })
        .select(
          "batch course trainer status startDate durationMonths"
        )
        .populate(
          "trainer",
          "name userId email trainerDetails"
        )
        .lean(),

      Course.find({
        students: student._id,
      })
        .select("courseName description isPublished")
        .lean(),
    ]);

    const paymentTotals = getPaymentTotals(payments);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          ...student,
          admissionDetails: student.admissionDetails || {},
        },

        payments: payments.map((payment) => ({
          ...payment,
          ...getPaymentBreakdown(payment),
        })),

        paymentSummary: {
          totalFees: paymentTotals.totalFees,
          collectedFees: paymentTotals.paid,
          pendingFees: paymentTotals.pending,
        },

        batches,
        courses,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch admission details."
    );
  }
};

// ======================================================
// 5. UPDATE ADMISSION / STUDENT
// PATCH /api/counsellor/admissions/:id
// ======================================================

export const updateAdmission = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const existingStudent = await findCounsellorStudent(
      req,
      req.params.id
    );

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student admission not found.",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "batch",
      "isActive",
    ];

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
            message:
              "The selected batch does not exist or is inactive.",
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

      // Merge instead of deleting existing admission fields.
      updates.admissionDetails = {
        ...(existingStudent.admissionDetails?.toObject?.() ||
          existingStudent.admissionDetails ||
          {}),
        ...getAdmissionDetails(req.body.admissionDetails),
      };
    }

    const student = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getCounsellorStudentFilter(req),
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-password")
      .populate(
        "referredBy.counsellor",
        "name userId email"
      );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student admission not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student admission updated successfully.",
      data: student,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update admission."
    );
  }
};

// ======================================================
// 6. DELETE / DEACTIVATE ADMISSION
// DELETE /api/counsellor/admissions/:id
// ======================================================

export const deleteAdmission = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getCounsellorStudentFilter(req),
      },
      {
        $set: {
          isActive: false,
        },
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

    return res.status(200).json({
      success: true,
      message: "Student admission deactivated successfully.",
      data: student,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to deactivate admission."
    );
  }
};

// ======================================================
// 7. GET STUDENTS
// GET /api/counsellor/students
// ======================================================

export const getStudents = async (req, res) => {
  try {
    const filter = getCounsellorStudentFilter(req);

    if (req.query.active === "true") {
      filter.isActive = true;
    }

    if (req.query.active === "false") {
      filter.isActive = false;
    }

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
      .populate(
        "referredBy.counsellor",
        "name userId email"
      )
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch students."
    );
  }
};

// ======================================================
// 8. GET BATCHES
// GET /api/counsellor/batches
// ======================================================

export const getBatches = async (req, res) => {
  try {
    const filter = {
      isActive: true,
    };

    const allowedStatuses = [
      "Upcoming",
      "Running",
      "Completed",
      "Cancelled",
    ];

    if (req.query.status) {
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

    const studentIds = await getCounsellorStudentIds(req);

    const [batches, studentCounts] = await Promise.all([
      Batch.find(filter)
        .populate(
          "trainer",
          "userId name email trainerDetails"
        )
        .sort({ startDate: 1 })
        .lean(),

      studentIds.length
        ? User.aggregate([
            {
              $match: {
                _id: { $in: studentIds },
                role: "Student",
                isActive: true,
                "referredBy.role": "Counsellor",
                "referredBy.counsellor": getCounsellorId(req),
              },
            },
            {
              $group: {
                _id: "$batch",
                count: { $sum: 1 },
              },
            },
          ])
        : [],
    ]);

    const counts = new Map(
      studentCounts.map((item) => [
        item._id,
        item.count,
      ])
    );

    const data = batches.map((batch) => ({
      ...batch,
      studentCount: counts.get(batch.batch) || 0,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch batches."
    );
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
      ];
    }

    if (req.query.availability) {
      const allowedAvailability = [
        "Available",
        "Busy",
        "Unavailable",
      ];

      if (
        !allowedAvailability.includes(req.query.availability)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid trainer availability.",
        });
      }

      filter["trainerDetails.availability"] =
        req.query.availability;
    }

    const trainers = await User.find(filter)
      .select(
        "userId name email batch createdAt trainerDetails"
      )
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: trainers.length,
      data: trainers,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch trainers."
    );
  }
};

// ======================================================
// 10. BATCH SCHEDULE
// GET /api/counsellor/schedule
// ======================================================

export const getSchedule = async (req, res) => {
  try {
    const filter = {
      isActive: true,
    };

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
      .populate(
        "trainer",
        "userId name email trainerDetails"
      )
      .sort({ startDate: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch schedule."
    );
  }
};

// ======================================================
// 11. GET FEES / PAYMENTS
// GET /api/counsellor/fees
// ======================================================

export const getFees = async (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(req.query.limit || "10", 10) || 10
      )
    );

    const { studentIds, paymentFilter: ownershipFilter } =
      await getCounsellorPaymentFilter(req);

    const emptySummary = {
      totalPayments: 0,
      totalFees: 0,
      collectedFees: 0,
      pendingFees: 0,
      paidTotal: 0,
      pendingTotal: 0,
      pendingFeeAccounts: 0,
      failedTotal: 0,
      refundedTotal: 0,
      currency: "INR",
    };

    if (!studentIds.length) {
      return res.status(200).json({
        success: true,
        message: "No students referred by this counsellor.",
        summary: emptySummary,
        payments: [],
        count: 0,
        total: 0,
        page,
        pages: 0,
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      });
    }

    // Ownership filter is always retained.
    const filter = {
      ...ownershipFilter,
    };

    // Status filter.
    if (req.query.status) {
      if (
        !allowedPaymentStatuses.includes(req.query.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      filter.status = req.query.status;
    }

    // Student filter: reject IDs belonging to other counsellors.
    if (req.query.student) {
      if (!isValidId(req.query.student)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      if (!isCounsellorStudent(studentIds, req.query.student)) {
        return res.status(200).json({
          success: true,
          message: "No payment records found for this student.",
          summary: emptySummary,
          payments: [],
          count: 0,
          total: 0,
          page,
          pages: 0,
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        });
      }

      filter.student = new mongoose.Types.ObjectId(
        req.query.student
      );
    }

    // Date filter.
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

    // Search filter is ANDed with the ownership filter.
    if (req.query.q) {
      const searchFilter = await getPaymentSearchFilter(
        req.query.q,
        studentIds
      );

      if (searchFilter) {
        filter.$and = [searchFilter];
      }
    }

    const [rawPayments, total, allPayments] =
      await Promise.all([
        Payment.find(filter)
          .populate(paymentPopulate)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        Payment.countDocuments(filter),

        // Overall summary includes all payments belonging
        // to this counsellor's referred students.
        Payment.find(ownershipFilter).lean(),
      ]);

    const payments = rawPayments.map((payment) => ({
      ...payment,
      ...getPaymentBreakdown(payment),
    }));

    let totalFees = 0;
    let collectedFees = 0;
    let pendingFees = 0;
    let failedTotal = 0;
    let refundedTotal = 0;

    const pendingStudentIds = new Set();

    for (const payment of allPayments) {
      const breakdown = getPaymentBreakdown(payment);

      totalFees += breakdown.totalFees;
      collectedFees += breakdown.collectedFees;
      pendingFees += breakdown.pendingFees;

      if (
        breakdown.pendingFees > 0 &&
        payment.student
      ) {
        pendingStudentIds.add(String(payment.student));
      }

      if (payment.status === "Failed") {
        failedTotal += breakdown.totalFees;
      }

      if (payment.status === "Refunded") {
        refundedTotal += breakdown.totalFees;
      }
    }

    const summary = {
      totalPayments: allPayments.length,
      totalFees,
      collectedFees,
      pendingFees,
      paidTotal: collectedFees,
      pendingTotal: pendingFees,
      pendingFeeAccounts: pendingStudentIds.size,
      failedTotal,
      refundedTotal,
      currency: "INR",
    };

    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message:
        "Counsellor referred students' payment records fetched successfully.",
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
    return sendError(
      res,
      error,
      "Failed to fetch counsellor payment records."
    );
  }
};

// ======================================================
// 12. GET SINGLE PAYMENT
// GET /api/counsellor/fees/:id
// ======================================================

export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const { paymentFilter } =
      await getCounsellorPaymentFilter(req);

    const payment = await Payment.findOne({
      _id: id,
      ...paymentFilter,
    })
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
      payment: {
        ...payment,
        ...getPaymentBreakdown(payment),
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to fetch payment record."
    );
  }
};

// ======================================================
// 13. RECORD PAYMENT
// POST /api/counsellor/fees
// ======================================================

export const recordPayment = async (req, res) => {
  try {
    const studentId =
      req.body.student || req.body.studentId;

    const batchId =
      req.body.batch || req.body.batchId;

    const totalFees = Number(
      req.body.totalFees ?? req.body.amount
    );

    const collectedFees = Number(
      req.body.collectedFees ??
        (req.body.status === "Paid" ? totalFees : 0)
    );

    const pendingFees = Number(
      req.body.pendingFees ??
        (totalFees - collectedFees)
    );

    const amount = totalFees;
    const currency = req.body.currency || "INR";

    const method =
      req.body.method ||
      req.body.paymentMethod ||
      "UPI";

    const status = req.body.status || "Pending";

    const reference =
      req.body.reference ||
      req.body.transactionId ||
      req.body.providerReference ||
      "";

    const {
      dueDate,
      paidAt,
      notes = "",
    } = req.body;

    if (!studentId || !isValidId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "A valid student ID is required.",
      });
    }

    // A counsellor cannot record a payment for another
    // counsellor's student or an Admin-referred student.
    const student = await findCounsellorStudent(
      req,
      studentId
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const feeValidationError = validateFeeAmounts({
      totalFees,
      collectedFees,
      pendingFees,
    });

    if (feeValidationError) {
      return res.status(400).json({
        success: false,
        message: feeValidationError,
      });
    }

    if (status === "Paid" && pendingFees > 0) {
      return res.status(400).json({
        success: false,
        message:
          "A payment cannot be marked Paid while remaining fees are outstanding.",
      });
    }

    if (!allowedPaymentStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    if (!allowedPaymentMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    if (currency !== "INR") {
      return res.status(400).json({
        success: false,
        message: "Only INR currency is currently supported.",
      });
    }

    const parsedDueDate = parseDate(dueDate);
    const parsedPaidAt = parseDate(paidAt);

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

    let batch = null;

    if (batchId) {
      if (!isValidId(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      batch = await Batch.findById(batchId);

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

    const payment = await Payment.create({
      student: student._id,
      batch: batch ? batch._id : null,

      amount,
      totalFees,
      collectedFees,
      pendingFees,

      currency,
      dueDate: parsedDueDate,

      paidAt:
        collectedFees > 0
          ? parsedPaidAt || new Date()
          : null,

      method,

      reference:
        typeof reference === "string"
          ? reference.trim()
          : "",

      status,

      notes:
        typeof notes === "string"
          ? notes.trim()
          : "",

      recordedBy: getCounsellorId(req),
    });

    const populatedPayment = await Payment.findById(
      payment._id
    )
      .populate(paymentPopulate)
      .lean();

    return res.status(201).json({
      success: true,
      message: "Payment record created successfully.",
      payment: {
        ...populatedPayment,
        ...getPaymentBreakdown(populatedPayment),
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to create payment record."
    );
  }
};

// ======================================================
// 14. UPDATE PAYMENT
// PATCH /api/counsellor/fees/:id
// ======================================================

export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const { paymentFilter } =
      await getCounsellorPaymentFilter(req);

    // Find payment only when it belongs to this counsellor.
    const payment = await Payment.findOne({
      _id: id,
      ...paymentFilter,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    const updates = {};
    const currentFees = getPaymentBreakdown(payment);

    const hasTotalFees =
      req.body.totalFees !== undefined ||
      req.body.amount !== undefined;

    const hasCollectedFees =
      req.body.collectedFees !== undefined;

    const hasPendingFees =
      req.body.pendingFees !== undefined;

    let totalFees = hasTotalFees
      ? Number(req.body.totalFees ?? req.body.amount)
      : currentFees.totalFees;

    let collectedFees = hasCollectedFees
      ? Number(req.body.collectedFees)
      : currentFees.collectedFees;

    let pendingFees = hasPendingFees
      ? Number(req.body.pendingFees)
      : currentFees.pendingFees;

    if (
      hasTotalFees &&
      !hasCollectedFees &&
      !hasPendingFees
    ) {
      pendingFees = totalFees - collectedFees;
    }

    if (hasCollectedFees && !hasPendingFees) {
      pendingFees = totalFees - collectedFees;
    }

    if (hasPendingFees && !hasCollectedFees) {
      collectedFees = totalFees - pendingFees;
    }

    if (
      req.body.status === "Paid" &&
      !hasCollectedFees &&
      !hasPendingFees &&
      !hasTotalFees
    ) {
      collectedFees = totalFees;
      pendingFees = 0;
    }

    const feeValidationError = validateFeeAmounts({
      totalFees,
      collectedFees,
      pendingFees,
    });

    if (feeValidationError) {
      return res.status(400).json({
        success: false,
        message: feeValidationError,
      });
    }

    if (
      hasTotalFees ||
      hasCollectedFees ||
      hasPendingFees ||
      req.body.status === "Paid"
    ) {
      updates.amount = totalFees;
      updates.totalFees = totalFees;
      updates.collectedFees = collectedFees;
      updates.pendingFees = pendingFees;
    }

    if (req.body.dueDate !== undefined) {
      const dueDate = parseDate(req.body.dueDate);

      if (dueDate === false) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date.",
        });
      }

      updates.dueDate = dueDate;
    }

    if (req.body.status !== undefined) {
      if (
        !allowedPaymentStatuses.includes(req.body.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      updates.status = req.body.status;
    }

    const finalStatus = updates.status || payment.status;

    if (finalStatus === "Paid" && pendingFees > 0) {
      return res.status(400).json({
        success: false,
        message:
          "A payment cannot be marked Paid while remaining fees are outstanding.",
      });
    }

    if (req.body.paidAt !== undefined) {
      const paidAt = parseDate(req.body.paidAt);

      if (paidAt === false) {
        return res.status(400).json({
          success: false,
          message: "Invalid paid date.",
        });
      }

      updates.paidAt = paidAt;
    }

    const finalCollectedFees =
      updates.collectedFees ?? currentFees.collectedFees;

    if (
      finalCollectedFees > 0 &&
      updates.paidAt === undefined &&
      !payment.paidAt
    ) {
      updates.paidAt = new Date();
    }

    if (finalCollectedFees === 0) {
      updates.paidAt = null;
    }

    const method =
      req.body.method ?? req.body.paymentMethod;

    if (method !== undefined) {
      if (!allowedPaymentMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method.",
        });
      }

      updates.method = method;
    }

    const reference =
      req.body.reference ??
      req.body.transactionId ??
      req.body.providerReference;

    if (reference !== undefined) {
      updates.reference =
        typeof reference === "string"
          ? reference.trim()
          : "";
    }

    if (req.body.notes !== undefined) {
      updates.notes =
        typeof req.body.notes === "string"
          ? req.body.notes.trim()
          : "";
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "No valid fields were provided for update.",
      });
    }

    Object.assign(payment, updates);

    await payment.save();

    // Recheck ownership when fetching the updated payment.
    const updatedPayment = await Payment.findOne({
      _id: payment._id,
      ...paymentFilter,
    })
      .populate(paymentPopulate)
      .lean();

    if (!updatedPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment record updated successfully.",
      payment: {
        ...updatedPayment,
        ...getPaymentBreakdown(updatedPayment),
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update payment record."
    );
  }
};

// ======================================================
// 15. DELETE PAYMENT
// DELETE /api/counsellor/fees/:id
// ======================================================

export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const { paymentFilter } =
      await getCounsellorPaymentFilter(req);

    const payment = await Payment.findOneAndDelete({
      _id: id,
      ...paymentFilter,
    });

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
    return sendError(
      res,
      error,
      "Failed to delete payment record."
    );
  }
};
