
import mongoose from "mongoose";

const mockInterviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    interviewType: {
      type: String,
      enum: ["Technical", "HR", "Managerial", "Full Stack", "Other"],
      default: "Technical",
    },

    description: {
      type: String,
      default: "",
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

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    duration: {
      type: Number,
      default: 30,
    },

    meetingUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "completed",
        "cancelled",
        "missed",
      ],
      default: "scheduled",
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

    strengths: {
      type: [String],
      default: [],
    },

    improvements: {
      type: [String],
      default: [],
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

mockInterviewSchema.index({
  student: 1,
  scheduledAt: -1,
});

export default mongoose.model(
  "MockInterview",
  mockInterviewSchema
);
