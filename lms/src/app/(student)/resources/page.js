
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  PlayCircle,
  Download,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getToken = () =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in to access your learning resources.");
      }

      const response = await fetch(`${API_URL}/api/student/resources`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load learning resources."
        );
      }

      const items = Array.isArray(data)
        ? data
        : data.resources || data.courses || [];

      setResources(items);
    } catch (err) {
      setError(err.message || "Unable to load learning resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const getResourceUrl = (resource) =>
    resource.url ||
    resource.fileUrl ||
    resource.resourceUrl ||
    resource.lessonUrl ||
    resource.videoUrl ||
    "";

  const getResourceTitle = (resource) =>
    resource.title ||
    resource.name ||
    resource.courseName ||
    "Learning Resource";

  const getResourceType = (resource) =>
    resource.type ||
    resource.resourceType ||
    resource.category ||
    "Study material";

  const getResourceDetail = (resource) =>
    resource.description ||
    resource.detail ||
    resource.courseDescription ||
    "Access your course learning material.";

  const getResourceIcon = (type) => {
    const value = String(type).toLowerCase();

    if (value.includes("video") || value.includes("lesson")) {
      return PlayCircle;
    }

    if (
      value.includes("pdf") ||
      value.includes("note") ||
      value.includes("document")
    ) {
      return FileText;
    }

    return Download;
  };

  const openResource = (resource) => {
    const url = getResourceUrl(resource);

    if (!url) {
      setError(
        `"${getResourceTitle(resource)}" does not have a resource link yet.`
      );
      return;
    }

    try {
      const parsedUrl = new URL(url, window.location.origin);

      if (!["https:", "http:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid resource URL.");
      }

      window.open(parsedUrl.href, "_blank", "noopener,noreferrer");
    } catch {
      setError("Unable to open this resource. Please check its URL.");
    }
  };

  const downloadResource = async (resource) => {
    const url = getResourceUrl(resource);

    if (!url) {
      setError(
        `"${getResourceTitle(resource)}" does not have a downloadable file yet.`
      );
      return;
    }

    try {
      const parsedUrl = new URL(url, window.location.origin);

      if (!["https:", "http:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid resource URL.");
      }

      // Open the file URL. For cross-origin URLs, the browser may display
      // the file instead of downloading it, depending on server headers.
      const link = document.createElement("a");
      link.href = parsedUrl.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Unable to download this resource. Please check its URL.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#102e60]">
            Learning Resources
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Access your course lessons, notes, videos and study materials.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchResources}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-white p-8 text-center text-sm text-slate-500">
          Loading learning resources...
        </div>
      ) : resources.length === 0 && !error ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-white p-8 text-center">
          <BookOpen size={34} className="mx-auto text-blue-400" />
          <h2 className="mt-3 text-sm font-bold text-[#102e60]">
            No learning resources available
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your trainers course materials and lesson links will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource, index) => {
            const id = resource._id || resource.id || index;
            const title = getResourceTitle(resource);
            const type = getResourceType(resource);
            const Icon = getResourceIcon(type);
            const url = getResourceUrl(resource);

            return (
              <article
                key={id}
                className="flex flex-col rounded-xl border border-blue-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BookOpen size={21} />
                </div>

                <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                  {type}
                </p>

                <h2 className="mt-1 font-bold text-[#102e60]">
                  {title}
                </h2>

                <p className="mt-2 flex-1 text-xs leading-5 text-slate-500">
                  {getResourceDetail(resource)}
                </p>

                {resource.trainerName && (
                  <p className="mt-2 text-xs text-slate-500">
                    Trainer: {resource.trainerName}
                  </p>
                )}

                {resource.courseName && resource.title && (
                  <p className="mt-1 text-xs text-slate-500">
                    Course: {resource.courseName}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openResource(resource)}
                    disabled={!url}
                    className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {url ? <Icon size={15} /> : <FileText size={15} />}
                    Open resource
                    {url && <ExternalLink size={12} />}
                  </button>

                  {url && (
                    <button
                      type="button"
                      onClick={() => downloadResource(resource)}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
