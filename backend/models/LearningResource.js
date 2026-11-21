
import mongoose from "mongoose";

const learningResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["video", "notes"],
      required: true,
    },

    // Video resource
    videoUrl: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 0, // Duration in seconds
    },

    // Notes resource
    fileUrl: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    // Ordering inside a batch
    order: {
      type: Number,
      default: 0,
    },

    // Module / topic
    moduleName: {
      type: String,
      default: "General",
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

learningResourceSchema.index({ batch: 1, type: 1, order: 1 });

export default mongoose.models.LearningResource ||
  mongoose.model("LearningResource", learningResourceSchema);
