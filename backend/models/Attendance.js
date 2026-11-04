
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Absent"],
      required: true,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Unique attendance per student, batch, and date
attendanceSchema.index(
  { batch: 1, student: 1, date: 1 },
  { unique: true }
);

// Fix stale model registration if its schema is incorrect
if (
  mongoose.models.Attendance &&
  !mongoose.models.Attendance.schema.path("student")
) {
  mongoose.deleteModel("Attendance");
}

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

export default Attendance;
