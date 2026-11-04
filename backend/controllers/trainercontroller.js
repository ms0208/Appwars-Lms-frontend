import mongoose from "mongoose";

import User from "../models/user.js";
import Batch from "../models/Batch.js";
import Attendance from "../models/Attendance.js";
import Announcement from "../models/Announcements.js";
import AssignmentSubmission from "../models/TrainerAssignmentSubmission.js";
import Assignment from "../models/Assignement.js";
import Doubt from "../models/TrainerDoubts.js";
import fs from "fs/promises";
import path from "path";

// UPLOAD Documents 
const ASSIGNMENT_UPLOAD_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "assignments"
);

// Validate the actual PDF file signature.
const isValidPDF = async (filePath) => {
  try {
    const fileHandle = await fs.open(filePath, "r");

    try {
      const buffer = Buffer.alloc(5);
      const { bytesRead } = await fileHandle.read(
        buffer,
        0,
        5,
        0
      );

      return (
        bytesRead === 5 &&
        buffer.toString("ascii") === "%PDF-"
      );
    } finally {
      await fileHandle.close();
    }
  } catch {
    return false;
  }
};

// Delete only files inside uploads/assignments.
const deleteAssignmentFile = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") return;

  try {
    const filename = path.basename(fileUrl);

    // Only generated PDF filenames are accepted.
    if (!/^[a-f0-9-]{36}\.pdf$/i.test(filename)) {
      return;
    }

    const filePath = path.resolve(
      ASSIGNMENT_UPLOAD_DIR,
      filename
    );

    if (!filePath.startsWith(ASSIGNMENT_UPLOAD_DIR + path.sep)) {
      return;
    }

    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Assignment file deletion error:", error);
    }
  }
};

// FormData sends arrays as strings.
const parseSubmissionTypes = (value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").map((item) => item.trim());
    }
  }

  return ["text", "url"];
};

// ==========================================
// ERROR HANDLER
// ==========================================

function sendError(res, error, fallback = "Something went wrong.") {
  console.error("Trainer API error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid database ID.",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallback,
  });
}

// ==========================================
// VALIDATE OBJECT ID
// ==========================================

function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
}

// ==========================================
// DATE RANGE
// ==========================================

function getDayRange(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

// ==========================================
// GET TRAINER BATCH
// ==========================================

async function getTrainerBatch(batchId, trainerId) {
  if (!isValidObjectId(batchId)) {
    return null;
  }

  return Batch.findOne({
    _id: batchId,
    trainer: trainerId,
    isActive: true,
  });
}

// ==========================================
// GET ALL ASSIGNED BATCHES
// ==========================================

async function getTrainerBatches(trainerId) {
  return Batch.find({
    trainer: trainerId,
    isActive: true,
  }).sort({ createdAt: -1 });
}

// ==========================================
// GET NUMBER OF STUDENTS BY BATCH
// IMPORTANT FUNCTION
// ==========================================

async function getBatchStudentCount(batchName) {
  if (!batchName) {
    return 0;
  }

  return User.countDocuments({
    role: "Student",
    isActive: true,
    batch: batchName.trim(),
  });
}

// ==========================================
// 1. TRAINER DASHBOARD
// GET /api/trainer/dashboard
// ==========================================

export const getDashboard = async (req, res) => {
  try {
    const trainerId = req.user.id;

    // Get logged-in trainer.
    const trainer = await User.findById(trainerId).select(
      "-password"
    );

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    // Find all active batches assigned to this trainer.
    const batches = await Batch.find({
      trainer: trainerId,
      isActive: true,
    }).lean();

    // Get assigned batch names.
    const batchNames = batches
      .map((batch) => batch.batch)
      .filter(Boolean);

    // Count all active students in the assigned batches.
    const totalStudents = batchNames.length
      ? await User.countDocuments({
          role: "Student",
          isActive: true,
          batch: { $in: batchNames },
        })
      : 0;

    // Calculate student count for each batch.
    const batchesWithStudentCount = await Promise.all(
      batches.map(async (batch) => {
        const studentCount = await User.countDocuments({
          role: "Student",
          isActive: true,
          batch: batch.batch,
        });

        return {
          ...batch,
          studentCount,
        };
      })
    );

    return res.status(200).json({
      success: true,

      trainer,

      stats: {
        totalStudents,
        assignedBatches: batches.length,
      },

      batches: batchesWithStudentCount,
    });
  } catch (error) {
    console.error("Trainer Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load trainer dashboard",
      error: error.message,
    });
  }
};

