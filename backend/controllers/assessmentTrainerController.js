import mongoose from "mongoose";

import Assessment from "../models/Assessment.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import { Batch } from "../models/AdminModels.js";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getTrainerId = (req) =>
  req.user?._id || req.user?.id;

// Trainer must own the selected batch.
const getTrainerBatch = async (batchId, trainerId) => {
  if (!isValidId(batchId)) return null;

  return Batch.findOne({
    _id: batchId,
    trainer: trainerId,
  });
};

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return "At least one question is required.";
  }

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    if (!question.questionText?.trim()) {
      return `Question ${i + 1} is empty.`;
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      return `Question ${i + 1} must have at least 2 options.`;
    }

    if (
      question.options.some(
        (option) => !option.optionText?.trim()
      )
    ) {
      return `Question ${i + 1} contains an empty option.`;
    }

    if (!question.correctOption) {
      return `Select the correct answer for question ${i + 1}.`;
    }

    const correctExists = question.options.some(
      (option) =>
        String(option._id) === String(question.correctOption)
    );

    if (!correctExists) {
      return `Invalid correct answer for question ${i + 1}.`;
    }

    const marks = Number(question.marks ?? 1);

    if (!Number.isFinite(marks) || marks < 0) {
      return `Invalid marks for question ${i + 1}.`;
    }
  }

  return null;
};

// --------------------------------------------------
// 1. CREATE ASSESSMENT
// POST /api/trainer/assessments
// --------------------------------------------------

export const createAssessment = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);

    const {
      title,
      description,
      batch,
      questions,
      dueDate,
      instructions,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Assessment title is required.",
      });
    }

    if (!batch) {
      return res.status(400).json({
        success: false,
        message: "Please select a batch.",
      });
    }

    const assignedBatch = await getTrainerBatch(
      batch,
      trainerId
    );

    if (!assignedBatch) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this batch.",
      });
    }

    const validationError = validateQuestions(questions);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (
      dueDate &&
      Number.isNaN(new Date(dueDate).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date.",
      });
    }

    const assessment = await Assessment.create({
      title: title.trim(),
      description,
      batch,
      trainer: trainerId,
      questions,
      dueDate: dueDate || null,
      instructions,
      status: "Draft",
    });

    return res.status(201).json({
      success: true,
      message: "Assessment created successfully.",
      assessment,
    });
  } catch (error) {
    console.error("Create assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create assessment.",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// 2. GET ALL TRAINER ASSESSMENTS
// GET /api/trainer/assessments
// --------------------------------------------------

export const getTrainerAssessments = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);

    const assessments = await Assessment.find({
      trainer: trainerId,
    })
      .populate("batch", "batch courseName")
      .sort({ createdAt: -1 })
      .lean();

    const assessmentIds = assessments.map((item) => item._id);

    const attemptStats = await AssessmentAttempt.aggregate([
      {
        $match: {
          assessment: { $in: assessmentIds },
          status: "Submitted",
        },
      },
      {
        $group: {
          _id: "$assessment",
          submissions: { $sum: 1 },
          averagePercentage: { $avg: "$percentage" },
        },
      },
    ]);

    const statsMap = new Map(
      attemptStats.map((item) => [
        String(item._id),
        item,
      ])
    );

    const data = assessments.map((item) => {
      const stats = statsMap.get(String(item._id));

      return {
        ...item,
        submissionCount: stats?.submissions || 0,
        averagePercentage: Number(
          (stats?.averagePercentage || 0).toFixed(2)
        ),
      };
    });

    return res.json({
      success: true,
      count: data.length,
      assessments: data,
    });
  } catch (error) {
    console.error("Get trainer assessments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessments.",
    });
  }
};

// --------------------------------------------------
// 3. GET SINGLE ASSESSMENT
// GET /api/trainer/assessments/:id
// --------------------------------------------------

export const getTrainerAssessmentById = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID.",
      });
    }

    const assessment = await Assessment.findOne({
      _id: id,
      trainer: trainerId,
    }).populate("batch", "batch courseName");

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    return res.json({
      success: true,
      assessment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessment.",
    });
  }
};

// --------------------------------------------------
// 4. UPDATE ASSESSMENT
// PUT /api/trainer/assessments/:id
// --------------------------------------------------

export const updateAssessment = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID.",
      });
    }

    const assessment = await Assessment.findOne({
      _id: id,
      trainer: trainerId,
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    if (assessment.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft assessments can be edited.",
      });
    }

    const {
      title,
      description,
      batch,
      questions,
      dueDate,
      instructions,
    } = req.body;

    if (batch) {
      const assignedBatch = await getTrainerBatch(
        batch,
        trainerId
      );

      if (!assignedBatch) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this batch.",
        });
      }

      assessment.batch = batch;
    }

    if (questions !== undefined) {
      const validationError = validateQuestions(questions);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      assessment.questions = questions;
    }

    if (title !== undefined) assessment.title = title.trim();
    if (description !== undefined) assessment.description = description;
    if (dueDate !== undefined) assessment.dueDate = dueDate || null;
    if (instructions !== undefined) assessment.instructions = instructions;

    await assessment.save();

    return res.json({
      success: true,
      message: "Assessment updated successfully.",
      assessment,
    });
  } catch (error) {
    console.error("Update assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update assessment.",
    });
  }
};

