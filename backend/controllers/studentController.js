import path from "path";
import fs from "fs/promises";
import mongoose from "mongoose";
import User from "../models/user.js";
import Course from "../models/Course.js";
import LearningResource from "../models/LearningResource.js";
import LiveClass from "../models/LiveClass.js";
import StudentReminder from "../models/StudentReminder.js";
import Doubt from "../models/Doubt.js";
import Notification from "../models/Notification.js";
import {Payment}from "../models/Adminmodels.js";
import Resume from "../models/Resume.js";
import MockInterview from "../models/MockInterview.js";
import Result from "../models/result.js";
import Batch from "../models/Batch.js";
import Job from "../models/Job.js";
import StudentProgress from "../models/StudentProgress.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const idOf = (value) => String(value?._id || value);
const validId = (value) => mongoose.isValidObjectId(value);
const courseAccessFilter = (user) => ({
  $or: [
    { students: user._id },
    { _id: { $in: user.enrolledCourses || [] } },
    ...(user.batch ? [{ batch: user.batch }] : [])
  ]
});

/* Profile */

/* Profile */
export const getProfile = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;

  if (!studentId || !mongoose.isValidObjectId(studentId)) {
    throw new ApiError(400, "Invalid student ID.");
  }

  const student = await User.findById(studentId).lean();

  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  let batchDetails = null;

  // Find batch using batchId
  if (student.batchId && mongoose.isValidObjectId(student.batchId)) {
    batchDetails = await Batch.findById(student.batchId)
      .populate("trainer", "name userId email")
      .lean();
  }

  // Fallback: find batch using batch name
  if (!batchDetails && typeof student.batch === "string") {
    batchDetails = await Batch.findOne({
      batch: student.batch.trim()
    })
      .populate("trainer", "name userId email")
      .lean();
  }

  const batchName =
    batchDetails?.batch ||
    (typeof student.batch === "string" ? student.batch : null) ||
    req.user.batch ||
    null;

  res.status(200).json({
    success: true,
    user: {
      _id: student._id,
      userId: student.userId,
      name: student.name,
      email: student.email,
      phone: student.phone || "",
      role: student.role,
      batch: batchName,

      batchDetails: batchDetails
        ? {
            _id: batchDetails._id,
            batch: batchDetails.batch,
            course: batchDetails.course,

            // Trainer now contains populated details
            trainer: batchDetails.trainer
              ? {
                  _id: batchDetails.trainer._id,
                  name: batchDetails.trainer.name,
                  userId: batchDetails.trainer.userId,
                  email: batchDetails.trainer.email
                }
              : null,

            startDate: batchDetails.startDate,
            durationMonths: batchDetails.durationMonths,
            status: batchDetails.status,
            description: batchDetails.description,
            isActive: batchDetails.isActive
          }
        : null,

      mustChangePassword: student.mustChangePassword
    }
  });
});


export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const updates = {};
  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, "Name is required.");
    updates.name = String(name).trim();
  }
  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ApiError(400, "Please provide a valid email address.");
    }
    const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
    if (duplicate) throw new ApiError(409, "Email is already in use.");
    updates.email = normalizedEmail;
  }
  if (phone !== undefined) updates.phone = String(phone).trim();

  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, {
    new: true, runValidators: true
  }).select("-password");

  res.json({ message: "Profile updated successfully.", user });
  console.log("Authenticated User ID:", req.user.id);
});

/* Courses and resources */
export const getCourses = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;

  const courses = await Course.find(courseAccessFilter(req.user))
    .select("title courseName name description thumbnail trainer batchId lessons isPublished createdAt")
    .populate("trainer", "name")
    .lean();

  const progress = await StudentProgress.find({
    student: studentId
  }).lean();

  const progressByCourse = new Map(
    progress.map((item) => [idOf(item.course), item])
  );

  const result = courses.map((course) => {
    const p = progressByCourse.get(idOf(course.id));

    const totalLessons =
      p?.totalLessons || course.lessons?.length || 0;

    const completedLessons =
      p?.completedLessonCount ??
      p?.completedLessons?.length ??
      0;

    const progressPercent =
      p?.progressPercent ??
      (totalLessons
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0);

    return {
      _id: course.id,

      // Course name
      courseName:
        course.courseName ||
        course.title ||
        course.name ||
        "Untitled Course",

      description: course.description || "",
      thumbnail: course.thumbnail || null,

      trainer: course.trainer || null,
      trainerName:
        course.trainer?.name || "Trainer to be announced",

      batchId: course.batchId || null,

      totalLessons,
      completedLessons,

      progress: Math.min(
        100,
        Math.max(0, progressPercent)
      ),

      isPublished: course.isPublished,
      createdAt: course.createdAt
    };
  });

  res.json({ courses: result });
});

