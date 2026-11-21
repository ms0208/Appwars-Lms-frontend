
import mongoose from "mongoose";

import Assessment from "../models/Assessment.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import User from "../models/user.js";
import { Batch } from "../models/AdminModels.js";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getStudentId = (req) =>
  req.user?._id || req.user?.id;

// Get logged-in student
const getStudent = async (req) => {
  const studentId = getStudentId(req);

  if (!studentId || !isValidId(studentId)) {
    return null;
  }

  return User.findById(studentId).select(
    "_id name fullName userId email batch"
  );
};

// --------------------------------------------------
// RESOLVE STUDENT BATCH
//
// Student may have batch = "MERN-01"
// Assessment.batch expects Batch ObjectId.
// This helper supports both batch code and ObjectId.
// --------------------------------------------------

const resolveStudentBatch = async (student) => {
  try {
    const studentBatch = student?.batch;

    if (!studentBatch) {
      return null;
    }

    // Already populated Batch document
    if (
      typeof studentBatch === "object" &&
      studentBatch._id
    ) {
      return studentBatch;
    }

    const batchValue = String(studentBatch).trim();

    if (!batchValue) {
      return null;
    }

    // Student batch is stored as MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(batchValue)) {
      const batchById = await Batch.findById(batchValue);

      if (batchById) {
        return batchById;
      }
    }

    // Student batch is stored as batch code, e.g. MERN-01
    const batchByCode = await Batch.findOne({
      batch: batchValue,
    });

    return batchByCode || null;
  } catch (error) {
    console.error("Resolve student batch error:", error);
    return null;
  }
};

// --------------------------------------------------
// GET ASSESSMENT FOR STUDENT
// --------------------------------------------------

const getAssessmentForStudent = async (
  assessmentId,
  studentBatch
) => {
  if (
    !isValidId(assessmentId) ||
    !studentBatch?._id
  ) {
    return null;
  }

  const assessment = await Assessment.findOne({
    _id: assessmentId,
    batch: studentBatch._id,
    status: "Published",
  });

  if (!assessment) {
    return null;
  }

  if (
    assessment.dueDate &&
    new Date() > new Date(assessment.dueDate)
  ) {
    return null;
  }

  return assessment;
};

// --------------------------------------------------
// FORMAT STUDENT ASSESSMENT
//
// Never send correctOption to the student
// before submission.
// --------------------------------------------------

const formatStudentAssessment = (assessment) => ({
  _id: assessment._id,
  title: assessment.title,
  description: assessment.description,
  instructions: assessment.instructions,
  totalMarks: assessment.totalMarks,
  totalQuestions: assessment.questions.length,
  dueDate: assessment.dueDate,

  questions: assessment.questions.map((question) => ({
    _id: question._id,
    questionText: question.questionText,

    options: question.options.map((option) => ({
      _id: option._id,
      optionText: option.optionText,
    })),

    marks: question.marks,
  })),
});

// --------------------------------------------------
// 1. GET ASSIGNED ASSESSMENTS
// GET /api/student/assessments
// --------------------------------------------------



