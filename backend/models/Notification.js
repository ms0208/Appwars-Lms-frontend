import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "general" },
  link: { type: String, default: "" },
  readAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
