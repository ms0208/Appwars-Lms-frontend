import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batch: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      required: true,
      trim: true,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedDate: {
      type: Date,
      default: Date.now,
    },

    startDate: {
      type: Date,
      required: true,
    },

    durationMonths: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Running", "Completed", "Cancelled"],
      default: "Upcoming",
    },

    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

batchSchema.index({ batch: 1, trainer: 1 }, { unique: true });

export default mongoose.models.Batch ||
  mongoose.model("Batch", batchSchema);