// ==========================================
// 2. ASSIGNED BATCHES
// GET /api/trainer/batches
// ==========================================

export const getAssignedBatches = async (req, res) => {
  try {
    const trainerId = req.user.id;

    const batches = await Batch.find({
      trainer: trainerId,
      isActive: true,
    }).lean();

    const batchesWithStudentCount = await Promise.all(
      batches.map(async (batch) => {
        const studentCount = await User.countDocuments({
          role: "Student",
          isActive: true,
          batch: batch.batch,
        });

        return {
          ...batch,
          studentCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: batchesWithStudentCount.length,
      data: batchesWithStudentCount,
    });
  } catch (error) {
    console.error("Assigned Batches Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assigned batches",
      error: error.message,
    });
  }
};

// ==========================================
// 3. STUDENTS IN A BATCH
// GET /api/trainer/batches/:batchId/students
// ==========================================

export const getBatchStudents = async (req, res) => {
  try {
    const batch = await getTrainerBatch(
      req.params.batchId,
      req.user.id
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const students = await User.find({
      role: "Student",
      isActive: true,
      batch: batch.batch,
    })
      .select("userId name email batch")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,

      batch: {
        _id: batch._id,
        batch: batch.batch,
        course: batch.course,
      },

      count: students.length,

      students: students.map((student, index) => ({
        ...student,
        roll: String(index + 1).padStart(2, "0"),
      })),
    });
  } catch (error) {
    return sendError(res, error, "Unable to load batch students.");
  }
};

// ==========================================
// 4. POST ANNOUNCEMENT
// POST /api/trainer/announcements
// ==========================================

export const createAnnouncement = async (req, res) => {
  try {
    const { batchId, message } = req.body;

    if (!batchId || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Batch ID and announcement message are required.",
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Announcement cannot exceed 2000 characters.",
      });
    }

    const batch = await getTrainerBatch(batchId, req.user.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const announcement = await Announcement.create({
      batch: batch._id,
      trainer: req.user.id,
      message: message.trim(),
    });

    await announcement.populate("batch", "batch course");

    return res.status(201).json({
      success: true,
      message: "Announcement posted successfully.",
      announcement,
    });
  } catch (error) {
    return sendError(res, error, "Unable to post announcement.");
  }
};

// ==========================================
// 5. GET ANNOUNCEMENTS
// GET /api/trainer/announcements
// ==========================================

export const getAnnouncements = async (req, res) => {
  try {
    const filter = {
      trainer: req.user.id,
    };

    if (req.query.batchId) {
      const batch = await getTrainerBatch(
        req.query.batchId,
        req.user.id
      );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found or not assigned to you.",
        });
      }

      filter.batch = batch._id;
    } else {
      const batches = await getTrainerBatches(req.user.id);

      filter.batch = {
        $in: batches.map((batch) => batch._id),
      };
    }

    const announcements = await Announcement.find(filter)
      .populate("batch", "batch course")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load announcements.");
  }
};

// ==========================================
// 6. SAVE ATTENDANCE
// PUT /api/trainer/attendance
// ==========================================

