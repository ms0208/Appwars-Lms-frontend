
"use client";

import { useState } from "react";
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
} from "lucide-react";

const initialSchedules = [
  {
    id: 1,
    title: "React.js Fundamentals",
    batch: "MERN-2026-A",
    course: "MERN Stack Development",
    trainer: "Rahul Sharma",
    date: "2026-10-25",
    startTime: "10:00",
    endTime: "11:30",
    mode: "Online",
    meetingLink: "https://meet.google.com/",
    location: "",
    type: "Lecture",
    status: "Scheduled",
    notes: "Components, props and state",
  },
  {
    id: 2,
    title: "Node.js and Express",
    batch: "MERN-2026-A",
    course: "MERN Stack Development",
    trainer: "Amit Verma",
    date: "2026-10-26",
    startTime: "14:00",
    endTime: "15:30",
    mode: "Online",
    meetingLink: "https://meet.google.com/",
    location: "",
    type: "Lecture",
    status: "Scheduled",
    notes: "Express routes and middleware",
  },
  {
    id: 3,
    title: "MongoDB Practical",
    batch: "MERN-2026-B",
    course: "MERN Stack Development",
    trainer: "Neha Singh",
    date: "2026-10-27",
    startTime: "11:00",
    endTime: "12:30",
    mode: "Offline",
    meetingLink: "",
    location: "Training Room 2",
    type: "Practical",
    status: "Scheduled",
    notes: "CRUD operations and aggregation",
  },
  {
    id: 4,
    title: "JavaScript Assessment",
    batch: "MERN-2026-B",
    course: "MERN Stack Development",
    trainer: "Rahul Sharma",
    date: "2026-10-28",
    startTime: "16:00",
    endTime: "17:00",
    mode: "Online",
    meetingLink: "https://meet.google.com/",
    location: "",
    type: "Assessment",
    status: "Scheduled",
    notes: "JavaScript fundamentals test",
  },
  {
    id: 5,
    title: "Git and GitHub Workshop",
    batch: "FULLSTACK-2026",
    course: "Full Stack Development",
    trainer: "Amit Verma",
    date: "2026-10-29",
    startTime: "10:00",
    endTime: "12:00",
    mode: "Offline",
    meetingLink: "",
    location: "Computer Lab 1",
    type: "Workshop",
    status: "Completed",
    notes: "Branching and collaboration",
  },
];

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

