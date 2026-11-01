import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  thumbnail: { type: String, default: "" },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lessons: [{
    title: String,
    description: String,
    videoUrl: String,
    resourceUrl: String,
    durationMinutes: Number,
    order: Number
  }],
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