export const saveAttendance = async (req, res) => {
  try {
    const { batchId, date, records } = req.body;

    if (!batchId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Batch ID and attendance records are required.",
      });
    }

    const batch = await getTrainerBatch(batchId, req.user.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const range = getDayRange(date);

    if (!range) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid attendance date.",
      });
    }

    const uniqueStudentIds = new Set();

    for (const record of records) {
      if (
        !record.studentId ||
        !isValidObjectId(record.studentId) ||
        !["Present", "Absent"].includes(record.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Each record needs a valid student ID and status.",
        });
      }

      if (uniqueStudentIds.has(String(record.studentId))) {
        return res.status(400).json({
          success: false,
          message: "Duplicate student IDs were provided.",
        });
      }

      uniqueStudentIds.add(String(record.studentId));
    }

    const students = await User.find({
      _id: { $in: [...uniqueStudentIds] },
      role: "Student",
      isActive: true,
      batch: batch.batch,
    })
      .select("_id")
      .lean();

    if (students.length !== uniqueStudentIds.size) {
      return res.status(400).json({
        success: false,
        message:
          "One or more students are inactive, invalid, or not in this batch.",
      });
    }

    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          batch: batch._id,
          student: record.studentId,
          date: {
            $gte: range.start,
            $lt: range.end,
          },
        },

        update: {
          $set: {
            trainer: req.user.id,
            status: record.status,
            date: range.start,
          },

          $setOnInsert: {
            batch: batch._id,
            student: record.studentId,
          },
        },

        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations, { ordered: true });

    const savedRecords = await Attendance.find({
      batch: batch._id,
      date: {
        $gte: range.start,
        $lt: range.end,
      },
    })
      .populate("student", "userId name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Attendance saved successfully.",
      count: savedRecords.length,
      attendance: savedRecords,
    });
  } catch (error) {
    return sendError(res, error, "Unable to save attendance.");
  }
  console.log(
  "Attendance model:",
  Attendance.modelName
);

console.log(
  "Attendance schema paths:",
  Object.keys(Attendance.schema.paths)
);

console.log(
  "Student field exists:",
  Boolean(Attendance.schema.path("student"))
);
};

// ==========================================
// 7. GET ATTENDANCE
// GET /api/trainer/attendance
// ==========================================

export const getAttendance = async (req, res) => {
  try {
    const { batchId, date } = req.query;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "Batch ID is required.",
      });
    }

    const batch = await getTrainerBatch(batchId, req.user.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const range = getDayRange(date);

    if (!range) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid attendance date.",
      });
    }

    const attendance = await Attendance.find({
      trainer: req.user.id,
      batch: batch._id,
      date: {
        $gte: range.start,
        $lt: range.end,
      },
    })
      .populate("student", "userId name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      batch: batch.batch,
      date: range.start,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load attendance.");
  }
};

// ==========================================
// 8. GET ASSIGNMENT SUBMISSIONS
// GET /api/trainer/submissions
// ==========================================

export const getSubmissions = async (req, res) => {
  try {
    const filter = {
      trainer: req.user.id,
    };

    if (req.query.batchId) {
      const batch = await getTrainerBatch(
        req.query.batchId,
        req.user.id
      );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found or not assigned to you.",
        });
      }

      filter.batch = batch._id;
    }

    if (req.query.result) {
      if (
        !["Pending", "Graded", "Needs revision"].includes(
          req.query.result
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid result filter.",
        });
      }

      filter.result = req.query.result;
    }

    const submissions = await AssignmentSubmission.find(filter)
      .populate("student", "userId name email")
      .populate("batch", "batch course")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load submissions.");
  }
};

// ==========================================
// 9. GRADE ASSIGNMENT
// PATCH /api/trainer/submissions/:submissionId/grade
// ==========================================

export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const { marks, result, feedback = "" } = req.body;

    if (!isValidObjectId(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    if (!["Graded", "Needs revision", "Pending"].includes(result)) {
      return res.status(400).json({
        success: false,
        message: "Invalid grading result.",
      });
    }

    if (typeof feedback !== "string" || feedback.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be text under 5000 characters.",
      });
    }

    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      trainer: req.user.id,
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found or not assigned to you.",
      });
    }

    if (
      result !== "Pending" &&
      (marks === undefined ||
        marks === null ||
        marks === "" ||
        !Number.isFinite(Number(marks)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid marks are required for grading.",
      });
    }

    if (result === "Pending") {
      submission.marks = null;
      submission.gradedAt = null;
    } else {
      const numericMarks = Number(marks);

      if (
        numericMarks < 0 ||
        numericMarks > submission.maxMarks
      ) {
        return res.status(400).json({
          success: false,
          message: `Marks must be between 0 and ${submission.maxMarks}.`,
        });
      }

      submission.marks = numericMarks;
      submission.gradedAt = new Date();
    }

    submission.result = result;
    submission.feedback = feedback.trim();

    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Grade saved successfully.",
      submission,
    });
  } catch (error) {
    return sendError(res, error, "Unable to save grade.");
  }
};

