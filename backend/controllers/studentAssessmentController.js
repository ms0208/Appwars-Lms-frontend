import mongoose from "mongoose";

import Assignment from "../models/Assignement.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";
import Course from "../models/Course.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const idOf = (value) => String(value?._id || value);

const validId = (value) =>
  mongoose.isValidObjectId(value);

const getStudentCourseFilter = (user) => ({
  $or: [
    { students: user._id },
    { _id: { $in: user.enrolledCourses || [] } },
    ...(user.batchId ? [{ batchId: user.batchId }] : []),
  ],
});

const getAssessmentFilter = (user) => {
  const conditions = [];

  if (user.batchId) {
    conditions.push({ batchId: user.batchId });
  }

  if (user.enrolledCourses?.length) {
    conditions.push({
      course: { $in: user.enrolledCourses },
    });
  }

  return conditions.length ? { $or: conditions } : null;
};

const ensureAssessmentAccess = async (user, assessment) => {
  const conditions = [];

  if (assessment.course) {
    conditions.push({
      _id: assessment.course,
      ...getStudentCourseFilter(user),
    });
  }

  if (
    assessment.batchId &&
    user.batchId &&
    idOf(assessment.batchId) === idOf(user.batchId)
  ) {
    conditions.push({
      batchId: user.batchId,
    });
  }

  if (conditions.length === 0) {
    throw new ApiError(
      403,
      "This assessment is not assigned to your course or batch."
    );
  }

  const accessibleCourse = await Course.findOne({
    $or: conditions,
  })
    .select("_id")
    .lean();

  if (!accessibleCourse) {
    throw new ApiError(
      403,
      "You are not authorized to access this assessment."
    );
  }
};

/* =========================================================
   ASSIGNMENTS
========================================================= */

/**
 * GET /api/student/assignments
 */
export const getAssignments = asyncHandler(async (req, res) => {
  const filter = getAssessmentFilter(req.user);

  if (!filter) {
    return res.json({ assignments: [] });
  }

  const assignments = await Assignment.find({
    $and: [filter, { isPublished: true }],
  })
    .populate("course", "courseName")
    .sort({ dueDate: 1 })
    .lean();

  const submissions = await AssignmentSubmission.find({
    student: req.user._id,
    assignment: {
      $in: assignments.map((assignment) => assignment._id),
    },
  }).lean();

  const submissionMap = new Map(
    submissions.map((submission) => [
      idOf(submission.assignment),
      submission,
    ])
  );

  const result = assignments.map((assignment) => {
    const submission = submissionMap.get(idOf(assignment._id));

    const late =
      !submission &&
      new Date(assignment.dueDate).getTime() < Date.now();

    return {
      ...assignment,
      courseName: assignment.course?.courseName || "",
      status: submission?.status || (late ? "Late" : "Pending"),
      submission: submission || null,
    };
  });

  res.json({ assignments: result });
});

/**
 * GET /api/student/assignments/:id
 */
export const getAssignmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    throw new ApiError(400, "Invalid assignment ID.");
  }

  const assignment = await Assignment.findOne({
    _id: id,
    isPublished: true,
  })
    .populate("course", "courseName")
    .lean();

  if (!assignment) {
    throw new ApiError(404, "Assignment not found.");
  }

  await ensureAssessmentAccess(req.user, assignment);

  const submission = await AssignmentSubmission.findOne({
    assignment: assignment._id,
    student: req.user._id,
  }).lean();

  res.json({
    assignment: {
      ...assignment,
      courseName: assignment.course?.courseName || "",
    },
    submission,
  });
});

/**
 * POST /api/student/assignments/:id/submit
 *
 * Body:
 * {
 *   "answerText": "My answer...",
 *   "submissionUrl": "https://example.com/my-work"
 * }
 */
