
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "learning-resources"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    const allowedVideos = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-matroska",
    ];

    if (allowedVideos.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("Only MP4, WebM, MOV and MKV videos are allowed."));
  }

  if (file.fieldname === "notes") {
    const allowedNotes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedNotes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("Only PDF, DOC and DOCX notes are allowed."));
  }

  return cb(new Error("Invalid upload field."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // Maximum 500 MB per file
  },
});

export const uploadLearningResource = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "notes", maxCount: 1 },
]);
