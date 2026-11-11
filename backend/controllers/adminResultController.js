
import mongoose from "mongoose";
import Result from "../models/result.js";
import User from "../models/user.js";
import  Batch  from "../models/Batch.js";

// ==========================================
// POPULATE CONFIGURATION
// ==========================================

const populateResult = (query) => {
  return query
    .populate({
      path: "student",
      select: "name userId email role batch",
      match: { role: "Student" },
    })
    .populate({
      path: "batch",
      select: "batch batchName name code course trainer startDate endDate status",
    });
};

// ==========================================
// GET ALL RESULTS
// GET /api/admin/results
// ==========================================

export const getResults = async (req, res) => {
  try {
    const results = await populateResult(
      Result.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Get results error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch results",
      error: error.message,
    });
  }
};

// ==========================================
// CREATE RESULT
// POST /api/admin/results
// ==========================================

export const createResult = async (req, res) => {
  try {
    const {
      studentId,
      batchId,
      exam,
      date,
      obtained,
      total,
      remarks,
      published,
    } = req.body;

    // Validate required fields
    if (
      !studentId ||
      !batchId ||
      !exam ||
      !date ||
      obtained === undefined ||
      total === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(batchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID or batch ID.",
      });
    }

    // Validate exam
    if (typeof exam !== "string" || !exam.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid exam name.",
      });
    }

    // Validate date
    const examDate = new Date(date);

    if (Number.isNaN(examDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid exam date.",
      });
    }

    // Find student
    const student = await User.findOne({
      _id: studentId,
      role: "Student",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Find batch
    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    // Convert marks
    const obtainedMarks = Number(obtained);
    const totalMarks = Number(total);

    // Validate marks
    if (
      !Number.isFinite(obtainedMarks) ||
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0 ||
      obtainedMarks < 0 ||
      obtainedMarks > totalMarks
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid marks. Obtained marks cannot exceed total marks.",
      });
    }

    // Create result
    const result = await Result.create({
      student: student._id,
      batch: batch._id,
      exam: exam.trim(),
      date: examDate,
      obtained: obtainedMarks,
      total: totalMarks,
      remarks: remarks || "",
      published: published ?? false,
    });

    // Populate result
    const populatedResult = await populateResult(
      Result.findById(result._id)
    );

    return res.status(201).json({
      success: true,
      message: "Result created successfully.",
      result: populatedResult,
    });
  } catch (error) {
    console.error("Create Result Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A result for this exam already exists for this student and batch.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create result.",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE RESULT
// GET /api/admin/results/:id
// ==========================================

export const getResultById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const result = await populateResult(
      Result.findById(id)
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Get result error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch result.",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE RESULT
// PATCH /api/admin/results/:id
// ==========================================

export const updateResult = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const result = await Result.findById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    const {
      studentId,
      batchId,
      exam,
      date,
      obtained,
      total,
      remarks,
      published,
    } = req.body;

    // Update student
    if (studentId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      const student = await User.findOne({
        _id: studentId,
        role: "Student",
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      result.student = student._id;
    }

    // Update batch
    if (batchId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      const batch = await Batch.findById(batchId);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found.",
        });
      }

      result.batch = batch._id;
    }

    // Update exam
    if (exam !== undefined) {
      if (typeof exam !== "string" || !exam.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid exam name.",
        });
      }

      result.exam = exam.trim();
    }

    // Update date
    if (date !== undefined) {
      const examDate = new Date(date);

      if (Number.isNaN(examDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid exam date.",
        });
      }

      result.date = examDate;
    }

    // Update marks
    if (obtained !== undefined) {
      result.obtained = Number(obtained);
    }

    if (total !== undefined) {
      result.total = Number(total);
    }

    if (remarks !== undefined) {
      result.remarks = remarks;
    }

    if (published !== undefined) {
      result.published = published;
    }

    // Validate marks
    if (
      !Number.isFinite(result.obtained) ||
      !Number.isFinite(result.total) ||
      result.obtained < 0 ||
      result.total <= 0 ||
      result.obtained > result.total
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid marks. Obtained marks cannot exceed total marks.",
      });
    }

    await result.save();

    const updatedResult = await populateResult(
      Result.findById(result._id)
    );

    return res.status(200).json({
      success: true,
      message: "Result updated successfully.",
      result: updatedResult,
    });
  } catch (error) {
    console.error("Update result error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A result for this student, batch and exam already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update result.",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE RESULT
// DELETE /api/admin/results/:id
// ==========================================

export const deleteResult = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const result = await Result.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Result deleted successfully.",
    });
  } catch (error) {
    console.error("Delete result error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete result.",
      error: error.message,
    });
  }
};
