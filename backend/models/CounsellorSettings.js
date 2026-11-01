
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    emailAdmissions: { type: Boolean, default: true },
    emailPayments: { type: Boolean, default: true },
    emailAnnouncements: { type: Boolean, default: true },
    emailReports: { type: Boolean, default: false },
    browserAlerts: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: false },
  },
  { _id: false }
);

const appearanceSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ["Light", "Dark", "System"],
      default: "Light",
    },
    compactMode: { type: Boolean, default: false },
    animations: { type: Boolean, default: true },
  },
  { _id: false }
);

const privacySchema = new mongoose.Schema(
  {
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    sessionAlerts: { type: Boolean, default: true },
  },
  { _id: false }
);

const counsellorSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    notifications: {
      type: notificationSchema,
      default: () => ({}),
    },

    appearance: {
      type: appearanceSchema,
      default: () => ({}),
    },

    privacy: {
      type: privacySchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

const CounsellorSettings =
  mongoose.models.CounsellorSettings ||
  mongoose.model("CounsellorSettings", counsellorSettingsSchema);

export default CounsellorSettings;
