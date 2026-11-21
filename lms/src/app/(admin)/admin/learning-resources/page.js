
"use client";

import { useEffect, useState } from "react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const emptyForm = {
  title: "",
  description: "",
  batch: "",
  type: "video",
  videoUrl: "",
  duration: "",
  fileUrl: "",
  fileName: "",
  moduleName: "General",
  order: 0,
};

export default function LearningResourcesPage() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [videoFile, setVideoFile] = useState(null);
  const [notesFile, setNotesFile] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("appwars_token") ||
        sessionStorage.getItem("token")
      : "";

  async function api(url, options = {}) {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    try {
      const data = await api("/api/admin/batches");

      const list = data.batches || data.data || [];

      setBatches(list);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (batchId) {
      loadResources();
    } else {
      setResources([]);
    }
  }, [batchId]);

  async function loadResources() {
    setLoading(true);
    setError("");

    try {
      const data = await api(
        `/api/learning-resources/batch/${batchId}`
      );

      setResources(data.resources || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function changeForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      batch: batchId,
    });

    setVideoFile(null);
    setNotesFile(null);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(resource) {
    setEditingId(resource._id);

    setForm({
      title: resource.title || "",
      description: resource.description || "",
      batch: resource.batch?._id || resource.batch || batchId,
      type: resource.type || "video",
      videoUrl: resource.videoUrl || "",
      duration: resource.duration || "",
      fileUrl: resource.fileUrl || "",
      fileName: resource.fileName || "",
      moduleName: resource.moduleName || "General",
      order: resource.order || 0,
    });

    setVideoFile(null);
    setNotesFile(null);

    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function saveResource(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.batch) {
      setError("Please select a batch.");
      return;
    }

    if (form.type === "video") {
      if (!editingId && !videoFile) {
        setError("Please select a video file.");
        return;
      }

      if (!editingId && Number(form.duration) <= 0) {
        setError("Please enter a valid video duration.");
        return;
      }
    }

    if (form.type === "notes" && !editingId && !notesFile) {
      setError("Please select a notes file.");
      return;
    }

    if (
      form.type === "video" &&
      videoFile &&
      !["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"].includes(
        videoFile.type
      )
    ) {
      setError("Please select a valid video file (MP4, WebM, MOV or MKV).");
      return;
    }

    if (
      form.type === "notes" &&
      notesFile &&
      ![
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(notesFile.type)
    ) {
      setError("Please select a PDF, DOC or DOCX file.");
      return;
    }

    const formData = new FormData();

    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("batch", form.batch);
    formData.append("type", form.type);
    formData.append("duration", String(Number(form.duration) || 0));
    formData.append("moduleName", form.moduleName);
    formData.append("order", String(Number(form.order) || 0));

    if (form.type === "video" && videoFile) {
      formData.append("video", videoFile);
    }

    if (form.type === "notes" && notesFile) {
      formData.append("notes", notesFile);
      formData.append("fileName", notesFile.name);
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/learning-resources/${editingId}`
        : "/api/learning-resources";

      await api(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      setSuccess(
        editingId
          ? "Resource updated successfully."
          : "Resource uploaded successfully."
      );

      setShowForm(false);
      resetForm();

      await loadResources();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(id) {
    if (!confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api(`/api/learning-resources/${id}`, {
        method: "DELETE",
      });

      setSuccess("Resource deleted successfully.");
      await loadResources();
    } catch (err) {
      setError(err.message);
    }
  }

  async function togglePublish(resource) {
    setError("");
    setSuccess("");

    try {
      await api(`/api/learning-resources/${resource._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPublished: !resource.isPublished,
        }),
      });

      setSuccess(
        resource.isPublished
          ? "Resource unpublished."
          : "Resource published successfully."
      );

      await loadResources();
    } catch (err) {
      setError(err.message);
    }
  }

  const videos = resources.filter((r) => r.type === "video");
  const notes = resources.filter((r) => r.type === "notes");

  const formatDuration = (seconds) => {
    const min = Math.floor((seconds || 0) / 60);
    const sec = Math.floor((seconds || 0) % 60);

    return `${min}m ${sec}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#102e60]">
              Learning Resources
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Upload and manage batch video lectures and study notes.
            </p>
          </div>

          <button
            onClick={openCreate}
            disabled={!batchId}
            className="rounded-xl bg-[#102e60] px-5 py-3 font-semibold text-white transition hover:bg-[#183d79] disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add Resource
          </button>
        </div>

        {/* BATCH SELECT */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Batch
          </label>

          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full max-w-md rounded-xl border p-3 outline-none focus:border-[#102e60]"
          >
            <option value="">Select a batch</option>

            {batches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.batchName || batch.batch || batch.name}
              </option>
            ))}
          </select>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="font-bold"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* CREATE / EDIT FORM */}
        {showForm && (
          <form
            onSubmit={saveResource}
            className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#102e60]">
                  {editingId ? "Edit Resource" : "Upload New Resource"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a video or document directly from your device.
                </p>
              </div>

              <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-[#102e60]">
                {editingId ? "EDIT MODE" : "UPLOAD MODE"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* TITLE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Resource Title *
                </label>

                <input
                  required
                  placeholder="e.g. Introduction to React"
                  value={form.title}
                  onChange={(e) =>
                    changeForm("title", e.target.value)
                  }
                  className="w-full rounded-xl border p-3 outline-none focus:border-[#102e60]"
                />
              </div>

              {/* MODULE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Module Name
                </label>

                <input
                  placeholder="e.g. React Hooks"
                  value={form.moduleName}
                  onChange={(e) =>
                    changeForm("moduleName", e.target.value)
                  }
                  className="w-full rounded-xl border p-3 outline-none focus:border-[#102e60]"
                />
              </div>

              {/* RESOURCE TYPE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Resource Type *
                </label>

                <select
                  value={form.type}
                  onChange={(e) => {
                    changeForm("type", e.target.value);
                    setVideoFile(null);
                    setNotesFile(null);
                  }}
                  className="w-full rounded-xl border p-3 outline-none focus:border-[#102e60]"
                >
                  <option value="video">Video Lecture</option>
                  <option value="notes">Notes / PDF</option>
                </select>
              </div>

              {/* ORDER */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Display Order
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.order}
                  onChange={(e) =>
                    changeForm("order", e.target.value)
                  }
                  className="w-full rounded-xl border p-3 outline-none focus:border-[#102e60]"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  rows="3"
                  placeholder="Write a short description..."
                  value={form.description}
                  onChange={(e) =>
                    changeForm("description", e.target.value)
                  }
                  className="w-full rounded-xl border p-3 outline-none focus:border-[#102e60]"
                />
              </div>

              {/* VIDEO UPLOAD */}
              {form.type === "video" && (
                <>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Upload Video *
                    </label>

                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                        onChange={(e) =>
                          setVideoFile(e.target.files?.[0] || null)
                        }
                        className="w-full text-sm"
                        required={!editingId}
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        Supported formats: MP4, WebM, MOV and MKV.
                      </p>

                      {videoFile && (
                        <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                          <p className="font-semibold text-[#102e60]">
                            {videoFile.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      )}

                      {!videoFile && editingId && form.videoUrl && (
                        <p className="mt-3 text-sm text-green-700">
                          Existing video is saved. Select another file to replace it.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Video Duration (Seconds) *
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="e.g. 600"
                      value={form.duration}
                      onChange={(e) =>
                        changeForm("duration", e.target.value)
                      }
                      className="w-full rounded-xl border p-3 outline-none focus:border-[#102e60]"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Enter the total video duration in seconds.
                    </p>
                  </div>
                </>
              )}

              {/* NOTES UPLOAD */}
              {form.type === "notes" && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Upload Notes / PDF *
                  </label>

                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) =>
                        setNotesFile(e.target.files?.[0] || null)
                      }
                      className="w-full text-sm"
                      required={!editingId}
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Supported formats: PDF, DOC and DOCX.
                    </p>

                    {notesFile && (
                      <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                        <p className="font-semibold text-[#102e60]">
                          {notesFile.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {(notesFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    )}

                    {!notesFile && editingId && form.fileUrl && (
                      <p className="mt-3 text-sm text-green-700">
                        Existing notes are saved. Select another file to replace them.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FORM BUTTONS */}
            <div className="flex flex-wrap gap-3 border-t pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#102e60] px-6 py-3 font-semibold text-white transition hover:bg-[#183d79] disabled:opacity-50"
              >
                {saving
                  ? "Uploading..."
                  : editingId
                  ? "Update Resource"
                  : "Upload Resource"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setError("");
                }}
                disabled={saving}
                className="rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* RESOURCES */}
        {!batchId ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
            Select a batch to view its learning resources.
          </div>
        ) : loading ? (
          <div className="py-10 text-center text-slate-500">
            Loading resources...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Stat
                title="Total Resources"
                value={resources.length}
              />

              <Stat
                title="Video Lectures"
                value={videos.length}
              />

              <Stat
                title="Notes / PDFs"
                value={notes.length}
              />
            </div>

            <ResourceList
              title="Video Lectures"
              items={videos}
              formatDuration={formatDuration}
              onEdit={openEdit}
              onDelete={deleteResource}
              onTogglePublish={togglePublish}
            />

            <ResourceList
              title="Notes & PDFs"
              items={notes}
              onEdit={openEdit}
              onDelete={deleteResource}
              onTogglePublish={togglePublish}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <p className="mt-2 text-3xl font-bold text-[#102e60]">
        {value}
      </p>
    </div>
  );
}

function ResourceList({
  title,
  items,
  formatDuration,
  onEdit,
  onDelete,
  onTogglePublish,
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-[#102e60]">
        {title}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          No resources added yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item._id}
              className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">
                  {item.title}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {item.moduleName || "General"} ·{" "}
                  {item.type === "video"
                    ? formatDuration?.(item.duration)
                    : item.fileName || "PDF Notes"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.isPublished
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.isPublished ? "Published" : "Draft"}
                  </span>

                  <span className="text-xs text-slate-400">
                    {item.type === "video" ? "Video" : "Document"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onTogglePublish(item)}
                  className="rounded-lg border px-3 py-2 text-sm transition hover:bg-slate-50"
                >
                  {item.isPublished ? "Unpublish" : "Publish"}
                </button>

                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="rounded-lg border px-3 py-2 text-sm transition hover:bg-slate-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(item._id)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
