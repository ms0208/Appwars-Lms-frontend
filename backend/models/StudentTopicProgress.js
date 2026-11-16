
import mongoose from "mongoose";

const studentTopicProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    topics: [
      {
        topicName: {
          type: String,
          required: true,
          trim: true,
        },

        knowledgePercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },

        status: {
          type: String,
          enum: ["Not Started", "Learning", "Confident"],
          default: "Not Started",
        },

        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// One progress record per student per batch
studentTopicProgressSchema.index(
  { student: 1, batch: 1 },
  { unique: true }
);

const StudentTopicProgress = mongoose.model(
  "StudentTopicProgress",
  studentTopicProgressSchema
);

export default StudentTopicProgress;
