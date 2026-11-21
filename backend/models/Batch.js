
import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batch: {
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
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of months.",
      },
    },

    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value || !this.startDate) return true;
          return value >= this.startDate;
        },
        message: "End date cannot be before the start date.",
      },
    },

    status: {
      type: String,
      enum: ["Upcoming", "Running", "Completed", "Cancelled"],
      default: "Upcoming",
    },

    description: {
      type: String,
      default: "",
      trim: true,
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

// A trainer can handle multiple batches.
// The same batch name can be assigned to different trainers.
// But the same batch name + same trainer combination must be unique.
batchSchema.index(
  { batch: 1, trainer: 1 },
  { unique: true }
);

export default mongoose.models.Batch ||
  mongoose.model("Batch", batchSchema);
