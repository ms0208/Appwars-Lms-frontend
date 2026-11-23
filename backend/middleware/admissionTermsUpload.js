
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const admissionTermsDirectory = path.resolve(
  __dirname,
  "../uploads/admission-terms"
);

fs.mkdirSync(admissionTermsDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, admissionTermsDirectory);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      `admission-terms-${Date.now()}-${crypto.randomUUID()}.pdf`;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" &&
    path.extname(file.originalname).toLowerCase() === ".pdf";

  if (!isPdf) {
    return cb(
      new Error("Only PDF files are allowed."),
      false
    );
  }

  cb(null, true);
};

const uploadAdmissionTerms = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

export default uploadAdmissionTerms;
