
import mongoose from "mongoose";

import User from "../models/user.js";
import { Batch } from "../models/AdminModels.js";

import StudentTopicProgress from "../models/StudentTopicProgress.js";
import BatchSyllabusProgress from "../models/BatchSyllabusProgress.js";

// ==========================================
// HELPERS
// ==========================================

const getUserId = (req) => req.user.id || req.user._id;

const calculateProgress = (topics, field) => {
  if (!topics || topics.length === 0) {
    return 0;
  }

  const total = topics.reduce(
    (sum, topic) => sum + (topic[field] || 0),
    0
  );

  return Math.round(total / topics.length);
};

// Resolve the actual MongoDB student _id.
// Supports both MongoDB _id and custom IDs like STU6A151C5D.
const getStudentMongoId = async (req) => {
  const identity =
    req.user?._id ||
    req.user?.userId ||
    req.user?.id;

  if (!identity) return null;

  const conditions = [{ userId: String(identity) }];

  if (mongoose.isValidObjectId(identity)) {
    conditions.push({ _id: identity });
  }

  const student = await User.findOne({
    role: "Student",
    isActive: true,
    $or: conditions,
  }).select("_id");

  return student?._id || null;
};

// Verify the student belongs to the requested batch.
const getStudentBatch = async (studentId, batchId) => {
  const batch = await Batch.findById(batchId);

  if (!batch) return null;

  const student = await User.findOne({
    _id: studentId,
    role: "Student",
    isActive: true,
    $or: [
      { batchId: batch._id },
      { batch: batch.batch },
    ],
  });

  if (!student) return null;

  return batch;
};

// ==========================================
// 1. GET STUDENT SELF-ASSESSMENT + TRAINER SYLLABUS
// GET /api/progress/student/:batchId
// ==========================================

