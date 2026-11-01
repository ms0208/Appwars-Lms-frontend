import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
  courseName: { type: String, default: "" },
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
  paymentMethod: { type: String, default: "" },
  paymentDate: { type: Date, default: null },
  providerReference: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