export const getResources = asyncHandler(async (req, res) => {
  const courses = await Course.find(courseAccessFilter(req.user)).select("_id courseName").lean();
  const courseIds = courses.map((course) => course.id);
  const courseNames = new Map(courses.map((course) => [idOf(course.id), course.courseName]));

  const resources = await LearningResource.find({
    course: { $in: courseIds }, isPublished: true
  }).populate("uploadedBy", "name").sort({ createdAt: -1 }).lean();

  res.json({
    resources: resources.map((resource) => ({
      ...resource,
      courseName: courseNames.get(idOf(resource.course)) || "",
      trainerName: resource.uploadedBy?.name || ""
    }))
  });
});

/* Live classes and reminders */
export const getLiveClasses = asyncHandler(async (req, res) => {
  const filter = {
    $or: [
      { students: req.user.id },
      ...(req.user.batch ? [{ batch: req.user.batch }] : []),
      ...(req.user.enrolledCourses?.length ? [{ course: { $in: req.user.enrolledCourses } }] : [])
    ]
  };

  const classes = await LiveClass.find(filter)
    .populate("trainer", "name")
    .populate("course", "courseName")
    .sort({ date: 1 }).lean();

  const reminderDocs = await StudentReminder.find({ student: req.user.id }).lean();
  const reminderMap = new Map(reminderDocs.map((item) => [idOf(item.liveClass), item.enabled]));

  res.json({
    classes: classes.map((item) => ({
      ...item,
      trainerName: item.trainer?.name || "Trainer to be announced",
      courseName: item.course?.courseName || "",
      meetingUrl: item.meetingUrl,
      reminderEnabled: reminderMap.get(idOf(item.id)) || false
    }))
  });
});

export const setLiveClassReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) throw new ApiError(400, "Invalid live class ID.");

  const liveClass = await LiveClass.findById(id);
  if (!liveClass) throw new ApiError(404, "Live class not found.");

  const allowed =
    (liveClass.students || []).some((studentId) => idOf(studentId) === idOf(req.user.id)) ||
    (req.user.batch && idOf(liveClass.batch) === idOf(req.user.batch)) ||
    (liveClass.course && (req.user.enrolledCourses || []).some((courseId) => idOf(courseId) === idOf(liveClass.course)));

  if (!allowed) throw new ApiError(403, "You are not assigned to this live class.");

  const enabled = Boolean(req.body.enabled);
  const reminder = await StudentReminder.findOneAndUpdate(
    { student: req.user.id, liveClass: id },
    { $set: { enabled } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.json({ message: enabled ? "Reminder enabled." : "Reminder disabled.", reminder });
});

/* Doubts */
export const getDoubts = asyncHandler(async (req, res) => {
  const doubts = await Doubt.find({ student: req.user.id })
    .populate("course", "courseName")
    .sort({ createdAt: -1 }).lean();
  res.json({ doubts });
});

export const createDoubt = asyncHandler(async (req, res) => {
  const { title, question, course, courseName } = req.body;
  if (!String(title || "").trim() || !String(question || "").trim()) {
    throw new ApiError(400, "Title and question are required.");
  }

  let courseId = null;
  let resolvedCourseName = String(courseName || "").trim();

  if (course) {
    if (!validId(course)) throw new ApiError(400, "Invalid course ID.");
    const accessibleCourse = await Course.findOne({ _id: course, ...courseAccessFilter(req.user) });
    if (!accessibleCourse) throw new ApiError(403, "You are not enrolled in this course.");
    courseId = accessibleCourse._id;
    resolvedCourseName = accessibleCourse.courseName;
  }

  const doubt = await Doubt.create({
    student: req.user.id,
    title: String(title).trim(),
    question: String(question).trim(),
    course: courseId,
    courseName: resolvedCourseName
  });

  res.status(201).json({ message: "Doubt submitted successfully.", doubt });
});

