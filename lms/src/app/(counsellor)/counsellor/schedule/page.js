
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
} from "lucide-react";

// ============================================
// API CONFIGURATION
// ============================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const SCHEDULE_API = `${API_URL}/api/counsellor/schedule`;

// JWT authentication
const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

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

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date) {
  if (!date) return "—";

  const [year, month, day] = date.split("-");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
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
      {status}
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

  const [schedules, setSchedules] = useState([]);

  const [loading, setLoading] = useState(true);
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

  const [form, setForm] = useState(emptyForm);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  // ------------------------------------------
  // FETCH SCHEDULES FROM BACKEND
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
          result.message || "Failed to fetch schedules"
        );
      }

      setSchedules(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      setError(
        err.message || "Unable to load schedules. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ------------------------------------------
  // SUCCESS MESSAGE
  // ------------------------------------------

  function showSuccessMessage(message) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  // ------------------------------------------
  // STATISTICS
  // ------------------------------------------

  const scheduledCount = schedules.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const completedCount = schedules.filter(
    (item) => item.status === "Completed"
  ).length;

  const cancelledCount = schedules.filter(
    (item) => item.status === "Cancelled"
  ).length;

  // ------------------------------------------
  // SEARCH AND FILTER
  // ------------------------------------------

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

  // ------------------------------------------
  // OPEN ADD MODAL
  // ------------------------------------------

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }

  // ------------------------------------------
  // OPEN EDIT MODAL
  // ------------------------------------------

  function openEditModal(schedule) {
    setEditingId(schedule._id);

    setForm({
      title: schedule.title || "",
      batch: schedule.batch || "",
      course: schedule.course || "",
      trainer: schedule.trainer || "",
      date: schedule.date || "",
      startTime: schedule.startTime || "10:00",
      endTime: schedule.endTime || "11:30",
      mode: schedule.mode || "Online",
      meetingLink: schedule.meetingLink || "",
      location: schedule.location || "",
      type: schedule.type || "Lecture",
      status: schedule.status || "Scheduled",
      notes: schedule.notes || "",
    });

    setFormError("");
    setError("");
    setShowModal(true);
  }

  // ------------------------------------------
  // CLOSE MODAL
  // ------------------------------------------

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  // ------------------------------------------
  // FORM INPUT HANDLING
  // ------------------------------------------

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ------------------------------------------
  // VALIDATE FORM
  // ------------------------------------------

  function validateForm() {
    if (
      !form.title.trim() ||
      !form.batch.trim() ||
      !form.course.trim() ||
      !form.trainer.trim() ||
      !form.date ||
      !form.startTime ||
      !form.endTime
    ) {
      setFormError("Please complete all required fields.");
      return false;
    }

    if (form.endTime <= form.startTime) {
      setFormError(
        "End time must be later than start time."
      );
      return false;
    }

    if (form.mode === "Online" && form.meetingLink.trim()) {
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

    return true;
  }

  // ------------------------------------------
  // CREATE / UPDATE SCHEDULE
  // ------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setError("");

    if (!validateForm()) return;

    const normalizedForm = {
      ...form,
      title: form.title.trim(),
      batch: form.batch.trim(),
      course: form.course.trim(),
      trainer: form.trainer.trim(),
      meetingLink: form.meetingLink.trim(),
      location: form.location.trim(),
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
            `Failed to ${isEditing ? "update" : "create"} schedule`
        );
      }

      // Refresh data from MongoDB
      await fetchSchedules();

      closeModal();

      showSuccessMessage(
        isEditing
          ? "Schedule updated successfully."
          : "Schedule created successfully."
      );
    } catch (err) {
      setFormError(
        err.message || "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------
  // DELETE SCHEDULE
  // ------------------------------------------

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
          result.message || "Failed to delete schedule"
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
      setError(
        err.message || "Unable to delete schedule."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ------------------------------------------
  // UPDATE SCHEDULE STATUS
  // ------------------------------------------

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
          result.message || "Failed to update status"
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

  // ------------------------------------------
  // CSV EXPORT
  // ------------------------------------------

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

  // ------------------------------------------
  // RESET FILTERS
  // ------------------------------------------

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setModeFilter("All");
    setDateFilter("");
  }

  // ------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------

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

  // ============================================
  // MAIN UI
  // ============================================

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
              Schedule classes, manage sessions and track batch timings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchSchedules}
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
              className="rounded p-1 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Classes"
            value={schedules.length}
            description="All recorded sessions"
            icon={CalendarDays}
            color="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="Scheduled"
            value={scheduledCount}
            description="Sessions awaiting completion"
            icon={CalendarClock}
            color="bg-indigo-50 text-indigo-700"
          />

          <StatCard
            title="Completed"
            value={completedCount}
            description="Sessions marked complete"
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

        {/* TABS */}

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

        {/* LIST / CALENDAR HEADER */}

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

          <div className="flex gap-2">
            {["List", "Calendar"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  activeTab === tab
                    ? "bg-blue-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab === "List" ? "List View" : "Calendar View"}
              </button>
            ))}
          </div>
        </div>

        {/* LIST VIEW */}

        {activeTab === "List" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-slate-900">
                  Class Schedule
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredSchedules.length} session(s) found
                </p>
              </div>
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
                          {item.title}
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
                        {item.trainer}
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
                              <RefreshCw size={17} className="animate-spin" />
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
                        No classes match your filters. Try changing your
                        search or schedule a new class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW */}

        {activeTab === "Calendar" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-bold text-slate-900">
                Schedule by Date
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Sessions are grouped by date. Use the date filter above
                to focus on a particular day.
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

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId
                      ? "Edit Class Schedule"
                      : "Schedule a New Class"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter the session details below.
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

              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <label className="text-sm font-semibold text-slate-700">
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

                  <label className="text-sm font-semibold text-slate-700">
                    Batch Name *
                    <input
                      required
                      name="batch"
                      value={form.batch}
                      onChange={handleFormChange}
                      className={inputClass}
                      placeholder="e.g. MERN-2026-A"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Course *
                    <input
                      required
                      name="course"
                      value={form.course}
                      onChange={handleFormChange}
                      className={inputClass}
                      placeholder="e.g. MERN Stack Development"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Trainer *
                    <input
                      required
                      name="trainer"
                      value={form.trainer}
                      onChange={handleFormChange}
                      className={inputClass}
                      placeholder="Trainer name"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
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

                  <label className="text-sm font-semibold text-slate-700">
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

                  <label className="text-sm font-semibold text-slate-700">
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

                  <label className="text-sm font-semibold text-slate-700">
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

                  <label className="text-sm font-semibold text-slate-700">
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

                  <label className="text-sm font-semibold text-slate-700">
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

                  {form.mode === "Online" ? (
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
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
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
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

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
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
                </div>

                {/* FORM ERROR */}

                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    <AlertCircle size={17} />
                    {formError}
                  </div>
                )}

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
                    disabled={saving}
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
                    ["Batch", viewSchedule.batch],
                    ["Trainer", viewSchedule.trainer],
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