// --------------------------------------------------
// 5. PUBLISH ASSESSMENT
// PATCH /api/trainer/assessments/:id/publish
// --------------------------------------------------

export const publishAssessment = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);

    const assessment = await Assessment.findOne({
      _id: req.params.id,
      trainer: trainerId,
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    if (assessment.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Assessment is already published or closed.",
      });
    }

    if (!assessment.questions.length) {
      return res.status(400).json({
        success: false,
        message: "Add questions before publishing.",
      });
    }

    assessment.status = "Published";
    assessment.publishedAt = new Date();

    await assessment.save();

    return res.json({
      success: true,
      message: "Assessment published successfully.",
      assessment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to publish assessment.",
    });
  }
};

// --------------------------------------------------
// 6. CLOSE ASSESSMENT
// PATCH /api/trainer/assessments/:id/close
// --------------------------------------------------

export const closeAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      trainer: getTrainerId(req),
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    assessment.status = "Closed";
    await assessment.save();

    return res.json({
      success: true,
      message: "Assessment closed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to close assessment.",
    });
  }
};

// --------------------------------------------------
// 7. DELETE DRAFT ASSESSMENT
// DELETE /api/trainer/assessments/:id
// --------------------------------------------------

export const deleteAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      trainer: getTrainerId(req),
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    if (assessment.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft assessments can be deleted.",
      });
    }

    await Assessment.deleteOne({ _id: assessment._id });

    return res.json({
      success: true,
      message: "Assessment deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete assessment.",
    });
  }
};

// --------------------------------------------------
// 8. GET STUDENT RESULTS
// GET /api/trainer/assessments/:id/results
// --------------------------------------------------

export const getAssessmentResults = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);
    const { id } = req.params;

    const assessment = await Assessment.findOne({
      _id: id,
      trainer: trainerId,
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    const attempts = await AssessmentAttempt.find({
      assessment: id,
      status: "Submitted",
    })
      .populate("student", "name fullName userId email")
      .sort({ percentage: -1, submittedAt: 1 });

    const results = attempts.map((attempt) => ({
      attemptId: attempt._id,
      student: attempt.student,
      totalQuestions: attempt.totalQuestions,
      attemptedQuestions: attempt.attemptedQuestions,
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      unansweredQuestions: attempt.unansweredQuestions,
      totalMarks: attempt.totalMarks,
      obtainedMarks: attempt.obtainedMarks,
      percentage: attempt.percentage,
      submittedAt: attempt.submittedAt,
    }));

    return res.json({
      success: true,
      assessment: {
        title: assessment.title,
        totalMarks: assessment.totalMarks,
        totalQuestions: assessment.questions.length,
      },
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Assessment results error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessment results.",
    });
  }
};

// --------------------------------------------------
// 9. GET INDIVIDUAL STUDENT ANSWER SHEET
// GET /api/trainer/assessments/:id/results/:studentId
// --------------------------------------------------

export const getStudentAssessmentResult = async (req, res) => {
  try {
    const trainerId = getTrainerId(req);
    const { id, studentId } = req.params;

    const assessment = await Assessment.findOne({
      _id: id,
      trainer: trainerId,
    }).lean();

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    const attempt = await AssessmentAttempt.findOne({
      assessment: id,
      student: studentId,
      status: "Submitted",
    }).populate("student", "name fullName userId email");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Student result not found.",
      });
    }

    const answerSheet = assessment.questions.map((question) => {
      const answer = attempt.answers.find(
        (item) =>
          String(item.question) === String(question._id)
      );

      const selected = question.options.find(
        (option) =>
          String(option._id) === String(answer?.selectedOption)
      );

      const correct = question.options.find(
        (option) =>
          String(option._id) === String(question.correctOption)
      );

      return {
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOption: answer?.selectedOption || null,
        selectedOptionText: selected?.optionText || null,
        correctOption: question.correctOption,
        correctOptionText: correct?.optionText || null,
        isCorrect: answer?.isCorrect || false,
        marks: question.marks,
        marksObtained: answer?.marksObtained || 0,
      };
    });

    return res.json({
      success: true,
      student: attempt.student,
      result: {
        totalMarks: attempt.totalMarks,
        obtainedMarks: attempt.obtainedMarks,
        percentage: attempt.percentage,
        correctAnswers: attempt.correctAnswers,
        incorrectAnswers: attempt.incorrectAnswers,
        unansweredQuestions: attempt.unansweredQuestions,
      },
      answerSheet,
    });
  } catch (error) {
    console.error("Student answer sheet error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student answer sheet.",
    });
  }
};