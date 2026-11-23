
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FileText,
  Download,
  RefreshCw,
  CalendarDays,
  HardDrive,
  AlertCircle,
  ShieldCheck,
  FileDown,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

export default function StudentAdmissionTermsPage() {
  const [document, setDocument] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () =>
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token");

  const fetchDocument = useCallback(async () => {
    let newUrl = "";

    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Please login to view admission terms.");
      }

      // Get document information
      const response = await fetch(
        `${API_URL}/student/admission-terms`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load admission terms."
        );
      }

      setDocument(result.data);

      // Fetch PDF using authenticated request
      const pdfResponse = await fetch(
        `${API_URL}/student/admission-terms/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!pdfResponse.ok) {
        throw new Error("Unable to load the admission PDF.");
      }

      const blob = await pdfResponse.blob();

      if (blob.type !== "application/pdf") {
        throw new Error("Invalid PDF response.");
      }

      newUrl = URL.createObjectURL(blob);

      setPdfUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return newUrl;
      });

    } catch (err) {
      setError(err.message);
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();

    return () => {
      setPdfUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return "";
      });
    };
  }, [fetchDocument]);

  const downloadPDF = async () => {
    try {
      setDownloading(true);

      const response = await fetch(
        `${API_URL}/student/admission-terms/download?download=true`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to download admission PDF.");
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf") {
        throw new Error("Invalid PDF file.");
      }

      const url = URL.createObjectURL(blob);

      const link = window.document.createElement("a");

      link.href = url;
      link.download = "Admission-Terms.pdf";

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
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
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <ShieldCheck size={27} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admission Terms & Conditions
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Official admission terms published by APPWARS.
            </p>
          </div>

        </div>

        <button
          onClick={fetchDocument}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center">

          <RefreshCw
            size={30}
            className="mx-auto mb-4 animate-spin text-blue-700"
          />

          <p className="text-sm text-slate-500">
            Loading admission terms PDF...
          </p>

        </div>
      )}

      {/* ERROR / EMPTY */}
      {!loading && error && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">

          <AlertCircle
            size={40}
            className="mx-auto mb-4 text-orange-500"
          />

          <h2 className="font-bold text-slate-900">
            Admission Terms Not Available
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            onClick={fetchDocument}
            className="mt-5 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white"
          >
            Try Again
          </button>

        </div>
      )}

      {/* DOCUMENT */}
      {!loading && !error && document && (

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

          {/* DOCUMENT INFORMATION */}
          <div className="flex flex-col justify-between gap-5 border-b border-slate-200 p-5 md:flex-row md:items-center md:p-7">

            <div className="flex min-w-0 items-center gap-4">

              <div className="shrink-0 rounded-xl bg-red-50 p-4 text-red-600">
                <FileText size={34} />
              </div>

              <div className="min-w-0">

                <h2 className="break-all text-lg font-bold text-slate-900">
                  {document.originalName}
                </h2>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">

                  <span className="flex items-center gap-1">
                    <HardDrive size={14} />
                    {formatSize(document.fileSize)}
                  </span>

                  <span className="flex items-center gap-1">
                    <CalendarDays size={14} />
                    {formatDate(document.publishedAt)}
                  </span>

                </div>

                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <ShieldCheck size={13} />
                  Official Published Document
                </span>

              </div>

            </div>

            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {downloading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}

              {downloading ? "Downloading..." : "Download PDF"}
            </button>

          </div>

          {/* PDF VIEWER */}
          <div className="p-4 md:p-6">

            <div className="mb-4 flex items-center gap-2">
              <FileDown size={19} className="text-blue-700" />

              <h3 className="font-semibold text-slate-900">
                Admission Terms Document
              </h3>
            </div>

            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Admission Terms and Conditions PDF"
                className="h-[75vh] min-h-[500px] w-full rounded-xl border border-slate-200 bg-slate-100"
              />
            ) : (
              <div className="flex h-96 items-center justify-center rounded-xl bg-slate-100">
                <p className="text-sm text-slate-500">
                  PDF preview unavailable.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