export const submitAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answerText = "", submissionUrl = "" } = req.body;

  if (!validId(id)) {
    throw new ApiError(400, "Invalid assignment ID.");
  }

  const assignment = await Assignment.findOne({
    _id: id,
    isPublished: true,
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found.");
  }

  await ensureAssessmentAccess(req.user, assignment);

  if (
    !String(answerText).trim() &&
    !String(submissionUrl).trim()
  ) {
    throw new ApiError(
      400,
      "Provide an answer or a submission URL."
    );
  }

  if (
    String(answerText).trim() &&
    !assignment.allowedSubmissionTypes.includes("text")
  ) {
    throw new ApiError(
      400,
      "Text submissions are not allowed for this assignment."
    );
  }

  if (
    String(submissionUrl).trim() &&
    !assignment.allowedSubmissionTypes.includes("url")
  ) {
    throw new ApiError(
      400,
      "URL submissions are not allowed for this assignment."
    );
  }

  const existing = await AssignmentSubmission.findOne({
    assignment: assignment._id,
    student: req.user._id,
  });

  if (existing?.status === "Graded") {
    throw new ApiError(
      409,
      "This assignment has already been graded."
    );
  }

  const now = new Date();

  if (now > new Date(assignment.dueDate)) {
    throw new ApiError(
      400,
      "The assignment deadline has passed."
    );
  }

  const submission = await AssignmentSubmission.findOneAndUpdate(
    {
      assignment: assignment._id,
      student: req.user._id,
    },
    {
      $set: {
        answerText: String(answerText).trim(),
        submissionUrl: String(submissionUrl).trim(),
        submittedAt: now,
        status: "Submitted",
      },
      $setOnInsert: {
        assignment: assignment._id,
        student: req.user._id,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(201).json({
    message: "Assignment submitted successfully.",
    submission,
  });
});

/* =========================================================
   TESTS
========================================================= */

/**
 * GET /api/student/tests
 */
export const getTests = asyncHandler(async (req, res) => {
  const filter = getAssessmentFilter(req.user);

  if (!filter) {
    return res.json({ tests: [] });
  }

  const tests = await Test.find({
    $and: [filter, { isPublished: true }],
  })
    .populate("course", "courseName")
    .sort({ startAt: 1 })
    .lean();

  const attempts = await TestAttempt.find({
    student: req.user._id,
    test: { $in: tests.map((test) => test._id) },
  })
    .select("test attemptNumber status marksObtained percentage passed submittedAt")
    .lean();

  const attemptsByTest = new Map();

  for (const attempt of attempts) {
    const key = idOf(attempt.test);

    if (!attemptsByTest.has(key)) {
      attemptsByTest.set(key, []);
    }

    attemptsByTest.get(key).push(attempt);
  }

  const now = Date.now();

  res.json({
    tests: tests.map((test) => {
      const testAttempts = attemptsByTest.get(idOf(test._id)) || [];
      const completedAttempts = testAttempts.filter(
        (attempt) => attempt.status !== "In Progress"
      );

      return {
        _id: test._id,
        title: test.title,
        description: test.description,
        courseName: test.course?.courseName || "",
        durationMinutes: test.durationMinutes,
        startAt: test.startAt,
        endAt: test.endAt,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
        maxAttempts: test.maxAttempts,
        attemptsUsed: testAttempts.length,
        attemptsRemaining: Math.max(
          0,
          test.maxAttempts - testAttempts.length
        ),
        status:
          now < new Date(test.startAt).getTime()
            ? "Upcoming"
            : now > new Date(test.endAt).getTime()
              ? "Closed"
              : "Available",
        results: completedAttempts,
      };
    }),
  });
});

/**
 * GET /api/student/tests/:id
 *
 * Never expose correctOption before the test is submitted.
 */
export const getTestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    throw new ApiError(400, "Invalid test ID.");
  }

  const test = await Test.findOne({
    _id: id,
    isPublished: true,
  }).populate("course", "courseName");

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  await ensureAssessmentAccess(req.user, test);

  const now = Date.now();

  if (
    now < new Date(test.startAt).getTime() ||
    now > new Date(test.endAt).getTime()
  ) {
    throw new ApiError(
      400,
      "This test is not currently available."
    );
  }

  const attempts = await TestAttempt.find({
    test: test._id,
    student: req.user._id,
  })
    .sort({ attemptNumber: -1 })
    .lean();

  const activeAttempt = attempts.find(
    (attempt) => attempt.status === "In Progress"
  );

  if (
    !activeAttempt &&
    attempts.length >= test.maxAttempts
  ) {
    throw new ApiError(
      409,
      "You have used all your attempts for this test."
    );
  }

  res.json({
    test: {
      _id: test._id,
      title: test.title,
      description: test.description,
      courseName: test.course?.courseName || "",
      durationMinutes: test.durationMinutes,
      startAt: test.startAt,
      endAt: test.endAt,
      totalMarks: test.totalMarks,
      questions: test.questions.map((question) => ({
        _id: question._id,
        questionText: question.questionText,
        options: question.options,
        marks: question.marks,
      })),
    },
    activeAttempt: activeAttempt || null,
    attemptsUsed: attempts.length,
  });
});

/**
 * POST /api/student/tests/:id/start
 */
