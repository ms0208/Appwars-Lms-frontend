import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    submissionType: {
      type: String,
      enum: ["GitHub link", "PDF", "Image", "File", "Text"],
      default: "File",
    },

    submissionUrl: {
      type: String,
      default: "",
      trim: true,
    },

    submittedText: {
      type: String,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    marks: {
      type: Number,
      min: 0,
      default: null,
    },

    maxMarks: {
      type: Number,
      min: 1,
      default: 50,
    },

    result: {
      type: String,
      enum: ["Pending", "Graded", "Needs revision"],
      default: "Pending",
    },

    feedback: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    gradedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSubmissionSchema.index({
  trainer: 1,
  batch: 1,
  result: 1,
});

export default mongoose.models.AssignmentSubmission ||
  mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);