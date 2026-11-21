
import mongoose from "mongoose";

const careerTaskSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["aptitude", "coding"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    topic: {
      type: String,
      default: "",
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },

    instructions: {
      type: String,
      default: "",
    },

    questions: [
      {
        question: String,
        options: [String],
        correctAnswer: String,
        marks: {
          type: Number,
          default: 1,
        },
      },
    ],

    problemStatement: {
      type: String,
      default: "",
    },

    starterCode: {
      type: String,
      default: "",
    },

    allowedLanguages: {
      type: [String],
      default: ["javascript"],
    },

    maxScore: {
      type: Number,
      default: 100,
      min: 0,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    batch: {
      type: String,
      required: true,
      index: true,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "published",
    },
  },
  { timestamps: true }
);

careerTaskSchema.index({
  batch: 1,
  type: 1,
  status: 1,
});

export default mongoose.model("CareerTask", careerTaskSchema);
