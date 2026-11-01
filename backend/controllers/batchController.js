import mongoose from "mongoose";

import Batch from "../models/Batch.js";
import User from "../models/user.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchRegex = (value) => new RegExp(escapeRegex(value), "i");

const allowedStatuses = [
  "Upcoming",
  "Running",
  "Completed",
  "Cancelled",
];

const allowedModes = ["Online", "Offline", "Hybrid"];

const allowedBatchTypes = ["Mon-Th", "Weekend", "Custom"];

const calculateEndDate = (startDate, durationMonths) => {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Number(durationMonths));
  return endDate;
};

const getStudentCounts = async (batchNames) => {
  const students = await User.aggregate([
    {
      $match: {
        role: "Student",
        isActive: true,
        batch: { $in: batchNames },
      },
    },
    {
      $group: {
        _id: "$batch",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    students.map((student) => [student._id, student.count])
  );
};

// GET /api/admin/batches
export const getBatches = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit || "20", 10))
    );

    const filter = {};

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch status.",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.mode) {
      if (!allowedModes.includes(req.query.mode)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch mode.",
        });
      }

      filter.mode = req.query.mode;
    }

    if (req.query.active === "true") filter.isActive = true;
    if (req.query.active === "false") filter.isActive = false;

    if (req.query.trainerId) {
      if (!isValidId(req.query.trainerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trainer ID.",
        });
      }

      filter.trainer = req.query.trainerId;
    }

    if (req.query.q || req.query.search) {
      const search = searchRegex(req.query.q || req.query.search);

      const matchingTrainers = await User.find({
        role: "Trainer",
        $or: [{ name: search }, { userId: search }, { email: search }],
      }).select("_id");

      filter.$or = [
        { batch: search },
        { course: search },
        { description: search },
        { trainer: { $in: matchingTrainers.map((trainer) => trainer._id) } },
      ];
    }

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .populate(
          "trainer",
          "userId name email isActive trainerDetails"
        )
        .sort({ startDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Batch.countDocuments(filter),
    ]);

    const studentCounts = await getStudentCounts(
      batches.map((batch) => batch.batch)
    );

    const data = batches.map((batch) => ({
      ...batch,
      studentCount: studentCounts.get(batch.batch) || 0,
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batches.",
    });
  }
};

// GET /api/admin/batches/stats
export const getBatchStats = async (req, res) => {
  try {
    const [total, upcoming, running, completed, cancelled, active] =
      await Promise.all([
        Batch.countDocuments(),
        Batch.countDocuments({ status: "Upcoming" }),
        Batch.countDocuments({ status: "Running" }),
        Batch.countDocuments({ status: "Completed" }),
        Batch.countDocuments({ status: "Cancelled" }),
        Batch.countDocuments({ isActive: true }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        upcoming,
        running,
        completed,
        cancelled,
        active,
      },
    });
  } catch (error) {
    console.error("Batch stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batch statistics.",
    });
  }
};

// GET /api/admin/batches/:id
export const getBatchById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batch = await Batch.findById(req.params.id)
      .populate(
        "trainer",
        "userId name email isActive trainerDetails"
      )
      .lean();

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const studentCount = await User.countDocuments({
      role: "Student",
      isActive: true,
      batch: batch.batch,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...batch,
        studentCount,
      },
    });
  } catch (error) {
    console.error("Get batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batch.",
    });
  }
};

// POST /api/admin/batches
export const createBatch = async (req, res) => {
  try {
    const {
      batch,
      course,
      trainer,
      startDate,
      durationMonths,
      status = "Upcoming",
      description = "",
      mode = "Online",
      batchType = "Mon-Th",
      time = "",
      days = "",
      capacity = 30,
      meetingLink = "",
      isActive = true,
      endDate,
    } = req.body;

    if (
      typeof batch !== "string" ||
      !batch.trim() ||
      typeof course !== "string" ||
      !course.trim() ||
      !trainer ||
      !startDate ||
      durationMonths === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Batch name, course, trainer, start date and duration are required.",
      });
    }

    if (!isValidId(trainer)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID.",
      });
    }

    const parsedStartDate = new Date(startDate);
    const parsedDuration = Number(durationMonths);
    const parsedCapacity = Number(capacity);

    if (Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch start date.",
      });
    }

    if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a positive whole number of months.",
      });
    }

    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive whole number.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch status.",
      });
    }

    if (!allowedModes.includes(mode) || !allowedBatchTypes.includes(batchType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch mode or batch type.",
      });
    }

    const trainerUser = await User.findOne({
      _id: trainer,
      role: "Trainer",
      isActive: true,
    }).select("_id");

    if (!trainerUser) {
      return res.status(400).json({
        success: false,
        message: "The selected trainer does not exist or is inactive.",
      });
    }

    const normalizedBatch = batch.trim();

    // Batch names should be unique because student accounts use
    // the batch name string to identify their assigned batch.
    const existingBatch = await Batch.findOne({
      batch: normalizedBatch,
    }).select("_id");

    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: "A batch with this name already exists.",
      });
    }

    const calculatedEndDate = calculateEndDate(
      parsedStartDate,
      parsedDuration
    );

    const parsedEndDate = endDate ? new Date(endDate) : calculatedEndDate;

    if (
      Number.isNaN(parsedEndDate.getTime()) ||
      parsedEndDate < parsedStartDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Batch end date must be on or after its start date.",
      });
    }

    const createdBatch = await Batch.create({
      batch: normalizedBatch,
      course: course.trim(),
      trainer: trainerUser._id,
      startDate: parsedStartDate,
      durationMonths: parsedDuration,
      endDate: parsedEndDate,
      status,
      description,
      mode,
      batchType,
      time,
      days,
      capacity: parsedCapacity,
      meetingLink,
      isActive,
      assignedDate: new Date(),
    });

    const populatedBatch = await Batch.findById(createdBatch._id)
      .populate(
        "trainer",
        "userId name email isActive trainerDetails"
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      data: {
        ...populatedBatch,
        studentCount: 0,
      },
    });
  } catch (error) {
    console.error("Create batch error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A batch with this name and trainer already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create batch.",
    });
  }
};

