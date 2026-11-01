import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    selectedOption: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const testAttemptSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    startedAt: {
      type: Date,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["In Progress", "Submitted", "Timed Out"],
      default: "In Progress",
    },

    marksObtained: {
      type: Number,
      default: null,
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    percentage: {
      type: Number,
      default: null,
    },

    passed: {
      type: Boolean,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

testAttemptSchema.index(
  {
    test: 1,
    student: 1,
    attemptNumber: 1,
  },
  {
    unique: true,
  }
);

const TestAttempt =
  mongoose.models.TestAttempt ||
  mongoose.model("TestAttempt", testAttemptSchema);

export default TestAttempt;