/* Notifications */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, "Invalid notification ID.");
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notification) throw new ApiError(404, "Notification not found.");
  res.json({ message: "Notification marked as read.", notification });
});

/* Progress and rank */
export const getRank = asyncHandler(async (req, res) => {
  const [totalStudents, completedCourses] = await Promise.all([
    User.countDocuments({ role: "student", isActive: { $ne: false } }),
    StudentProgress.countDocuments({ student: req.user._id, progressPercent: { $gte: 100 } })
  ]);

  // Placeholder rank until your LMS defines a scoring/ranking policy.
  // This is intentionally not presented as a real rank.
  res.json({ rank: null, totalStudents, completedCourses, message: "Student rank requires a defined scoring policy." });
});

// ==========================================
// GET STUDENT RESULTS
// GET /api/student/progress
// ==========================================

export const getProgress = asyncHandler(async (req, res) => {
  // ==========================================
  // GET STUDENT WITH ASSIGNED BATCH
  // ==========================================

  const student = await User.findById(req.user.id)
    .populate("batch", "batchName name code")
    .select("name userId batch")
    .lean();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found.",
    });
  }

  const studentBatch = student.batch;

  if (!studentBatch) {
    return res.status(200).json({
      success: true,
      count: 0,
      batch: null,
      results: [],
      message: "No batch assigned to this student.",
    });
  }

  // ==========================================
  // VALIDATE REQUESTED BATCH
  // ==========================================

  const requestedBatchId = req.query.batchId;

  const assignedBatchId = String(
    studentBatch._id || studentBatch
  );

  if (
    requestedBatchId &&
    requestedBatchId !== assignedBatchId
  ) {
    return res.status(403).json({
      success: false,
      message: "You cannot access results for another batch.",
    });
  }

  // ==========================================
  // FETCH PUBLISHED STUDENT RESULTS
  // ==========================================

  const results = await Result.find({
    student: student._id,
    published: true,
  })
    .select(
      "exam date obtained total remarks published createdAt"
    )
    .sort({ date: -1 })
    .lean();

  // ==========================================
  // FORMAT RESULTS WITH BATCH DETAILS
  // ==========================================

  const items = results.map((result) => ({
    resultId: result._id,

    batch: {
      _id: studentBatch._id,
      batchName:
        studentBatch.batchName ||
        studentBatch.name ||
        studentBatch.code ||
        "Batch",
      name:
        studentBatch.name ||
        studentBatch.batchName ||
        studentBatch.code ||
        "Batch",
      code: studentBatch.code || "",
    },

    exam: result.exam || "Assessment",

    date: result.date,

    obtained: Number(result.obtained) || 0,

    total: Number(result.total) || 0,

    percentage:
      Number(result.total) > 0
        ? Math.round(
            (Number(result.obtained) /
              Number(result.total)) *
              100
          )
        : 0,

    remarks: result.remarks || "",
  }));

  // ==========================================
  // RESPONSE
  // ==========================================

  return res.status(200).json({
    success: true,

    count: items.length,

    batch: {
      _id: studentBatch._id,
      batchName:
        studentBatch.batchName ||
        studentBatch.name ||
        studentBatch.code ||
        "Batch",
      name:
        studentBatch.name ||
        studentBatch.batchName ||
        studentBatch.code ||
        "Batch",
    },

    results: items,
  });
});

/* Payments: records only. Do not create or mark payments paid from this endpoint. */

