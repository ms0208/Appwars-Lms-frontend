
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const courseSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        description: { type: String, default: "" },
        duration: { type: String, default: "" },
        fee: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: ["Active", "Inactive", "Draft"],
            default: "Active",
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const batchSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, unique: true, uppercase: true },
        course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        trainer: { type: Schema.Types.ObjectId, ref: "User", default: null },
        students: [{ type: Schema.Types.ObjectId, ref: "User" }],
        startDate: Date,
        endDate: Date,
        capacity: { type: Number, default: 30, min: 1 },
        status: {
            type: String,
            enum: ["Upcoming", "Running", "Completed", "Cancelled"],
            default: "Upcoming",
        },
    },
    { timestamps: true }
);

const attendanceSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["Student", "Trainer"], required: true },
        batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
        date: { type: Date, required: true, default: Date.now },
        status: {
            type: String,
            enum: ["Present", "Absent", "Late", "Leave"],
            default: "Present",
        },
        checkIn: Date,
        checkOut: Date,
        remarks: { type: String, default: "" },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const resultSchema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
        title: { type: String, required: true },
        totalMarks: { type: Number, required: true, min: 1 },
        marksObtained: { type: Number, required: true, min: 0 },
        examDate: { type: Date, default: Date.now },
        remarks: { type: String, default: "" },
        published: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

resultSchema.virtual("percentage").get(function () {
    return this.totalMarks
        ? Math.round((this.marksObtained / this.totalMarks) * 10000) / 100
        : 0;
});

resultSchema.set("toJSON", { virtuals: true });

const assignmentSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
        course: { type: Schema.Types.ObjectId, ref: "Course", default: null },
        trainer: { type: Schema.Types.ObjectId, ref: "User", default: null },
        dueDate: Date,
        attachmentUrl: { type: String, default: "" },
        status: {
            type: String,
            enum: ["Draft", "Published", "Closed"],
            default: "Published",
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const liveClassSchema = new Schema(
    {
        title: { type: String, required: true },
        batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
        trainer: { type: Schema.Types.ObjectId, ref: "User", default: null },
        meetingUrl: { type: String, default: "" },
        startTime: { type: Date, required: true },
        endTime: Date,
        status: {
            type: String,
            enum: ["Scheduled", "Live", "Completed", "Cancelled"],
            default: "Scheduled",
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const announcementSchema = new Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        audience: {
            type: String,
            enum: ["All", "Student", "Trainer", "Counsellor"],
            default: "All",
        },
        publishAt: { type: Date, default: Date.now },
        isPublished: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const doubtSchema = new Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        student: { type: Schema.Types.ObjectId, ref: "User", default: null },
        assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
        batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
        status: {
            type: String,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open",
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
        },
        response: { type: String, default: "" },
    },
    { timestamps: true }
);

const paymentSchema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: "INR" },
        dueDate: Date,
        paidAt: Date,
        method: {
            type: String,
            enum: ["Cash", "UPI", "Card", "Bank Transfer", "Other"],
            default: "Other",
        },
        reference: { type: String, default: "" },
        status: {
            type: String,
            enum: ["Pending", "Paid", "Overdue", "Refunded", "Cancelled"],
            default: "Pending",
        },
        notes: { type: String, default: "" },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const settingsSchema = new Schema(
    {
        companyName: {
            type: String,
            default: "APPWARS TECHNOLOGIES PVT. LTD.",
        },
        platformName: { type: String, default: "APPWARS LMS" },
        companyEmail: { type: String, default: "info@appwars.in" },
        adminEmail: { type: String, default: "admin@appwars.in" },
        supportEmail: { type: String, default: "support@appwars.in" },
        theme: { type: String, enum: ["light", "dark"], default: "light" },
        trainerCheckIn: { type: String, default: "10:00" },
        trainerCheckOut: { type: String, default: "19:00" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

export const Course = models.Course || model("Course", courseSchema);
export const Batch = models.Batch || model("Batch", batchSchema);
export const Attendance =
    models.Attendance || model("Attendance", attendanceSchema);
export const Result = models.Result || model("Result", resultSchema);
export const Assignment =
    models.Assignment || model("Assignment", assignmentSchema);
export const LiveClass =
    models.LiveClass || model("LiveClass", liveClassSchema);
export const Announcement =
    models.Announcement || model("Announcement", announcementSchema);
export const Doubt = models.Doubt || model("Doubt", doubtSchema);
export const Payment = models.Payment || model("Payment", paymentSchema);
export const Settings = models.Settings || model("Settings", settingsSchema);
