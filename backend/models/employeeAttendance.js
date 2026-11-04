import mongoose from "mongoose";

const employeeAttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["Trainer", "Counsellor"],
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    checkIn: {
      type: String,
      default: "",
      trim: true,
    },

    checkOut: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Present", "Late", "Absent", "Half Day", "Leave"],
      required: true,
      default: "Present",
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// One attendance record per employee per day.
employeeAttendanceSchema.index(
  { user: 1, role: 1, date: 1 },
  { unique: true }
);

const EmployeeAttendance =
  mongoose.models.EmployeeAttendance ||
  mongoose.model("EmployeeAttendance", employeeAttendanceSchema);

export default EmployeeAttendance;