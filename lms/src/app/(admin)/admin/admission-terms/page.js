
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FileText,
  FileUp,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  HardDrive,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

export default function AdmissionTermsPage() {
  const [document, setDocument] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const getToken = () =>
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token");

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/admin/admission-terms`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setDocument(result.data || null);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Unable to load document",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

    if (
      selectedFile.type !== "application/pdf" ||
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage({
        type: "error",
        text: "Only PDF files are allowed.",
      });

      return false;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "PDF size must not exceed 10 MB.",
      });

      return false;
    }

    setFile(selectedFile);

    setMessage({
      type: "",
      text: "",
    });

    return true;
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({
        type: "error",
        text: "Please select a PDF file first.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Uploading a new PDF will replace the existing admission terms PDF. Continue?"
    );

    if (!confirmed) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch(
        `${API_URL}/admin/admission-terms/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed");
      }

      setMessage({
        type: "success",
        text: "Admission terms PDF uploaded and published successfully.",
      });

      setFile(null);

      await fetchDocument();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async () => {
    try {
      const response = await fetch(
        `${API_URL}/admin/admission-terms/download?download=true`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = url;
      link.download = "Admission-Terms.pdf";

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";

    return (bytes / 1024).toFixed(2) + " KB";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">

      {/* HEADER */}
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <FileText size={27} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admission Terms & Conditions
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Upload and publish the official admission terms PDF for students.
            </p>
          </div>
        </div>
      </div>

      {/* ALERT */}
      {message.text && (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border p-4 text-sm ${message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
            }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}

            {message.text}
          </div>

          <button onClick={() => setMessage({ type: "", text: "" })}>
            <X size={17} />
          </button>
        </div>
      )}

      {/* UPLOAD SECTION */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Upload Admission Terms PDF
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select your official admission terms and conditions PDF.
          </p>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);

            const droppedFile = e.dataTransfer.files[0];

            if (droppedFile) validateFile(droppedFile);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition md:p-12 ${dragging
              ? "border-blue-600 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50"
            }`}
        >
          <div className="mb-4 rounded-full bg-blue-100 p-4 text-blue-700">
            <FileUp size={32} />
          </div>

          <h3 className="font-semibold text-slate-800">
            Click to upload or drag and drop
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            PDF files only (Maximum size: 10 MB)
          </p>

          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              validateFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>

        {/* SELECTED FILE */}
        {file && (
          <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center">

            <div className="flex min-w-0 items-center gap-3">
              <FileText className="shrink-0 text-red-600" size={28} />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {file.name}
                </p>

                <p className="text-xs text-slate-500">
                  {formatSize(file.size)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setFile(null)}
              className="self-end text-slate-500 hover:text-red-600 sm:self-auto"
            >
              <X size={20} />
            </button>

          </div>
        )}

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">

          <button
            onClick={() => setFile(null)}
            disabled={!file || uploading}
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={17} />

            {uploading ? "Uploading..." : "Upload & Publish"}
          </button>

        </div>

      </div>

      {/* CURRENT DOCUMENT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7">

        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">
              Current Published Document
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This document is visible to all students.
            </p>
          </div>

          <button
            onClick={fetchDocument}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading document...
          </p>
        ) : document ? (

          <div className="flex flex-col justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center">

            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-xl bg-white p-3 text-red-600">
                <FileText size={30} />
              </div>

              <div className="min-w-0">
                <h3 className="break-all font-semibold text-slate-900">
                  {document.originalName}
                </h3>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <HardDrive size={13} />
                    {formatSize(document.fileSize)}
                  </span>

                  <span className="flex items-center gap-1">
                    <CalendarDays size={13} />
                    {formatDate(document.publishedAt)}
                  </span>
                </div>

                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <CheckCircle2 size={13} />
                  Published
                </span>
              </div>
            </div>

            <button
              onClick={downloadDocument}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} />
              Document Details
            </button>

          </div>

        ) : (

          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={38} />

            <h3 className="font-semibold text-slate-800">
              No PDF Uploaded
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Upload the admission terms PDF to make it available to students.
            </p>
          </div>

        )}

      </div>

    </div>
  );
}