// ==========================================
// 10. GET STUDENT PERFORMANCE
// GET /api/trainer/performance
// ==========================================

export const getStudentPerformance = async (req, res) => {
  try {
    const batches = await getTrainerBatches(req.user.id);

    let selectedBatches = batches;

    if (req.query.batchId) {
      const batch = await getTrainerBatch(
        req.query.batchId,
        req.user.id
      );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found or not assigned to you.",
        });
      }

      selectedBatches = [batch];
    }

    const performance = await Promise.all(
      selectedBatches.map(async (batch) => {
        const students = await User.find({
          role: "Student",
          isActive: true,
          batch: batch.batch,
        })
          .select("_id userId name email")
          .sort({ name: 1 })
          .lean();

        const studentResults = await Promise.all(
          students.map(async (student) => {
            const graded = await AssignmentSubmission.find({
              trainer: req.user.id,
              batch: batch._id,
              student: student._id,
              result: "Graded",
              marks: { $ne: null },
            })
              .select("marks maxMarks")
              .lean();

            const totalMarks = graded.reduce(
              (total, item) => total + item.marks,
              0
            );

            const totalPossible = graded.reduce(
              (total, item) => total + item.maxMarks,
              0
            );

            const percentage = totalPossible
              ? Math.round((totalMarks / totalPossible) * 100)
              : null;

            return {
              studentId: student._id,
              userId: student.userId,
              name: student.name,
              email: student.email,
              gradedAssignments: graded.length,
              totalMarks,
              totalPossible,
              percentage,
            };
          })
        );

        return {
          batchId: batch._id,
          batch: batch.batch,
          course: batch.course,
          students: studentResults,
        };
      })
    );

    return res.status(200).json({
      success: true,
      performance,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load student performance.");
  }
};

// ==========================================
// 11. GET OPEN DOUBTS
// GET /api/trainer/doubts
// ==========================================

export const getOpenDoubts = async (req, res) => {
  try {
    const batches = await getTrainerBatches(req.user.id);

    const batchIds = batches.map((batch) => batch._id);

    const filter = {
      batch: { $in: batchIds },
      status: "Open",
    };

    if (req.query.batchId) {
      const batch = await getTrainerBatch(
        req.query.batchId,
        req.user.id
      );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found or not assigned to you.",
        });
      }

      filter.batch = batch._id;
    }

    const doubts = await Doubt.find(filter)
      .populate("student", "userId name email")
      .populate("batch", "batch course")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: doubts.length,
      doubts,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load open doubts.");
  }
};

// ==========================================
// 12. REPLY TO DOUBT
// POST /api/trainer/doubts/:doubtId/replies
// ==========================================

export const replyToDoubt = async (req, res) => {
  try {
    const { doubtId } = req.params;

    const { message } = req.body;

    if (!isValidObjectId(doubtId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doubt ID.",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required.",
      });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot exceed 5000 characters.",
      });
    }

    const assignedBatches = await getTrainerBatches(req.user.id);

    const doubt = await Doubt.findOne({
      _id: doubtId,
      batch: {
        $in: assignedBatches.map((batch) => batch._id),
      },
    });

    if (!doubt) {
      return res.status(404).json({
        success: false,
        message: "Doubt not found in your assigned batches.",
      });
    }

    if (doubt.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "This doubt has been closed.",
      });
    }

    doubt.replies.push({
      trainer: req.user.id,
      message: message.trim(),
      repliedAt: new Date(),
    });

    doubt.status = "Answered";

    await doubt.save();

    return res.status(200).json({
      success: true,
      message: "Reply submitted successfully.",
      doubt,
    });
  } catch (error) {
    return sendError(res, error, "Unable to submit doubt reply.");
  }
};

// ==========================================
// 13. GET TRAINER PROFILE
// GET /api/trainer/profile
// ==========================================