export const getStudentAssessments = async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentBatch = await resolveStudentBatch(student);

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
      });
    }

    // 1. Fetch ALL assessments for this batch.
    // Do not filter only by Published because your existing
    // results controller is successfully fetching all 7.
    const assessments = await Assessment.find({
      batch: studentBatch._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!assessments.length) {
      return res.status(200).json({
        success: true,
        message: "No assessments found for this batch.",
        batch: {
          _id: studentBatch._id,
          batch: studentBatch.batch || studentBatch.name,
        },
        summary: {
          totalAssessments: 0,
          submitted: 0,
          inProgress: 0,
          notStarted: 0,
          expired: 0,
        },
        assessments: [],
      });
    }

    // 2. Fetch student's attempts for these assessments.
    const attempts = await AssessmentAttempt.find({
      student: student._id,
      assessment: {
        $in: assessments.map((item) => item._id),
      },
    })
      .sort({
        updatedAt: -1,
        submittedAt: -1,
        createdAt: -1,
      })
      .lean();

    // 3. Get latest attempt for each assessment.
    const attemptMap = new Map();

    for (const attempt of attempts) {
      const assessmentId = String(attempt.assessment);

      if (!attemptMap.has(assessmentId)) {
        attemptMap.set(assessmentId, attempt);
      }
    }

    const now = new Date();

    // 4. Generate student-specific assessment statuses.
    const assessmentData = assessments.map((assessment) => {
      const attempt = attemptMap.get(
        String(assessment._id)
      );

      const isSubmitted =
        attempt?.status === "Submitted";

      const isInProgress =
        attempt &&
        ["In Progress", "Started"].includes(attempt.status);

      const isExpired =
        assessment.dueDate &&
        now > new Date(assessment.dueDate);

      let status = "Not Started";

      if (isSubmitted) {
        status = "Submitted";
      } else if (isInProgress) {
        status = "In Progress";
      } else if (isExpired) {
        status = "Expired";
      }

      return {
        _id: assessment._id,

        title: assessment.title,
        description: assessment.description,

        totalQuestions:
          assessment.questions?.length || 0,

        totalMarks: assessment.totalMarks || 0,

        createdAt: assessment.createdAt || null,
        publishedAt: assessment.publishedAt || null,
        dueDate: assessment.dueDate || null,

        status,
        attempted: Boolean(attempt),

        attemptId: attempt?._id || null,

        obtainedMarks: isSubmitted
          ? attempt.obtainedMarks || 0
          : null,

        percentage: isSubmitted
          ? attempt.percentage || 0
          : null,

        submittedAt: isSubmitted
          ? attempt.submittedAt || null
          : null,
      };
    });

    // 5. Calculate summary.
    const summary = {
      totalAssessments: assessmentData.length,

      submitted: assessmentData.filter(
        (item) => item.status === "Submitted"
      ).length,

      inProgress: assessmentData.filter(
        (item) => item.status === "In Progress"
      ).length,

      notStarted: assessmentData.filter(
        (item) => item.status === "Not Started"
      ).length,

      expired: assessmentData.filter(
        (item) => item.status === "Expired"
      ).length,
    };

    return res.status(200).json({
      success: true,
      message: "Student assessments fetched successfully.",

      student: {
        _id: student._id,
        userId: student.userId,
        name: student.name,
        email: student.email,
      },

      batch: {
        _id: studentBatch._id,
        batch: studentBatch.batch || studentBatch.name,
      },

      summary,
      assessments: assessmentData,
    });

  } catch (error) {
    console.error("Student assessment list error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessments.",
      error: error.message,
    });
  }
};


// --------------------------------------------------
// 2. START / RESUME ASSESSMENT
// POST /api/student/assessments/:id/start
// --------------------------------------------------

export const startAssessment = async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentBatch = await resolveStudentBatch(student);

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
      });
    }

    const assessment = await getAssessmentForStudent(
      req.params.id,
      studentBatch
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not available or deadline expired.",
      });
    }

    let attempt = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: student._id,
    });

    if (attempt?.status === "Submitted") {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this assessment.",
        submitted: true,
      });
    }

    if (!attempt) {
      attempt = await AssessmentAttempt.create({
        assessment: assessment._id,
        student: student._id,

        // Store Batch ObjectId, not "MERN-01".
        batch: studentBatch._id,

        totalQuestions: assessment.questions.length,
        totalMarks: assessment.totalMarks,
        answers: [],
        status: "In Progress",
      });
    }

    const formattedAssessment =
      formatStudentAssessment(assessment);

    return res.json({
      success: true,
      message: "Assessment ready.",

      assessment: formattedAssessment,

      attempt: {
        _id: attempt._id,
        status: attempt.status,

        answers: attempt.answers.map((answer) => ({
          question: answer.question,
          selectedOption: answer.selectedOption,
        })),

        startedAt: attempt.startedAt,
      },
    });
  } catch (error) {
    console.error("Start assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start assessment.",
    });
  }
};

// --------------------------------------------------
// 3. SAVE ANSWER
// PATCH /api/student/assessments/:id/save-answer
// --------------------------------------------------

export const saveAssessmentAnswer = async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentBatch = await resolveStudentBatch(student);

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
      });
    }

    const { questionId, selectedOption } = req.body;

    if (
      !isValidId(req.params.id) ||
      !isValidId(questionId) ||
      !isValidId(selectedOption)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment, question or option ID.",
      });
    }

    const assessment = await getAssessmentForStudent(
      req.params.id,
      studentBatch
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not available or deadline expired.",
      });
    }

    const question = assessment.questions.id(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    const optionExists = question.options.some(
      (option) =>
        String(option._id) === String(selectedOption)
    );

    if (!optionExists) {
      return res.status(400).json({
        success: false,
        message: "Selected option does not belong to this question.",
      });
    }

    const attempt = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: student._id,
    });

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: "Start the assessment first.",
      });
    }

    if (attempt.status === "Submitted") {
      return res.status(400).json({
        success: false,
        message: "Assessment already submitted.",
      });
    }

    const existingAnswer = attempt.answers.find(
      (answer) =>
        String(answer.question) === String(questionId)
    );

    if (existingAnswer) {
      existingAnswer.selectedOption = selectedOption;
    } else {
      attempt.answers.push({
        question: questionId,
        selectedOption,
      });
    }

    await attempt.save();

    return res.json({
      success: true,
      message: "Answer saved successfully.",

      savedAnswer: {
        questionId,
        selectedOption,
      },
    });
  } catch (error) {
    console.error("Save assessment answer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save answer.",
    });
  }
};

