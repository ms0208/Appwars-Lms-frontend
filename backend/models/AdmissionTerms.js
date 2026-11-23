
import mongoose from "mongoose";

const admissionTermsSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      default: "application/pdf",
    },

    fileSize: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Published"],
      default: "Published",
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const AdmissionTerms =
  mongoose.models.AdmissionTerms ||
  mongoose.model("AdmissionTerms", admissionTermsSchema);

export default AdmissionTerms;
