
import mongoose from "mongoose";

const careerSubmissionSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareerTask",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    batch: {
      type: String,
      required: true,
    },

    answer: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    code: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      default: "",
    },

    githubUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "approved",
        "revision_required",
      ],
      default: "submitted",
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

careerSubmissionSchema.index(
  { task: 1, student: 1 },
  { unique: true }
);

export default mongoose.model(
  "CareerSubmission",
  careerSubmissionSchema
);