// --------------------------------------------------
// 4. SUBMIT ASSESSMENT
// POST /api/student/assessments/:id/submit
// --------------------------------------------------

export const submitAssessment = async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentBatch = await resolveStudentBatch(student);

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID.",
      });
    }

    // Use Batch ObjectId, not student.batch code.
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      batch: studentBatch._id,
      status: "Published",
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    const attempt = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: student._id,
    });

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: "Start the assessment first.",
      });
    }

    if (attempt.status === "Submitted") {
      return res.status(400).json({
        success: false,
        message: "Assessment has already been submitted.",
      });
    }

    const now = new Date();

    if (
      assessment.dueDate &&
      now > new Date(assessment.dueDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Assessment submission deadline has passed.",
      });
    }

    let obtainedMarks = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let attemptedQuestions = 0;
    let unansweredQuestions = 0;

    // Evaluate every answer on the server.
    const evaluatedAnswers = assessment.questions.map(
      (question) => {
        const studentAnswer = attempt.answers.find(
          (answer) =>
            String(answer.question) === String(question._id)
        );

        const selectedOption =
          studentAnswer?.selectedOption || null;

        if (!selectedOption) {
          unansweredQuestions++;

          return {
            question: question._id,
            selectedOption: null,
            isCorrect: false,
            marksObtained: 0,
          };
        }

        attemptedQuestions++;

        const isCorrect =
          String(selectedOption) ===
          String(question.correctOption);

        const marksObtained = isCorrect
          ? Number(question.marks || 0)
          : 0;

        if (isCorrect) {
          correctAnswers++;
          obtainedMarks += marksObtained;
        } else {
          incorrectAnswers++;
        }

        return {
          question: question._id,
          selectedOption,
          isCorrect,
          marksObtained,
        };
      }
    );

    const totalMarks = assessment.questions.reduce(
      (total, question) =>
        total + Number(question.marks || 0),
      0
    );

    const percentage =
      totalMarks > 0
        ? Number(
            ((obtainedMarks / totalMarks) * 100).toFixed(2)
          )
        : 0;

    // Save final result.
    attempt.answers = evaluatedAnswers;
    attempt.totalQuestions = assessment.questions.length;
    attempt.attemptedQuestions = attemptedQuestions;
    attempt.correctAnswers = correctAnswers;
    attempt.incorrectAnswers = incorrectAnswers;
    attempt.unansweredQuestions = unansweredQuestions;
    attempt.totalMarks = totalMarks;
    attempt.obtainedMarks = obtainedMarks;
    attempt.percentage = percentage;
    attempt.status = "Submitted";
    attempt.submittedAt = now;

    await attempt.save();

    return res.json({
      success: true,
      message: "Assessment submitted successfully.",

      result: {
        totalQuestions: attempt.totalQuestions,
        attemptedQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        totalMarks,
        obtainedMarks,
        percentage,
        status: "Submitted",
        submittedAt: now,
      },
    });
  } catch (error) {
    console.error("Submit assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit assessment.",
    });
  }
};

// --------------------------------------------------
// 5. GET STUDENT RESULT
// GET /api/student/assessments/:id/result
// --------------------------------------------------

export const getStudentAssessmentResult = async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentBatch = await resolveStudentBatch(student);

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID.",
      });
    }

    const assessment = await Assessment.findOne({
      _id: req.params.id,
      batch: studentBatch._id,
    }).lean();

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    const attempt = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: student._id,
      status: "Submitted",
    }).lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Assessment result not available.",
      });
    }

    const answerSheet = assessment.questions.map(
      (question) => {
        const answer = attempt.answers.find(
          (item) =>
            String(item.question) === String(question._id)
        );

        const selectedOption = question.options.find(
          (option) =>
            String(option._id) ===
            String(answer?.selectedOption)
        );

        const correctOption = question.options.find(
          (option) =>
            String(option._id) ===
            String(question.correctOption)
        );

        return {
          questionId: question._id,
          questionText: question.questionText,

          options: question.options.map((option) => ({
            _id: option._id,
            optionText: option.optionText,
          })),

          selectedOption: answer?.selectedOption || null,

          selectedOptionText:
            selectedOption?.optionText || null,

          correctOption: question.correctOption,

          correctOptionText:
            correctOption?.optionText || null,

          isCorrect: answer?.isCorrect || false,

          marks: question.marks,

          marksObtained:
            answer?.marksObtained || 0,
        };
      }
    );

    return res.json({
      success: true,

      assessment: {
        _id: assessment._id,
        title: assessment.title,
        totalQuestions: assessment.questions.length,
      },

      result: {
        totalQuestions: attempt.totalQuestions,
        attemptedQuestions: attempt.attemptedQuestions,
        correctAnswers: attempt.correctAnswers,
        incorrectAnswers: attempt.incorrectAnswers,
        unansweredQuestions: attempt.unansweredQuestions,
        totalMarks: attempt.totalMarks,
        obtainedMarks: attempt.obtainedMarks,
        percentage: attempt.percentage,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
      },

      answerSheet,
    });
  } catch (error) {
    console.error("Get student result error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessment result.",
    });
  }
};

