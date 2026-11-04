import mongoose from "mongoose";
import EmployeeAttendance from "../models/employeeAttendance.js";
import User from "../models/user.js";

// ==========================================
// CONSTANTS
// ==========================================

const VALID_ROLES = ["Trainer", "Counsellor"];

const VALID_STATUSES = [
  "Present",
  "Late",
  "Absent",
  "Half Day",
  "Leave",
];

const COMPANY_START = "10:00";
const COMPANY_END = "19:00";

// ==========================================
// HELPER: PARSE DATE
// ==========================================

const parseEmployeeDate = (date) => {
  if (!date || typeof date !== "string") return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

// ==========================================
// HELPER: VALIDATE TIME
// ==========================================

const isValidTime = (time) => {
  if (time === "" || time === undefined || time === null) {
    return true;
  }

  if (typeof time !== "string") return false;

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return false;
  }

  return true;
};

// ==========================================
// HELPER: VALIDATE CHECK-IN / CHECK-OUT
// ==========================================

const validateTimes = (checkIn, checkOut) => {
  if (!isValidTime(checkIn) || !isValidTime(checkOut)) {
    return "Invalid time. Use HH:mm format.";
  }

  if (checkIn && checkOut && checkOut <= checkIn) {
    return "Check-out time must be later than check-in time.";
  }

  return null;
};

// ==========================================
// HELPER: CALCULATE STATUS
// Company timing: 10:00 AM - 7:00 PM
// ==========================================

const calculateEmployeeStatus = (checkIn, checkOut) => {
  if (!checkIn) return "Absent";

  if (checkIn > COMPANY_START) {
    return "Late";
  }

  if (checkOut && checkOut < COMPANY_END) {
    return "Half Day";
  }

  return "Present";
};

// ==========================================
// HELPER: POPULATE RESPONSE
// ==========================================

const populateEmployeeAttendance = async (query) => {
  return EmployeeAttendance.populate(query, {
    path: "user",
    select: "userId name email role",
  });
};

// ==========================================
// COMMON: GET ATTENDANCE BY ROLE
// ==========================================

const getAttendanceByRole = async (req, res, role) => {
  try {
    const { date, status, search } = req.query;

    const filter = { role };

    if (date) {
      const parsedDate = parseEmployeeDate(date);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date. Use YYYY-MM-DD format.",
        });
      }

      const nextDate = new Date(parsedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      filter.date = {
        $gte: parsedDate,
        $lt: nextDate,
      };
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status.",
        });
      }

      filter.status = status;
    }

    let attendance = await EmployeeAttendance.find(filter)
      .populate("user", "userId name email role")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (search) {
      const searchText = String(search).toLowerCase();

      attendance = attendance.filter((record) => {
        const user = record.user || {};

        return (
          user.name?.toLowerCase().includes(searchText) ||
          user.email?.toLowerCase().includes(searchText) ||
          user.userId?.toLowerCase().includes(searchText)
        );
      });
    }

    return res.status(200).json({
      success: true,
      role,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    console.error(`Get ${role} attendance:`, error);

    return res.status(500).json({
      success: false,
      message: `Unable to fetch ${role.toLowerCase()} attendance.`,
      error: error.message,
    });
  }
};

// ==========================================
// COMMON: CREATE ATTENDANCE
// ==========================================

const createAttendanceByRole = async (req, res, role) => {
  try {
    const {
      userId,
      date,
      checkIn = "",
      checkOut = "",
      status,
      remarks = "",
    } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        message: "Employee and date are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    const attendanceDate = parseEmployeeDate(date);

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD format.",
      });
    }

    const timeError = validateTimes(checkIn, checkOut);

    if (timeError) {
      return res.status(400).json({
        success: false,
        message: timeError,
      });
    }

    const employee = await User.findOne({
      _id: userId,
      role,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `${role} not found.`,
      });
    }

    const finalStatus =
      status || calculateEmployeeStatus(checkIn, checkOut);

    if (!VALID_STATUSES.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status.",
      });
    }

    const attendance = await EmployeeAttendance.create({
      user: userId,
      role,
      date: attendanceDate,
      checkIn,
      checkOut,
      status: finalStatus,
      remarks: String(remarks).trim(),
    });

    const populatedAttendance = await populateEmployeeAttendance(
      attendance
    );

    return res.status(201).json({
      success: true,
      message: `${role} attendance created successfully.`,
      data: populatedAttendance,
    });
  } catch (error) {
    console.error(`Create ${role} attendance:`, error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Attendance already exists for this ${role.toLowerCase()} on this date.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create employee attendance.",
      error: error.message,
    });
  }
};

