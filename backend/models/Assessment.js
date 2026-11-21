import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    optionText: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [optionSchema],
      validate: {
        validator: (options) => options.length >= 2,
        message: "Each question must have at least 2 options.",
      },
    },

    correctOption: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    marks: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { _id: true }
);

const assessmentSchema = new mongoose.Schema(
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
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    questions: {
      type: [questionSchema],
      validate: {
        validator: (questions) => questions.length > 0,
        message: "An assessment must contain at least one question.",
      },
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Draft", "Published", "Closed"],
      default: "Draft",
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    instructions: {
      type: String,
      default: "Select one answer for each question.",
    },
  },
  {
    timestamps: true,
  }
);

// Automatically calculate total marks.
assessmentSchema.pre("save", function () {
  this.totalMarks = this.questions.reduce(
    (total, question) => total + Number(question.marks || 0),
    0
  );
});

const Assessment =
  mongoose.models.Assessment ||
  mongoose.model("Assessment", assessmentSchema);

export default Assessment;