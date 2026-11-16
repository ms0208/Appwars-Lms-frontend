
import mongoose from "mongoose";

const batchSyllabusProgressSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      unique: true,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    topics: [
      {
        topicName: {
          type: String,
          required: true,
          trim: true,
        },

        completionPercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },

        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed"],
          default: "Pending",
        },

        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const BatchSyllabusProgress = mongoose.model(
  "BatchSyllabusProgress",
  batchSyllabusProgressSchema
);

export default BatchSyllabusProgress;
