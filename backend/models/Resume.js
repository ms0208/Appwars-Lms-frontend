import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimeType: { type: String, default: "application/pdf" },
  size: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Resume || mongoose.model("Resume", resumeSchema);
