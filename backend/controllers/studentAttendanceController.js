
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";

// ==========================================
// GET STUDENT ATTENDANCE
// GET /api/student/attendance
// ==========================================

export const getMyAttendance = async (req, res) => {
  try {
    // Get authenticated student ID from JWT middleware
    const studentId = req.user?._id || req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Student authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    // Ensure the authenticated user is a Student
    if (req.user.role !== "Student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student role required.",
      });
    }

    // Fetch only attendance records of the logged-in student
    const attendanceRecords = await Attendance.find({
      student: studentId,
    })
      .populate("batch", "name batchName code status duration")
      .populate("trainer", "name userId")
      .sort({ date: -1 })
      .lean();

    // ==========================================
    // CALCULATE ATTENDANCE STATISTICS
    // ==========================================

    const totalClasses = attendanceRecords.length;

    const presentCount = attendanceRecords.filter(
      (record) => record.status === "Present"
    ).length;

    const absentCount = attendanceRecords.filter(
      (record) => record.status === "Absent"
    ).length;

    const attendancePercentage =
      totalClasses > 0
        ? Number(((presentCount / totalClasses) * 100).toFixed(2))
        : 0;

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Student attendance fetched successfully.",

      student: {
        id: req.user._id,
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },

      statistics: {
        totalClasses,
        present: presentCount,
        absent: absentCount,
        attendancePercentage,
      },

      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error("Get Student Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student attendance.",
      error: error.message,
    });
  }
};
