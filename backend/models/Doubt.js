import mongoose from "mongoose";

const doubtSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  question: { type: String, required: true, trim: true, maxlength: 5000 },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
  courseName: { type: String, default: "" },
  answer: { type: String, default: "" },
  status: { type: String, enum: ["Open", "In Progress", "Answered", "Closed"], default: "Open" },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  answeredAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.Doubt || mongoose.model("Doubt", doubtSchema);
