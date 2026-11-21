
import LearningResource from "../models/LearningResource.js";
import ResourceProgress from "../models/ResourceProgress.js";
import Batch from "../models/Batch.js";
import User from "../models/user.js";

// ------------------------------------------------------
// 1. AUTHENTICATION HELPERS
// ------------------------------------------------------

const getRole = (req) =>
    String(req.user?.role || "").toLowerCase();

const isAdmin = (req) => getRole(req) === "admin";

const isTrainer = (req) => getRole(req) === "trainer";

const isStudent = (req) => getRole(req) === "student";

// ------------------------------------------------------
// 2. RESOLVE AUTHENTICATED USER
//
// Supports:
// 1. MongoDB _id
// 2. Application userId (TRN30B73915)
// 3. req.user.id
// 4. Authenticated email
// ------------------------------------------------------

async function getAuthenticatedUser(req) {
    const identities = [
        req.user?._id,
        req.user?.id,
        req.user?.userId,
    ].filter(Boolean);

    for (const identity of identities) {
        const value = String(identity).trim();

        if (!value) continue;

        // Check MongoDB ObjectId
        if (/^[a-fA-F0-9]{24}$/.test(value)) {
            const userById = await User.findById(value);

            if (userById) {
                return userById;
            }
        }

        // Check application userId
        const userByUserId = await User.findOne({
            userId: value,
        });

        if (userByUserId) {
            return userByUserId;
        }
    }

    // Fallback: authenticated email
    if (req.user?.email) {
        const email = String(req.user.email)
            .trim()
            .toLowerCase();

        const userByEmail = await User.findOne({
            email,
        });

        if (userByEmail) {
            return userByEmail;
        }
    }

    return null;
}

// ------------------------------------------------------
// 3. GET AUTHENTICATED MONGODB USER ID
// ------------------------------------------------------

async function getDatabaseUserId(req) {
    const user = await getAuthenticatedUser(req);

    return user?._id || null;
}

// ------------------------------------------------------
// 4. RESOLVE STUDENT BATCH ID
//
// Student user.batch can be:
// 1. "MERN-01"
// 2. MongoDB ObjectId
// 3. Populated batch object
// ------------------------------------------------------

async function getStudentBatchId(req) {
    try {
        const user = await getAuthenticatedUser(req);

        if (!user || !user.batch) {
            return null;
        }

        const batchValue = user.batch;

        // Populated batch object
        if (
            typeof batchValue === "object" &&
            batchValue._id
        ) {
            return batchValue._id;
        }

        const batchString = String(batchValue).trim();

        if (!batchString) {
            return null;
        }

        // Find by batch name/code
        const batchByName = await Batch.findOne({
            batch: batchString,
        }).select("_id batch");

        if (batchByName) {
            return batchByName._id;
        }

        // Find by MongoDB ObjectId
        if (/^[a-fA-F0-9]{24}$/.test(batchString)) {
            const batchById = await Batch.findById(batchString)
                .select("_id batch");

            if (batchById) {
                return batchById._id;
            }
        }

        return null;
    } catch (error) {
        console.error("getStudentBatchId error:", error);
        return null;
    }
}

// ------------------------------------------------------
// 5. GET BATCH DOCUMENT FROM ID OR BATCH CODE
// ------------------------------------------------------

async function getBatchDocument(batchId) {
    if (!batchId) return null;

    if (
        typeof batchId === "object" &&
        batchId._id
    ) {
        return Batch.findById(batchId._id);
    }

    const value = String(batchId).trim();

    if (!value) return null;

    // Find by batch code
    const batchByName = await Batch.findOne({
        batch: value,
    });

    if (batchByName) {
        return batchByName;
    }

    // Find by MongoDB ObjectId
    if (/^[a-fA-F0-9]{24}$/.test(value)) {
        return Batch.findById(value);
    }

    return null;
}

// ------------------------------------------------------
// 6. TRAINER / ADMIN BATCH AUTHORIZATION
//
// Admin:
// Can manage all batches.
//
// Trainer:
// Can manage only batches assigned to them.
//
// IMPORTANT:
// Batch.trainer stores MongoDB User ObjectId.
// req.user.id may contain application userId.
// Therefore resolve actual User document first.
// ------------------------------------------------------

