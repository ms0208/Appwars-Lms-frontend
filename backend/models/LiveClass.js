import mongoose from "mongoose";

const liveClassSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null, index: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  date: { type: Date, required: true },
  time: { type: String, default: "" },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  meetingUrl: { type: String, default: "" },
  status: { type: String, enum: ["Scheduled", "Upcoming", "Live", "Completed", "Cancelled"], default: "Scheduled" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default mongoose.models.LiveClass || mongoose.model("LiveClass", liveClassSchema);
