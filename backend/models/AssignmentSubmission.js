
import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    // Student details
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Batch details
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    // Trainer details
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Original trainer assignment
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    // Assignment information
    title: {
      type: String,
      required: true,
      trim: true,
    },

    assignmentTitle: {
      type: String,
      trim: true,
    },

    // Student's submitted answer
    description: {
      type: String,
      default: "",
    },

    // GitHub / Project URL
    submissionUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // Trainer assignment completion status
    status: {
      type: String,
      enum: ["Pending", "Complete", "Not Access"],
      default: "Pending",
    },

    // Grading information
    maxMarks: {
      type: Number,
      default: 50,
      min: 0,
    },

    marks: {
      type: Number,
      default: null,
      min: 0,
    },

    // Evaluation result
    result: {
      type: String,
      enum: ["Pending", "Graded", "Needs revision"],
      default: "Pending",
    },

    feedback: {
      type: String,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
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

// One submission per student per assignment
assignmentSubmissionSchema.index(
  {
    student: 1,
    assignment: 1,
  },
  {
    unique: true,
  }
);

// Trainer can quickly find submissions
assignmentSubmissionSchema.index({
  trainer: 1,
  batch: 1,
  assignment: 1,
});

const AssignmentSubmission = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);

export default AssignmentSubmission;