export const getTrainerProfile = async (req, res) => {
  try {
    const trainer = await User.findOne({
      _id: req.user.id,
      role: "Trainer",
    }).select("-password");

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer profile not found.",
      });
    }

    return res.status(200).json({
      success: true,

      trainer: {
        _id: trainer._id,
        userId: trainer.userId,
        name: trainer.name,
        email: trainer.email,
        role: trainer.role,
        isActive: trainer.isActive,
        trainerDetails: trainer.trainerDetails || {},
        createdAt: trainer.createdAt,
        updatedAt: trainer.updatedAt,
      },
    });
  } catch (error) {
    return sendError(res, error, "Unable to load trainer profile.");
  }
};

// ==========================================
// 14. UPDATE TRAINER PROFILE
// PUT /api/trainer/profile
// ==========================================

export const updateTrainerProfile = async (req, res) => {
  try {
    const trainer = await User.findOne({
      _id: req.user.id,
      role: "Trainer",
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer profile not found.",
      });
    }

    const {
      name,
      phone,
      expertise,
      courses,
      experience,
      availability,
    } = req.body;

    // NAME

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid trainer name.",
        });
      }

      trainer.name = name.trim();
    }

    // PHONE

    if (phone !== undefined) {
      if (
        typeof phone !== "string" ||
        !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number.",
        });
      }

      trainer.trainerDetails.phone = phone.trim();
    }

    // EXPERTISE

    if (expertise !== undefined) {
      if (
        typeof expertise !== "string" ||
        expertise.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: "Expertise must be text under 200 characters.",
        });
      }

      trainer.trainerDetails.expertise = expertise.trim();
    }

    // COURSES

    if (courses !== undefined) {
      if (
        !Array.isArray(courses) ||
        courses.some(
          (course) =>
            typeof course !== "string" ||
            !course.trim() ||
            course.trim().length > 100
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Courses must be an array of valid course names.",
        });
      }

      trainer.trainerDetails.courses = [
        ...new Set(courses.map((course) => course.trim())),
      ];
    }

    // EXPERIENCE

    if (experience !== undefined) {
      const numericExperience = Number(experience);

      if (
        !Number.isFinite(numericExperience) ||
        numericExperience < 0 ||
        numericExperience > 60
      ) {
        return res.status(400).json({
          success: false,
          message: "Experience must be between 0 and 60 years.",
        });
      }

      trainer.trainerDetails.experience = numericExperience;
    }

    // AVAILABILITY

    if (availability !== undefined) {
      const allowedAvailability = [
        "Available",
        "Busy",
        "Unavailable",
      ];

      if (!allowedAvailability.includes(availability)) {
        return res.status(400).json({
          success: false,
          message: "Invalid availability status.",
        });
      }

      trainer.trainerDetails.availability = availability;
    }

    await trainer.save();

    const updatedTrainer = await User.findById(trainer._id)
      .select("-password")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Trainer profile updated successfully.",

      trainer: {
        _id: updatedTrainer._id,
        userId: updatedTrainer.userId,
        name: updatedTrainer.name,
        email: updatedTrainer.email,
        role: updatedTrainer.role,
        isActive: updatedTrainer.isActive,
        trainerDetails: updatedTrainer.trainerDetails || {},
        createdAt: updatedTrainer.createdAt,
        updatedAt: updatedTrainer.updatedAt,
      },
    });
  } catch (error) {
    return sendError(res, error, "Unable to update trainer profile.");
  }
};

// ==========================================
// 15. GET SINGLE ASSIGNED BATCH DETAILS
// GET /api/trainer/batches/:batchId
// ==========================================

export const getBatchDetails = async (req, res) => {
  try {
    const batch = await getTrainerBatch(
      req.params.batchId,
      req.user.id
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const students = await User.find({
      role: "Student",
      isActive: true,
      batch: batch.batch,
    })
      .select("userId name email batch createdAt")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,

      batch: {
        _id: batch._id,
        batch: batch.batch,
        course: batch.course,
        trainer: batch.trainer,
        assignedDate: batch.assignedDate,
        startDate: batch.startDate,
        durationMonths: batch.durationMonths,
        status: batch.status,
        description: batch.description,
        isActive: batch.isActive,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      },

      // Exact number of students in the assigned batch
      studentCount: students.length,

      students: students.map((student, index) => ({
        ...student,
        roll: String(index + 1).padStart(2, "0"),
      })),
    });
  } catch (error) {
    return sendError(res, error, "Unable to load batch details.");
  }
};
// ==========================================
// ASSIGNMENTS
// Trainer creates and manages own assignments
// ==========================================