async function canManageBatch(req, batchId) {
    // Admin access
    if (isAdmin(req)) {
        return true;
    }

    // Only trainers can pass trainer authorization
    if (!isTrainer(req)) {
        return false;
    }

    // Resolve logged-in trainer's MongoDB document
    const trainerUser = await getAuthenticatedUser(req);

    if (!trainerUser) {
        console.error(
            "Trainer authorization failed: user not found.",
            {
                id: req.user?.id,
                userId: req.user?.userId,
                email: req.user?.email,
            }
        );

        return false;
    }

    // Resolve requested batch
    const batch = await getBatchDocument(batchId);

    if (!batch) {
        console.error(
            "Trainer authorization failed: batch not found.",
            batchId
        );

        return false;
    }

    if (!batch.trainer) {
        console.error(
            "Trainer authorization failed: batch has no assigned trainer.",
            batch.batch
        );

        return false;
    }

    const assignedTrainerId = String(
        batch.trainer?._id || batch.trainer
    );

    const loggedInTrainerId = String(
        trainerUser._id
    );

    const allowed =
        assignedTrainerId === loggedInTrainerId;

    console.log("LEARNING RESOURCE BATCH AUTHORIZATION:", {
        trainerName: trainerUser.name,
        trainerUserId: trainerUser.userId,
        trainerMongoId: loggedInTrainerId,
        assignedTrainerId,
        batch: batch.batch,
        allowed,
    });

    return allowed;
}

// ------------------------------------------------------
// 7. GET STUDENT'S BATCH DOCUMENT
// ------------------------------------------------------

async function getStudentBatch(req) {
    const batchId = await getStudentBatchId(req);

    if (!batchId) {
        return null;
    }

    return Batch.findById(batchId);
}

// ------------------------------------------------------
// 8. CREATE RESOURCE
// POST /api/learning-resources
// ------------------------------------------------------


export const createResource = async (req, res, next) => {
  try {
    const {
      title,
      description,
      batch,
      type,
      duration,
      moduleName,
      order,
      isPublished,
    } = req.body;

    if (!title || !batch || !type) {
      return res.status(400).json({
        success: false,
        message: "Title, batch and resource type are required.",
      });
    }

    if (!["video", "notes"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Resource type must be video or notes.",
      });
    }

    const batchDoc = await getBatchDocument(batch);

    if (!batchDoc) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const allowed = await canManageBatch(req, batchDoc._id);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage this batch.",
      });
    }

    const userMongoId = await getDatabaseUserId(req);

    if (!userMongoId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    let videoUrl = "";
    let fileUrl = "";
    let fileName = "";
    let videoDuration = 0;

    // VIDEO UPLOAD
    if (type === "video") {
      const videoFile = req.files?.video?.[0];

      if (!videoFile) {
        return res.status(400).json({
          success: false,
          message: "Please select a video from your device.",
        });
      }

      videoUrl =
        `/uploads/learning-resources/${videoFile.filename}`;

      videoDuration = Number(duration);

      if (
        !Number.isFinite(videoDuration) ||
        videoDuration <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid video duration in seconds is required.",
        });
      }
    }

    // NOTES UPLOAD
    if (type === "notes") {
      const notesFile = req.files?.notes?.[0];

      if (!notesFile) {
        return res.status(400).json({
          success: false,
          message: "Please select notes from your device.",
        });
      }

      fileUrl =
        `/uploads/learning-resources/${notesFile.filename}`;

      fileName = notesFile.originalname;
    }

    const resource = await LearningResource.create({
      title: title.trim(),
      description: description || "",

      batch: batchDoc._id,
      type,

      videoUrl,
      duration: videoDuration,

      fileUrl,
      fileName,

      moduleName: moduleName || "General",
      order: Number(order) || 0,

      isPublished:
        isPublished === true ||
        isPublished === "true",

      createdBy: userMongoId,
      updatedBy: userMongoId,
    });

    return res.status(201).json({
      success: true,
      message: "Learning resource uploaded successfully.",
      resource,
    });
  } catch (error) {
    next(error);
  }
};


// ------------------------------------------------------
// 9. GET RESOURCES FOR A BATCH
// GET /api/learning-resources/batch/:batchId
// ------------------------------------------------------