export const getStudentBatchProgress = async (req, res) => {
  try {
    const studentId = getUserId(req);
    const { batchId } = req.params;

    if (
      !mongoose.isValidObjectId(studentId) ||
      !mongoose.isValidObjectId(batchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID or batch ID.",
      });
    }

    // Verify that the student belongs to this batch
    const batch = await getStudentBatch(studentId, batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Student is not assigned to this batch.",
      });
    }

    // Fetch trainer syllabus
    const syllabus = await BatchSyllabusProgress.findOne({
      batch: batchId,
    }).lean();

    // Fetch student's personal progress
    const studentProgress = await StudentTopicProgress.findOne({
      student: studentId,
      batch: batchId,
    }).lean();

    const trainerTopics = syllabus?.topics || [];
    const studentTopics = studentProgress?.topics || [];

    // Match student progress with trainer syllabus by topic name
    const topics = trainerTopics.map((trainerTopic) => {
      const studentTopic = studentTopics.find(
        (item) =>
          item.topicName?.trim().toLowerCase() ===
          trainerTopic.topicName?.trim().toLowerCase()
      );

      return {
        // IMPORTANT: This is the trainer syllabus topic ID.
        // Use this ID in the existing student PUT API.
        _id: trainerTopic._id,

        topicName: trainerTopic.topicName,

        // Trainer's syllabus progress
        completionPercentage:
          trainerTopic.completionPercentage || 0,

        trainerStatus: trainerTopic.status || "Pending",

        // Student's personal self-assessment
        knowledgePercentage:
          studentTopic?.knowledgePercentage ?? 0,

        status: studentTopic?.status || "Not Started",

        updatedAt: studentTopic?.updatedAt || null,

        // Optional: student's own progress record ID
        studentProgressId: studentTopic?._id || null,
      };
    });

    const overallProgress = calculateProgress(
      topics,
      "knowledgePercentage"
    );

    return res.status(200).json({
      success: true,
      message: "Student learning progress fetched successfully.",

      batch: {
        id: batch._id,
        name: batch.batch,
      },

      overallProgress,
      totalTopics: topics.length,

      trainerOverallProgress: calculateProgress(
        trainerTopics,
        "completionPercentage"
      ),

      topics,
    });
  } catch (error) {
    console.error("Get Student Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch student progress.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. UPDATE STUDENT TOPIC KNOWLEDGE
// PUT /api/progress/student/:batchId/:topicId
// ==========================================


export const updateStudentTopicProgress = async (req, res) => {
  try {
    const studentId = getUserId(req);
    const { batchId, topicId } = req.params;
    const { knowledgePercentage } = req.body;

    if (
      !mongoose.isValidObjectId(batchId) ||
      !mongoose.isValidObjectId(topicId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID or topic ID.",
      });
    }

    if (
      typeof knowledgePercentage !== "number" ||
      knowledgePercentage < 0 ||
      knowledgePercentage > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Knowledge percentage must be between 0 and 100.",
      });
    }

    // Verify student batch
    const batch = await getStudentBatch(studentId, batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Student is not assigned to this batch.",
      });
    }

    // Fetch trainer syllabus
    const syllabus = await BatchSyllabusProgress.findOne({
      batch: batchId,
    });

    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Trainer syllabus has not been created yet.",
      });
    }

    // Verify topic exists in trainer syllabus
    const syllabusTopic = syllabus.topics.id(topicId);

    if (!syllabusTopic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found in batch syllabus.",
      });
    }

    // Find or create student progress
    let progress = await StudentTopicProgress.findOne({
      student: studentId,
      batch: batchId,
    });

    if (!progress) {
      progress = new StudentTopicProgress({
        student: studentId,
        batch: batchId,
        topics: syllabus.topics.map((topic) => ({
          topicName: topic.topicName,
          knowledgePercentage: 0,
          status: "Not Started",
        })),
      });
    }

    // Synchronize newly added trainer topics
    for (const syllabusItem of syllabus.topics) {
      const exists = progress.topics.some(
        (topic) =>
          topic.topicName.toLowerCase() ===
          syllabusItem.topicName.toLowerCase()
      );

      if (!exists) {
        progress.topics.push({
          topicName: syllabusItem.topicName,
          knowledgePercentage: 0,
          status: "Not Started",
        });
      }
    }

    // Find student's corresponding topic by name
    const studentTopic = progress.topics.find(
      (topic) =>
        topic.topicName.toLowerCase() ===
        syllabusTopic.topicName.toLowerCase()
    );

    if (!studentTopic) {
      return res.status(404).json({
        success: false,
        message: "Student topic could not be synchronized.",
      });
    }

    // Update student knowledge
    studentTopic.knowledgePercentage = knowledgePercentage;

    studentTopic.status =
      knowledgePercentage === 0
        ? "Not Started"
        : knowledgePercentage >= 80
        ? "Confident"
        : "Learning";

    studentTopic.updatedAt = new Date();

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Student topic progress updated successfully.",

      overallProgress: calculateProgress(
        progress.topics,
        "knowledgePercentage"
      ),

      topics: progress.topics,
    });
  } catch (error) {
    console.error("Update Student Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update student progress.",
      error: error.message,
    });
  }
};


// ==========================================
// 3. GET TRAINER BATCH SYLLABUS PROGRESS
// GET /api/progress/trainer/:batchId
// ==========================================

