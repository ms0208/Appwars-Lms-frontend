import mongoose from "mongoose";

const doubtReplySchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    repliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const doubtSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    topic: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Open", "Answered", "Closed"],
      default: "Open",
      index: true,
    },

    replies: {
      type: [doubtReplySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Doubt ||
  mongoose.model("Doubt", doubtSchema);