import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "assignments"
);

// Create the upload directory automatically.
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const filename = `${randomUUID()}.pdf`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    extension !== ".pdf" ||
    file.mimetype !== "application/pdf"
  ) {
    return cb(new Error("Only PDF documents are allowed."));
  }

  cb(null, true);
};

const uploadAssignment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
});

export default uploadAssignment;