// ==========================================
// COMMON: UPDATE ATTENDANCE
// ==========================================

const updateAttendanceByRole = async (req, res, role) => {
  try {
    const { attendanceId } = req.params;

    const {
      date,
      checkIn,
      checkOut,
      status,
      remarks,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID.",
      });
    }

    const attendance = await EmployeeAttendance.findOne({
      _id: attendanceId,
      role,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: `${role} attendance record not found.`,
      });
    }

    if (date !== undefined) {
      const updatedDate = parseEmployeeDate(date);

      if (!updatedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date. Use YYYY-MM-DD format.",
        });
      }

      attendance.date = updatedDate;
    }

    if (checkIn !== undefined) {
      attendance.checkIn = checkIn;
    }

    if (checkOut !== undefined) {
      attendance.checkOut = checkOut;
    }

    const timeError = validateTimes(
      attendance.checkIn,
      attendance.checkOut
    );

    if (timeError) {
      return res.status(400).json({
        success: false,
        message: timeError,
      });
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status.",
        });
      }

      attendance.status = status;
    } else if (checkIn !== undefined || checkOut !== undefined) {
      attendance.status = calculateEmployeeStatus(
        attendance.checkIn,
        attendance.checkOut
      );
    }

    if (remarks !== undefined) {
      attendance.remarks = String(remarks).trim();
    }

    await attendance.save();

    const populatedAttendance = await populateEmployeeAttendance(
      attendance
    );

    return res.status(200).json({
      success: true,
      message: `${role} attendance updated successfully.`,
      data: populatedAttendance,
    });
  } catch (error) {
    console.error(`Update ${role} attendance:`, error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this employee on this date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update employee attendance.",
      error: error.message,
    });
  }
};

// ==========================================
// COMMON: DELETE ATTENDANCE
// ==========================================

const deleteAttendanceByRole = async (req, res, role) => {
  try {
    const { attendanceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID.",
      });
    }

    const attendance = await EmployeeAttendance.findOneAndDelete({
      _id: attendanceId,
      role,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: `${role} attendance record not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${role} attendance deleted successfully.`,
    });
  } catch (error) {
    console.error(`Delete ${role} attendance:`, error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete employee attendance.",
      error: error.message,
    });
  }
};

// ==========================================
// TRAINER ATTENDANCE APIs
// ==========================================

export const getTrainerAttendance = (req, res) =>
  getAttendanceByRole(req, res, "Trainer");

export const createTrainerAttendance = (req, res) =>
  createAttendanceByRole(req, res, "Trainer");

export const updateTrainerAttendance = (req, res) =>
  updateAttendanceByRole(req, res, "Trainer");

export const deleteTrainerAttendance = (req, res) =>
  deleteAttendanceByRole(req, res, "Trainer");

// ==========================================
// COUNSELLOR ATTENDANCE APIs
// ==========================================

export const getCounsellorAttendance = (req, res) =>
  getAttendanceByRole(req, res, "Counsellor");

export const createCounsellorAttendance = (req, res) =>
  createAttendanceByRole(req, res, "Counsellor");

export const updateCounsellorAttendance = (req, res) =>
  updateAttendanceByRole(req, res, "Counsellor");

export const deleteCounsellorAttendance = (req, res) =>
  deleteAttendanceByRole(req, res, "Counsellor");