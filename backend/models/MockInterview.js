import mongoose from "mongoose";

const mockInterviewSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  title: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 30 },
  interviewerName: { type: String, default: "Career Team" },
  meetingUrl: { type: String, default: "" },
  status: { type: String, enum: ["Available", "Booked", "Completed", "Cancelled"], default: "Available" },
  notes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.models.MockInterview || mongoose.model("MockInterview", mockInterviewSchema);
