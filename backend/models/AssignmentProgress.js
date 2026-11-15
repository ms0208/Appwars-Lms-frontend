
import mongoose from "mongoose";

const assignmentProgressSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Complete", "Not Access"],
      default: "Pending",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// One progress record per student per assignment
assignmentProgressSchema.index(
  { assignment: 1, student: 1 },
  { unique: true }
);

const AssignmentProgress = mongoose.model(
  "AssignmentProgress",
  assignmentProgressSchema
);

export default AssignmentProgress;