// ======================================================
// GET ALL ASSESSMENT RESULTS OF LOGGED-IN STUDENT
// GET /api/student/assessments/results
// ======================================================

export const getAllStudentAssessmentResults = async (req, res) => {
  try {
    // 1. Get logged-in student
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // 2. Resolve student batch
    const studentBatch = await resolveStudentBatch(student);

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "Student batch not found.",
      });
    }

    // 3. Get all assessments assigned to student's batch
    const assessments = await Assessment.find({
      batch: studentBatch._id,
    })
      .select("_id title description questions createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!assessments.length) {
      return res.json({
        success: true,
        message: "No assessments found.",
        batch: {
          _id: studentBatch._id,
          batchName: studentBatch.batchName || studentBatch.name,
        },
        totalAssessments: 0,
        attemptedAssessments: 0,
        pendingAssessments: 0,
        results: [],
      });
    }

    // 4. Get all submitted attempts of this student
    const attempts = await AssessmentAttempt.find({
      student: student._id,
      status: "Submitted",
      assessment: {
        $in: assessments.map((item) => item._id),
      },
    })
      .sort({ submittedAt: -1 })
      .lean();

    // 5. Create attempt lookup
    const attemptMap = new Map();

    attempts.forEach((attempt) => {
      const assessmentId = String(attempt.assessment);

      // Keep the latest submitted attempt if multiple exist
      if (!attemptMap.has(assessmentId)) {
        attemptMap.set(assessmentId, attempt);
      }
    });

    // 6. Prepare assessment results
    const results = assessments.map((assessment) => {
      const attempt = attemptMap.get(
        String(assessment._id)
      );

      return {
        assessment: {
          _id: assessment._id,
          title: assessment.title,
          description: assessment.description || "",
          totalQuestions: assessment.questions?.length || 0,
          createdAt: assessment.createdAt,
        },

        attempted: !!attempt,

        result: attempt
          ? {
              totalQuestions: attempt.totalQuestions,
              attemptedQuestions: attempt.attemptedQuestions,
              correctAnswers: attempt.correctAnswers,
              incorrectAnswers: attempt.incorrectAnswers,
              unansweredQuestions: attempt.unansweredQuestions,
              totalMarks: attempt.totalMarks,
              obtainedMarks: attempt.obtainedMarks,
              percentage: attempt.percentage,
              status: attempt.status,
              submittedAt: attempt.submittedAt,
            }
          : null,
      };
    });

    // 7. Calculate summary
    const attemptedAssessments = results.filter(
      (item) => item.attempted
    ).length;

    const pendingAssessments =
      assessments.length - attemptedAssessments;

    const totalObtainedMarks = attempts.reduce(
      (sum, item) => sum + (Number(item.obtainedMarks) || 0),
      0
    );

    const totalMarks = attempts.reduce(
      (sum, item) => sum + (Number(item.totalMarks) || 0),
      0
    );

    const averagePercentage = attempts.length
      ? Number(
          (
            attempts.reduce(
              (sum, item) =>
                sum + (Number(item.percentage) || 0),
              0
            ) / attempts.length
          ).toFixed(2)
        )
      : 0;

    return res.status(200).json({
      success: true,
      message: "Student assessment results fetched successfully.",

      batch: {
        _id: studentBatch._id,
        batchName: studentBatch.batchName || studentBatch.name,
      },

      summary: {
        totalAssessments: assessments.length,
        attemptedAssessments,
        pendingAssessments,
        totalObtainedMarks,
        totalMarks,
        averagePercentage,
      },

      results,
    });
  } catch (error) {
    console.error(
      "Get all student assessment results error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student assessment results.",
    });
  }
};
