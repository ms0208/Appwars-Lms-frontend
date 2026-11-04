import mongoose from "mongoose";
import Result from "../models/result.js";
import User from "../models/user.js";
import Course from "../models/course.js";

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
      path: "course",
      select: "courseName code duration fee status",
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
      courseId,
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
      !courseId ||
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

    // Validate exam name
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

    // Find course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // Convert marks to numbers
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
        message:
          "Invalid marks. Obtained marks cannot exceed total marks.",
      });
    }

    // Create result
    const result = await Result.create({
      student: student._id,
      course: course._id,
      exam: exam.trim(),
      date: examDate,
      obtained: obtainedMarks,
      total: totalMarks,
      remarks: remarks || "",
      published: published ?? false,
    });

    // Populate student and course details
    const populatedResult = await Result.findById(result._id)
      .populate("student", "name userId email batch")
      .populate("course", "courseName code duration");

    return res.status(201).json({
      success: true,
      message: "Result created successfully.",
      result: populatedResult,
    });
  } catch (error) {
    console.error("Create Result Error:", error);

    // Handle duplicate result
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A result for this exam already exists for this student and course.",
      });
    }

    // Handle validation errors
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

    const result = await populateResult(Result.findById(id));

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
      courseId,
      exam,
      date,
      obtained,
      total,
      remarks,
      published,
    } = req.body;

    // Validate and update student if supplied
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

    // Validate and update course if supplied
    if (courseId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      result.course = course._id;
    }

    if (exam !== undefined) result.exam = exam;
    if (date !== undefined) result.date = date;
    if (obtained !== undefined) result.obtained = Number(obtained);
    if (total !== undefined) result.total = Number(total);
    if (remarks !== undefined) result.remarks = remarks;
    if (published !== undefined) result.published = published;

    if (
      !Number.isFinite(result.obtained) ||
      !Number.isFinite(result.total) ||
      result.obtained < 0 ||
      result.total < 1 ||
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
        message: "A result for this student, course and exam already exists.",
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
console.log("Loaded Result schema fields:", Object.keys(Result.schema.paths));