export const startTest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    throw new ApiError(400, "Invalid test ID.");
  }

  const test = await Test.findOne({
    _id: id,
    isPublished: true,
  });

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  await ensureAssessmentAccess(req.user, test);

  const now = new Date();

  if (now < test.startAt || now > test.endAt) {
    throw new ApiError(
      400,
      "The test is not currently available."
    );
  }

  const existingAttempts = await TestAttempt.find({
    test: test._id,
    student: req.user._id,
  }).sort({ attemptNumber: -1 });

  const activeAttempt = existingAttempts.find(
    (attempt) => attempt.status === "In Progress"
  );

  if (activeAttempt) {
    if (now >= activeAttempt.expiresAt || now > test.endAt) {
      activeAttempt.status = "Timed Out";
      activeAttempt.submittedAt = now;
      activeAttempt.answers = [];
      await activeAttempt.save();

      throw new ApiError(
        400,
        "Your previous test attempt has expired."
      );
    }

    return res.json({
      message: "Resuming your existing test attempt.",
      attempt: {
        _id: activeAttempt._id,
        startedAt: activeAttempt.startedAt,
        expiresAt: activeAttempt.expiresAt,
        status: activeAttempt.status,
      },
    });
  }

  if (existingAttempts.length >= test.maxAttempts) {
    throw new ApiError(
      409,
      "You have used all your attempts for this test."
    );
  }

  const expiresAt = new Date(
    Math.min(
      now.getTime() + test.durationMinutes * 60 * 1000,
      new Date(test.endAt).getTime()
    )
  );

  const attempt = await TestAttempt.create({
    test: test._id,
    student: req.user._id,
    attemptNumber: existingAttempts.length + 1,
    answers: [],
    startedAt: now,
    expiresAt,
    totalMarks: test.totalMarks,
  });

  res.status(201).json({
    message: "Test started successfully.",
    attempt: {
      _id: attempt._id,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      status: attempt.status,
    },
    questions: test.questions.map((question) => ({
      _id: question._id,
      questionText: question.questionText,
      options: question.options,
      marks: question.marks,
    })),
  });
});

/**
 * POST /api/student/tests/:id/submit
 *
 * Body:
 * {
 *   "attemptId": "MongoDB attempt ID",
 *   "answers": [
 *     {
 *       "questionId": "MongoDB question ID",
 *       "selectedOption": 1
 *     }
 *   ]
 * }
 */
export const submitTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attemptId, answers = [] } = req.body;

  if (!validId(id) || !validId(attemptId)) {
    throw new ApiError(
      400,
      "Valid test ID and attempt ID are required."
    );
  }

  if (!Array.isArray(answers)) {
    throw new ApiError(400, "Answers must be an array.");
  }

  const test = await Test.findOne({
    _id: id,
    isPublished: true,
  });

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  await ensureAssessmentAccess(req.user, test);

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    test: test._id,
    student: req.user._id,
  });

  if (!attempt) {
    throw new ApiError(404, "Test attempt not found.");
  }

  if (attempt.status !== "In Progress") {
    throw new ApiError(
      409,
      "This test attempt has already been submitted."
    );
  }

  const now = new Date();

  if (now > attempt.expiresAt || now > test.endAt) {
    attempt.status = "Timed Out";
    attempt.submittedAt = now;
    attempt.answers = [];
    await attempt.save();

    throw new ApiError(
      400,
      "Your test time has expired."
    );
  }

  const questionMap = new Map(
    test.questions.map((question) => [
      idOf(question._id),
      question,
    ])
  );

  const seenQuestions = new Set();
  let marksObtained = 0;

  const normalizedAnswers = answers.map((answer) => {
    const questionId = String(answer.questionId || "");

    if (!validId(questionId)) {
      throw new ApiError(400, "Invalid question ID.");
    }

    if (seenQuestions.has(questionId)) {
      throw new ApiError(
        400,
        "Duplicate answers for a question are not allowed."
      );
    }

    seenQuestions.add(questionId);

    const question = questionMap.get(questionId);

    if (!question) {
      throw new ApiError(
        400,
        "An answer refers to a question outside this test."
      );
    }

    const selectedOption = Number(answer.selectedOption);

    if (
      !Number.isInteger(selectedOption) ||
      selectedOption < 0 ||
      selectedOption >= question.options.length
    ) {
      throw new ApiError(
        400,
        "A selected option is invalid."
      );
    }

    if (selectedOption === question.correctOption) {
      marksObtained += question.marks;
    }

    return {
      question: question._id,
      selectedOption,
    };
  });

  const percentage = test.totalMarks
    ? Math.round((marksObtained / test.totalMarks) * 10000) / 100
    : 0;

  attempt.answers = normalizedAnswers;
  attempt.submittedAt = now;
  attempt.status = "Submitted";
  attempt.marksObtained = marksObtained;
  attempt.percentage = percentage;
  attempt.passed = marksObtained >= test.passingMarks;

  await attempt.save();

  res.json({
    message: "Test submitted successfully.",
    result: {
      attemptId: attempt._id,
      testId: test._id,
      marksObtained,
      totalMarks: test.totalMarks,
      percentage,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    },
  });
});

/**
 * GET /api/student/tests/:id/results
 */
export const getTestResults = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    throw new ApiError(400, "Invalid test ID.");
  }

  const test = await Test.findOne({
    _id: id,
    isPublished: true,
  })
    .select("title totalMarks passingMarks")
    .lean();

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  await ensureAssessmentAccess(req.user, test);

  const attempts = await TestAttempt.find({
    test: test._id,
    student: req.user._id,
    status: { $in: ["Submitted", "Timed Out"] },
  })
    .select(
      "attemptNumber status marksObtained totalMarks percentage passed startedAt submittedAt"
    )
    .sort({ attemptNumber: -1 })
    .lean();

  res.json({
    test: {
      _id: test._id,
      title: test.title,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
    },
    results: attempts,
  });
});