export const getBatchResources = async (req, res, next) => {
    try {
        const { batchId } = req.params;

        const batchDoc = await getBatchDocument(batchId);

        if (!batchDoc) {
            return res.status(404).json({
                success: false,
                message: "Batch not found.",
            });
        }

        let allowed = false;

        // Admin access
        if (isAdmin(req)) {
            allowed = true;
        }

        // Trainer access
        else if (isTrainer(req)) {
            allowed = await canManageBatch(
                req,
                batchDoc._id
            );
        }

        // Student access
        else if (isStudent(req)) {
            const studentBatchId =
                await getStudentBatchId(req);

            allowed =
                String(studentBatchId) ===
                String(batchDoc._id);
        }

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this batch.",
            });
        }

        const filter = {
            batch: batchDoc._id,
        };

        // Students only see published resources
        if (isStudent(req)) {
            filter.isPublished = true;
        }

        const resources = await LearningResource.find(filter)
            .populate("batch", "batch batchName")
            .sort({
                moduleName: 1,
                order: 1,
                createdAt: 1,
            });

        // Student progress map
        const progressMap = {};

        if (isStudent(req)) {
            const studentMongoId =
                await getDatabaseUserId(req);

            if (!studentMongoId) {
                return res.status(401).json({
                    success: false,
                    message: "Authenticated student account not found.",
                });
            }

            const progressRecords =
                await ResourceProgress.find({
                    student: studentMongoId,
                    resource: {
                        $in: resources.map(
                            (resource) => resource._id
                        ),
                    },
                });

            progressRecords.forEach((progress) => {
                progressMap[String(progress.resource)] =
                    progress;
            });
        }

        const result = resources.map((resource) => {
            const progress =
                progressMap[String(resource._id)];

            return {
                ...resource.toObject(),

                progress: progress
                    ? {
                        watchedSeconds: progress.watchedSeconds,
                        lastPosition: progress.lastPosition,
                        duration: progress.duration,
                        completed: progress.completed,
                        completedAt: progress.completedAt,
                    }
                    : {
                        watchedSeconds: 0,
                        lastPosition: 0,
                        duration: resource.duration || 0,
                        completed: false,
                        completedAt: null,
                    },
            };
        });

        return res.json({
            success: true,

            batch: {
                _id: batchDoc._id,
                batch: batchDoc.batch,
            },

            resources: result,
        });
    } catch (error) {
        next(error);
    }
};

// ------------------------------------------------------
// 10. UPDATE RESOURCE
// PUT /api/learning-resources/:id
// ------------------------------------------------------

export const updateResource = async (req, res, next) => {
    try {
        const resource = await LearningResource.findById(
            req.params.id
        );

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Learning resource not found.",
            });
        }

        // Permission check
        const allowed = await canManageBatch(
            req,
            resource.batch
        );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You cannot edit this resource.",
            });
        }

        const allowedFields = [
            "title",
            "description",
            "videoUrl",
            "duration",
            "fileUrl",
            "fileName",
            "moduleName",
            "order",
            "isPublished",
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                resource[field] = req.body[field];
            }
        });

        // Validate video
        if (resource.type === "video") {
            if (!resource.videoUrl) {
                return res.status(400).json({
                    success: false,
                    message: "Video URL is required.",
                });
            }

            if (
                !Number.isFinite(Number(resource.duration)) ||
                Number(resource.duration) <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid video duration is required.",
                });
            }
        }

        // Validate notes
        if (
            resource.type === "notes" &&
            !resource.fileUrl
        ) {
            return res.status(400).json({
                success: false,
                message: "Notes file URL is required.",
            });
        }

        const userMongoId = await getDatabaseUserId(req);

        if (!userMongoId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found.",
            });
        }

        resource.updatedBy = userMongoId;

        await resource.save();

        // Update progress duration if video duration changes
        if (resource.type === "video") {
            const duration = Number(resource.duration) || 0;

            const progressRecords =
                await ResourceProgress.find({
                    resource: resource._id,
                });

            for (const progress of progressRecords) {
                progress.duration = duration;

                progress.watchedSeconds = Math.min(
                    Number(progress.watchedSeconds) || 0,
                    duration
                );

                progress.completed =
                    duration > 0 &&
                    progress.watchedSeconds >= duration * 0.9;

                if (
                    progress.completed &&
                    !progress.completedAt
                ) {
                    progress.completedAt = new Date();
                }

                if (!progress.completed) {
                    progress.completedAt = null;
                }

                await progress.save();
            }
        }

        return res.json({
            success: true,
            message: "Learning resource updated successfully.",
            resource,
        });
    } catch (error) {
        next(error);
    }
};

