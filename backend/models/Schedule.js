import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

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
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    mode: {
      type: String,
      enum: ["Online", "Offline"],
      default: "Online",
    },

    meetingLink: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: [
        "Lecture",
        "Practical",
        "Workshop",
        "Assessment",
        "Doubt Session",
      ],
      default: "Lecture",
    },

    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Schedule =
  mongoose.models.Schedule ||
  mongoose.model("Schedule", scheduleSchema);

export default Schedule;