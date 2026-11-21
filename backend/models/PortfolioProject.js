
import mongoose from "mongoose";

const portfolioProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    instructions: {
      type: String,
      default: "",
    },

    techStack: {
      type: [String],
      default: [],
    },

    batch: {
      type: String,
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
    },

    dueDate: {
      type: Date,
      default: null,
    },

    githubUrl: {
      type: String,
      default: "",
    },

    liveUrl: {
      type: String,
      default: "",
    },

    submissionNotes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "assigned",
        "submitted",
        "under_review",
        "approved",
        "revision_required",
      ],
      default: "assigned",
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

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

portfolioProjectSchema.index({
  student: 1,
  status: 1,
});

export default mongoose.model(
  "PortfolioProject",
  portfolioProjectSchema
);
