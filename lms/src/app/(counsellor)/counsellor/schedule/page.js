
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Users,
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Video,
  MapPin,
  CircleCheck,
  CircleX,
  CalendarClock,
  ExternalLink,
  Filter,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  UserRound,
  ChevronDown,
} from "lucide-react";

// ============================================
// API CONFIGURATION
// ============================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const BATCH_API = `${API_URL}/api/counsellor/batches`;
const SCHEDULE_API = `${API_URL}/api/counsellor/schedule`;

// ============================================
// AUTHENTICATION
// ============================================

const getAuthHeaders = () => {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json" };
  }

  const token =
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("appwars_token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ============================================
// DEFAULT FORM
// ============================================

const emptyForm = {
  title: "",
  batchId: "",
  batch: "",
  course: "",
  trainer: "",
  date: "",
  startTime: "10:00",
  endTime: "11:30",
  mode: "Online",
  meetingLink: "",
  location: "",
  type: "Lecture",
  status: "Scheduled",
  notes: "",
};

// ============================================
// STYLING
// ============================================

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass = "text-sm font-semibold text-slate-700";

// ============================================
// DATA HELPERS
// ============================================

// Handles different batch name properties.

function getBatchName(batch) {
  if (!batch) return "";

  if (typeof batch === "string") {
    return batch;
  }

  return (
    batch.batch ||
    batch.name ||
    batch.batchName ||
    ""
  );
}

// Handles populated trainer objects.

function getTrainerName(trainer) {
  if (!trainer) return "";

  if (typeof trainer === "string") {
    return trainer;
  }

  return (
    trainer.name ||
    trainer.fullName ||
    trainer.userId ||
    ""
  );
}

function getTrainerId(trainer) {
  if (!trainer || typeof trainer === "string") return "";

  return trainer._id || trainer.id || "";
}

function getCourseName(course) {
  if (!course) return "";

  if (typeof course === "string") return course;

  return course.title || course.name || "";
}

// Convert ISO date into YYYY-MM-DD without timezone shifting.

function toInputDate(date) {
  if (!date) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(date) {
  if (!date) return "—";

  const dateString = toInputDate(date);

  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");

  const months = [
    "Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec",
  ];

  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function formatTime(time) {
  if (!time) return "—";

  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Normalize schedule response before using it in the UI.

function normalizeSchedule(item) {
  return {
    ...item,
    batch: getBatchName(item.batch),
    course: getCourseName(item.course),
    trainer: getTrainerName(item.trainer),
    batchId:
      item.batchId?._id ||
      item.batchId ||
      item.batch?._id ||
      "",
    date: toInputDate(item.date || item.startDate),
    startTime: item.startTime || "10:00",
    endTime: item.endTime || "11:30",
    mode: item.mode || "Online",
    type: item.type || "Lecture",
    status: item.status || "Scheduled",
    meetingLink: item.meetingLink || "",
    location: item.location || "",
    notes: item.notes || item.description || "",
  };
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }) {
  const styles = {
    Scheduled: "bg-blue-50 text-blue-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

// ============================================
// STAT CARD
// ============================================

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BatchSchedulePage() {
  // ------------------------------------------
  // STATES
  // ------------------------------------------

  const [batches, setBatches] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const [activeTab, setActiveTab] = useState("List");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewSchedule, setViewSchedule] = useState(null);

  const [form, setForm] = useState({ ...emptyForm });

  const [error, setError] = useState("");
  const [batchError, setBatchError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  // ------------------------------------------
  // FETCH BATCHES
  // ------------------------------------------

  const fetchBatches = useCallback(async () => {
    try {
      setBatchLoading(true);
      setBatchError("");

      const response = await fetch(BATCH_API, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to fetch batches."
        );
      }

      const batchData = Array.isArray(result.data)
        ? result.data
        : [];

      setBatches(batchData.filter((batch) => batch.isActive !== false));
    } catch (err) {
      setBatchError(
        err.message || "Unable to load batches."
      );
    } finally {
      setBatchLoading(false);
    }
  }, []);

  // ------------------------------------------
  // FETCH SCHEDULES
  // ------------------------------------------

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(SCHEDULE_API, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to fetch schedules."
        );
      }

      const scheduleData = Array.isArray(result.data)
        ? result.data
        : [];

      setSchedules(scheduleData.map(normalizeSchedule));
    } catch (err) {
      setError(
        err.message || "Unable to load schedules."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------
  // INITIAL API CALLS
  // ------------------------------------------

  useEffect(() => {
    fetchBatches();
    fetchSchedules();
  }, [fetchBatches, fetchSchedules]);

  // ------------------------------------------
  // SUCCESS MESSAGE
  // ------------------------------------------

  function showSuccessMessage(message) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  const scheduledCount = schedules.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const completedCount = schedules.filter(
    (item) => item.status === "Completed"
  ).length;

  const cancelledCount = schedules.filter(
    (item) => item.status === "Cancelled"
  ).length;

  const activeBatchCount = batches.length;

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((item) => {
        const query = search.toLowerCase();

        const matchesSearch =
          (item.title || "").toLowerCase().includes(query) ||
          (item.batch || "").toLowerCase().includes(query) ||
          (item.course || "").toLowerCase().includes(query) ||
          (item.trainer || "").toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter;

        const matchesMode =
          modeFilter === "All" ||
          item.mode === modeFilter;

        const matchesDate =
          !dateFilter || item.date === dateFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMode &&
          matchesDate
        );
      })
      .sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(
          `${b.date} ${b.startTime}`
        )
      );
  }, [
    schedules,
    search,
    statusFilter,
    modeFilter,
    dateFilter,
  ]);

  // ==========================================
  // BATCH SELECTION
  // ==========================================

  function handleBatchSelection(event) {
    const batchId = event.target.value;

    const selectedBatch = batches.find(
      (item) => item._id === batchId
    );

    if (!selectedBatch) {
      setForm((previous) => ({
        ...previous,
        batchId: "",
        batch: "",
        course: "",
        trainer: "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,

      // Automatically populated from backend.
      batchId: selectedBatch._id,

      batch: getBatchName(selectedBatch),

      course: getCourseName(selectedBatch.course),

      trainer: getTrainerName(selectedBatch.trainer),
    }));
  }

  // ==========================================
  // OPEN ADD MODAL
  // ==========================================

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setError("");
    setShowModal(true);
  }

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  function openEditModal(schedule) {
    const normalized = normalizeSchedule(schedule);

    // Find the associated batch using its ID or name.
    const selectedBatch = batches.find(
      (batch) =>
        batch._id === normalized.batchId ||
        getBatchName(batch) === normalized.batch
    );

    setEditingId(schedule._id);

    setForm({
      ...emptyForm,

      title: normalized.title || "",

      batchId: selectedBatch?._id || normalized.batchId || "",

      batch: normalized.batch || "",

      course:
        normalized.course ||
        getCourseName(selectedBatch?.course),

      trainer:
        normalized.trainer ||
        getTrainerName(selectedBatch?.trainer),

      date: normalized.date,

      startTime: normalized.startTime,
      endTime: normalized.endTime,

      mode: normalized.mode,

      meetingLink: normalized.meetingLink,
      location: normalized.location,

      type: normalized.type,
      status: normalized.status,
      notes: normalized.notes,
    });

    setFormError("");
    setError("");
    setShowModal(true);
  }

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  // ==========================================
  // FORM INPUT HANDLING
  // ==========================================

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ==========================================
  // FORM VALIDATION
  // ==========================================

  function validateForm() {
    if (
      !form.title.trim() ||
      !form.batchId ||
      !form.batch.trim() ||
      !form.course.trim() ||
      !form.trainer.trim() ||
      !form.date ||
      !form.startTime ||
      !form.endTime
    ) {
      setFormError(
        "Please select a batch and complete all required fields."
      );

      return false;
    }

    if (form.endTime <= form.startTime) {
      setFormError(
        "End time must be later than start time."
      );

      return false;
    }

    if (form.mode === "Online") {
      if (form.meetingLink.trim()) {
        try {
          const url = new URL(form.meetingLink.trim());

          if (!["http:", "https:"].includes(url.protocol)) {
            setFormError("Please enter a valid meeting URL.");
            return false;
          }
        } catch {
          setFormError("Please enter a valid meeting URL.");
          return false;
        }
      }
    }

    return true;
  }

  // ==========================================
  // CREATE / UPDATE SCHEDULE
  // ==========================================

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setError("");

    if (!validateForm()) return;

    const selectedBatch = batches.find(
      (item) => item._id === form.batchId
    );

    // Always use the latest batch details from the API.
    if (!selectedBatch) {
      setFormError(
        "Selected batch is no longer available. Please select again."
      );

      return;
    }

    const normalizedForm = {
      title: form.title.trim(),

      batchId: selectedBatch._id,

      batch: getBatchName(selectedBatch),

      course: getCourseName(selectedBatch.course),

      trainer: getTrainerName(selectedBatch.trainer),

      date: form.date,

      startTime: form.startTime,
      endTime: form.endTime,

      mode: form.mode,

      meetingLink:
        form.mode === "Online"
          ? form.meetingLink.trim()
          : "",

      location:
        form.mode === "Offline"
          ? form.location.trim()
          : "",

      type: form.type,
      status: form.status,

      notes: form.notes.trim(),
    };

    try {
      setSaving(true);

      const isEditing = Boolean(editingId);

      const url = isEditing
        ? `${SCHEDULE_API}/${editingId}`
        : SCHEDULE_API;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(normalizedForm),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to ${isEditing ? "update" : "create"} schedule.`
        );
      }

      await fetchSchedules();

      closeModal();

      showSuccessMessage(
        isEditing
          ? "Schedule updated successfully."
          : "Class scheduled successfully."
      );
    } catch (err) {
      setFormError(
        err.message || "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DELETE SCHEDULE
  // ==========================================

  async function deleteSchedule(id) {
    if (!window.confirm("Delete this schedule permanently?")) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");

      const response = await fetch(
        `${SCHEDULE_API}/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to delete schedule."
        );
      }

      setSchedules((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (viewSchedule?._id === id) {
        setViewSchedule(null);
      }

      showSuccessMessage("Schedule deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete schedule.");
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================
  // UPDATE SCHEDULE STATUS
  // ==========================================

  async function updateStatus(schedule, status) {
    try {
      setUpdatingId(schedule._id);
      setError("");

      const response = await fetch(
        `${SCHEDULE_API}/${schedule._id}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to update status."
        );
      }

      const updatedStatus = result.data?.status || status;

      setSchedules((previous) =>
        previous.map((item) =>
          item._id === schedule._id
            ? { ...item, status: updatedStatus }
            : item
        )
      );

      setViewSchedule((previous) =>
        previous?._id === schedule._id
          ? { ...previous, status: updatedStatus }
          : previous
      );

      showSuccessMessage(
        `Schedule marked as ${updatedStatus}.`
      );
    } catch (err) {
      setError(
        err.message || "Unable to update schedule status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // ==========================================
  // CSV EXPORT
  // ==========================================

  function exportCSV() {
    if (filteredSchedules.length === 0) {
      alert("No schedules available to export.");
      return;
    }

    const headers = [
      "Class",
      "Batch",
      "Course",
      "Trainer",
      "Date",
      "Start Time",
      "End Time",
      "Mode",
      "Type",
      "Status",
      "Location",
      "Meeting Link",
      "Notes",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredSchedules.map((item) => [
      item.title,
      item.batch,
      item.course,
      item.trainer,
      item.date,
      item.startTime,
      item.endTime,
      item.mode,
      item.type,
      item.status,
      item.location,
      item.meetingLink,
      item.notes,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      })
    );

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "appwars-batch-schedule.csv";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ==========================================
  // RESET FILTERS
  // ==========================================

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setModeFilter("All");
    setDateFilter("");
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50">
        <RefreshCw
          size={35}
          className="animate-spin text-blue-700"
        />

        <p className="mt-4 text-sm font-medium text-slate-600">
          Loading batch schedules...
        </p>
      </div>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADING */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <CalendarDays size={17} />
              Counsellor Portal / Schedule
            </div>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Batch Schedule
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Select an existing batch and schedule its classes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                fetchBatches();
                fetchSchedules();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              <Plus size={18} />
              Schedule a Class
            </button>
          </div>
        </div>

        {/* SUCCESS MESSAGE */}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            <CircleCheck size={18} />
            {success}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>

            <button
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded p-1 hover:bg-red-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* BATCH API ERROR */}

        {batchError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              Batch API: {batchError}
            </div>

            <button
              onClick={fetchBatches}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Batches"
            value={activeBatchCount}
            description="Available batches"
            icon={GraduationCap}
            color="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="Total Classes"
            value={schedules.length}
            description="All recorded sessions"
            icon={CalendarDays}
            color="bg-indigo-50 text-indigo-700"
          />

          <StatCard
            title="Scheduled"
            value={scheduledCount}
            description="Awaiting completion"
            icon={CalendarClock}
            color="bg-sky-50 text-sky-700"
          />

          <StatCard
            title="Completed"
            value={completedCount}
            description="Completed sessions"
            icon={CircleCheck}
            color="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Cancelled"
            value={cancelledCount}
            description="Cancelled sessions"
            icon={CircleX}
            color="bg-red-50 text-red-700"
          />
        </div>

        {/* VIEW TABS */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex gap-2">
            {["List", "Calendar"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-blue-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab === "List" ? "List View" : "Calendar View"}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>

        {/* FILTERS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
            <Filter size={17} />
            Search and Filter Classes
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search
                size={18}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search class, batch, course or trainer..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className={inputClass}
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={modeFilter}
              onChange={(event) =>
                setModeFilter(event.target.value)
              }
              className={inputClass}
            >
              <option value="All">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value)
              }
              className={inputClass}
              aria-label="Filter by class date"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* SCHEDULE COUNT */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {filteredSchedules.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {schedules.length}
            </span>{" "}
            schedules
          </p>
        </div>

        {/* ======================================
            LIST VIEW
        ====================================== */}

        {activeTab === "List" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">
                Class Schedule
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredSchedules.length} session(s) found
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Class Details</th>
                    <th className="px-5 py-4">Batch / Course</th>
                    <th className="px-5 py-4">Date & Time</th>
                    <th className="px-5 py-4">Trainer</th>
                    <th className="px-5 py-4">Mode</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewSchedule(item)}
                          className="text-left font-semibold text-blue-800 hover:underline"
                        >
                          {item.title || "Untitled Class"}
                        </button>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.type}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {item.batch}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.course}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {formatDate(item.date)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(item.startTime)} –{" "}
                          {formatTime(item.endTime)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {item.trainer || "Not Assigned"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          {item.mode === "Online" ? (
                            <Video size={15} />
                          ) : (
                            <MapPin size={15} />
                          )}

                          {item.mode}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewSchedule(item)}
                            title="View details"
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <BookOpen size={17} />
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit schedule"
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => deleteSchedule(item._id)}
                            disabled={deletingId === item._id}
                            title="Delete schedule"
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === item._id ? (
                              <RefreshCw
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredSchedules.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No classes match your filters.
                        Schedule a new class to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================
            CALENDAR VIEW
        ====================================== */}

        {activeTab === "Calendar" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-bold text-slate-900">
                Schedule by Date
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Sessions are grouped by their scheduled date.
              </p>
            </div>

            {filteredSchedules.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No scheduled sessions found.
              </p>
            ) : (
              <div className="space-y-6">
                {[...new Set(filteredSchedules.map((item) => item.date))]
                  .sort()
                  .map((date) => (
                    <div key={date}>
                      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <CalendarDays
                          size={18}
                          className="text-blue-700"
                        />

                        <h3 className="font-bold text-slate-800">
                          {formatDate(date)}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {filteredSchedules
                          .filter((item) => item.date === date)
                          .map((item) => (
                            <div
                              key={item._id}
                              className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                            >
                              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {item.title}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {item.batch} · {item.course}
                                  </p>
                                </div>

                                <StatusBadge status={item.status} />
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                <p className="flex items-center gap-2">
                                  <Clock3
                                    size={16}
                                    className="text-blue-700"
                                  />

                                  {formatTime(item.startTime)} –{" "}
                                  {formatTime(item.endTime)}
                                </p>

                                <p className="flex items-center gap-2">
                                  <Users
                                    size={16}
                                    className="text-blue-700"
                                  />

                                  {item.trainer}
                                </p>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  onClick={() => setViewSchedule(item)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  View
                                </button>

                                <button
                                  onClick={() => openEditModal(item)}
                                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================
            ADD / EDIT MODAL
        ====================================== */}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId
                      ? "Edit Class Schedule"
                      : "Schedule a New Class"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a batch to automatically fill course and trainer.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                {/* BATCH SELECTION */}

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <GraduationCap
                      size={20}
                      className="text-blue-700"
                    />

                    <h3 className="font-bold text-slate-800">
                      Select Existing Batch
                    </h3>
                  </div>

                  <label className={labelClass}>
                    Batch Name *

                    <div className="relative">
                      <select
                        required
                        name="batchId"
                        value={form.batchId}
                        onChange={handleBatchSelection}
                        disabled={batchLoading}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        <option value="">
                          {batchLoading
                            ? "Loading batches..."
                            : batches.length === 0
                            ? "No batches available"
                            : "Select a batch"}
                        </option>

                        {batches.map((batch) => (
                          <option
                            key={batch._id}
                            value={batch._id}
                          >
                            {getBatchName(batch)}
                            {" — "}
                            {getCourseName(batch.course)}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={17}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </label>

                  {!batchLoading && batches.length === 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      No batches found. Please create a batch first.
                    </p>
                  )}

                  {/* AUTO POPULATED DETAILS */}

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <BookOpen size={15} />
                        Course
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {form.course || "Select a batch"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <UserRound size={15} />
                        Assigned Trainer
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {form.trainer || "Select a batch"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-blue-700">
                    Course and trainer are automatically populated
                    from Batch Management.
                  </p>
                </div>

                {/* CLASS INFORMATION */}

                <div>
                  <h3 className="mb-3 font-bold text-slate-800">
                    Class Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <label className={labelClass}>
                      Class Title *

                      <input
                        required
                        name="title"
                        value={form.title}
                        onChange={handleFormChange}
                        className={inputClass}
                        placeholder="e.g. React Hooks"
                      />
                    </label>

                    <label className={labelClass}>
                      Class Type

                      <select
                        name="type"
                        value={form.type}
                        onChange={handleFormChange}
                        className={inputClass}
                      >
                        <option>Lecture</option>
                        <option>Practical</option>
                        <option>Workshop</option>
                        <option>Assessment</option>
                        <option>Doubt Session</option>
                      </select>
                    </label>

                    <label className={labelClass}>
                      Class Date *

                      <input
                        required
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleFormChange}
                        className={inputClass}
                      />
                    </label>

                    <label className={labelClass}>
                      Status

                      <select
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                        className={inputClass}
                      >
                        <option>Scheduled</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </label>

                    <label className={labelClass}>
                      Start Time *

                      <input
                        required
                        type="time"
                        name="startTime"
                        value={form.startTime}
                        onChange={handleFormChange}
                        className={inputClass}
                      />
                    </label>

                    <label className={labelClass}>
                      End Time *

                      <input
                        required
                        type="time"
                        name="endTime"
                        value={form.endTime}
                        onChange={handleFormChange}
                        className={inputClass}
                      />
                    </label>

                    <label className={labelClass}>
                      Class Mode

                      <select
                        name="mode"
                        value={form.mode}
                        onChange={(event) => {
                          const mode = event.target.value;

                          setForm((previous) => ({
                            ...previous,
                            mode,
                            location:
                              mode === "Online"
                                ? ""
                                : previous.location,
                            meetingLink:
                              mode === "Offline"
                                ? ""
                                : previous.meetingLink,
                          }));
                        }}
                        className={inputClass}
                      >
                        <option>Online</option>
                        <option>Offline</option>
                      </select>
                    </label>

                  </div>
                </div>

                {/* MODE DETAILS */}

                <div>
                  <h3 className="mb-3 font-bold text-slate-800">
                    Class Location
                  </h3>

                  {form.mode === "Online" ? (
                    <label className={labelClass}>
                      Meeting Link

                      <input
                        type="url"
                        name="meetingLink"
                        value={form.meetingLink}
                        onChange={handleFormChange}
                        className={inputClass}
                        placeholder="https://meet.google.com/..."
                      />
                    </label>
                  ) : (
                    <label className={labelClass}>
                      Classroom / Location

                      <input
                        name="location"
                        value={form.location}
                        onChange={handleFormChange}
                        className={inputClass}
                        placeholder="e.g. Computer Lab 1"
                      />
                    </label>
                  )}
                </div>

                {/* NOTES */}

                <label className={labelClass}>
                  Session Notes

                  <textarea
                    rows={3}
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    className={inputClass}
                    placeholder="Topics, instructions or preparation details..."
                  />
                </label>

                {/* FORM ERROR */}

                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    <AlertCircle size={17} />
                    {formError}
                  </div>
                )}

                {/* FORM BUTTONS */}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || batchLoading || batches.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    )}

                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Create Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================
            VIEW DETAILS MODAL
        ====================================== */}

        {viewSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Class Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review the session information.
                  </p>
                </div>

                <button
                  onClick={() => setViewSchedule(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-5">

                <div>
                  <StatusBadge status={viewSchedule.status} />

                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    {viewSchedule.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {viewSchedule.course}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ["Batch", getBatchName(viewSchedule.batch)],
                    ["Trainer", getTrainerName(viewSchedule.trainer)],
                    ["Date", formatDate(viewSchedule.date)],
                    [
                      "Time",
                      `${formatTime(viewSchedule.startTime)} – ${formatTime(viewSchedule.endTime)}`,
                    ],
                    ["Type", viewSchedule.type],
                    ["Mode", viewSchedule.mode],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-50 p-3"
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {label}
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {viewSchedule.mode === "Online" &&
                  viewSchedule.meetingLink && (
                    <a
                      href={viewSchedule.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                    >
                      <Video size={17} />
                      Open Meeting Link
                      <ExternalLink size={14} />
                    </a>
                  )}

                {viewSchedule.mode === "Offline" &&
                  viewSchedule.location && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={17} />
                      {viewSchedule.location}
                    </p>
                  )}

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">
                    Session Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {viewSchedule.notes || "No notes added."}
                  </p>
                </div>

                {/* STATUS ACTIONS */}

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {viewSchedule.status !== "Completed" && (
                    <button
                      disabled={updatingId === viewSchedule._id}
                      onClick={() =>
                        updateStatus(viewSchedule, "Completed")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CircleCheck size={16} />
                      Mark Completed
                    </button>
                  )}

                  {viewSchedule.status !== "Cancelled" && (
                    <button
                      disabled={updatingId === viewSchedule._id}
                      onClick={() => {
                        if (window.confirm("Cancel this class?")) {
                          updateStatus(viewSchedule, "Cancelled");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <CircleX size={16} />
                      Cancel Class
                    </button>
                  )}

                  {viewSchedule.status !== "Scheduled" && (
                    <button
                      disabled={updatingId === viewSchedule._id}
                      onClick={() =>
                        updateStatus(viewSchedule, "Scheduled")
                      }
                      className="rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      Restore Schedule
                    </button>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    onClick={() => {
                      const selected = viewSchedule;

                      setViewSchedule(null);
                      openEditModal(selected);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    <Pencil size={16} />
                    Edit Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