// ------------------------------------------------------
// 11. DELETE RESOURCE
// DELETE /api/learning-resources/:id
// ------------------------------------------------------

export const deleteResource = async (req, res, next) => {
    try {
        const resource = await LearningResource.findById(
            req.params.id
        );

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Learning resource not found.",
            });
        }

        // Permission check
        const allowed = await canManageBatch(
            req,
            resource.batch
        );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You cannot delete this resource.",
            });
        }

        // Delete related student progress
        await ResourceProgress.deleteMany({
            resource: resource._id,
        });

        // Delete resource
        await resource.deleteOne();

        return res.json({
            success: true,
            message: "Resource and associated progress deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
};

// ------------------------------------------------------
// 12. SAVE VIDEO WATCH PROGRESS
// POST /api/learning-resources/:id/progress
// ------------------------------------------------------

export const saveVideoProgress = async (req, res, next) => {
    try {
        const {
            currentTime,
            playbackDelta,
        } = req.body;

        if (!isStudent(req)) {
            return res.status(403).json({
                success: false,
                message: "Only students can submit watch progress.",
            });
        }

        const studentMongoId =
            await getDatabaseUserId(req);

        if (!studentMongoId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated student account not found.",
            });
        }

        const position = Math.max(
            0,
            Number(currentTime) || 0
        );

        const resource = await LearningResource.findById(
            req.params.id
        );

        if (
            !resource ||
            resource.type !== "video" ||
            !resource.isPublished
        ) {
            return res.status(404).json({
                success: false,
                message: "Published video lecture not found.",
            });
        }

        // Resolve actual student's batch
        const studentBatchId =
            await getStudentBatchId(req);

        if (!studentBatchId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not assigned to a valid batch.",
            });
        }

        // Verify video belongs to student's batch
        if (
            String(studentBatchId) !==
            String(resource.batch)
        ) {
            return res.status(403).json({
                success: false,
                message: "This video does not belong to your batch.",
            });
        }

        const duration = Number(resource.duration) || 0;

        // Limit delta to 20 seconds per request
        const delta = Math.min(
            Math.max(Number(playbackDelta) || 0, 0),
            20
        );

        let progress = await ResourceProgress.findOne({
            student: studentMongoId,
            resource: resource._id,
        });

        if (!progress) {
            progress = new ResourceProgress({
                student: studentMongoId,
                batch: resource.batch,
                resource: resource._id,
                watchedSeconds: 0,
                lastPosition: 0,
                duration,
            });
        }

        // Determine playback movement
        const movement = Math.abs(
            position - progress.lastPosition
        );

        // Add watched time for reasonable playback movement
        if (
            movement > 0 &&
            movement <= 20 &&
            delta > 0
        ) {
            progress.watchedSeconds = Math.min(
                duration,
                (Number(progress.watchedSeconds) || 0) + delta
            );
        }

        progress.lastPosition = Math.min(
            position,
            duration
        );

        progress.duration = duration;
        progress.lastWatchedAt = new Date();

        // 90% completion threshold
        const completed =
            duration > 0 &&
            progress.watchedSeconds >= duration * 0.9;

        if (completed) {
            progress.completed = true;

            progress.completedAt =
                progress.completedAt || new Date();
        } else {
            progress.completed = false;
            progress.completedAt = null;
        }

        await progress.save();

        return res.json({
            success: true,
            message: "Video progress saved.",

            progress: {
                watchedSeconds: progress.watchedSeconds,
                lastPosition: progress.lastPosition,
                duration,
                completed: progress.completed,
                completedAt: progress.completedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ------------------------------------------------------
// 13. GET STUDENT BATCH PROGRESS
// GET /api/learning-resources/my-progress
// ------------------------------------------------------

export const getMyBatchProgress = async (req, res, next) => {
    try {
        if (!isStudent(req)) {
            return res.status(403).json({
                success: false,
                message: "Student access only.",
            });
        }

        const studentMongoId =
            await getDatabaseUserId(req);

        if (!studentMongoId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated student account not found.",
            });
        }

        const batchId = await getStudentBatchId(req);

        if (!batchId) {
            return res.json({
                success: true,
                batchId: null,
                batchProgress: 0,
                totalVideos: 0,
                completedVideos: 0,
                totalDuration: 0,
                watchedDuration: 0,
                completedDuration: 0,
                progressPercentage: 0,
            });
        }

        // Get published videos for student's batch
        const videos = await LearningResource.find({
            batch: batchId,
            type: "video",
            isPublished: true,
        }).select("_id duration");

        // Get student's progress records
        const progressRecords =
            await ResourceProgress.find({
                student: studentMongoId,
                resource: {
                    $in: videos.map(
                        (video) => video._id
                    ),
                },
            });

        const progressMap = new Map(
            progressRecords.map((progress) => [
                String(progress.resource),
                progress,
            ])
        );

        // Total published video duration
        const totalDuration = videos.reduce(
            (sum, video) =>
                sum + (Number(video.duration) || 0),
            0
        );

        let completedVideos = 0;
        let completedDuration = 0;
        let watchedDuration = 0;

        videos.forEach((video) => {
            const progress = progressMap.get(
                String(video._id)
            );

            const duration = Number(video.duration) || 0;

            const watched = Math.min(
                duration,
                Number(progress?.watchedSeconds) || 0
            );

            watchedDuration += watched;

            if (progress?.completed) {
                completedVideos++;
                completedDuration += duration;
            }
        });

        // Progress based on actual watched duration
        const batchProgress =
            totalDuration > 0
                ? Math.round(
                    (watchedDuration / totalDuration) * 100
                )
                : 0;

        return res.json({
            success: true,

            batchId,

            batchProgress,
            progressPercentage: batchProgress,

            totalVideos: videos.length,
            completedVideos,

            totalDuration,
            watchedDuration,
            completedDuration,
        });
    } catch (error) {
        next(error);
    }
};

// ------------------------------------------------------
// 14. ADMIN / TRAINER: GET STUDENT PROGRESS FOR BATCH
// GET /api/learning-resources/batch/:batchId/progress
// ------------------------------------------------------

export const getBatchStudentProgress = async (req, res, next) => {
    try {
        const { batchId } = req.params;

        const batchDoc = await getBatchDocument(batchId);

        if (!batchDoc) {
            return res.status(404).json({
                success: false,
                message: "Batch not found.",
            });
        }

        // Admin / Trainer authorization
        const allowed = await canManageBatch(
            req,
            batchDoc._id
        );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You cannot view this batch.",
            });
        }

        // Get published videos
        const videos = await LearningResource.find({
            batch: batchDoc._id,
            type: "video",
            isPublished: true,
        }).select("_id duration");

        // Student User.batch stores batch CODE, e.g. MERN-01
        const students = await User.find({
            batch: batchDoc.batch,
            role: "Student",
        }).select("name userId email batch");

        // Get progress records for these videos
        const progressRecords =
            await ResourceProgress.find({
                batch: batchDoc._id,
                resource: {
                    $in: videos.map(
                        (video) => video._id
                    ),
                },
            });

        const totalDuration = videos.reduce(
            (sum, video) =>
                sum + (Number(video.duration) || 0),
            0
        );

        // Build student progress
        const result = students.map((student) => {
            const studentProgress = progressRecords.filter(
                (progress) =>
                    String(progress.student) ===
                    String(student._id)
            );

            const progressMap = new Map(
                studentProgress.map((progress) => [
                    String(progress.resource),
                    progress,
                ])
            );

            let completedVideos = 0;
            let watchedDuration = 0;
            let completedDuration = 0;

            videos.forEach((video) => {
                const progress = progressMap.get(
                    String(video._id)
                );

                const duration = Number(video.duration) || 0;

                const watched = Math.min(
                    duration,
                    Number(progress?.watchedSeconds) || 0
                );

                watchedDuration += watched;

                if (progress?.completed) {
                    completedVideos++;
                    completedDuration += duration;
                }
            });

            // Student's progress based on actual watch duration
            const batchProgress = totalDuration
                ? Math.round(
                    (watchedDuration / totalDuration) * 100
                )
                : 0;

            return {
                student: {
                    _id: student._id,
                    name: student.name,
                    userId: student.userId,
                    email: student.email,
                },

                totalVideos: videos.length,
                completedVideos,

                totalDuration,
                watchedDuration,
                completedDuration,

                batchProgress,
                progressPercentage: batchProgress,
            };
        });

        return res.json({
            success: true,

            batch: {
                _id: batchDoc._id,
                batch: batchDoc.batch,
            },

            batchId: batchDoc._id,

            totalVideos: videos.length,
            totalDuration,

            totalStudents: students.length,

            students: result,
        });
    } catch (error) {
        next(error);
    }
};
