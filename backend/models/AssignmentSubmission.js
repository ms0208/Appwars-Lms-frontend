import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    answerText: {
      type: String,
      default: "",
    },

    submissionUrl: {
      type: String,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Late", "Graded"],
      default: "Draft",
    },

    marksObtained: {
      type: Number,
      default: null,
      min: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

assignmentSubmissionSchema.index(
  {
    assignment: 1,
    student: 1,
  },
  {
    unique: true,
  }
);

const AssignmentSubmission =
  mongoose.models.AssignmentSubmission ||
  mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);

export default AssignmentSubmission;