// ==========================================
// 1. CREATE ASSIGNMENT
// POST /api/trainer/assignments
// ==========================================

export const createAssignment = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const {
      title,
      description,
      instructions = "",
      batchId,
      course,
      dueDate,
      totalMarks,
      status = "Published",
      isPublished,
    } = req.body;

    const trainerId = req.user.id;

    if (req.file) {
      uploadedFilePath = req.file.path;
    }

    // Required fields
    if (
      !title?.trim() ||
      !description?.trim() ||
      !batchId ||
      !dueDate ||
      totalMarks === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, description, batch, due date and total marks are required.",
      });
    }

    if (!isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    // Verify trainer owns the batch.
    const batch = await getTrainerBatch(batchId, trainerId);

    if (!batch) {
      return res.status(403).json({
        success: false,
        message:
          "You can only create assignments for your assigned batches.",
      });
    }

    const parsedDueDate = new Date(dueDate);
    const parsedMarks = Number(totalMarks);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid due date.",
      });
    }

    if (!Number.isFinite(parsedMarks) || parsedMarks < 1) {
      return res.status(400).json({
        success: false,
        message: "Total marks must be at least 1.",
      });
    }

    if (!["Draft", "Published", "Closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment status.",
      });
    }

    // Course is optional.
    if (course && !isValidObjectId(course)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const allowedTypes = parseSubmissionTypes(
      req.body.allowedSubmissionTypes
    );

    if (
      !allowedTypes.length ||
      allowedTypes.some(
        (type) => !["text", "url"].includes(type)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Allowed submission types must contain text or url.",
      });
    }

    // Verify the actual file content.
    if (req.file) {
      const validPDF = await isValidPDF(req.file.path);

      if (!validPDF) {
        return res.status(400).json({
          success: false,
          message: "The uploaded document is not a valid PDF.",
        });
      }
    }

    const published =
      typeof isPublished === "boolean"
        ? isPublished
        : isPublished === "true"
          ? true
          : isPublished === "false"
            ? false
            : status === "Published";

    // Public URL served by Express.
    const attachmentUrl = req.file
      ? `/uploads/assignments/${req.file.filename}`
      : "";

    const assignment = await Assignment.create({
      title: title.trim(),
      description: description.trim(),
      instructions: String(instructions || "").trim(),

      batch: batch._id,
      batchId: batch.batch,

      course: course || undefined,

      trainer: trainerId,
      createdBy: trainerId,

      dueDate: parsedDueDate,
      totalMarks: parsedMarks,

      attachmentUrl,

      allowedSubmissionTypes: [...new Set(allowedTypes)],

      status,
      isPublished: published,
    });

    await assignment.populate([
      { path: "batch", select: "batch course" },
      { path: "course", select: "title courseName code" },
      { path: "trainer", select: "name email userId" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully.",
      assignment,
    });
  } catch (error) {
    // Remove the uploaded file if assignment creation fails.
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }

    return sendError(
      res,
      error,
      "Unable to create assignment."
    );
  }
};

// ==========================================
// 2. GET TRAINER ASSIGNMENTS
// GET /api/trainer/assignments
// ==========================================

