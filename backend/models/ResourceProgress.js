
import mongoose from "mongoose";

const resourceProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningResource",
      required: true,
      index: true,
    },

    watchedSeconds: {
      type: Number,
      default: 0,
    },

    lastPosition: {
      type: Number,
      default: 0,
    },

    duration: {
      type: Number,
      default: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    lastWatchedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One progress record per student per lecture.
resourceProgressSchema.index(
  { student: 1, resource: 1 },
  { unique: true }
);

export default mongoose.models.ResourceProgress ||
  mongoose.model("ResourceProgress", resourceProgressSchema);
