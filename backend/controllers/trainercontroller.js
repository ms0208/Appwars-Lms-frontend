import mongoose from "mongoose";

import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Attendance from "../models/Attendance.js";
import Announcement from "../models/Announcements.js";
import AssignmentSubmission from "../models/TrainerAssignmentSubmission.js";
import Doubt from "../models/TrainerDoubts.js";

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

function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
}

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

async function getTrainerBatches(trainerId) {
  return Batch.find({
    trainer: trainerId,
    isActive: true,
  }).sort({ createdAt: -1 });
}

/*
|--------------------------------------------------------------------------
| 1. TRAINER DASHBOARD
|--------------------------------------------------------------------------
| GET /api/trainer/dashboard
*/
export const getDashboard = async (req, res) => {
  try {
    const trainerId = req.user.id;

    const batches = await getTrainerBatches(trainerId);
    const batchIds = batches.map((batch) => batch._id);

    const batchNames = batches.map((batch) => batch.batch);

    const [students, pendingReviews, openDoubts, announcements] =
      await Promise.all([
        batchNames.length
          ? User.countDocuments({
              role: "Student",
              isActive: true,
              batch: { $in: batchNames },
            })
          : 0,

        AssignmentSubmission.countDocuments({
          trainer: trainerId,
          result: { $in: ["Pending", "Needs revision"] },
        }),

        Doubt.countDocuments({
          batch: { $in: batchIds },
          status: "Open",
        }),

        Announcement.find({
          trainer: trainerId,
          batch: { $in: batchIds },
        })
          .populate("batch", "batch course")
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    const batchData = await Promise.all(
      batches.map(async (batch) => {
        const studentCount = await User.countDocuments({
          role: "Student",
          isActive: true,
          batch: batch.batch,
        });

        return {
          _id: batch._id,
          batch: batch.batch,
          course: batch.course,
          students: studentCount,
          status: batch.status,
          assignedDate: batch.assignedDate,
          startDate: batch.startDate,
          durationMonths: batch.durationMonths,
          description: batch.description,
        };
      })
    );

    return res.status(200).json({
      success: true,
      dashboard: {
        stats: {
          assignedBatches: batches.length,
          runningBatches: batches.filter(
            (batch) => batch.status === "Running"
          ).length,
          totalStudents: students,
          pendingReviews,
          openDoubts,
        },
        batches: batchData,
        announcements,
      },
    });
  } catch (error) {
    return sendError(res, error, "Unable to load trainer dashboard.");
  }
};

/*
|--------------------------------------------------------------------------
| 2. ASSIGNED BATCHES
|--------------------------------------------------------------------------
| GET /api/trainer/batches
*/
export const getAssignedBatches = async (req, res) => {
  try {
    const batches = await getTrainerBatches(req.user.id);

    const result = await Promise.all(
      batches.map(async (batch) => {
        const students = await User.countDocuments({
          role: "Student",
          isActive: true,
          batch: batch.batch,
        });

        return {
          _id: batch._id,
          batch: batch.batch,
          course: batch.course,
          students,
          status: batch.status,
          assignedDate: batch.assignedDate,
          startDate: batch.startDate,
          durationMonths: batch.durationMonths,
          description: batch.description,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: result.length,
      batches: result,
    });
  } catch (error) {
    return sendError(res, error, "Unable to load assigned batches.");
  }
};

/*
|--------------------------------------------------------------------------
| 3. STUDENTS IN A BATCH
|--------------------------------------------------------------------------
| GET /api/trainer/batches/:batchId/students
*/
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

/*
|--------------------------------------------------------------------------
| 4. POST ANNOUNCEMENT
|--------------------------------------------------------------------------
| POST /api/trainer/announcements
| Body: { batchId, message }
*/
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

/*
|--------------------------------------------------------------------------
| 5. GET ANNOUNCEMENTS
|--------------------------------------------------------------------------
| GET /api/trainer/announcements?batchId=<MongoDB ID>
*/
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
      filter.batch = { $in: batches.map((batch) => batch._id) };
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

/*
|--------------------------------------------------------------------------
| 6. SAVE ATTENDANCE
|--------------------------------------------------------------------------
| PUT /api/trainer/attendance
|
| Body:
| {
|   "batchId": "<MongoDB batch ID>",
|   "date": "2026-10-29",
|   "records": [
|     { "studentId": "<MongoDB student ID>", "status": "Present" },
|     { "studentId": "<MongoDB student ID>", "status": "Absent" }
|   ]
| }
*/
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
      date: { $gte: range.start, $lt: range.end },
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
};

/*
|--------------------------------------------------------------------------
| 7. GET ATTENDANCE
|--------------------------------------------------------------------------
| GET /api/trainer/attendance?batchId=<ID>&date=2026-10-29
*/
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
      date: { $gte: range.start, $lt: range.end },
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

/*
|--------------------------------------------------------------------------
| 8. GET ASSIGNMENT SUBMISSIONS
|--------------------------------------------------------------------------
| GET /api/trainer/submissions
| Optional: ?batchId=<ID>&result=Pending
*/
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

/*
|--------------------------------------------------------------------------
| 9. GRADE ASSIGNMENT
|--------------------------------------------------------------------------
| PATCH /api/trainer/submissions/:submissionId/grade
|
| Body:
| {
|   "marks": 42,
|   "result": "Graded",
|   "feedback": "Good work."
| }
*/
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

    if (
      !["Graded", "Needs revision", "Pending"].includes(result)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid grading result.",
      });
    }

    if (
      typeof feedback !== "string" ||
      feedback.length > 5000
    ) {
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

/*
|--------------------------------------------------------------------------
| 10. GET STUDENT PERFORMANCE
|--------------------------------------------------------------------------
| GET /api/trainer/performance?batchId=<ID>
*/
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

/*
|--------------------------------------------------------------------------
| 11. GET OPEN DOUBTS
|--------------------------------------------------------------------------
| GET /api/trainer/doubts
| Optional: ?batchId=<ID>
*/
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

/*
|--------------------------------------------------------------------------
| 12. REPLY TO DOUBT
|--------------------------------------------------------------------------
| POST /api/trainer/doubts/:doubtId/replies
| Body: { "message": "..." }
*/
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
      batch: { $in: assignedBatches.map((batch) => batch._id) },
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

/*
|--------------------------------------------------------------------------
| 13. GET TRAINER PROFILE
|--------------------------------------------------------------------------
| GET /api/trainer/profile
*/
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

/*
|--------------------------------------------------------------------------
| 14. UPDATE TRAINER PROFILE
|--------------------------------------------------------------------------
| PUT /api/trainer/profile
|
| Body:
| {
|   "name": "Rahul Sharma",
|   "phone": "9876543210",
|   "expertise": "MERN Stack Development",
|   "courses": ["MERN Stack", "React.js"],
|   "experience": 3,
|   "availability": "Available"
| }
*/
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

    // Validate name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid trainer name.",
        });
      }

      trainer.name = name.trim();
    }

    // Validate phone
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

    // Validate expertise
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

    // Validate courses
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

    // Validate experience
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

    // Validate availability
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

/*
|--------------------------------------------------------------------------
| 15. GET SINGLE ASSIGNED BATCH DETAILS
|--------------------------------------------------------------------------
| GET /api/trainer/batches/:batchId
*/
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