export const getAssignments = async (req, res) => {
  try {
    const trainerId = req.user.id;

    const assignedBatches = await getTrainerBatches(trainerId);
    const assignedBatchIds = assignedBatches.map((batch) => batch._id);

    const filter = {
      trainer: trainerId,
      batch: { $in: assignedBatchIds },
    };

    if (req.query.batchId) {
      if (!isValidObjectId(req.query.batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      const batch = await getTrainerBatch(
        req.query.batchId,
        trainerId
      );

      if (!batch) {
        return res.status(403).json({
          success: false,
          message: "This batch is not assigned to you.",
        });
      }

      filter.batch = batch._id;
    }

    if (req.query.status) {
      if (!["Draft", "Published", "Closed"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const assignments = await Assignment.find(filter)
      .populate("batch", "batch course")
      .populate("course", "title courseName code")
      .populate("trainer", "name email userId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    return sendError(res, error, "Unable to fetch assignments.");
  }
};

// ==========================================
// 3. UPDATE ASSIGNMENT
// PATCH /api/trainer/assignments/:assignmentId
// ==========================================

export const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const trainerId = req.user.id;

    if (!isValidObjectId(assignmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    // Trainer can update only their own assignment.
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      trainer: trainerId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or you do not own this assignment.",
      });
    }

    const {
      title,
      description,
      instructions,
      batchId,
      course,
      dueDate,
      totalMarks,
      attachmentUrl,
      allowedSubmissionTypes,
      status,
      isPublished,
    } = req.body;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Assignment title is required.",
        });
      }

      assignment.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Assignment description is required.",
        });
      }

      assignment.description = description.trim();
    }

    if (instructions !== undefined) {
      assignment.instructions = String(instructions).trim();
    }

    if (batchId !== undefined) {
      if (!isValidObjectId(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      const batch = await getTrainerBatch(batchId, trainerId);

      if (!batch) {
        return res.status(403).json({
          success: false,
          message: "You cannot assign work to a batch not assigned to you.",
        });
      }

      assignment.batch = batch._id;
      assignment.batchId = batch.batch;
    }

    if (course !== undefined) {
      if (course && !isValidObjectId(course)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      assignment.course = course || null;
    }

    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid due date.",
        });
      }

      assignment.dueDate = parsedDate;
    }

    if (totalMarks !== undefined) {
      const parsedMarks = Number(totalMarks);

      if (!Number.isFinite(parsedMarks) || parsedMarks < 1) {
        return res.status(400).json({
          success: false,
          message: "Total marks must be at least 1.",
        });
      }

      assignment.totalMarks = parsedMarks;
    }

    if (attachmentUrl !== undefined) {
      if (typeof attachmentUrl !== "string") {
        return res.status(400).json({
          success: false,
          message: "Attachment URL must be text.",
        });
      }

      assignment.attachmentUrl = attachmentUrl.trim();
    }

    if (allowedSubmissionTypes !== undefined) {
      if (
        !Array.isArray(allowedSubmissionTypes) ||
        allowedSubmissionTypes.length === 0 ||
        allowedSubmissionTypes.some(
          (type) => !["text", "url"].includes(type)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid allowed submission types.",
        });
      }

      assignment.allowedSubmissionTypes = [
        ...new Set(allowedSubmissionTypes),
      ];
    }

    if (status !== undefined) {
      if (!["Draft", "Published", "Closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status.",
        });
      }

      assignment.status = status;

      if (isPublished === undefined) {
        assignment.isPublished = status === "Published";
      }
    }

    if (isPublished !== undefined) {
      if (typeof isPublished !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isPublished must be true or false.",
        });
      }

      assignment.isPublished = isPublished;

      if (status === undefined) {
        assignment.status = isPublished ? "Published" : "Draft";
      }
    }

    await assignment.save();

    await assignment.populate([
      { path: "batch", select: "batch course" },
      { path: "course", select: "title courseName code" },
      { path: "trainer", select: "name email userId" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully.",
      assignment,
    });
  } catch (error) {
    return sendError(res, error, "Unable to update assignment.");
  }
};

// ==========================================
// 4. DELETE ASSIGNMENT
// DELETE /api/trainer/assignments/:assignmentId
// ==========================================

export const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    if (!isValidObjectId(assignmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    // Only the trainer who created the assignment can delete it.
    const assignment = await Assignment.findOneAndDelete({
      _id: assignmentId,
      trainer: req.user.id,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or you do not own this assignment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully.",
      assignmentId,
    });
  } catch (error) {
    return sendError(res, error, "Unable to delete assignment.");
  }
};