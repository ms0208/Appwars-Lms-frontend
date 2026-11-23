
import fs from "fs/promises";
import path from "path";

import AdmissionTerms from "../models/AdmissionTerms.js";
import {
  admissionTermsDirectory,
} from "../middleware/admissionTermsUpload.js";

// ==========================================
// ADMIN: GET UPLOADED PDF
// ==========================================
export const getAdminAdmissionTerms = async (req, res) => {
  try {
    const terms = await AdmissionTerms.findOne()
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name userId email");

    return res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch admission terms PDF",
    });
  }
};

// ==========================================
// ADMIN: UPLOAD / REPLACE PDF
// ==========================================
export const uploadAdmissionTerms = async (req, res) => {
  let newFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a PDF file",
      });
    }

    newFilePath = req.file.path;

    // Verify actual PDF file signature
    const fileHandle = await fs.open(newFilePath, "r");

    let signature;

    try {
      signature = Buffer.alloc(5);
      await fileHandle.read(signature, 0, 5, 0);
    } finally {
      await fileHandle.close();
    }

    if (signature.toString() !== "%PDF-") {
      await fs.unlink(newFilePath).catch(() => { });

      return res.status(400).json({
        success: false,
        message: "Invalid PDF file. Please upload a valid PDF.",
      });
    }

    // Find previous document
    const previousTerms = await AdmissionTerms.findOne()
      .sort({ createdAt: -1 });

    // Get authenticated Admin MongoDB ID
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      await fs.unlink(newFilePath).catch(() => { });

      return res.status(401).json({
        success: false,
        message: "Admin authentication ID not found. Please login again.",
      });
    }

    const terms = await AdmissionTerms.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: newFilePath,
      mimeType: "application/pdf",
      fileSize: req.file.size,
      status: "Published",
      uploadedBy: adminId,
      publishedAt: new Date(),
    });

    // Delete old file after successful database save
    if (previousTerms) {
      await fs.unlink(previousTerms.filePath).catch((error) => {
        console.error("Old PDF cleanup error:", error.message);
      });

      await AdmissionTerms.deleteMany({
        _id: { $ne: terms._id },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Admission terms PDF uploaded and published successfully",
      data: terms,
    });
  } catch (error) {
    console.error("Admission PDF Upload Error:", error);

    if (newFilePath) {
      await fs.unlink(newFilePath).catch(() => { });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to upload admission terms PDF",
    });
  }
};

// ==========================================
// STUDENT: GET PUBLISHED PDF DETAILS
// ==========================================
export const getStudentAdmissionTerms = async (req, res) => {
  try {
    const terms = await AdmissionTerms.findOne({
      status: "Published",
    })
      .select(
        "originalName fileName fileSize mimeType publishedAt status"
      )
      .sort({ publishedAt: -1 });

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Admission terms PDF is not available yet",
      });
    }

    return res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch admission terms",
    });
  }
};

// ==========================================
// STUDENT: VIEW / DOWNLOAD PDF
// ==========================================
export const downloadStudentAdmissionTerms = async (req, res) => {
  try {
    const terms = await AdmissionTerms.findOne({
      status: "Published",
    }).sort({ publishedAt: -1 });

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Admission terms PDF not found",
      });
    }

    const safePath = path.resolve(terms.filePath);

    if (
      path.dirname(safePath) !==
      path.resolve(admissionTermsDirectory)
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid document location",
      });
    }

    await fs.access(safePath);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `${req.query.download === "true" ? "attachment" : "inline"}; filename="Admission-Terms.pdf"`
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.sendFile(safePath);
  } catch (error) {
    console.error("Admission PDF Download Error:", error);

    return res.status(404).json({
      success: false,
      message: "Admission terms PDF file not found",
    });
  }
};
