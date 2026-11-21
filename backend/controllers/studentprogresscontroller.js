
import Assignment from "../models/Assignement.js";
import AssignmentProgress from "../models/AssignmentProgress.js";
import Attendance from "../models/Attendance.js";
import Assessment from "../models/Assessment.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import User from "../models/user.js";
import Batch from "../models/Batch.js";

// ======================================================
// GET STUDENT 3A SCORECARD
// Assignment + Attendance + Assessment
// GET /api/student/progress/3a-scorecard
// ======================================================

export const getStudent3AScorecard = async (req, res) => {
  try {
    // 1. GET AUTHENTICATED STUDENT
    const authenticatedStudentId =
      req.user?._id || req.user?.id;

    if (!authenticatedStudentId) {
      return res.status(401).json({
        success: false,
        message: "Student authentication information not found.",
      });
    }

    const student = await User.findById(
      authenticatedStudentId
    ).lean();

    if (!student || student.role !== "Student") {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentId = student._id;

    // ==================================================
    // 2. RESOLVE STUDENT BATCH
    // Student.batch contains batch name/code e.g. MERN-01
    // ==================================================

    const batchConditions = [];

    if (student.batch) {
      const studentBatchValue =
        typeof student.batch === "object"
          ? student.batch.batch ||
            student.batch.name ||
            student.batch.code
          : student.batch;

      if (studentBatchValue) {
        batchConditions.push(
          { batch: studentBatchValue },
          { name: studentBatchValue },
          { code: studentBatchValue }
        );
      }
    }

    // Support newer Batch schema where students
    // are stored as User ObjectIds.
    batchConditions.push({
      students: studentId,
    });

    const studentBatch = await Batch.findOne({
      $or: batchConditions,
    }).lean();

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
        studentBatch: student.batch || null,
      });
    }

    const batchId = studentBatch._id;

    // ==================================================
    // A1 - ASSIGNMENT SCORE
    // ==================================================

    const assignments = await Assignment.find({
      batch: batchId,
      status: "Published",
    })
      .select("_id title dueDate")
      .lean();

    const assignmentIds = assignments.map(
      (item) => item._id
    );

    const assignmentProgress = assignmentIds.length
      ? await AssignmentProgress.find({
          student: studentId,
          batch: batchId,
          assignment: { $in: assignmentIds },
        }).lean()
      : [];

    const progressMap = new Map();

    assignmentProgress.forEach((item) => {
      const assignmentId =
        item.assignment?._id ||
        item.assignment ||
        item.assignmentId;

      if (assignmentId) {
        progressMap.set(
          String(assignmentId),
          item.status || item.progressStatus || "Pending"
        );
      }
    });

    const assignmentDetails = assignments.map(
      (assignment) => {
        const progressStatus =
          progressMap.get(String(assignment._id)) ||
          "Not Access";

        return {
          _id: assignment._id,
          title: assignment.title,
          dueDate: assignment.dueDate,
          progressStatus,
        };
      }
    );

    const totalAssignments = assignments.length;

    const completedAssignments =
      assignmentDetails.filter((item) =>
        ["Complete", "Completed", "Submitted"].includes(
          String(item.progressStatus).trim()
        )
      ).length;

    const pendingAssignments =
      assignmentDetails.filter(
        (item) =>
          String(item.progressStatus).toLowerCase() ===
          "pending"
      ).length;

    const notAccessAssignments =
      assignmentDetails.filter(
        (item) =>
          String(item.progressStatus).toLowerCase() ===
          "not access"
      ).length;

    const assignmentPercentage =
      totalAssignments > 0
        ? Number(
            (
              (completedAssignments / totalAssignments) *
              100
            ).toFixed(2)
          )
        : 0;

    // ==================================================
    // A2 - ATTENDANCE SCORE
    // ==================================================

    const attendanceRecords = await Attendance.find({
      student: studentId,
      batch: batchId,
    })
      .select("_id date status remarks")
      .sort({ date: -1 })
      .lean();

    const totalClasses = attendanceRecords.length;

    const presentClasses = attendanceRecords.filter(
      (item) =>
        String(item.status).toLowerCase() === "present"
    ).length;

    const absentClasses = attendanceRecords.filter(
      (item) =>
        String(item.status).toLowerCase() === "absent"
    ).length;

    const attendancePercentage =
      totalClasses > 0
        ? Number(
            (
              (presentClasses / totalClasses) *
              100
            ).toFixed(2)
          )
        : 0;

    // ==================================================
    // A3 - ASSESSMENT SCORE
    // ==================================================

    const assessments = await Assessment.find({
      batch: batchId,
    })
      .select("_id title questions createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const assessmentIds = assessments.map(
      (item) => item._id
    );

    const assessmentAttempts = assessmentIds.length
      ? await AssessmentAttempt.find({
          student: studentId,
          assessment: { $in: assessmentIds },
          status: "Submitted",
        })
          .sort({ submittedAt: -1 })
          .lean()
      : [];

    // Keep latest submitted attempt for each assessment
    const attemptMap = new Map();

    assessmentAttempts.forEach((attempt) => {
      const id = String(
        attempt.assessment?._id ||
        attempt.assessment
      );

      if (!attemptMap.has(id)) {
        attemptMap.set(id, attempt);
      }
    });

    const assessmentDetails = assessments.map(
      (assessment) => {
        const attempt = attemptMap.get(
          String(assessment._id)
        );

        return {
          _id: assessment._id,
          title: assessment.title,

          totalQuestions:
            assessment.questions?.length || 0,

          attempted: Boolean(attempt),

          totalMarks: attempt
            ? Number(attempt.totalMarks) || 0
            : 0,

          obtainedMarks: attempt
            ? Number(attempt.obtainedMarks) || 0
            : 0,

          percentage: attempt
            ? Number(attempt.percentage) || 0
            : 0,

          status: attempt ? "Submitted" : "Pending",

          submittedAt: attempt?.submittedAt || null,
        };
      }
    );

    const totalAssessments = assessments.length;

    const attemptedAssessments = attemptMap.size;

    const pendingAssessments =
      totalAssessments - attemptedAssessments;

    const assessmentTotalMarks =
      assessmentDetails.reduce(
        (sum, item) => sum + item.totalMarks,
        0
      );

    const assessmentObtainedMarks =
      assessmentDetails.reduce(
        (sum, item) => sum + item.obtainedMarks,
        0
      );

    const assessmentPercentage =
      assessmentTotalMarks > 0
        ? Number(
            (
              (assessmentObtainedMarks /
                assessmentTotalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    // ==================================================
    // FINAL 3A SCORE
    // ==================================================

    const threeAScore = Number(
      (
        (assignmentPercentage +
          attendancePercentage +
          assessmentPercentage) /
        3
      ).toFixed(2)
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      message: "Student 3A scorecard fetched successfully.",

      student: {
        _id: student._id,
        userId: student.userId,
        name: student.name,
        email: student.email,
        role: student.role,
      },

      batch: {
        _id: batchId,
        batch:
          studentBatch.batch ||
          studentBatch.name ||
          studentBatch.code,
        status: studentBatch.status,
      },

      threeAScore: {
        assignment: {
          total: totalAssignments,
          completed: completedAssignments,
          pending: pendingAssignments,
          notAccessed: notAccessAssignments,
          percentage: assignmentPercentage,
          details: assignmentDetails,
        },

        attendance: {
          totalClasses,
          present: presentClasses,
          absent: absentClasses,
          percentage: attendancePercentage,
          details: attendanceRecords,
        },

        assessment: {
          totalAssessments,
          attemptedAssessments,
          pendingAssessments,
          totalMarks: assessmentTotalMarks,
          obtainedMarks: assessmentObtainedMarks,
          percentage: assessmentPercentage,
          details: assessmentDetails,
        },

        overall: {
          assignmentScore: assignmentPercentage,
          attendanceScore: attendancePercentage,
          assessmentScore: assessmentPercentage,
          score: threeAScore,
          maximumScore: 100,
          formula:
            "(Assignment + Attendance + Assessment) / 3",
        },
      },
    });

  } catch (error) {
    console.error(
      "Get student 3A scorecard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student 3A scorecard.",
      error: error.message,
    });
  }
};
