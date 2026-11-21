
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Video,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  RefreshCw,
  Search,
  PlayCircle,
  Upload,
  File,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const EMPTY_FORM = {
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
  isPublished: true,
};

const VIDEO_ACCEPT =
  "video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv";

const NOTES_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

const NOTES_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function TrainerLearningResourcesPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [resources, setResources] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingResource, setEditingResource] = useState(null);

  const [videoFile, setVideoFile] = useState(null);
  const [notesFile, setNotesFile] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("video");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // API HELPER
  // --------------------------------------------------

  const getToken = () => {
    if (typeof window === "undefined") return "";

    return (
      localStorage.getItem("appwars_token") ||
      sessionStorage.getItem("token") ||
      ""
    );
  };

  const api = useCallback(async (url, options = {}) => {
    const token = getToken();

    const isFormData =
      typeof FormData !== "undefined" &&
      options.body instanceof FormData;

    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        ...(!isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }, []);

  // --------------------------------------------------
  // LOAD TRAINER BATCHES
  // --------------------------------------------------

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    setLoading(true);
    setError("");

    try {
      const data = await api("/api/trainer/batches");

      const list =
        data.batches ||
        data.assignedBatches ||
        data.data ||
        [];

      setBatches(list);

      if (list.length > 0) {
        setSelectedBatch((current) => {
          const stillExists = list.some(
            (batch) => (batch._id || batch.id) === current
          );

          return stillExists
            ? current
            : list[0]._id || list[0].id;
        });
      } else {
        setSelectedBatch("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // LOAD RESOURCES FOR SELECTED BATCH
  // --------------------------------------------------

  useEffect(() => {
    if (selectedBatch) {
      loadResources(selectedBatch);
    } else {
      setResources([]);
    }
  }, [selectedBatch]);

  async function loadResources(batchId = selectedBatch) {
    if (!batchId) return;

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

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function openAddForm(type = "video") {
    setEditingResource(null);
    setVideoFile(null);
    setNotesFile(null);

    setForm({
      ...EMPTY_FORM,
      batch: selectedBatch,
      type,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(resource) {
    setEditingResource(resource);

    setVideoFile(null);
    setNotesFile(null);

    setForm({
      title: resource.title || "",
      description: resource.description || "",
      batch:
        resource.batch?._id ||
        resource.batch ||
        selectedBatch,
      type: resource.type || "video",
      videoUrl: resource.videoUrl || "",
      duration: resource.duration || "",
      fileUrl: resource.fileUrl || "",
      fileName: resource.fileName || "",
      moduleName: resource.moduleName || "General",
      order: resource.order ?? 0,
      isPublished: resource.isPublished ?? true,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingResource(null);
    setForm({
      ...EMPTY_FORM,
      batch: selectedBatch,
    });

    setVideoFile(null);
    setNotesFile(null);
  }

  function handleVideoChange(e) {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setVideoFile(null);
      return;
    }

    if (
      !VIDEO_TYPES.includes(file.type) &&
      !/\.(mp4|webm|mov|mkv)$/i.test(file.name)
    ) {
      setError("Please select a valid MP4, WebM, MOV or MKV video.");
      e.target.value = "";
      setVideoFile(null);
      return;
    }

    setError("");
    setVideoFile(file);
  }

  function handleNotesChange(e) {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setNotesFile(null);
      return;
    }

    if (
      !NOTES_TYPES.includes(file.type) &&
      !/\.(pdf|doc|docx)$/i.test(file.name)
    ) {
      setError("Please select a valid PDF, DOC or DOCX file.");
      e.target.value = "";
      setNotesFile(null);
      return;
    }

    setError("");
    setNotesFile(file);

    setForm((previous) => ({
      ...previous,
      fileName: file.name,
    }));
  }

  // --------------------------------------------------
  // CREATE / UPDATE
  // --------------------------------------------------

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedBatch) {
      setError("Please select a batch first.");
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter a resource title.");
      return;
    }

    if (form.type === "video") {
      if (!editingResource && !videoFile) {
        setError("Please select a video file.");
        return;
      }

      if (!form.duration || Number(form.duration) <= 0) {
        setError("Please enter a valid video duration in seconds.");
        return;
      }
    }

    if (form.type === "notes") {
      if (!editingResource && !notesFile) {
        setError("Please select a notes file.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("batch", selectedBatch);
      formData.append("type", form.type);
      formData.append(
        "moduleName",
        form.moduleName.trim() || "General"
      );
      formData.append("order", String(Number(form.order) || 0));
      formData.append("isPublished", String(Boolean(form.isPublished)));

      if (form.type === "video") {
        formData.append("duration", String(Number(form.duration)));

        if (videoFile) {
          formData.append("video", videoFile);
        }
      }

      if (form.type === "notes") {
        formData.append(
          "fileName",
          notesFile?.name || form.fileName || ""
        );

        if (notesFile) {
          formData.append("notes", notesFile);
        }
      }

      const isEditing = Boolean(editingResource);

      const url = isEditing
        ? `/api/learning-resources/${editingResource._id}`
        : "/api/learning-resources";

      await api(url, {
        method: isEditing ? "PUT" : "POST",
        body: formData,
      });

      setShowForm(false);
      setEditingResource(null);
      setForm({
        ...EMPTY_FORM,
        batch: selectedBatch,
      });

      setVideoFile(null);
      setNotesFile(null);

      setSuccess(
        isEditing
          ? "Resource updated successfully."
          : "Resource uploaded successfully."
      );

      await loadResources(selectedBatch);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function handleDelete(resource) {
    const confirmed = window.confirm(
      `Delete "${resource.title}"?\n\nThis will permanently delete the resource and its associated student video progress.`
    );

    if (!confirmed) return;

    setDeletingId(resource._id);
    setError("");
    setSuccess("");

    try {
      await api(`/api/learning-resources/${resource._id}`, {
        method: "DELETE",
      });

      setSuccess("Resource deleted successfully.");
      await loadResources(selectedBatch);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // --------------------------------------------------
  // PUBLISH / UNPUBLISH
  // --------------------------------------------------

  async function togglePublish(resource) {
    setError("");
    setSuccess("");

    try {
      await api(`/api/learning-resources/${resource._id}`, {
        method: "PUT",
        body: JSON.stringify({
          isPublished: !resource.isPublished,
        }),
      });

      setSuccess(
        resource.isPublished
          ? "Resource unpublished."
          : "Resource published."
      );

      await loadResources(selectedBatch);
    } catch (err) {
      setError(err.message);
    }
  }

  // --------------------------------------------------
  // FILTERING
  // --------------------------------------------------

  const videos = useMemo(
    () => resources.filter((resource) => resource.type === "video"),
    [resources]
  );

  const notes = useMemo(
    () => resources.filter((resource) => resource.type === "notes"),
    [resources]
  );

  const currentResources =
    activeTab === "video" ? videos : notes;

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return currentResources;

    return currentResources.filter((resource) => {
      return (
        resource.title?.toLowerCase().includes(term) ||
        resource.moduleName?.toLowerCase().includes(term) ||
        resource.description?.toLowerCase().includes(term)
      );
    });
  }, [currentResources, search]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function formatDuration(seconds) {
    const total = Number(seconds) || 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${secs}s`;
  }

  const batchLabel = (batch) =>
    batch.batchName ||
    batch.batch ||
    batch.name ||
    "Unnamed Batch";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen size={20} />
              <span className="text-sm font-semibold">
                TRAINER PORTAL
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold text-[#102e60] md:text-3xl">
              Learning Resources
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage video lectures and notes for your assigned batches.
            </p>
          </div>

          <button
            onClick={() => openAddForm(activeTab)}
            disabled={!selectedBatch}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} />
            Add {activeTab === "video" ? "Lecture" : "Notes"}
          </button>
        </div>

        {/* NOTIFICATIONS */}
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* BATCH SELECTOR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Assigned Batch
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select Batch</option>

              {batches.map((batch) => (
                <option
                  key={batch._id || batch.id}
                  value={batch._id || batch.id}
                >
                  {batchLabel(batch)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadResources(selectedBatch)}
              disabled={!selectedBatch || loading}
              className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Resources"
            value={resources.length}
            icon={<BookOpen size={20} />}
          />

          <StatCard
            title="Video Lectures"
            value={videos.length}
            icon={<Video size={20} />}
          />

          <StatCard
            title="Notes / PDFs"
            value={notes.length}
            icon={<FileText size={20} />}
          />
        </div>

        {/* RESOURCE MANAGEMENT */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* TABS */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab("video");
                setSearch("");
              }}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold ${
                activeTab === "video"
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Video size={17} />
              Video Lectures ({videos.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("notes");
                setSearch("");
              }}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold ${
                activeTab === "notes"
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText size={17} />
              Notes ({notes.length})
            </button>
          </div>

          {/* SEARCH */}
          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-md">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or module..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* RESOURCE LIST */}
          <div className="p-4 md:p-6">
            {!selectedBatch ? (
              <EmptyState
                title="Select a batch"
                message="Choose one of your assigned batches to manage its resources."
              />
            ) : loading ? (
              <div className="flex justify-center py-16">
                <Loader2
                  className="animate-spin text-blue-600"
                  size={28}
                />
              </div>
            ) : filteredResources.length === 0 ? (
              <EmptyState
                title={`No ${activeTab === "video" ? "lectures" : "notes"} found`}
                message="Add your first learning resource to this batch."
              />
            ) : (
              <div className="space-y-3">
                {filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource._id}
                    resource={resource}
                    formatDuration={formatDuration}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onTogglePublish={togglePublish}
                    deleting={deletingId === resource._id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CREATE / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-xl font-bold text-[#102e60]">
                    {editingResource
                      ? "Edit Resource"
                      : "Add Learning Resource"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {editingResource
                      ? "Update your learning resource details."
                      : "Upload a video or document from your device."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4 p-5"
              >

                {/* RESOURCE TYPE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Resource Type
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={Boolean(editingResource) || saving}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          type: "video",
                        }));
                        setVideoFile(null);
                        setNotesFile(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                        form.type === "video"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600"
                      } disabled:cursor-not-allowed`}
                    >
                      <Video size={18} />
                      Video Lecture
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(editingResource) || saving}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          type: "notes",
                        }));
                        setVideoFile(null);
                        setNotesFile(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                        form.type === "notes"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600"
                      } disabled:cursor-not-allowed`}
                    >
                      <FileText size={18} />
                      Notes / PDF
                    </button>
                  </div>

                  {editingResource && (
                    <p className="mt-1 text-xs text-slate-400">
                      Resource type cannot be changed after creation.
                    </p>
                  )}
                </div>

                {/* TITLE */}
                <Field label="Title" required>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    placeholder={
                      form.type === "video"
                        ? "e.g. Introduction to React"
                        : "e.g. React Hooks Notes"
                    }
                    className="input"
                  />
                </Field>

                {/* MODULE */}
                <Field label="Module / Topic">
                  <input
                    name="moduleName"
                    value={form.moduleName}
                    onChange={handleChange}
                    placeholder="e.g. React Fundamentals"
                    className="input"
                  />
                </Field>

                {/* DESCRIPTION */}
                <Field label="Description">
                  <textarea
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Write a short description..."
                    className="input resize-y"
                  />
                </Field>

                {/* ORDER */}
                <Field label="Display Order">
                  <input
                    name="order"
                    type="number"
                    min="0"
                    value={form.order}
                    onChange={handleChange}
                    className="input"
                  />
                </Field>

                {/* VIDEO UPLOAD */}
                {form.type === "video" && (
                  <>
                    <Field
                      label="Upload Video From Device"
                      required={!editingResource}
                    >
                      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                            <Upload size={22} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              Choose video file
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              MP4, WebM, MOV or MKV
                            </p>
                          </div>
                        </div>

                        <input
                          type="file"
                          accept={VIDEO_ACCEPT}
                          onChange={handleVideoChange}
                          required={!editingResource}
                          disabled={saving}
                          className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                        />

                        {videoFile && (
                          <FilePreview file={videoFile} />
                        )}

                        {!videoFile &&
                          editingResource &&
                          form.videoUrl && (
                            <p className="mt-3 text-xs text-emerald-700">
                              Existing video is saved. Select another file to replace it.
                            </p>
                          )}
                      </div>
                    </Field>

                    <Field label="Duration (seconds)" required>
                      <input
                        name="duration"
                        type="number"
                        min="1"
                        value={form.duration}
                        onChange={handleChange}
                        required
                        placeholder="Example: 1800 for 30 minutes"
                        className="input"
                      />

                      {Number(form.duration) > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Video duration: {formatDuration(form.duration)}
                        </p>
                      )}
                    </Field>
                  </>
                )}

                {/* NOTES UPLOAD */}
                {form.type === "notes" && (
                  <>
                    <Field
                      label="Upload Notes / PDF From Device"
                      required={!editingResource}
                    >
                      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                            <FileText size={22} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              Choose notes file
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              PDF, DOC or DOCX
                            </p>
                          </div>
                        </div>

                        <input
                          type="file"
                          accept={NOTES_ACCEPT}
                          onChange={handleNotesChange}
                          required={!editingResource}
                          disabled={saving}
                          className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
                        />

                        {notesFile && (
                          <FilePreview file={notesFile} />
                        )}

                        {!notesFile &&
                          editingResource &&
                          form.fileUrl && (
                            <p className="mt-3 text-xs text-emerald-700">
                              Existing notes are saved. Select another file to replace it.
                            </p>
                          )}
                      </div>
                    </Field>

                    <Field label="File Name">
                      <input
                        name="fileName"
                        value={form.fileName}
                        readOnly
                        placeholder="File name will appear here"
                        className="input bg-slate-50"
                      />
                    </Field>
                  </>
                )}

                {/* PUBLISH */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={form.isPublished}
                    onChange={handleChange}
                    disabled={saving}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Publish resource
                    </p>

                    <p className="text-xs text-slate-500">
                      Published resources are visible to students.
                    </p>
                  </div>
                </label>

                {/* FORM BUTTONS */}
                <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
                  >
                    {saving && (
                      <Loader2 size={16} className="animate-spin" />
                    )}

                    {saving
                      ? "Uploading..."
                      : editingResource
                        ? "Update Resource"
                        : "Upload Resource"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .input:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

// --------------------------------------------------
// FILE PREVIEW
// --------------------------------------------------

function FilePreview({ file }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
        <File size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-700">
          {file.name}
        </p>

        <p className="text-xs text-slate-400">
          {(file.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------
// RESOURCE CARD
// --------------------------------------------------

function ResourceCard({
  resource,
  formatDuration,
  onEdit,
  onDelete,
  onTogglePublish,
  deleting,
}) {
  const isVideo = resource.type === "video";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm lg:flex-row lg:items-center">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          isVideo
            ? "bg-blue-50 text-blue-600"
            : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {isVideo ? <PlayCircle size={23} /> : <FileText size={23} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-800">
            {resource.title}
          </h3>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              resource.isPublished
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {resource.isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {resource.moduleName || "General"}
          {isVideo && resource.duration
            ? ` · ${formatDuration(resource.duration)}`
            : resource.fileName
              ? ` · ${resource.fileName}`
              : ""}
        </p>

        {resource.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
            {resource.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTogglePublish(resource)}
          title={resource.isPublished ? "Unpublish" : "Publish"}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {resource.isPublished ? (
            <EyeOff size={15} />
          ) : (
            <Eye size={15} />
          )}

          {resource.isPublished ? "Unpublish" : "Publish"}
        </button>

        <button
          type="button"
          onClick={() => onEdit(resource)}
          className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
        >
          <Pencil size={15} />
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(resource)}
          disabled={deleting}
          className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}

          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------
// SMALL COMPONENTS
// --------------------------------------------------

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>

        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-3xl font-bold text-[#102e60]">
        {value}
      </p>
    </div>
  );
}

function Alert({ type, message }) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <BookOpen
        className="mx-auto mb-3 text-slate-400"
        size={32}
      />

      <h3 className="font-semibold text-slate-700">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}
