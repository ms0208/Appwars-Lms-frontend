import Schedule from "../models/Schedule.js";

// GET ALL SCHEDULES
export const getSchedule = async (req, res) => {
  try {
    const { batch, from, to, status, mode } = req.query;

    const filter = {};

    if (batch) {
      filter.batch = batch;
    }

    if (status) {
      filter.status = status;
    }

    if (mode) {
      filter.mode = mode;
    }

    if (from || to) {
      filter.date = {};

      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const schedules = await Schedule.find(filter).sort({
      date: 1,
      startTime: 1,
    });

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch schedules",
      error: error.message,
    });
  }
};

// GET SINGLE SCHEDULE
export const getSingleSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch schedule",
      error: error.message,
    });
  }
};

// CREATE SCHEDULE
export const createSchedule = async (req, res) => {
  try {
    const {
      title,
      batch,
      course,
      trainer,
      date,
      startTime,
      endTime,
      mode,
      meetingLink,
      location,
      type,
      status,
      notes,
    } = req.body;

    if (
      !title ||
      !batch ||
      !course ||
      !trainer ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required schedule fields",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time",
      });
    }

    const schedule = await Schedule.create({
      title,
      batch,
      course,
      trainer,
      date,
      startTime,
      endTime,
      mode,
      meetingLink,
      location,
      type,
      status,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create schedule",
      error: error.message,
    });
  }
};

// UPDATE SCHEDULE
export const updateSchedule = async (req, res) => {
  try {
    const updates = { ...req.body };

    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    if (
      updates.startTime &&
      updates.endTime &&
      updates.startTime >= updates.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time",
      });
    }

    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update schedule",
      error: error.message,
    });
  }
};

// UPDATE SCHEDULE STATUS
export const updateScheduleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Scheduled",
      "Completed",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule status",
      });
    }

    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule status updated successfully",
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update schedule status",
      error: error.message,
    });
  }
};

// DELETE SCHEDULE
export const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
};