export const getTrainerBatchProgress = async (req, res) => {
  try {
    const trainerId = getUserId(req);
    const { batchId } = req.params;

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    // IMPORTANT:
    // This assumes the Batch model has a trainer field
    // containing the assigned trainer's ObjectId.
    const batch = await Batch.findOne({
      _id: batchId,
      trainer: trainerId,
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    let progress = await BatchSyllabusProgress.findOne({
      batch: batchId,
    }).lean();

    if (!progress) {
      progress = {
        batch: batchId,
        trainer: trainerId,
        topics: [],
      };
    }

    return res.status(200).json({
      success: true,
      message: "Batch syllabus progress fetched successfully.",
      batch: {
        id: batch._id,
        name: batch.batch,
      },
      overallProgress: calculateProgress(
        progress.topics,
        "completionPercentage"
      ),
      totalTopics: progress.topics.length,
      completedTopics: progress.topics.filter(
        (topic) => topic.completionPercentage === 100
      ).length,
      topics: progress.topics,
    });
  } catch (error) {
    console.error("Get Trainer Batch Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch batch syllabus progress.",
      error: error.message,
    });
  }
};

// ==========================================
// 4. ADD BATCH SYLLABUS TOPIC
// POST /api/progress/trainer/:batchId/topics
// ==========================================

export const addBatchSyllabusTopic = async (req, res) => {
  try {
    const trainerId = getUserId(req);
    const { batchId } = req.params;
    const { topicName } = req.body;

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    if (!topicName || !topicName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Topic name is required.",
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      trainer: trainerId,
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    let progress = await BatchSyllabusProgress.findOne({
      batch: batchId,
    });

    if (!progress) {
      progress = new BatchSyllabusProgress({
        batch: batchId,
        trainer: trainerId,
        topics: [],
      });
    }

    const existingTopic = progress.topics.find(
      (topic) =>
        topic.topicName.toLowerCase() === topicName.trim().toLowerCase()
    );

    if (existingTopic) {
      return res.status(409).json({
        success: false,
        message: "This topic already exists.",
      });
    }

    progress.topics.push({
      topicName: topicName.trim(),
      completionPercentage: 0,
      status: "Pending",
      completedAt: null,
    });

    await progress.save();

    return res.status(201).json({
      success: true,
      message: "Syllabus topic added successfully.",
      overallProgress: calculateProgress(
        progress.topics,
        "completionPercentage"
      ),
      topics: progress.topics,
    });
  } catch (error) {
    console.error("Add Syllabus Topic Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add syllabus topic.",
      error: error.message,
    });
  }
};

// ==========================================
// 5. UPDATE BATCH SYLLABUS TOPIC
// PUT /api/progress/trainer/:batchId/topics/:topicId
// ==========================================

export const updateBatchSyllabusTopic = async (req, res) => {
  try {
    const trainerId = getUserId(req);
    const { batchId, topicId } = req.params;

    const { completionPercentage, topicName } = req.body;

    if (
      !mongoose.isValidObjectId(batchId) ||
      !mongoose.isValidObjectId(topicId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID or topic ID.",
      });
    }

    if (
      completionPercentage !== undefined &&
      (
        typeof completionPercentage !== "number" ||
        completionPercentage < 0 ||
        completionPercentage > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Completion percentage must be between 0 and 100.",
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      trainer: trainerId,
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const progress = await BatchSyllabusProgress.findOne({
      batch: batchId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Batch syllabus progress not found.",
      });
    }

    const topic = progress.topics.id(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Syllabus topic not found.",
      });
    }

    if (topicName !== undefined) {
      if (!topicName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Topic name cannot be empty.",
        });
      }

      topic.topicName = topicName.trim();
    }

    if (completionPercentage !== undefined) {
      topic.completionPercentage = completionPercentage;
    }

    topic.status =
      topic.completionPercentage === 100
        ? "Completed"
        : topic.completionPercentage > 0
        ? "In Progress"
        : "Pending";

    topic.completedAt =
      topic.completionPercentage === 100
        ? topic.completedAt || new Date()
        : null;

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Syllabus topic updated successfully.",
      overallProgress: calculateProgress(
        progress.topics,
        "completionPercentage"
      ),
      topics: progress.topics,
    });
  } catch (error) {
    console.error("Update Syllabus Topic Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update syllabus topic.",
      error: error.message,
    });
  }
};

// ==========================================
// 6. DELETE BATCH SYLLABUS TOPIC
// DELETE /api/progress/trainer/:batchId/topics/:topicId
// ==========================================

export const deleteBatchSyllabusTopic = async (req, res) => {
  try {
    const trainerId = getUserId(req);
    const { batchId, topicId } = req.params;

    if (
      !mongoose.isValidObjectId(batchId) ||
      !mongoose.isValidObjectId(topicId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID or topic ID.",
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      trainer: trainerId,
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not assigned to you.",
      });
    }

    const progress = await BatchSyllabusProgress.findOne({
      batch: batchId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Batch syllabus progress not found.",
      });
    }

    const topic = progress.topics.id(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Syllabus topic not found.",
      });
    }

    topic.deleteOne();

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Syllabus topic deleted successfully.",
      overallProgress: calculateProgress(
        progress.topics,
        "completionPercentage"
      ),
      topics: progress.topics,
    });
  } catch (error) {
    console.error("Delete Syllabus Topic Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete syllabus topic.",
      error: error.message,
    });
  }
};

