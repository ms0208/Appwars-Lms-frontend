import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options) =>
          options.length >= 2 &&
          options.every((option) => String(option).trim()),
        message: "Each question must have at least two non-empty options.",
      },
    },

    correctOption: {
      type: Number,
      required: true,
      min: 0,
    },

    marks: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: true,
  }
);

const testSchema = new mongoose.Schema(
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

    questions: {
      type: [questionSchema],
      validate: {
        validator: (questions) => questions.length > 0,
        message: "A test must contain at least one question.",
      },
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    startAt: {
      type: Date,
      required: true,
    },

    endAt: {
      type: Date,
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    passingMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
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

testSchema.pre("validate", function () {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate("endAt", "Test end time must be after start time.");
  }

  if (
    this.totalMarks !== undefined &&
    this.questions?.length &&
    this.questions.reduce((sum, question) => sum + question.marks, 0) !==
      this.totalMarks
  ) {
    this.invalidate(
      "totalMarks",
      "Total marks must equal the sum of question marks."
    );
  }

  if (
    this.passingMarks !== undefined &&
    this.totalMarks !== undefined &&
    this.passingMarks > this.totalMarks
  ) {
    this.invalidate(
      "passingMarks",
      "Passing marks cannot exceed total marks."
    );
  }

  for (const question of this.questions || []) {
    if (
      question.correctOption < 0 ||
      question.correctOption >= question.options.length
    ) {
      this.invalidate(
        "questions",
        "Each correctOption must refer to an existing option."
      );
      break;
    }
  }
});

const Test =
  mongoose.models.Test || mongoose.model("Test", testSchema);

export default Test;