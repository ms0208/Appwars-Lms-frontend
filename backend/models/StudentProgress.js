import mongoose from "mongoose";

const studentProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  completedLessons: [{ type: String }],
  completedLessonCount: { type: Number, default: 0, min: 0 },
  totalLessons: { type: Number, default: 0, min: 0 },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  lastAccessedAt: { type: Date, default: null }
}, { timestamps: true });

studentProgressSchema.index({ student: 1, course: 1 }, { unique: true });
export default mongoose.models.StudentProgress || mongoose.model("StudentProgress", studentProgressSchema);
