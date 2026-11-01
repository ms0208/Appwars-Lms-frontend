import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: "Not specified" },
  jobType: { type: String, default: "Full-time" },
  description: { type: String, default: "" },
  skills: [{ type: String }],
  applicationUrl: { type: String, default: "" },
  applicationDeadline: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Job || mongoose.model("Job", jobSchema);