// PUT /api/admin/batches/:id
export const updateBatch = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batchDocument = await Batch.findById(req.params.id);

    if (!batchDocument) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const {
      batch,
      course,
      trainer,
      startDate,
      durationMonths,
      endDate,
      status,
      description,
      mode,
      batchType,
      time,
      days,
      capacity,
      meetingLink,
      isActive,
    } = req.body;

    if (batch !== undefined) {
      if (typeof batch !== "string" || !batch.trim()) {
        return res.status(400).json({
          success: false,
          message: "Batch name cannot be empty.",
        });
      }

      const normalizedBatch = batch.trim();

      const duplicate = await Batch.findOne({
        batch: normalizedBatch,
        _id: { $ne: batchDocument._id },
      }).select("_id");

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A batch with this name already exists.",
        });
      }

      batchDocument.batch = normalizedBatch;
    }

    if (course !== undefined) {
      if (typeof course !== "string" || !course.trim()) {
        return res.status(400).json({
          success: false,
          message: "Course cannot be empty.",
        });
      }

      batchDocument.course = course.trim();
    }

    if (trainer !== undefined) {
      if (!isValidId(trainer)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trainer ID.",
        });
      }

      const trainerUser = await User.findOne({
        _id: trainer,
        role: "Trainer",
        isActive: true,
      }).select("_id");

      if (!trainerUser) {
        return res.status(400).json({
          success: false,
          message: "The selected trainer does not exist or is inactive.",
        });
      }

      batchDocument.trainer = trainerUser._id;
    }

    if (startDate !== undefined) {
      const parsedDate = new Date(startDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date.",
        });
      }

      batchDocument.startDate = parsedDate;
    }

    if (durationMonths !== undefined) {
      const parsedDuration = Number(durationMonths);

      if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
        return res.status(400).json({
          success: false,
          message: "Duration must be a positive whole number of months.",
        });
      }

      batchDocument.durationMonths = parsedDuration;
    }

    if (endDate !== undefined) {
      const parsedEndDate = new Date(endDate);

      if (Number.isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date.",
        });
      }

      batchDocument.endDate = parsedEndDate;
    } else if (
      startDate !== undefined ||
      durationMonths !== undefined
    ) {
      batchDocument.endDate = calculateEndDate(
        batchDocument.startDate,
        batchDocument.durationMonths
      );
    }

    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch status.",
        });
      }

      batchDocument.status = status;
    }

    if (mode !== undefined) {
      if (!allowedModes.includes(mode)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch mode.",
        });
      }

      batchDocument.mode = mode;
    }

    if (batchType !== undefined) {
      if (!allowedBatchTypes.includes(batchType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch type.",
        });
      }

      batchDocument.batchType = batchType;
    }

    if (capacity !== undefined) {
      const parsedCapacity = Number(capacity);

      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive whole number.",
        });
      }

      const studentCount = await User.countDocuments({
        role: "Student",
        isActive: true,
        batch: batchDocument.batch,
      });

      if (parsedCapacity < studentCount) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be lower than the ${studentCount} currently assigned students.`,
        });
      }

      batchDocument.capacity = parsedCapacity;
    }

    if (description !== undefined) {
      batchDocument.description = description;
    }

    if (time !== undefined) batchDocument.time = time;
    if (days !== undefined) batchDocument.days = days;
    if (meetingLink !== undefined) batchDocument.meetingLink = meetingLink;

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }

      batchDocument.isActive = isActive;
    }

    if (batchDocument.endDate < batchDocument.startDate) {
      return res.status(400).json({
        success: false,
        message: "Batch end date cannot be before the start date.",
      });
    }

    await batchDocument.save();

    const updatedBatch = await Batch.findById(batchDocument._id)
      .populate(
        "trainer",
        "userId name email isActive trainerDetails"
      )
      .lean();

    const studentCount = await User.countDocuments({
      role: "Student",
      isActive: true,
      batch: updatedBatch.batch,
    });

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully.",
      data: {
        ...updatedBatch,
        studentCount,
      },
    });
  } catch (error) {
    console.error("Update batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update batch.",
    });
  }
};

// DELETE /api/admin/batches/:id
// Soft delete: keep the document for historical references.
export const deleteBatch = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batchDocument = await Batch.findById(req.params.id);

    if (!batchDocument) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const assignedStudents = await User.countDocuments({
      role: "Student",
      batch: batchDocument.batch,
    });

    if (assignedStudents > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This batch has student accounts assigned to it. Reassign those students before deactivating the batch.",
      });
    }

    batchDocument.isActive = false;
    batchDocument.status = "Cancelled";

    await batchDocument.save();

    return res.status(200).json({
      success: true,
      message: "Batch deactivated successfully.",
    });
  } catch (error) {
    console.error("Delete batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate batch.",
    });
  }
};