// ==========================================
// GET TRAINER BATCH PROGRESS FOR STUDENT
// GET /api/progress/student/:batchId/trainer
// ==========================================

export const getStudentTrainerBatchProgress = async (req, res) => {
  try {
    const { batchId } = req.params;

    // ==========================================
    // VALIDATE BATCH ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    // ==========================================
    // GET LOGGED-IN STUDENT
    // ==========================================

    const loggedInUserId =
      req.user?._id ||
      req.user?.id;

    const loggedInUserCode = req.user?.userId;

    let student = null;

    if (
      loggedInUserId &&
      mongoose.Types.ObjectId.isValid(loggedInUserId)
    ) {
      student = await User.findById(loggedInUserId).lean();
    }

    // Fallback for authentication middleware that supplies
    // the generated userId instead of MongoDB _id.

    if (!student && (loggedInUserCode || loggedInUserId)) {
      student = await User.findOne({
        userId: loggedInUserCode || loggedInUserId,
      }).lean();
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    if (String(student.role).toLowerCase() !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access this endpoint.",
      });
    }

    // ==========================================
    // VERIFY STUDENT BATCH
    // ==========================================

    const studentBatch =
      student.batch && typeof student.batch === "object"
        ? student.batch.batch || student.batch.name
        : student.batch;

    if (!studentBatch) {
      return res.status(400).json({
        success: false,
        message: "You are not assigned to any batch.",
      });
    }

    // Find the requested batch and verify that it belongs
    // to the logged-in student's assigned batch.

    const batch = await Batch.findOne({
      _id: batchId,
      batch: studentBatch,
    }).lean();

    if (!batch) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view progress for this batch.",
      });
    }

    // ==========================================
    // FETCH TRAINER SYLLABUS PROGRESS
    // ==========================================

    const trainerProgress =
      await BatchSyllabusProgress.findOne({
        batch: batchId,
      }).lean();

    // ==========================================
    // NO TRAINER PROGRESS FOUND
    // ==========================================

    if (!trainerProgress) {
      return res.status(200).json({
        success: true,
        message: "Your trainer has not added batch progress yet.",

        batch: {
          id: batch._id,
          name: batch.batch,
          course: batch.course || null,
          trainer: batch.trainer || null,
        },

        overallProgress: 0,
        totalTopics: 0,
        completedTopics: 0,
        topics: [],
      });
    }

    // ==========================================
    // CALCULATE PROGRESS
    // ==========================================

    const topics = Array.isArray(trainerProgress.topics)
      ? trainerProgress.topics
      : [];

    const totalTopics = topics.length;

    const completedTopics = topics.filter(
      (topic) =>
        String(topic.status || "").toLowerCase() === "completed" ||
        Number(topic.completionPercentage) >= 100
    ).length;

    const totalCompletion = topics.reduce(
      (sum, topic) =>
        sum + (Number(topic.completionPercentage) || 0),
      0
    );

    const overallProgress =
      totalTopics > 0
        ? Math.round(totalCompletion / totalTopics)
        : 0;

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Trainer batch progress fetched successfully.",

      batch: {
        id: batch._id,
        name: batch.batch,
        course: batch.course || null,
        trainer: batch.trainer || null,
      },

      overallProgress,
      totalTopics,
      completedTopics,

      topics: topics.map((topic) => ({
        _id: topic._id,
        topicName: topic.topicName,
        completionPercentage:
          Number(topic.completionPercentage) || 0,
        status: topic.status || "Pending",
        completedAt: topic.completedAt || null,
      })),
    });
  } catch (error) {
    console.error(
      "GET STUDENT TRAINER BATCH PROGRESS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch trainer batch progress.",
      error: error.message,
    });
  }
};