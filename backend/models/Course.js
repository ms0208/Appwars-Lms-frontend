import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    // Main course information
    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    fee: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // Trainer and batch assignment
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },

    // Additional course information
    thumbnail: {
      type: String,
      default: "",
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lessons: [
      {
        title: String,
        description: String,
        videoUrl: String,
        resourceUrl: String,
        durationMinutes: Number,
        order: Number,
      },
    ],

    isPublished: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Reuse the existing model only if it has the correct schema.
const Course =
  mongoose.models.Course?.schema.path("trainer")
    ? mongoose.models.Course
    : mongoose.model("Course", courseSchema);

export default Course;