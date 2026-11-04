
import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required."],
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required."],
      index: true,
    },

    exam: {
      type: String,
      required: [true, "Exam name is required."],
      trim: true,
    },

    date: {
      type: Date,
      required: [true, "Exam date is required."],
    },

    obtained: {
      type: Number,
      required: [true, "Obtained marks are required."],
      min: [0, "Obtained marks cannot be negative."],
    },

    total: {
      type: Number,
      required: [true, "Total marks are required."],
      min: [1, "Total marks must be at least 1."],
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    published: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Validate obtained marks against total marks
resultSchema.pre("validate", function () {
  if (
    typeof this.obtained === "number" &&
    typeof this.total === "number" &&
    this.obtained > this.total
  ) {
    this.invalidate(
      "obtained",
      "Obtained marks cannot exceed total marks."
    );
  }
});

// Prevent duplicate exam results for the same student and course
resultSchema.index(
  { student: 1, course: 1, exam: 1 },
  { unique: true }
);

const Result =
  mongoose.models.Result ||
  mongoose.model("Result", resultSchema);

export default Result;
