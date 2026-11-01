
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageCircleQuestion,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Send,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserRound,
  CalendarDays,
  Filter,
  MessageSquare,
  LoaderCircle,
  ChevronDown,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const DOUBTS_ENDPOINT = `${API_URL}/admin/doubts`;

const STATUS_OPTIONS = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const TRAINERS = [
  "Unassigned",
  "Manav Sharma",
  "Ravi Kumar",
  "Priya Singh",
];

function getAuthHeaders() {
  let token = "";

  if (typeof window !== "undefined") {
    token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      "";
  }

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
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
}

function normalizeDoubt(item) {
  return {
    ...item,
    id: String(item._id || item.id || item.doubtId || ""),
    student:
      item.student?.name ||
      item.studentName ||
      (typeof item.student === "string" ? item.student : "") ||
      "Unknown Student",
    email:
      item.student?.email ||
      item.email ||
      item.studentEmail ||
      "",
    subject: item.subject || item.title || "Untitled Doubt",
    description: item.description || item.message || item.question || "",
    course: item.course?.name || item.courseName ||
      (typeof item.course === "string" ? item.course : "") ||
      "General",
    status: item.status || "Open",
    priority: item.priority || "Medium",
    assignedTo:
      item.assignedTo?.name ||
      (typeof item.assignedTo === "string" ? item.assignedTo : "") ||
      "Unassigned",
    createdAt: item.createdAt || item.date || null,
    replies: Array.isArray(item.replies)
      ? item.replies.map((reply) => ({
          ...reply,
          message: reply.message || reply.text || "",
          sender:
            reply.sender?.name ||
            reply.senderName ||
            (typeof reply.sender === "string" ? reply.sender : "") ||
            "User",
          createdAt: reply.createdAt || reply.date || null,
        }))
      : [],
  };
}

