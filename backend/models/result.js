
import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    exam: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    obtained: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 1,
    },

    remarks: {
      type: String,
      default: "",
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

// One result per student, batch and exam
resultSchema.index(
  { student: 1, batch: 1, exam: 1 },
  { unique: true }
);

const Result =
  mongoose.models.Result ||
  mongoose.model("Result", resultSchema);

export default Result;
