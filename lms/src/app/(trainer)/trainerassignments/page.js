
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Download,
  CalendarDays,
  Clock,
  Users,
  BookOpen,
  Eye,
  FileText,
  CheckCircle2,
  Filter,
  Award,
  Send,
  Save,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  instructions: "",
  batchId: "",
  course: "",
  dueDate: "",
  totalMarks: "100",
  attachmentUrl: "",
  allowedSubmissionTypes: ["text", "url"],
  status: "Draft",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
}

function getName(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return (
    value.name ||
    value.fullName ||
    value.title ||
    value.batchName ||
    value.courseName ||
    value.batch ||
    value.user?.name ||
    value.trainer?.name ||
    value.email ||
    value.userId ||
    ""
  );
}

function getBatchName(batch) {
  if (!batch) return "Batch not assigned";

  if (typeof batch === "string") return batch;

  return (
    batch.batch ||
    batch.batchName ||
    batch.name ||
    batch.title ||
    "Batch not assigned"
  );
}

function getCourseId(value) {
  if (!value) return "";

  if (typeof value === "string") return "";

  return value._id || value.id || value.courseId || "";
}

function getCourseName(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return getName(value);
}

function dateOnly(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function getAttachmentUrl(value) {
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const backendUrl = API_URL.replace(/\/api\/?$/, "");

  return `${backendUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

function mapAssignment(item) {
  const batchObject =
    item.batch && typeof item.batch === "object"
      ? item.batch
      : null;

  const courseObject =
    item.course && typeof item.course === "object"
      ? item.course
      : batchObject?.course &&
          typeof batchObject.course === "object"
        ? batchObject.course
        : null;

  const courseName =
    getCourseName(item.course) ||
    getCourseName(batchObject?.course) ||
    "";

  return {
    ...item,
    id: getId(item),

    batchId:
      getId(batchObject) ||
      item.batchId ||
      "",

    batch: getBatchName(batchObject || item.batch),

    courseId: getCourseId(courseObject),

    course: courseName,

    trainer: getName(item.trainer),

    dueDate: dateOnly(item.dueDate),

    totalMarks: Number(item.totalMarks ?? 100),

    attachmentUrl: getAttachmentUrl(item.attachmentUrl),

    instructions: item.instructions || "",

    allowedSubmissionTypes: Array.isArray(
      item.allowedSubmissionTypes
    )
      ? item.allowedSubmissionTypes
      : ["text", "url"],

    status: item.status || "Draft",

    isPublished:
      item.isPublished ??
      item.status === "Published",

    createdAt: dateOnly(item.createdAt),
  };
}

function getList(result, resourceName = "") {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.[resourceName])) {
    return result[resourceName];
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.data?.[resourceName])) {
    return result.data[resourceName];
  }

  if (Array.isArray(result?.data?.items)) {
    return result.data.items;
  }

  return [];
}

function StatusBadge({ status }) {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Draft: "bg-amber-50 text-amber-700",
    Closed: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {subtitle}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dropdownLoading, setDropdownLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewAssignment, setViewAssignment] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [dropdownError, setDropdownError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // AUTHENTICATION HEADERS
  // ==========================================

  const getAuthHeaders = useCallback(() => {
    let token = null;

    if (typeof window !== "undefined") {
      token =
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("appwars_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("appwars_token");
    }

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // ==========================================
  // COMMON API REQUEST
  // Supports JSON and FormData
  // ==========================================

  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

      const headers = {
        ...getAuthHeaders(),
        ...options.headers,
      };

      if (isFormData) {
        // Do not manually set multipart Content-Type.
        // Browser automatically adds the boundary.
        delete headers["Content-Type"];
      } else if (options.body) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            `Request failed with status ${response.status}`
        );
      }

      return result;
    },
    [getAuthHeaders]
  );

  // ==========================================
  // LOAD ASSIGNMENTS
  // ==========================================

  const loadAssignments = useCallback(async () => {
    setPageError("");

    try {
      const result = await apiRequest("/trainer/assignments");

      const assignmentItems = getList(result, "assignments");

      setAssignments(assignmentItems.map(mapAssignment));
    } catch (err) {
      setPageError(
        err.message || "Unable to load assignments."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // ==========================================
  // LOAD TRAINER BATCHES
  // ==========================================

  const loadBatches = useCallback(async () => {
    setDropdownLoading(true);
    setDropdownError("");

    try {
      const result = await apiRequest("/trainer/batches");

      const batchItems = getList(result, "batches");

      const mappedBatches = batchItems
        .map((item) => {
          const course =
            item.course ||
            item.courseId ||
            null;

          return {
            id: getId(item),
            name: getBatchName(item),
            courseId: getCourseId(course),
            courseName: getCourseName(course),
            raw: item,
          };
        })
        .filter((item) => item.id && item.name);

      setBatches(mappedBatches);
    } catch (err) {
      setBatches([]);
      setDropdownError(
        err.message || "Unable to load trainer batches."
      );
    } finally {
      setDropdownLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadAssignments();
    loadBatches();
  }, [loadAssignments, loadBatches]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const publishedCount = assignments.filter(
    (item) => item.status === "Published"
  ).length;

  const draftCount = assignments.filter(
    (item) => item.status === "Draft"
  ).length;

  const closedCount = assignments.filter(
    (item) => item.status === "Closed"
  ).length;

  // ==========================================
  // SELECTED BATCH
  // ==========================================

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === form.batchId),
    [batches, form.batchId]
  );

  const selectedCourseName =
    selectedBatch?.courseName || "";

  // ==========================================
  // FILTER ASSIGNMENTS
  // ==========================================

  const filteredAssignments = assignments.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = [
      item.title,
      item.description,
      item.instructions,
      item.course,
      item.batch,
    ].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );

    const matchesStatus =
      statusFilter === "All" ||
      item.status === statusFilter;

    const matchesBatch =
      batchFilter === "All" ||
      item.batchId === batchFilter;

    return matchesSearch && matchesStatus && matchesBatch;
  });

  // ==========================================
  // OPEN CREATE MODAL
  // ==========================================

  function openCreateModal() {
    setEditingId(null);
    setAttachmentFile(null);

    setForm({
      ...EMPTY_FORM,
      batchId: batches[0]?.id || "",
    });

    setError("");
    setModalOpen(true);
  }

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  function openEditModal(assignment) {
    setEditingId(assignment.id);
    setAttachmentFile(null);

    setForm({
      ...EMPTY_FORM,
      title: assignment.title || "",
      description: assignment.description || "",
      instructions: assignment.instructions || "",
      batchId: assignment.batchId || "",
      course: "",
      dueDate: assignment.dueDate || "",
      totalMarks: String(assignment.totalMarks ?? 100),
      attachmentUrl: assignment.attachmentUrl || "",
      allowedSubmissionTypes: Array.isArray(
        assignment.allowedSubmissionTypes
      )
        ? assignment.allowedSubmissionTypes
        : ["text", "url"],
      status: assignment.status || "Draft",
    });

    setError("");
    setModalOpen(true);
  }

  // ==========================================
  // UPDATE FORM
  // ==========================================

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // ==========================================
  // SELECT PDF
  // ==========================================

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    const isPDF =
      file.type === "application/pdf" &&
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      setAttachmentFile(null);
      setError("Only PDF documents are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAttachmentFile(null);
      setError("PDF file size must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setAttachmentFile(file);
  }

  // ==========================================
  // TOGGLE SUBMISSION TYPE
  // ==========================================

  function toggleSubmissionType(type) {
    setForm((previous) => {
      const selected = previous.allowedSubmissionTypes || [];

      const updated = selected.includes(type)
        ? selected.filter((item) => item !== type)
        : [...selected, type];

      return {
        ...previous,
        allowedSubmissionTypes: updated,
      };
    });
  }

  // ==========================================
  // CREATE / UPDATE ASSIGNMENT
  // ==========================================

  async function saveAssignment(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!form.title.trim() || !form.description.trim()) {
      setError(
        "Please enter the assignment title and description."
      );
      return;
    }

    if (form.title.trim().length < 3) {
      setError(
        "Assignment title must contain at least 3 characters."
      );
      return;
    }

    if (!form.batchId) {
      setError("Please select one of your assigned batches.");
      return;
    }

    if (!form.dueDate) {
      setError("Please select the due date.");
      return;
    }

    if (
      !Number.isFinite(Number(form.totalMarks)) ||
      Number(form.totalMarks) <= 0
    ) {
      setError("Please enter valid total marks.");
      return;
    }

    if (!form.allowedSubmissionTypes.length) {
      setError(
        "Please select at least one submission type."
      );
      return;
    }

    if (attachmentFile) {
      const isPDF =
        attachmentFile.type === "application/pdf" &&
        attachmentFile.name.toLowerCase().endsWith(".pdf");

      if (!isPDF) {
        setError("Only PDF documents are allowed.");
        return;
      }

      if (attachmentFile.size > MAX_FILE_SIZE) {
        setError("PDF file size must not exceed 10 MB.");
        return;
      }
    }

    setSaving(true);

    try {
      const payload = new FormData();

      payload.append("title", form.title.trim());
      payload.append("description", form.description.trim());
      payload.append("instructions", form.instructions.trim());

      // Batch MongoDB ID.
      payload.append("batchId", form.batchId);

      // IMPORTANT:
      // Do not send course ID.
      // Backend validates trainer batch ownership.
      // Course is optional and is not required here.

      payload.append("dueDate", form.dueDate);

      payload.append(
        "totalMarks",
        String(Number(form.totalMarks))
      );

      payload.append(
        "allowedSubmissionTypes",
        JSON.stringify(form.allowedSubmissionTypes)
      );

      payload.append("status", form.status);

      payload.append(
        "isPublished",
        String(form.status === "Published")
      );

      // Actual PDF file.
      if (attachmentFile) {
        payload.append("attachment", attachmentFile);
      }

      const result = editingId
        ? await apiRequest(
            `/trainer/assignments/${editingId}`,
            {
              method: "PATCH",
              body: payload,
            }
          )
        : await apiRequest("/trainer/assignments", {
            method: "POST",
            body: payload,
          });

      const savedItem =
        result.assignment ||
        result.item ||
        (result.data && !Array.isArray(result.data)
          ? result.data
          : null);

      if (savedItem && (savedItem._id || savedItem.id)) {
        const mapped = mapAssignment(savedItem);

        setAssignments((previous) =>
          editingId
            ? previous.map((item) =>
                item.id === editingId ? mapped : item
              )
            : [mapped, ...previous]
        );
      } else {
        await loadAssignments();
      }

      setModalOpen(false);
      setEditingId(null);
      setAttachmentFile(null);
      setForm(EMPTY_FORM);

      setSuccessMessage(
        editingId
          ? "Assignment updated successfully."
          : "Assignment created successfully."
      );
    } catch (err) {
      setError(
        err.message || "Failed to save assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DELETE ASSIGNMENT
  // ==========================================

  async function deleteAssignment(assignment) {
    const confirmed = window.confirm(
      `Delete assignment "${assignment.title}"?`
    );

    if (!confirmed) return;

    setPageError("");
    setDeletingId(assignment.id);

    try {
      await apiRequest(
        `/trainer/assignments/${assignment.id}`,
        {
          method: "DELETE",
        }
      );

      setAssignments((previous) =>
        previous.filter((item) => item.id !== assignment.id)
      );

      if (viewAssignment?.id === assignment.id) {
        setViewAssignment(null);
      }

      setSuccessMessage("Assignment deleted successfully.");
    } catch (err) {
      setPageError(
        err.message || "Failed to delete assignment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================
  // EXPORT CSV
  // ==========================================

  function exportCSV() {
    const headers = [
      "Title",
      "Description",
      "Instructions",
      "Course",
      "Batch",
      "Due Date",
      "Total Marks",
      "Attachment",
      "Allowed Submission Types",
      "Status",
    ];

    const rows = filteredAssignments.map((item) => [
      item.title,
      item.description,
      item.instructions,
      item.course,
      item.batch,
      item.dueDate,
      item.totalMarks,
      item.attachmentUrl,
      (item.allowedSubmissionTypes || []).join("; "),
      item.status,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-trainer-assignments.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // ==========================================
  // RESET FILTERS
  // ==========================================

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setBatchFilter("All");
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <ClipboardList size={17} />
              APPWARS LMS / Trainer
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Assignment Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create assignments for your assigned batches and manage deadlines.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Download size={17} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={dropdownLoading || batches.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#102b53] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              Create Assignment
            </button>
          </div>
        </div>

        {/* ERRORS */}

        {pageError && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{pageError}</span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadAssignments();
              }}
              className="inline-flex shrink-0 items-center gap-2 font-semibold underline"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {dropdownError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load assigned batches
              </p>

              <p className="mt-1">{dropdownError}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Assignments"
            value={assignments.length}
            subtitle="Created by this trainer"
            icon={ClipboardList}
            color="blue"
          />

          <StatCard
            title="Published"
            value={publishedCount}
            subtitle="Available to assigned learners"
            icon={CheckCircle2}
            color="green"
          />

          <StatCard
            title="Drafts"
            value={draftCount}
            subtitle="Not yet published"
            icon={FileText}
            color="amber"
          />

          <StatCard
            title="Closed"
            value={closedCount}
            subtitle="No longer accepting work"
            icon={Clock}
            color="purple"
          />
        </div>

        {/* INFORMATION BANNER */}

        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                <BookOpen size={23} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Trainer assignment workspace
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
                  Create coding tasks, practical exercises, projects, tests,
                  and homework. Assignments can only be created for batches
                  assigned to your trainer account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={dropdownLoading || batches.length === 0}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-50"
            >
              Add New Assignment
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Search and Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assignments, courses, batches..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={batchFilter}
              onChange={(event) => setBatchFilter(event.target.value)}
              className={inputClass}
              aria-label="Filter by batch"
            >
              <option value="All">All batches</option>

              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* ASSIGNMENT LIST */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-gray-900">
                My Assignments
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Showing {filteredAssignments.length} of {assignments.length} assignments
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadAssignments();
              }}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:self-auto"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading assignments from the server...
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAssignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="p-5 transition hover:bg-gray-50/70 sm:p-6"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-bold text-gray-900">
                          {assignment.title}
                        </h3>

                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                          {assignment.description}
                        </p>

                        {assignment.instructions && (
                          <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-gray-500">
                            Instructions: {assignment.instructions}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <BookOpen size={13} />
                            {assignment.course || "Course not assigned"}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            <Users size={13} />
                            {assignment.batch || "Batch not assigned"}
                          </span>

                          <StatusBadge status={assignment.status} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              Due Date
                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-800">
                              <CalendarDays
                                size={14}
                                className="text-gray-400"
                              />
                              {assignment.dueDate || "Not set"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Total Marks
                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                              <Award
                                size={14}
                                className="text-gray-400"
                              />
                              {assignment.totalMarks}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Submission Types
                            </p>

                            <p className="mt-1 text-sm font-medium text-gray-800">
                              {(assignment.allowedSubmissionTypes || [])
                                .map((type) =>
                                  type === "text"
                                    ? "Text"
                                    : type === "url"
                                      ? "URL"
                                      : type
                                )
                                .join(", ") || "Not specified"}
                            </p>
                          </div>
                        </div>

                        {assignment.attachmentUrl && (
                          <a
                            href={assignment.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
                          >
                            <FileText size={14} />
                            View Assignment PDF
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => setViewAssignment(assignment)}
                        title="View assignment"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(assignment)}
                        title="Edit assignment"
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAssignment(assignment)}
                        disabled={deletingId === assignment.id}
                        title="Delete assignment"
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === assignment.id ? (
                          <RefreshCw
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {filteredAssignments.length === 0 && (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                    <ClipboardList size={25} />
                  </div>

                  <h3 className="mt-4 font-semibold text-gray-900">
                    No assignments found
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Try changing the filters or create a new assignment.
                  </p>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    disabled={dropdownLoading || batches.length === 0}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53] disabled:opacity-50"
                  >
                    <Plus size={17} />
                    Create Assignment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================
          CREATE / EDIT MODAL
      ====================================== */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setModalOpen(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Assignment" : "Create Assignment"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Configure assignment instructions, batch, and deadline.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveAssignment}
              className="space-y-5 p-5 sm:p-6"
            >
              {/* TITLE */}

              <FormField label="Assignment Title" required>
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  placeholder="Enter assignment title"
                  className={inputClass}
                />
              </FormField>

              {/* DESCRIPTION */}

              <FormField label="Assignment Description" required>
                <textarea
                  required
                  rows={5}
                  maxLength={10000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe the task and expected deliverables..."
                  className={`${inputClass} resize-y`}
                />
              </FormField>

              {/* INSTRUCTIONS */}

              <FormField label="Instructions">
                <textarea
                  rows={4}
                  maxLength={10000}
                  value={form.instructions}
                  onChange={(event) =>
                    updateForm("instructions", event.target.value)
                  }
                  placeholder="Add detailed instructions for students (optional)"
                  className={`${inputClass} resize-y`}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* BATCH */}

                <FormField label="Assigned Batch" required>
                  <select
                    required
                    value={form.batchId}
                    onChange={(event) =>
                      updateForm("batchId", event.target.value)
                    }
                    className={inputClass}
                    disabled={
                      dropdownLoading || batches.length === 0
                    }
                  >
                    <option value="">
                      {dropdownLoading
                        ? "Loading your batches..."
                        : batches.length === 0
                          ? "No assigned batches available"
                          : "Select batch"}
                    </option>

                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                        {batch.courseName
                          ? ` — ${batch.courseName}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* COURSE */}

                <FormField label="Course">
                  <input
                    value={
                      selectedCourseName ||
                      "Course linked to selected batch"
                    }
                    readOnly
                    className={`${inputClass} bg-gray-50 text-gray-500`}
                  />
                </FormField>

                {/* DUE DATE */}

                <FormField label="Due Date" required>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(event) =>
                      updateForm("dueDate", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                {/* MARKS */}

                <FormField label="Total Marks" required>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100000"
                    value={form.totalMarks}
                    onChange={(event) =>
                      updateForm("totalMarks", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                {/* PDF UPLOAD */}

                <div className="sm:col-span-2">
                  <FormField label="Upload Assignment PDF">
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 transition hover:border-blue-400">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                            <FileText size={24} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              Select assignment document
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              PDF only · Maximum file size 10 MB
                            </p>
                          </div>
                        </div>

                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]">
                          <Plus size={16} />

                          Choose PDF

                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>

                      {/* SELECTED FILE */}

                      {attachmentFile && (
                        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white p-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText
                              className="shrink-0 text-red-600"
                              size={20}
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">
                                {attachmentFile.name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {(
                                  attachmentFile.size /
                                  1024 /
                                  1024
                                ).toFixed(2)} MB
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setAttachmentFile(null)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            aria-label="Remove selected PDF"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      )}

                      {/* EXISTING FILE */}

                      {!attachmentFile && form.attachmentUrl && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white p-3">
                          <div className="flex items-center gap-2 text-sm text-emerald-700">
                            <CheckCircle2 size={18} />
                            Existing PDF attached
                          </div>

                          <a
                            href={form.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-blue-700 hover:underline"
                          >
                            View current PDF
                          </a>
                        </div>
                      )}

                      <p className="mt-3 text-xs text-gray-500">
                        {editingId
                          ? "Choose a new PDF only if you want to replace the existing document. Otherwise, the existing PDF will remain attached."
                          : "Upload the assignment PDF while creating this assignment. You can also create an assignment without a PDF."}
                      </p>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* SUBMISSION TYPES */}

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Allowed Submission Types
                  <span className="ml-1 text-red-500">*</span>
                </p>

                <div className="flex flex-wrap gap-3">
                  {[
                    { value: "text", label: "Text Submission" },
                    { value: "url", label: "URL / GitHub Link" },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.allowedSubmissionTypes.includes(
                          type.value
                        )}
                        onChange={() =>
                          toggleSubmissionType(type.value)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* STATUS */}

              <FormField label="Assignment Status" required>
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="Draft">Save as Draft</option>
                  <option value="Published">Publish Assignment</option>
                  <option value="Closed">Closed</option>
                </select>
              </FormField>

              {/* ERROR */}

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    dropdownLoading ||
                    batches.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : form.status === "Published" ? (
                    <Send size={16} />
                  ) : (
                    <Save size={16} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : form.status === "Published"
                        ? "Publish Assignment"
                        : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================
          VIEW ASSIGNMENT MODAL
      ====================================== */}

      {viewAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewAssignment(null);
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
              <div>
                <div className="mb-3">
                  <StatusBadge status={viewAssignment.status} />
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  {viewAssignment.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewAssignment(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Description
                </h3>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                  {viewAssignment.description}
                </p>
              </div>

              {viewAssignment.instructions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Instructions
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                    {viewAssignment.instructions}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Course", viewAssignment.course || "Not assigned"],
                  ["Batch", viewAssignment.batch || "Not assigned"],
                  ["Due Date", viewAssignment.dueDate || "Not set"],
                  ["Total Marks", viewAssignment.totalMarks],
                  [
                    "Allowed Submission Types",
                    (viewAssignment.allowedSubmissionTypes || []).join(", "),
                  ],
                  ["Status", viewAssignment.status],
                  ["Created At", viewAssignment.createdAt || "Not available"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-gray-50 p-3"
                  >
                    <p className="text-xs text-gray-500">
                      {label}
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {viewAssignment.attachmentUrl && (
                <a
                  href={viewAssignment.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Download size={16} />
                  Open Assignment PDF
                </a>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setViewAssignment(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selected = viewAssignment;

                    setViewAssignment(null);

                    openEditModal(selected);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  <Pencil size={16} />
                  Edit Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