function formatDate(date) {
  if (!date) return "—";

  const [year, month, day] = date.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{value}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

export default function BatchSchedulePage() {
  const [schedules, setSchedules] = useState(initialSchedules);
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

  const scheduledCount = schedules.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const completedCount = schedules.filter(
    (item) => item.status === "Completed"
  ).length;

  const cancelledCount = schedules.filter(
    (item) => item.status === "Cancelled"
  ).length;

  const filteredSchedules = schedules
    .filter((item) => {
      const query = search.toLowerCase();

      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.batch.toLowerCase().includes(query) ||
        item.course.toLowerCase().includes(query) ||
        item.trainer.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesMode = modeFilter === "All" || item.mode === modeFilter;

      const matchesDate = !dateFilter || item.date === dateFilter;

      return matchesSearch && matchesStatus && matchesMode && matchesDate;
    })
    .sort((a, b) =>
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    );

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  }

  function openEditModal(schedule) {
    setEditingId(schedule.id);
    setForm({ ...schedule });
    setError("");
    setShowModal(true);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !form.title.trim() ||
      !form.batch.trim() ||
      !form.course.trim() ||
      !form.trainer.trim() ||
      !form.date
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.endTime <= form.startTime) {
      setError("End time must be later than start time.");
      return;
    }

    if (form.mode === "Online" && form.meetingLink.trim()) {
      try {
        const url = new URL(form.meetingLink);

        if (!["http:", "https:"].includes(url.protocol)) {
          setError("Please enter a valid meeting URL.");
          return;
        }
      } catch {
        setError("Please enter a valid meeting URL.");
        return;
      }
    }

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

    if (editingId !== null) {
      setSchedules((previous) =>
        previous.map((item) =>
          item.id === editingId ? { ...item, ...normalizedForm } : item
        )
      );
    } else {
      setSchedules((previous) => [
        ...previous,
        { ...normalizedForm, id: Date.now() },
      ]);
    }

    setShowModal(false);
    setForm({ ...emptyForm });
    setEditingId(null);
  }

  function deleteSchedule(id) {
    if (!window.confirm("Delete this schedule permanently?")) return;

    setSchedules((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (viewSchedule?.id === id) setViewSchedule(null);
  }

  function updateStatus(schedule, status) {
    setSchedules((previous) =>
      previous.map((item) =>
        item.id === schedule.id ? { ...item, status } : item
      )
    );

    setViewSchedule((previous) =>
      previous?.id === schedule.id ? { ...previous, status } : previous
    );
  }

  function exportCSV() {
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
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "appwars-batch-schedule.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setModeFilter("All");
    setDateFilter("");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
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

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Plus size={18} />
            Schedule a Class
          </button>
        </div>

        {/* Summary cards */}
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

        {/* Tabs */}
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

        {/* Filters */}
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
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
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

        {/* List view */}
        {activeTab === "List" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-slate-900">Class Schedule</h2>
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
                    <tr key={item.id} className="hover:bg-slate-50">
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
                          {formatTime(item.startTime)} – {formatTime(item.endTime)}
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
                            onClick={() => deleteSchedule(item.id)}
                            title="Delete schedule"
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={17} />
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
                        No classes match your filters. Try changing your search
                        or schedule a new class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar-style grouped view */}
        {activeTab === "Calendar" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-bold text-slate-900">Schedule by Date</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sessions are grouped by date. Use the date filter above to
                focus on a particular day.
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
                        <CalendarDays size={18} className="text-blue-700" />
                        <h3 className="font-bold text-slate-800">
                          {formatDate(date)}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {filteredSchedules
                          .filter((item) => item.date === date)
                          .map((item) => (
                            <div
                              key={item.id}
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
                                  <Clock3 size={16} className="text-blue-700" />
                                  {formatTime(item.startTime)} – {formatTime(item.endTime)}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Users size={16} className="text-blue-700" />
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

        {/* Add/Edit modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId !== null ? "Edit Class Schedule" : "Schedule a New Class"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the session details below.
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Class Title *
                    <input
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. React Hooks"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Batch Name *
                    <input
                      required
                      value={form.batch}
                      onChange={(e) => setForm({ ...form, batch: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. MERN-2026-A"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Course *
                    <input
                      required
                      value={form.course}
                      onChange={(e) => setForm({ ...form, course: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. MERN Stack Development"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Trainer *
                    <input
                      required
                      value={form.trainer}
                      onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                      className={inputClass}
                      placeholder="Trainer name"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Class Date *
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Class Type
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    End Time *
                    <input
                      required
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Class Mode
                    <select
                      value={form.mode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mode: e.target.value,
                          location: e.target.value === "Online" ? "" : form.location,
                          meetingLink: e.target.value === "Offline" ? "" : form.meetingLink,
                        })
                      }
                      className={inputClass}
                    >
                      <option>Online</option>
                      <option>Offline</option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Status
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
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
                        value={form.meetingLink}
                        onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                        className={inputClass}
                        placeholder="https://meet.google.com/..."
                      />
                    </label>
                  ) : (
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Classroom / Location
                      <input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Computer Lab 1"
                      />
                    </label>
                  )}

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Session Notes
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className={inputClass}
                      placeholder="Topics, instructions or preparation details..."
                    />
                  </label>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    {editingId !== null ? "Save Changes" : "Create Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View details modal */}
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
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {viewSchedule.mode === "Online" && viewSchedule.meetingLink && (
                  <a
                    href={viewSchedule.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    <Video size={17} />
                    Open Meeting Link
                    <ExternalLink size={14} />
                  </a>
                )}

                {viewSchedule.mode === "Offline" && viewSchedule.location && (
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

                {viewSchedule.status === "Scheduled" && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => updateStatus(viewSchedule, "Completed")}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <CircleCheck size={16} />
                      Mark Completed
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("Cancel this class?")) {
                          updateStatus(viewSchedule, "Cancelled");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <CircleX size={16} />
                      Cancel Class
                    </button>
                  </div>
                )}

                {viewSchedule.status === "Cancelled" && (
                  <button
                    onClick={() => updateStatus(viewSchedule, "Scheduled")}
                    className="rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Restore Schedule
                  </button>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    onClick={() => {
                      setViewSchedule(null);
                      openEditModal(viewSchedule);
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