export const getPayments = asyncHandler(async (req, res) => {
  // Fetch only the logged-in student's payment records
  const payments = await Payment.find({
    student: req.user.id,
  })
    .populate({
      path: "student",
      select: "name userId email phone",
    })
    .populate({
      path: "batch",
      select: "batch name code course trainer",
      populate: {
        path: "trainer",
        select: "name userId email phone",
      },
    })
    .populate({
      path: "recordedBy",
      select: "name userId",
    })
    .sort({
      createdAt: -1,
      dueDate: -1,
    })
    .lean();

  // -----------------------------------------------
  // NORMALIZE PAYMENT FEE VALUES
  // -----------------------------------------------

  const normalizedPayments = payments.map((payment) => {
    // Backward compatibility for older payment records
    const totalFees = Number(
      payment.totalFees ?? payment.amount ?? 0
    );

    const collectedFees = Number(
      payment.collectedFees ??
        (payment.status === "Paid" ? totalFees : 0)
    );

    const pendingFees = Number(
      payment.pendingFees ??
        Math.max(0, totalFees - collectedFees)
    );

    return {
      ...payment,

      // Keep amount synchronized with totalFees
      amount: totalFees,

      totalFees,
      collectedFees,
      pendingFees,
    };
  });

  // -----------------------------------------------
  // CALCULATE SUMMARY USING ACTUAL FEE AMOUNTS
  // -----------------------------------------------

  const totalFees = normalizedPayments.reduce(
    (sum, payment) => sum + payment.totalFees,
    0
  );

  const collectedFees = normalizedPayments.reduce(
    (sum, payment) => sum + payment.collectedFees,
    0
  );

  const pendingFees = normalizedPayments.reduce(
    (sum, payment) => sum + payment.pendingFees,
    0
  );

  // Status-based totals for Failed and Refunded
  const failedTotal = normalizedPayments
    .filter((payment) => payment.status === "Failed")
    .reduce(
      (sum, payment) => sum + payment.totalFees,
      0
    );

  const refundedTotal = normalizedPayments
    .filter((payment) => payment.status === "Refunded")
    .reduce(
      (sum, payment) => sum + payment.totalFees,
      0
    );

  // -----------------------------------------------
  // RESPONSE
  // -----------------------------------------------

  return res.status(200).json({
    success: true,
    message: "Student payment records fetched successfully.",

    summary: {
      totalPayments: normalizedPayments.length,

      // Overall fee totals
      totalFees,
      collectedFees,
      pendingFees,

      // Compatibility aliases
      paidTotal: collectedFees,
      pendingTotal: pendingFees,

      failedTotal,
      refundedTotal,

      currency: "INR",
    },

    payments: normalizedPayments,
  });
});


/* Career and placements */
export const getCareer = asyncHandler(async (req, res) => {
  const [resume, mockInterviews, activeJobs] = await Promise.all([
    Resume.findOne({ student: req.user._id }).lean(),
    MockInterview.countDocuments({
      $or: [{ student: req.user._id }, { student: null }],
      status: { $in: ["Available", "Booked"] }
    }),
    Job.countDocuments({ isActive: true })
  ]);

  res.json({
    career: {
      resumeUploaded: Boolean(resume),
      mockInterviewsAvailable: mockInterviews,
      activeJobs,
      preparation: { aptitude: 0, dsa: 0, mockInterviews: 0, portfolioProjects: 0 }
    }
  });
});

export const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ student: req.user._id }).lean();
  res.json({ resume });
});

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Please select a PDF resume to upload.");

  const allowedTypes = ["application/pdf"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    await fs.unlink(req.file.path).catch(() => { });
    throw new ApiError(400, "Only PDF resumes are allowed.");
  }

  const fileUrl = `/uploads/resumes/${path.basename(req.file.path)}`;
  const resume = await Resume.findOneAndUpdate(
    { student: req.user._id },
    {
      $set: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileUrl,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json({ message: "Resume uploaded successfully.", resume });
});

export const getMockInterviews = asyncHandler(async (req, res) => {
  const interviews = await MockInterview.find({
    $or: [{ student: req.user._id }, { student: null }]
  }).sort({ scheduledAt: 1 }).lean();
  res.json({ interviews });
});

export const mockInterviewAction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (!validId(id)) throw new ApiError(400, "Invalid interview ID.");
  if (!["book", "join"].includes(action)) throw new ApiError(400, "Action must be book or join.");

  const interview = await MockInterview.findOne({
    _id: id,
    $or: [{ student: req.user._id }, { student: null }]
  });
  if (!interview) throw new ApiError(404, "Mock interview not found.");

  if (action === "book") {
    if (interview.status !== "Available" && idOf(interview.student) !== idOf(req.user._id)) {
      throw new ApiError(409, "This interview slot is no longer available.");
    }
    interview.student = req.user._id;
    interview.status = "Booked";
    await interview.save();
    return res.json({ message: "Mock interview booked.", interview });
  }

  if (idOf(interview.student) !== idOf(req.user._id)) {
    throw new ApiError(403, "Book this interview before joining.");
  }
  if (!interview.meetingUrl) throw new ApiError(400, "Meeting link is not available yet.");
  res.json({ meetingUrl: interview.meetingUrl });
});

export const getJobs = asyncHandler(async (_req, res) => {
  const jobs = await Job.find({ isActive: true })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({ jobs });
});
