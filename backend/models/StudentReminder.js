import mongoose from "mongoose";

const studentReminderSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  liveClass: { type: mongoose.Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

studentReminderSchema.index({ student: 1, liveClass: 1 }, { unique: true });
export default mongoose.models.StudentReminder || mongoose.model("StudentReminder", studentReminderSchema);
