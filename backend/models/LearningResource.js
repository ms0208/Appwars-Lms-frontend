import mongoose from "mongoose";

const learningResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  type: { type: String, default: "Study material" },
  url: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.LearningResource || mongoose.model("LearningResource", learningResourceSchema);
