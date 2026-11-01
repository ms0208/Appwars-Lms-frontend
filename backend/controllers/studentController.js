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
import Payment from "../models/Payment.js";
import Resume from "../models/Resume.js";
import MockInterview from "../models/MockInterview.js";
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
    ...(user.batchId ? [{ batchId: user.batchId }] : [])
  ]
});

/* Profile */
export const getProfile = asyncHandler(async (req, res) => {
  res.json({
    user: {
      _id: req.user._id, userId: req.user.userId, name: req.user.name,
      email: req.user.email, phone: req.user.phone, role: req.user.role,
      batchId: req.user.batchId, batchName: req.user.batchName
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
    const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
    if (duplicate) throw new ApiError(409, "Email is already in use.");
    updates.email = normalizedEmail;
  }
  if (phone !== undefined) updates.phone = String(phone).trim();

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, {
    new: true, runValidators: true
  }).select("-password");

  res.json({ message: "Profile updated successfully.", user });
});

/* Courses and resources */
export const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find(courseAccessFilter(req.user))
    .select("courseName description thumbnail trainer batchId lessons isPublished createdAt")
    .populate("trainer", "name")
    .lean();

  const progress = await StudentProgress.find({ student: req.user._id }).lean();
  const progressByCourse = new Map(progress.map((item) => [idOf(item.course), item]));

  const result = courses.map((course) => {
    const p = progressByCourse.get(idOf(course._id));
    const totalLessons = p?.totalLessons || course.lessons?.length || 0;
    const completedLessons = p?.completedLessonCount ?? p?.completedLessons?.length ?? 0;
    const progressPercent = p?.progressPercent ??
      (totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0);

    return {
      ...course,
      courseName: course.courseName,
      trainerName: course.trainer?.name || "Trainer to be announced",
      totalLessons,
      completedLessons,
      progress: Math.min(100, Math.max(0, progressPercent))
    };
  });

  res.json({ courses: result });
});

export const getResources = asyncHandler(async (req, res) => {
  const courses = await Course.find(courseAccessFilter(req.user)).select("_id courseName").lean();
  const courseIds = courses.map((course) => course._id);
  const courseNames = new Map(courses.map((course) => [idOf(course._id), course.courseName]));

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
      { students: req.user._id },
      ...(req.user.batchId ? [{ batchId: req.user.batchId }] : []),
      ...(req.user.enrolledCourses?.length ? [{ course: { $in: req.user.enrolledCourses } }] : [])
    ]
  };

  const classes = await LiveClass.find(filter)
    .populate("trainer", "name")
    .populate("course", "courseName")
    .sort({ date: 1 }).lean();

  const reminderDocs = await StudentReminder.find({ student: req.user._id }).lean();
  const reminderMap = new Map(reminderDocs.map((item) => [idOf(item.liveClass), item.enabled]));

  res.json({
    classes: classes.map((item) => ({
      ...item,
      trainerName: item.trainer?.name || "Trainer to be announced",
      courseName: item.course?.courseName || "",
      meetingUrl: item.meetingUrl,
      reminderEnabled: reminderMap.get(idOf(item._id)) || false
    }))
  });
});

export const setLiveClassReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) throw new ApiError(400, "Invalid live class ID.");

  const liveClass = await LiveClass.findById(id);
  if (!liveClass) throw new ApiError(404, "Live class not found.");

  const allowed =
    (liveClass.students || []).some((studentId) => idOf(studentId) === idOf(req.user._id)) ||
    (req.user.batchId && idOf(liveClass.batchId) === idOf(req.user.batchId)) ||
    (liveClass.course && (req.user.enrolledCourses || []).some((courseId) => idOf(courseId) === idOf(liveClass.course)));

  if (!allowed) throw new ApiError(403, "You are not assigned to this live class.");

  const enabled = Boolean(req.body.enabled);
  const reminder = await StudentReminder.findOneAndUpdate(
    { student: req.user._id, liveClass: id },
    { $set: { enabled } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.json({ message: enabled ? "Reminder enabled." : "Reminder disabled.", reminder });
});

/* Doubts */
export const getDoubts = asyncHandler(async (req, res) => {
  const doubts = await Doubt.find({ student: req.user._id })
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
    student: req.user._id,
    title: String(title).trim(),
    question: String(question).trim(),
    course: courseId,
    courseName: resolvedCourseName
  });

  res.status(201).json({ message: "Doubt submitted successfully.", doubt });
});

/* Notifications */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, "Invalid notification ID.");
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
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

export const getProgress = asyncHandler(async (req, res) => {
  const courses = await Course.find(courseAccessFilter(req.user)).select("courseName lessons").lean();
  const progress = await StudentProgress.find({ student: req.user._id }).lean();
  const progressByCourse = new Map(progress.map((item) => [idOf(item.course), item]));

  const items = courses.map((course) => {
    const p = progressByCourse.get(idOf(course._id));
    const totalLessons = p?.totalLessons || course.lessons?.length || 0;
    const completedLessons = p?.completedLessonCount ?? p?.completedLessons?.length ?? 0;
    const progressPercent = p?.progressPercent ??
      (totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0);
    return {
      courseId: course._id,
      courseName: course.courseName,
      totalLessons,
      completedLessons,
      progress: Math.min(100, Math.max(0, progressPercent))
    };
  });

  const averageProgress = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length)
    : 0;

  res.json({ averageProgress, courses: items });
});

/* Payments: records only. Do not create or mark payments paid from this endpoint. */
export const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ student: req.user._id })
    .sort({ paymentDate: -1, createdAt: -1 }).lean();
  const paidTotal = payments
    .filter((payment) => payment.status === "Paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  res.json({ payments, paidTotal, currency: "INR" });
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
