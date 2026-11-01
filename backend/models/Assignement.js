import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
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

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    batchId: {
      type: String,
      default: null,
      index: true,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    attachmentUrl: {
      type: String,
      default: "",
    },

    allowedSubmissionTypes: {
      type: [String],
      enum: ["text", "url"],
      default: ["text", "url"],
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({
  course: 1,
  batchId: 1,
  isPublished: 1,
});

const Assignment =
  mongoose.models.Assignment ||
  mongoose.model("Assignment", assignmentSchema);

export default Assignment;