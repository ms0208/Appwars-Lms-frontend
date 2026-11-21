
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import User from "../models/user.js";
import Batch from "../models/Batch.js";

import CareerTask from "../models/CareerTask.js";
import CareerSubmission from "../models/CareerSubmission.js";
import MockInterview from "../models/MockInterview.js";
import PortfolioProject from "../models/PortfolioProject.js";
import StudentResume from "../models/StudentResume.js";

// ======================================================
// COMMON HELPERS
// ======================================================

const getUserId = (req) => req.user?.id || req.user?._id;

const getRole = (req) => String(req.user?.role || "").toLowerCase();

const isAdmin = (req) => getRole(req) === "admin";

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const validId = (id) => mongoose.isValidObjectId(id);

const isValidHttpUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const getStudent = async (studentId) => {
  if (!validId(studentId)) return null;

  return User.findOne({
    _id: studentId,
    role: "Student",
    isActive: true,
  });
};

// Trainer must own or be assigned to the batch.
const verifyTrainerBatch = async (req, batchName) => {
  if (isAdmin(req)) return true;

  const trainerId = getUserId(req);

  if (!trainerId || !batchName) return false;

  const batch = await Batch.findOne({
    $and: [
      {
        $or: [
          { batch: batchName },
          { batchName },
          { name: batchName },
        ],
      },
      {
        $or: [
          { trainer: trainerId },
          { assignedTrainer: trainerId },
          { trainerId },
          { trainers: trainerId },
        ],
      },
    ],
  });

  return Boolean(batch);
};

const verifyTrainerStudent = async (req, studentId) => {
  const student = await getStudent(studentId);

  if (!student) return null;
  if (isAdmin(req)) return student;

  const allowed = await verifyTrainerBatch(req, student.batch);
  return allowed ? student : null;
};

const verifyTaskOwner = async (req, task) => {
  if (!task) return false;
  if (isAdmin(req)) return true;

  return (
    String(task.trainer) === String(getUserId(req)) &&
    await verifyTrainerBatch(req, task.batch)
  );
};

const verifyProjectOwner = async (req, project) => {
  if (!project) return false;
  if (isAdmin(req)) return true;

  return (
    String(project.trainer) === String(getUserId(req)) &&
    await verifyTrainerBatch(req, project.batch)
  );
};

const removeUploadedFile = (filePath) => {
  if (!filePath) return;

  const absolutePath = path.resolve(filePath);
  const uploadRoot = path.resolve(process.cwd(), "uploads", "resumes");

  if (!absolutePath.startsWith(uploadRoot + path.sep)) return;

  if (fs.existsSync(absolutePath)) {
    fs.unlink(absolutePath, () => {});
  }
};

const buildResumeUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/resumes/${filename}`;

// ======================================================
// 1. TRAINER: CREATE CAREER TASK
// ======================================================

export const createCareerTask = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      topic,
      difficulty,
      instructions,
      questions,
      problemStatement,
      starterCode,
      allowedLanguages,
      maxScore,
      dueDate,
      batch,
      status,
    } = req.body;

    if (!["aptitude", "coding"].includes(type)) {
      return sendError(res, 400, "Invalid task type.");
    }

    if (!title?.trim() || !batch) {
      return sendError(res, 400, "Title and batch are required.");
    }

    if (!isAdmin(req)) {
      const allowed = await verifyTrainerBatch(req, batch);

      if (!allowed) {
        return sendError(res, 403, "You are not assigned to this batch.");
      }
    }

    if (dueDate && Number.isNaN(Date.parse(dueDate))) {
      return sendError(res, 400, "Invalid due date.");
    }

    if (
      maxScore !== undefined &&
      (!Number.isFinite(Number(maxScore)) || Number(maxScore) <= 0)
    ) {
      return sendError(res, 400, "Maximum score must be positive.");
    }

    if (type === "aptitude" && questions !== undefined && !Array.isArray(questions)) {
      return sendError(res, 400, "Questions must be an array.");
    }

    if (type === "coding" && !problemStatement?.trim()) {
      return sendError(res, 400, "Coding problem statement is required.");
    }

    const task = await CareerTask.create({
      type,
      title: title.trim(),
      description,
      topic,
      difficulty,
      instructions,
      questions,
      problemStatement,
      starterCode,
      allowedLanguages,
      maxScore: maxScore || 100,
      dueDate: dueDate || null,
      batch,
      trainer: getUserId(req),
      status: status || "published",
    });

    return res.status(201).json({
      success: true,
      message: "Career task created successfully.",
      task,
    });
  } catch (error) {
    console.error("Create career task:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 2. TRAINER: GET CAREER TASKS
// ======================================================

export const getTrainerCareerTasks = async (req, res) => {
  try {
    const filter = {};

    if (!isAdmin(req)) {
      filter.trainer = getUserId(req);
    }

    if (req.query.batch) {
      filter.batch = req.query.batch;

      if (!await verifyTrainerBatch(req, req.query.batch)) {
        return sendError(res, 403, "Batch access denied.");
      }
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const tasks = await CareerTask.find(filter)
      .populate("trainer", "name userId email")
      .sort({ createdAt: -1 })
      .lean();

    const taskIds = tasks.map((task) => task._id);

    const submissionCounts = taskIds.length
      ? await CareerSubmission.aggregate([
          { $match: { task: { $in: taskIds } } },
          {
            $group: {
              _id: "$task",
              total: { $sum: 1 },
              approved: {
                $sum: {
                  $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
                },
              },
              pending: {
                $sum: {
                  $cond: [
                    { $in: ["$status", ["submitted", "under_review"]] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
      : [];

    const counts = new Map(
      submissionCounts.map((item) => [String(item._id), item])
    );

    const enrichedTasks = tasks.map((task) => ({
      ...task,
      submissionSummary: counts.get(String(task._id)) || {
        total: 0,
        approved: 0,
        pending: 0,
      },
    }));

    return res.json({
      success: true,
      total: tasks.length,
      tasks: enrichedTasks,
    });
  } catch (error) {
    console.error("Get trainer career tasks:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 3. TRAINER: UPDATE CAREER TASK
// ======================================================

export const updateCareerTask = async (req, res) => {
  try {
    const task = await CareerTask.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Career task not found.");
    }

    if (!await verifyTaskOwner(req, task)) {
      return sendError(res, 403, "You cannot update this task.");
    }

    const allowedFields = [
      "title",
      "description",
      "topic",
      "difficulty",
      "instructions",
      "questions",
      "problemStatement",
      "starterCode",
      "allowedLanguages",
      "maxScore",
      "dueDate",
      "status",
    ];

    if (
      req.body.dueDate &&
      Number.isNaN(Date.parse(req.body.dueDate))
    ) {
      return sendError(res, 400, "Invalid due date.");
    }

    if (
      req.body.maxScore !== undefined &&
      (!Number.isFinite(Number(req.body.maxScore)) ||
        Number(req.body.maxScore) <= 0)
    ) {
      return sendError(res, 400, "Maximum score must be positive.");
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    }

    await task.save();

    return res.json({
      success: true,
      message: "Career task updated successfully.",
      task,
    });
  } catch (error) {
    console.error("Update career task:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 4. TRAINER: DELETE CAREER TASK
// ======================================================

export const deleteCareerTask = async (req, res) => {
  try {
    const task = await CareerTask.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Career task not found.");
    }

    if (!await verifyTaskOwner(req, task)) {
      return sendError(res, 403, "You cannot delete this task.");
    }

    await CareerSubmission.deleteMany({ task: task._id });
    await task.deleteOne();

    return res.json({
      success: true,
      message: "Career task and its submissions deleted.",
    });
  } catch (error) {
    console.error("Delete career task:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 5. STUDENT: GET ASSIGNED CAREER TASKS
// ======================================================

export const getStudentCareerTasks = async (req, res) => {
  try {
    const student = await getStudent(getUserId(req));

    if (!student) {
      return sendError(res, 404, "Student not found.");
    }

    const tasks = await CareerTask.find({
      batch: student.batch,
      status: "published",
    })
      .populate("trainer", "name userId")
      .sort({ createdAt: -1 })
      .lean();

    const taskIds = tasks.map((task) => task._id);

    const submissions = taskIds.length
      ? await CareerSubmission.find({
          student: student._id,
          task: { $in: taskIds },
        }).lean()
      : [];

    const submissionMap = new Map(
      submissions.map((submission) => [
        String(submission.task),
        submission,
      ])
    );

    const result = tasks.map((task) => {
      const safeTask = { ...task };

      // Never expose correct answers to students.
      if (safeTask.type === "aptitude") {
        safeTask.questions = (safeTask.questions || []).map(
          ({ correctAnswer, ...question }) => question
        );
      }

      return {
        ...safeTask,
        submission: submissionMap.get(String(task._id)) || null,
      };
    });

    return res.json({
      success: true,
      total: result.length,
      tasks: result,
    });
  } catch (error) {
    console.error("Get student career tasks:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 6. STUDENT: SUBMIT APTITUDE / CODING TASK
// ======================================================

export const submitCareerTask = async (req, res) => {
  try {
    const student = await getStudent(getUserId(req));

    if (!student) {
      return sendError(res, 404, "Student not found.");
    }

    if (!validId(req.params.id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const task = await CareerTask.findOne({
      _id: req.params.id,
      batch: student.batch,
      status: "published",
    });

    if (!task) {
      return sendError(res, 404, "Career task not found.");
    }

    if (task.dueDate && new Date() > new Date(task.dueDate)) {
      return sendError(res, 400, "Submission deadline has passed.");
    }

    const { answer, code, language, githubUrl } = req.body;

    if (githubUrl && !isValidHttpUrl(githubUrl)) {
      return sendError(res, 400, "Invalid GitHub URL.");
    }

    if (task.type === "aptitude") {
      if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
        return sendError(res, 400, "Please submit your answers.");
      }

      const submittedAnswers = Object.fromEntries(
        Object.entries(answer).map(([key, value]) => [
          key,
          String(value),
        ])
      );

      const submission = await CareerSubmission.findOneAndUpdate(
        {
          task: task._id,
          student: student._id,
        },
        {
          $set: {
            answer: submittedAnswers,
            status: "submitted",
            score: 0,
            feedback: "",
            reviewedBy: null,
            reviewedAt: null,
            submittedAt: new Date(),
          },
          $setOnInsert: {
            batch: student.batch,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

      return res.json({
        success: true,
        message: "Aptitude answers submitted successfully.",
        submission,
      });
    }

    if (task.type === "coding") {
      if (!code || !String(code).trim()) {
        return sendError(res, 400, "Coding solution is required.");
      }

      const permittedLanguages = task.allowedLanguages || [];

      if (
        language &&
        permittedLanguages.length &&
        !permittedLanguages.includes(language)
      ) {
        return sendError(res, 400, "Programming language not allowed.");
      }

      const submission = await CareerSubmission.findOneAndUpdate(
        {
          task: task._id,
          student: student._id,
        },
        {
          $set: {
            code,
            language: language || "javascript",
            githubUrl: githubUrl || "",
            status: "submitted",
            score: 0,
            feedback: "",
            reviewedBy: null,
            reviewedAt: null,
            submittedAt: new Date(),
          },
          $setOnInsert: {
            batch: student.batch,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

      return res.json({
        success: true,
        message: "Coding solution submitted successfully.",
        submission,
      });
    }

    return sendError(res, 400, "Unsupported task type.");
  } catch (error) {
    console.error("Submit career task:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 7. TRAINER: GET STUDENT SUBMISSIONS
// ======================================================

export const getCareerSubmissions = async (req, res) => {
  try {
    const filter = {};

    if (req.params.taskId) {
      if (!validId(req.params.taskId)) {
        return sendError(res, 400, "Invalid task ID.");
      }

      const task = await CareerTask.findById(req.params.taskId);

      if (!task || !await verifyTaskOwner(req, task)) {
        return sendError(res, 403, "Task access denied.");
      }

      filter.task = task._id;
    } else if (!isAdmin(req)) {
      const trainerTasks = await CareerTask.find({
        trainer: getUserId(req),
      }).select("_id");

      filter.task = {
        $in: trainerTasks.map((task) => task._id),
      };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const submissions = await CareerSubmission.find(filter)
      .populate("student", "name userId email batch")
      .populate("task", "title type topic difficulty maxScore")
      .populate("reviewedBy", "name")
      .sort({ submittedAt: -1 });

    return res.json({
      success: true,
      total: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Get career submissions:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 8. TRAINER: GRADE STUDENT SUBMISSION
// ======================================================

export const reviewCareerSubmission = async (req, res) => {
  try {
    const { score, feedback, status } = req.body;

    if (!["approved", "revision_required", "under_review"].includes(status)) {
      return sendError(res, 400, "Invalid review status.");
    }

    if (!validId(req.params.submissionId)) {
      return sendError(res, 400, "Invalid submission ID.");
    }

    const submission = await CareerSubmission.findById(
      req.params.submissionId
    ).populate("task");

    if (!submission) {
      return sendError(res, 404, "Submission not found.");
    }

    if (!submission.task || !await verifyTaskOwner(req, submission.task)) {
      return sendError(res, 403, "You cannot review this submission.");
    }

    const maxScore = Number(submission.task.maxScore || 100);
    const numericScore = Number(score);

    if (
      !Number.isFinite(numericScore) ||
      numericScore < 0 ||
      numericScore > maxScore
    ) {
      return sendError(
        res,
        400,
        `Score must be between 0 and ${maxScore}.`
      );
    }

    submission.score = numericScore;
    submission.feedback = feedback || "";
    submission.status = status;
    submission.reviewedBy = getUserId(req);
    submission.reviewedAt = new Date();

    await submission.save();

    return res.json({
      success: true,
      message: "Student submission evaluated successfully.",
      submission,
    });
  } catch (error) {
    console.error("Review career submission:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 9. STUDENT: GET CAREER DASHBOARD
// ======================================================

export const getStudentCareerOverview = async (req, res) => {
  try {
    const student = await getStudent(getUserId(req));

    if (!student) {
      return sendError(res, 404, "Student not found.");
    }

    const tasks = await CareerTask.find({
      batch: student.batch,
      status: "published",
    }).select("_id type");

    const aptitudeTasks = tasks.filter((task) => task.type === "aptitude");
    const codingTasks = tasks.filter((task) => task.type === "coding");
    const taskIds = tasks.map((task) => task._id);

    const [submissions, interviewStats, projectStats] = await Promise.all([
      taskIds.length
        ? CareerSubmission.find({
            student: student._id,
            task: { $in: taskIds },
          }).select("task status")
        : [],

      MockInterview.aggregate([
        { $match: { student: student._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
              },
            },
          },
        },
      ]),

      PortfolioProject.aggregate([
        { $match: { student: student._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const approvedTasks = new Set(
      submissions
        .filter((item) => item.status === "approved")
        .map((item) => String(item.task))
    );

    const calculateProgress = (items) => {
      if (!items.length) return 0;

      const completed = items.filter((item) =>
        approvedTasks.has(String(item._id))
      ).length;

      return Math.round((completed / items.length) * 100);
    };

    const interviews = interviewStats[0] || {
      total: 0,
      completed: 0,
    };

    const projects = projectStats[0] || {
      total: 0,
      completed: 0,
    };

    return res.json({
      success: true,
      career: {
        aptitudeProgress: calculateProgress(aptitudeTasks),
        dsaProgress: calculateProgress(codingTasks),
        mockInterviewsCompleted: interviews.completed,
        mockInterviewsTotal: interviews.total,
        portfolioProjectsCompleted: projects.completed,
        portfolioProjectsTotal: projects.total,
      },
      summary: {
        totalAptitudeTasks: aptitudeTasks.length,
        totalCodingTasks: codingTasks.length,
        approvedSubmissions: approvedTasks.size,
        pendingReviews: submissions.filter((item) =>
          ["submitted", "under_review"].includes(item.status)
        ).length,
      },
      batch: student.batch,
    });
  } catch (error) {
    console.error("Student career overview:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 10. TRAINER: CREATE MOCK INTERVIEW
// ======================================================

export const createMockInterview = async (req, res) => {
  try {
    const {
      studentId,
      title,
      interviewType,
      description,
      scheduledAt,
      duration,
      meetingUrl,
    } = req.body;

    if (!studentId || !title || !scheduledAt) {
      return sendError(
        res,
        400,
        "Student, title and interview date are required."
      );
    }

    const student = await verifyTrainerStudent(req, studentId);

    if (!student) {
      return sendError(res, 403, "Student access denied.");
    }

    if (Number.isNaN(Date.parse(scheduledAt))) {
      return sendError(res, 400, "Invalid interview date.");
    }

    if (meetingUrl && !isValidHttpUrl(meetingUrl)) {
      return sendError(res, 400, "Invalid meeting URL.");
    }

    const interview = await MockInterview.create({
      student: student._id,
      batch: student.batch,
      trainer: getUserId(req),
      title,
      interviewType,
      description,
      scheduledAt,
      duration,
      meetingUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Mock interview scheduled successfully.",
      interview,
    });
  } catch (error) {
    console.error("Create mock interview:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 11. TRAINER: GET MOCK INTERVIEWS
// ======================================================

export const getTrainerMockInterviews = async (req, res) => {
  try {
    const filter = isAdmin(req)
      ? {}
      : { trainer: getUserId(req) };

    if (req.query.studentId) {
      if (!validId(req.query.studentId)) {
        return sendError(res, 400, "Invalid student ID.");
      }

      filter.student = req.query.studentId;
    }

    const interviews = await MockInterview.find(filter)
      .populate("student", "name userId email batch")
      .populate("trainer", "name userId")
      .sort({ scheduledAt: -1 });

    return res.json({
      success: true,
      total: interviews.length,
      interviews,
    });
  } catch (error) {
    console.error("Trainer mock interviews:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 12. TRAINER: UPDATE MOCK INTERVIEW
// ======================================================

export const updateMockInterview = async (req, res) => {
  try {
    const interview = await MockInterview.findById(req.params.id);

    if (!interview) {
      return sendError(res, 404, "Mock interview not found.");
    }

    if (
      !isAdmin(req) &&
      String(interview.trainer) !== String(getUserId(req))
    ) {
      return sendError(res, 403, "Interview access denied.");
    }

    const allowedFields = [
      "title",
      "interviewType",
      "description",
      "scheduledAt",
      "duration",
      "meetingUrl",
      "status",
      "score",
      "feedback",
      "strengths",
      "improvements",
    ];

    if (
      req.body.scheduledAt &&
      Number.isNaN(Date.parse(req.body.scheduledAt))
    ) {
      return sendError(res, 400, "Invalid interview date.");
    }

    if (req.body.meetingUrl && !isValidHttpUrl(req.body.meetingUrl)) {
      return sendError(res, 400, "Invalid meeting URL.");
    }

    if (
      req.body.score !== undefined &&
      (!Number.isFinite(Number(req.body.score)) ||
        Number(req.body.score) < 0 ||
        Number(req.body.score) > 100)
    ) {
      return sendError(res, 400, "Score must be between 0 and 100.");
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        interview[field] = req.body[field];
      }
    }

    if (interview.status === "completed") {
      interview.reviewedAt = new Date();
    }

    await interview.save();

    return res.json({
      success: true,
      message: "Mock interview updated successfully.",
      interview,
    });
  } catch (error) {
    console.error("Update mock interview:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 13. TRAINER: DELETE MOCK INTERVIEW
// ======================================================

export const deleteMockInterview = async (req, res) => {
  try {
    const interview = await MockInterview.findById(req.params.id);

    if (!interview) {
      return sendError(res, 404, "Interview not found.");
    }

    if (
      !isAdmin(req) &&
      String(interview.trainer) !== String(getUserId(req))
    ) {
      return sendError(res, 403, "Interview access denied.");
    }

    await interview.deleteOne();

    return res.json({
      success: true,
      message: "Mock interview deleted successfully.",
    });
  } catch (error) {
    console.error("Delete mock interview:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 14. STUDENT: GET MOCK INTERVIEWS
// ======================================================

export const getStudentMockInterviews = async (req, res) => {
  try {
    const interviews = await MockInterview.find({
      student: getUserId(req),
    })
      .populate("trainer", "name userId")
      .sort({ scheduledAt: -1 });

    const formatted = interviews.map((item) => ({
      ...item.toObject(),
      trainerName: item.trainer?.name || "",
    }));

    return res.json({
      success: true,
      total: formatted.length,
      interviews: formatted,
    });
  } catch (error) {
    console.error("Student mock interviews:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 15. TRAINER: CREATE PORTFOLIO PROJECT
// ======================================================

export const createPortfolioProject = async (req, res) => {
  try {
    const {
      studentId,
      title,
      description,
      instructions,
      techStack,
      dueDate,
    } = req.body;

    if (!studentId || !title || !description) {
      return sendError(
        res,
        400,
        "Student, title and description are required."
      );
    }

    const student = await verifyTrainerStudent(req, studentId);

    if (!student) {
      return sendError(res, 403, "Student access denied.");
    }

    if (dueDate && Number.isNaN(Date.parse(dueDate))) {
      return sendError(res, 400, "Invalid project deadline.");
    }

    const project = await PortfolioProject.create({
      student: student._id,
      batch: student.batch,
      trainer: getUserId(req),
      title,
      description,
      instructions,
      techStack,
      dueDate: dueDate || null,
    });

    return res.status(201).json({
      success: true,
      message: "Portfolio project assigned successfully.",
      project,
    });
  } catch (error) {
    console.error("Create portfolio project:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 16. TRAINER: GET PORTFOLIO PROJECTS
// ======================================================

export const getTrainerPortfolioProjects = async (req, res) => {
  try {
    const filter = isAdmin(req)
      ? {}
      : { trainer: getUserId(req) };

    if (req.query.studentId) {
      if (!validId(req.query.studentId)) {
        return sendError(res, 400, "Invalid student ID.");
      }

      filter.student = req.query.studentId;
    }

    const projects = await PortfolioProject.find(filter)
      .populate("student", "name userId email batch")
      .populate("trainer", "name userId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Trainer portfolio projects:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 17. TRAINER: REVIEW PORTFOLIO PROJECT
// ======================================================

export const reviewPortfolioProject = async (req, res) => {
  try {
    const { status, score, feedback } = req.body;

    const allowedStatuses = [
      "approved",
      "revision_required",
      "under_review",
    ];

    if (!allowedStatuses.includes(status)) {
      return sendError(res, 400, "Invalid project review status.");
    }

    const project = await PortfolioProject.findById(req.params.id);

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    if (!await verifyProjectOwner(req, project)) {
      return sendError(res, 403, "Project access denied.");
    }

    const numericScore = Number(score);

    if (
      !Number.isFinite(numericScore) ||
      numericScore < 0 ||
      numericScore > 100
    ) {
      return sendError(res, 400, "Score must be between 0 and 100.");
    }

    project.status = status;
    project.score = numericScore;
    project.feedback = feedback || "";
    project.reviewedAt = new Date();

    await project.save();

    return res.json({
      success: true,
      message: "Portfolio project reviewed successfully.",
      project,
    });
  } catch (error) {
    console.error("Review portfolio project:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 18. TRAINER: UPDATE PORTFOLIO PROJECT
// ======================================================

export const updatePortfolioProject = async (req, res) => {
  try {
    const project = await PortfolioProject.findById(req.params.id);

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    if (!await verifyProjectOwner(req, project)) {
      return sendError(res, 403, "Project access denied.");
    }

    if (
      req.body.dueDate &&
      Number.isNaN(Date.parse(req.body.dueDate))
    ) {
      return sendError(res, 400, "Invalid project deadline.");
    }

    const fields = [
      "title",
      "description",
      "instructions",
      "techStack",
      "dueDate",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    }

    await project.save();

    return res.json({
      success: true,
      message: "Project updated successfully.",
      project,
    });
  } catch (error) {
    console.error("Update portfolio project:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 19. TRAINER: DELETE PORTFOLIO PROJECT
// ======================================================

export const deletePortfolioProject = async (req, res) => {
  try {
    const project = await PortfolioProject.findById(req.params.id);

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    if (!await verifyProjectOwner(req, project)) {
      return sendError(res, 403, "Project access denied.");
    }

    await project.deleteOne();

    return res.json({
      success: true,
      message: "Portfolio project deleted successfully.",
    });
  } catch (error) {
    console.error("Delete portfolio project:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 20. STUDENT: GET PORTFOLIO PROJECTS
// ======================================================

export const getStudentPortfolioProjects = async (req, res) => {
  try {
    const projects = await PortfolioProject.find({
      student: getUserId(req),
    })
      .populate("trainer", "name userId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Student portfolio projects:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 21. STUDENT: SUBMIT PORTFOLIO PROJECT
// ======================================================

export const submitPortfolioProject = async (req, res) => {
  try {
    const { githubUrl, liveUrl, submissionNotes } = req.body;

    if (!isValidHttpUrl(githubUrl) || !isValidHttpUrl(liveUrl)) {
      return sendError(res, 400, "Invalid project URL.");
    }

    if (!validId(req.params.id)) {
      return sendError(res, 400, "Invalid project ID.");
    }

    const project = await PortfolioProject.findOne({
      _id: req.params.id,
      student: getUserId(req),
    });

    if (!project) {
      return sendError(res, 404, "Portfolio project not found.");
    }

    if (project.status === "approved") {
      return sendError(
        res,
        400,
        "This project has already been approved."
      );
    }

    if (!githubUrl && !liveUrl) {
      return sendError(
        res,
        400,
        "Please provide a GitHub or live project URL."
      );
    }

    project.githubUrl = githubUrl || "";
    project.liveUrl = liveUrl || "";
    project.submissionNotes = submissionNotes || "";
    project.status = "submitted";
    project.score = 0;
    project.feedback = "";
    project.reviewedAt = null;

    await project.save();

    return res.json({
      success: true,
      message: "Portfolio project submitted successfully.",
      project,
    });
  } catch (error) {
    console.error("Submit portfolio project:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 22. STUDENT: GET RESUME
// ======================================================

export const getStudentResume = async (req, res) => {
  try {
    const resume = await StudentResume.findOne({
      student: getUserId(req),
    }).populate("reviewedBy", "name userId");

    return res.json({
      success: true,
      resume: resume || null,
    });
  } catch (error) {
    console.error("Get student resume:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 23. STUDENT: UPLOAD / REPLACE RESUME
// ======================================================

export const uploadStudentResume = async (req, res) => {
  const uploadedFile = req.file;

  try {
    if (!uploadedFile) {
      return sendError(res, 400, "Please select a resume file.");
    }

    const student = await getStudent(getUserId(req));

    if (!student) {
      removeUploadedFile(uploadedFile.path);
      return sendError(res, 404, "Student not found.");
    }

    const existing = await StudentResume.findOne({
      student: student._id,
    });

    const resumeData = {
      student: student._id,
      originalName: uploadedFile.originalname,
      fileName: uploadedFile.filename,
      filePath: uploadedFile.path,
      url: buildResumeUrl(req, uploadedFile.filename),
      mimeType: uploadedFile.mimetype,
      size: uploadedFile.size,
      uploadedAt: new Date(),
      reviewStatus: "pending",
      trainerFeedback: "",
      reviewedBy: null,
      reviewedAt: null,
    };

    const resume = await StudentResume.findOneAndUpdate(
      { student: student._id },
      { $set: resumeData },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    if (existing?.filePath) {
      removeUploadedFile(existing.filePath);
    }

    return res.status(201).json({
      success: true,
      message: "Resume uploaded successfully.",
      resume,
    });
  } catch (error) {
    if (uploadedFile?.path) {
      removeUploadedFile(uploadedFile.path);
    }

    console.error("Upload student resume:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 24. TRAINER: GET STUDENT RESUMES
// ======================================================

export const getTrainerResumes = async (req, res) => {
  try {
    let students;

    if (isAdmin(req)) {
      students = await User.find({
        role: "Student",
        isActive: true,
      }).select("_id batch");
    } else {
      const batches = await Batch.find({
        $or: [
          { trainer: getUserId(req) },
          { assignedTrainer: getUserId(req) },
          { trainerId: getUserId(req) },
          { trainers: getUserId(req) },
        ],
      });

      const batchNames = batches
        .map((batch) => batch.batch || batch.batchName || batch.name)
        .filter(Boolean);

      students = await User.find({
        role: "Student",
        isActive: true,
        batch: { $in: batchNames },
      }).select("_id batch");
    }

    const studentIds = students.map((student) => student._id);

    const resumes = studentIds.length
      ? await StudentResume.find({
          student: { $in: studentIds },
        })
          .populate("student", "name userId email batch")
          .populate("reviewedBy", "name")
          .sort({ uploadedAt: -1 })
      : [];

    return res.json({
      success: true,
      total: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error("Trainer resumes:", error);
    return sendError(res, 500, error.message);
  }
};

// ======================================================
// 25. TRAINER: REVIEW STUDENT RESUME
// ======================================================

export const reviewStudentResume = async (req, res) => {
  try {
    const { reviewStatus, trainerFeedback } = req.body;

    if (!["reviewed", "revision_required"].includes(reviewStatus)) {
      return sendError(res, 400, "Invalid resume review status.");
    }

    if (!validId(req.params.id)) {
      return sendError(res, 400, "Invalid resume ID.");
    }

    const resume = await StudentResume.findById(req.params.id)
      .populate("student");

    if (!resume) {
      return sendError(res, 404, "Resume not found.");
    }

    if (
      !resume.student ||
      !await verifyTrainerStudent(req, resume.student._id)
    ) {
      return sendError(res, 403, "Resume access denied.");
    }

    resume.reviewStatus = reviewStatus;
    resume.trainerFeedback = trainerFeedback || "";
    resume.reviewedBy = getUserId(req);
    resume.reviewedAt = new Date();

    await resume.save();

    return res.json({
      success: true,
      message: "Resume reviewed successfully.",
      resume,
    });
  } catch (error) {
    console.error("Review student resume:", error);
    return sendError(res, 500, error.message);
  }
};