function extractDoubts(result) {
  const list =
    result?.doubts ??
    result?.data?.doubts ??
    result?.data?.data ??
    result?.data ??
    result?.results ??
    result;

  if (Array.isArray(list)) {
    return list.map(normalizeDoubt);
  }

  return [];
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClasses(status) {
  switch (status) {
    case "Resolved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "In Progress":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "Closed":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
}

function priorityClasses(priority) {
  switch (priority) {
    case "Urgent":
      return "bg-red-50 text-red-700";
    case "High":
      return "bg-orange-50 text-orange-700";
    case "Low":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-yellow-50 text-yellow-700";
  }
}

const EMPTY_FORM = {
  student: "",
  email: "",
  subject: "",
  description: "",
  course: "",
  priority: "Medium",
  assignedTo: "Unassigned",
};

export default function DoubtsManagementPage() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [selectedDoubtId, setSelectedDoubtId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [replyText, setReplyText] = useState("");

  const fetchDoubts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest(DOUBTS_ENDPOINT);
      setDoubts(extractDoubts(result));
    } catch (err) {
      setError(err.message || "Unable to load doubts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoubts();
  }, [fetchDoubts]);

  const filteredDoubts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return doubts.filter((doubt) => {
      const matchesSearch =
        !query ||
        [
          doubt.student,
          doubt.email,
          doubt.subject,
          doubt.description,
          doubt.course,
          doubt.id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "All" || doubt.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || doubt.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [doubts, search, statusFilter, priorityFilter]);

  const selectedDoubt = doubts.find(
    (doubt) => doubt.id === selectedDoubtId
  );

  const stats = useMemo(
    () => ({
      total: doubts.length,
      open: doubts.filter((d) => d.status === "Open").length,
      inProgress: doubts.filter((d) => d.status === "In Progress").length,
      resolved: doubts.filter((d) => d.status === "Resolved").length,
    }),
    [doubts]
  );

  function showSuccess(message) {
    setSuccess(message);
    setError("");

    setTimeout(() => {
      setSuccess("");
    }, 3500);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveDoubt(event) {
    event.preventDefault();

    if (
      !form.student.trim() ||
      !form.subject.trim() ||
      !form.description.trim()
    ) {
      setError("Student name, subject, and description are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        studentName: form.student.trim(),
        student: form.student.trim(),
        email: form.email.trim(),
        studentEmail: form.email.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        courseName: form.course.trim(),
        course: form.course.trim(),
        priority: form.priority,
        assignedTo:
          form.assignedTo === "Unassigned" ? "" : form.assignedTo,
        status: "Open",
      };

      const result = await apiRequest(DOUBTS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const created =
        result?.doubt ||
        result?.data?.doubt ||
        (result?.data && !Array.isArray(result.data)
          ? result.data
          : null);

      if (created && (created._id || created.id)) {
        const normalized = normalizeDoubt(created);

        setDoubts((previous) => [
          normalized,
          ...previous.filter((item) => item.id !== normalized.id),
        ]);
      } else {
        await fetchDoubts();
      }

      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      showSuccess("Doubt created successfully.");
    } catch (err) {
      setError(err.message || "Failed to create doubt.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(doubt, status) {
    if (!doubt?.id) return;

    setError("");

    const previousStatus = doubt.status;

    setDoubts((previous) =>
      previous.map((item) =>
        item.id === doubt.id ? { ...item, status } : item
      )
    );

    try {
      const result = await apiRequest(
        `${DOUBTS_ENDPOINT}/${encodeURIComponent(doubt.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      const updated =
        result?.doubt || result?.data?.doubt;

      if (updated) {
        const normalized = normalizeDoubt(updated);

        setDoubts((previous) =>
          previous.map((item) =>
            item.id === doubt.id ? normalized : item
          )
        );
      }

      showSuccess("Doubt status updated.");
    } catch (err) {
      setDoubts((previous) =>
        previous.map((item) =>
          item.id === doubt.id
            ? { ...item, status: previousStatus }
            : item
        )
      );

      setError(err.message || "Failed to update status.");
    }
  }

  async function updateDoubtField(doubt, changes) {
    if (!doubt?.id) return;

    setError("");

    const previousValues = {};

    Object.keys(changes).forEach((key) => {
      previousValues[key] = doubt[key];
    });

    setDoubts((previous) =>
      previous.map((item) =>
        item.id === doubt.id ? { ...item, ...changes } : item
      )
    );

    try {
      const result = await apiRequest(
        `${DOUBTS_ENDPOINT}/${encodeURIComponent(doubt.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(changes),
        }
      );

      const updated =
        result?.doubt || result?.data?.doubt;

      if (updated) {
        const normalized = normalizeDoubt(updated);

        setDoubts((previous) =>
          previous.map((item) =>
            item.id === doubt.id ? normalized : item
          )
        );
      }

      showSuccess("Doubt updated successfully.");
    } catch (err) {
      setDoubts((previous) =>
        previous.map((item) =>
          item.id === doubt.id
            ? { ...item, ...previousValues }
            : item
        )
      );

      setError(err.message || "Failed to update doubt.");
    }
  }

  async function deleteDoubt(doubt) {
    if (!doubt?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${doubt.subject}"?`
    );

    if (!confirmed) return;

    setError("");

    try {
      await apiRequest(
        `${DOUBTS_ENDPOINT}/${encodeURIComponent(doubt.id)}`,
        { method: "DELETE" }
      );

      setDoubts((previous) =>
        previous.filter((item) => item.id !== doubt.id)
      );

      if (selectedDoubtId === doubt.id) {
        setSelectedDoubtId(null);
      }

      showSuccess("Doubt deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete doubt.");
    }
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!selectedDoubt?.id || !replyText.trim()) return;

    setSaving(true);
    setError("");

    try {
      const result = await apiRequest(
        `${DOUBTS_ENDPOINT}/${encodeURIComponent(
          selectedDoubt.id
        )}/replies`,
        {
          method: "POST",
          body: JSON.stringify({
            message: replyText.trim(),
            sender: "Admin",
            senderName: "Admin",
          }),
        }
      );

      const updated =
        result?.doubt ||
        result?.data?.doubt;

      if (updated) {
        const normalized = normalizeDoubt(updated);

        setDoubts((previous) =>
          previous.map((item) =>
            item.id === selectedDoubt.id ? normalized : item
          )
        );
      } else if (result?.reply || result?.data?.reply) {
        const newReply = result.reply || result.data.reply;

        setDoubts((previous) =>
          previous.map((item) =>
            item.id === selectedDoubt.id
              ? {
                  ...item,
                  replies: [
                    ...item.replies,
                    {
                      ...newReply,
                      message: newReply.message || replyText.trim(),
                      sender: newReply.senderName || "Admin",
                      createdAt: newReply.createdAt || new Date().toISOString(),
                    },
                  ],
                }
              : item
          )
        );
      } else {
        await fetchDoubts();
      }

      setReplyText("");
      showSuccess("Reply sent successfully.");
    } catch (err) {
      setError(err.message || "Failed to send reply.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <MessageCircleQuestion size={18} />
              Admin Panel
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Doubts Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage student questions, assign trainers, and track resolutions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchDoubts}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setError("");
                setShowCreateModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Doubt
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Doubts"
            value={stats.total}
            icon={MessageSquare}
            color="blue"
          />
          <StatCard
            title="Open"
            value={stats.open}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={RefreshCw}
            color="indigo"
          />
          <StatCard
            title="Resolved"
            value={stats.resolved}
            icon={CheckCircle2}
            color="emerald"
          />
        </div>

        {/* Search and filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, subject, course..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${inputClass} appearance-none pl-9 pr-9`}
              >
                <option value="All">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="All">All priorities</option>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Doubts table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">
              Student Doubts
            </h2>

            <p className="text-sm text-slate-500">
              Showing {filteredDoubts.length} of {doubts.length} doubts
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <LoaderCircle
                size={30}
                className="animate-spin text-blue-600"
              />
              <p className="text-sm">Loading doubts from the server...</p>
            </div>
          ) : filteredDoubts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-400">
                <MessageCircleQuestion size={30} />
              </div>

              <h3 className="font-semibold text-slate-800">
                No doubts found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {error
                  ? "Check your backend server and API endpoint, then refresh."
                  : "Try changing your search or filters, or create a new doubt."}
              </p>

              {error && (
                <button
                  type="button"
                  onClick={fetchDoubts}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Try again
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Student / Doubt</th>
                    <th className="px-5 py-4 font-semibold">Course</th>
                    <th className="px-5 py-4 font-semibold">Priority</th>
                    <th className="px-5 py-4 font-semibold">Assigned To</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredDoubts.map((doubt) => (
                    <tr
                      key={doubt.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="max-w-xs px-5 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoubtId(doubt.id);
                            setReplyText("");
                            setError("");
                          }}
                          className="block max-w-full text-left"
                        >
                          <span className="block truncate font-semibold text-slate-900 hover:text-blue-600">
                            {doubt.subject}
                          </span>

                          <span className="mt-1 block text-xs text-slate-500">
                            {doubt.student}
                            {doubt.email ? ` · ${doubt.email}` : ""}
                          </span>

                          <span className="mt-1 line-clamp-2 block text-xs text-slate-500">
                            {doubt.description}
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {doubt.course}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClasses(
                            doubt.priority
                          )}`}
                        >
                          {doubt.priority}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={doubt.assignedTo}
                          onChange={(event) =>
                            updateDoubtField(doubt, {
                              assignedTo: event.target.value,
                            })
                          }
                          className="max-w-40 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                          aria-label={`Assign ${doubt.subject}`}
                        >
                          {[
                            ...new Set([
                              "Unassigned",
                              ...TRAINERS,
                              doubt.assignedTo,
                            ]),
                          ].map((trainer) => (
                            <option key={trainer} value={trainer}>
                              {trainer}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={doubt.status}
                          onChange={(event) =>
                            changeStatus(doubt, event.target.value)
                          }
                          className={`max-w-36 rounded-full px-3 py-1.5 text-xs font-semibold outline-none ring-1 ${statusClasses(
                            doubt.status
                          )}`}
                          aria-label={`Change status for ${doubt.subject}`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {formatDate(doubt.createdAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoubtId(doubt.id);
                              setReplyText("");
                              setError("");
                            }}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            View / Reply
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteDoubt(doubt)}
                            title="Delete doubt"
                            aria-label={`Delete ${doubt.subject}`}
                            className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create doubt modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create New Doubt
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a question to the doubts management system.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveDoubt} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Student Name *">
                  <input
                    required
                    value={form.student}
                    onChange={(e) => updateForm("student", e.target.value)}
                    placeholder="Enter student name"
                    className={inputClass}
                  />
                </Field>

                <Field label="Student Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="student@example.com"
                    className={inputClass}
                  />
                </Field>

                <Field label="Subject *">
                  <input
                    required
                    value={form.subject}
                    onChange={(e) => updateForm("subject", e.target.value)}
                    placeholder="Enter doubt subject"
                    className={inputClass}
                  />
                </Field>

                <Field label="Course / Batch">
                  <input
                    value={form.course}
                    onChange={(e) => updateForm("course", e.target.value)}
                    placeholder="e.g. MERN-07"
                    className={inputClass}
                  />
                </Field>

                <Field label="Priority">
                  <select
                    value={form.priority}
                    onChange={(e) => updateForm("priority", e.target.value)}
                    className={inputClass}
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Assign Trainer">
                  <select
                    value={form.assignedTo}
                    onChange={(e) => updateForm("assignedTo", e.target.value)}
                    className={inputClass}
                  >
                    {TRAINERS.map((trainer) => (
                      <option key={trainer} value={trainer}>
                        {trainer}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Description *">
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    updateForm("description", e.target.value)
                  }
                  placeholder="Describe the student's doubt..."
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving ? "Saving..." : "Create Doubt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doubt details and replies modal */}
      {selectedDoubt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Doubt Details
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedDoubt.subject}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Submitted by {selectedDoubt.student}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDoubtId(null)}
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Course</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedDoubt.course}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Priority</p>
                  <select
                    value={selectedDoubt.priority}
                    onChange={(e) =>
                      updateDoubtField(selectedDoubt, {
                        priority: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <select
                    value={selectedDoubt.status}
                    onChange={(e) =>
                      changeStatus(selectedDoubt, e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Description
                </h3>
                <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-sm leading-6 text-slate-600">
                  {selectedDoubt.description || "No description provided."}
                </p>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageSquare size={17} />
                  Conversation ({selectedDoubt.replies.length})
                </h3>

                {selectedDoubt.replies.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                    No replies yet. Send a reply below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDoubt.replies.map((reply, index) => (
                      <div
                        key={reply._id || reply.id || index}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <UserRound size={15} />
                            {reply.sender}
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={sendReply} className="space-y-3">
                <label
                  htmlFor="doubt-reply"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Write a reply
                </label>

                <textarea
                  id="doubt-reply"
                  required
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the student..."
                  className={`${inputClass} resize-y`}
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !replyText.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {saving ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedDoubtId(null)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${colors[color] || colors.blue}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
