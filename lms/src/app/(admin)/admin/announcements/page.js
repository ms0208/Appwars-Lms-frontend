"use client";

import { useState } from "react";
import {
  Bell,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Send,
  Save,
  Users,
  GraduationCap,
  UserCog,
  CalendarDays,
  Megaphone,
  Pin,
  Clock,
  Eye,
  AlertCircle,
} from "lucide-react";

const INITIAL_ANNOUNCEMENTS = [
  {
    id: 1,
    title: "Welcome to the APPWARS LMS Portal",
    message:
      "Welcome to the official APPWARS LMS portal. Students and trainers can use this platform to access important announcements, attendance records, learning resources, course updates, and other academic information. Please check the portal regularly to stay informed about upcoming activities and important notifications.",
    audience: "Everyone",
    priority: "High",
    status: "Published",
    pinned: true,
    createdAt: "2026-10-24",
    createdBy: "Admin",
  },
  {
    id: 2,
    title: "MERN Stack Batch Schedule",
    message:
      "All students enrolled in the MERN Stack Development program should follow their assigned batch timetable. Please attend classes regularly, complete assigned tasks, and keep your project work updated. Contact your assigned trainer if you have any questions about the schedule.",
    audience: "Students",
    priority: "Normal",
    status: "Published",
    pinned: false,
    createdAt: "2026-10-24",
    createdBy: "Admin",
  },
  {
    id: 3,
    title: "Trainer Attendance Reminder",
    message:
      "All trainers are requested to follow the company's working schedule of 10:00 AM to 7:00 PM. Admin will maintain trainer attendance records, including actual check-in and check-out times. Please communicate any planned leave or schedule-related concerns to the administration in advance.",
    audience: "Trainers",
    priority: "High",
    status: "Published",
    pinned: false,
    createdAt: "2026-10-24",
    createdBy: "Admin",
  },
];

const EMPTY_FORM = {
  title: "",
  message: "",
  audience: "Everyone",
  priority: "Normal",
  status: "Published",
  pinned: false,
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function AudienceBadge({ audience }) {
  const styles = {
    Everyone: "bg-blue-50 text-blue-700",
    Students: "bg-emerald-50 text-emerald-700",
    Trainers: "bg-purple-50 text-purple-700",
  };

  const Icon =
    audience === "Students"
      ? GraduationCap
      : audience === "Trainers"
        ? UserCog
        : Users;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[audience] || "bg-gray-100 text-gray-700"
      }`}
    >
      <Icon size={13} />
      {audience}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    High: "bg-red-50 text-red-700",
    Normal: "bg-blue-50 text-blue-700",
    Low: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[priority] || styles.Normal
      }`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Draft: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${styles[color]}`}>
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
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(
    INITIAL_ANNOUNCEMENTS
  );

  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewAnnouncement, setViewAnnouncement] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const publishedCount = announcements.filter(
    (item) => item.status === "Published"
  ).length;

  const draftCount = announcements.filter(
    (item) => item.status === "Draft"
  ).length;

  const pinnedCount = announcements.filter(
    (item) => item.pinned
  ).length;

  const filteredAnnouncements = announcements
    .filter((item) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        item.createdBy.toLowerCase().includes(query);

      const matchesAudience =
        audienceFilter === "All" || item.audience === audienceFilter;

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesAudience && matchesStatus;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return b.id - a.id;
    });

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(announcement) {
    setEditingId(announcement.id);

    setForm({
      title: announcement.title,
      message: announcement.message,
      audience: announcement.audience,
      priority: announcement.priority,
      status: announcement.status,
      pinned: announcement.pinned,
    });

    setError("");
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function saveAnnouncement(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim() || !form.message.trim()) {
      setError("Please enter both the announcement title and message.");
      return;
    }

    if (form.title.trim().length < 3) {
      setError("The title must contain at least 3 characters.");
      return;
    }

    const today = new Date().toLocaleDateString("en-CA");

    const announcementData = {
      title: form.title.trim(),
      message: form.message.trim(),
      audience: form.audience,
      priority: form.priority,
      status: form.status,
      pinned: form.pinned,
      createdAt: today,
      createdBy: "Admin",
    };

    if (editingId !== null) {
      setAnnouncements((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...announcementData,
              }
            : item
        )
      );
    } else {
      setAnnouncements((previous) => [
        {
          id: Date.now(),
          ...announcementData,
        },
        ...previous,
      ]);
    }

    setModalOpen(false);
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function deleteAnnouncement(announcement) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${announcement.title}"?`
    );

    if (!confirmed) return;

    setAnnouncements((previous) =>
      previous.filter((item) => item.id !== announcement.id)
    );

    if (viewAnnouncement?.id === announcement.id) {
      setViewAnnouncement(null);
    }
  }

  function togglePin(announcement) {
    setAnnouncements((previous) =>
      previous.map((item) =>
        item.id === announcement.id
          ? { ...item, pinned: !item.pinned }
          : item
      )
    );
  }

  function exportCSV() {
    const headers = [
      "Title",
      "Message",
      "Audience",
      "Priority",
      "Status",
      "Pinned",
      "Created Date",
      "Created By",
    ];

    const rows = filteredAnnouncements.map((item) => [
      item.title,
      item.message,
      item.audience,
      item.priority,
      item.status,
      item.pinned ? "Yes" : "No",
      item.createdAt,
      item.createdBy,
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
    link.download = "appwars-announcements.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <Megaphone size={17} />
              APPWARS LMS / Administration
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Announcements
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create and manage important updates for students and trainers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Save size={17} />
              Export CSV
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#102b53]"
            >
              <Plus size={18} />
              Create Announcement
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Announcements"
            value={announcements.length}
            icon={Bell}
            color="blue"
          />
          <StatCard
            title="Published"
            value={publishedCount}
            icon={Send}
            color="green"
          />
          <StatCard
            title="Drafts"
            value={draftCount}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Pinned Announcements"
            value={pinnedCount}
            icon={Pin}
            color="purple"
          />
        </div>

        {/* Announcement composer shortcut */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                <Megaphone size={23} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Share an important update
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                  Publish class schedules, holiday notices, examination
                  information, assignment deadlines, placement updates, and
                  trainer instructions for the relevant audience.
                </p>
              </div>
            </div>

            <button
              onClick={openCreateModal}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50"
            >
              Write Announcement
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or message..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={audienceFilter}
              onChange={(event) => setAudienceFilter(event.target.value)}
              className={inputClass}
              aria-label="Filter by audience"
            >
              <option value="All">All audiences</option>
              <option value="Everyone">Everyone</option>
              <option value="Students">Students</option>
              <option value="Trainers">Trainers</option>
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
            </select>
          </div>
        </div>

        {/* Announcement list */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-gray-900">
                All Announcements
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {filteredAnnouncements.length} announcement
                {filteredAnnouncements.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className="p-5 transition hover:bg-gray-50/70 sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex">
                      <Bell size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-bold text-gray-900">
                          {announcement.title}
                        </h3>

                        {announcement.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            <Pin size={12} />
                            Pinned
                          </span>
                        )}
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                        {announcement.message}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <AudienceBadge audience={announcement.audience} />
                        <PriorityBadge priority={announcement.priority} />
                        <StatusBadge status={announcement.status} />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {announcement.createdAt}
                        </span>

                        <span>
                          Created by {announcement.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      onClick={() => setViewAnnouncement(announcement)}
                      title="View announcement"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      onClick={() => togglePin(announcement)}
                      title={announcement.pinned ? "Unpin" : "Pin"}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
                        announcement.pinned
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Pin size={15} />
                      {announcement.pinned ? "Unpin" : "Pin"}
                    </button>

                    <button
                      onClick={() => openEditModal(announcement)}
                      title="Edit announcement"
                      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => deleteAnnouncement(announcement)}
                      title="Delete announcement"
                      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {filteredAnnouncements.length === 0 && (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <Bell size={25} />
                </div>

                <h3 className="mt-4 font-semibold text-gray-900">
                  No announcements found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Change your filters or create a new announcement.
                </p>

                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  <Plus size={17} />
                  Create Announcement
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Announcement" : "Create Announcement"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Write an update and select who should receive it.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAnnouncement} className="space-y-5 p-5 sm:p-6">
              <FormField label="Announcement Title" required>
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  placeholder="e.g. Important Class Schedule Update"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Announcement Message" required>
                <textarea
                  required
                  rows={7}
                  maxLength={10000}
                  value={form.message}
                  onChange={(event) =>
                    updateForm("message", event.target.value)
                  }
                  placeholder="Write your complete announcement here..."
                  className={`${inputClass} resize-y`}
                />
                <span className="mt-1 block text-right text-xs text-gray-400">
                  {form.message.length}/10000 characters
                </span>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Target Audience" required>
                  <select
                    value={form.audience}
                    onChange={(event) =>
                      updateForm("audience", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Students">Students only</option>
                    <option value="Trainers">Trainers only</option>
                  </select>
                </FormField>

                <FormField label="Priority" required>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateForm("priority", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </FormField>

                <FormField label="Publication Status" required>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Published">Publish now</option>
                    <option value="Draft">Save as draft</option>
                  </select>
                </FormField>

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3.5">
                    <input
                      type="checkbox"
                      checked={form.pinned}
                      onChange={(event) =>
                        updateForm("pinned", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">
                        Pin announcement
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        Show it at the top of the list
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Published announcements are marked as published in this
                  admin page. To display them in student and trainer portals,
                  connect this page to your database and expose published
                  announcements through your API.
                </p>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  {form.status === "Published" ? (
                    <Send size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {editingId
                    ? "Save Changes"
                    : form.status === "Published"
                      ? "Publish Announcement"
                      : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewAnnouncement(null);
            }
          }}
        >
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <AudienceBadge audience={viewAnnouncement.audience} />
                  <PriorityBadge priority={viewAnnouncement.priority} />
                  <StatusBadge status={viewAnnouncement.status} />
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  {viewAnnouncement.title}
                </h2>
              </div>

              <button
                onClick={() => setViewAnnouncement(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close announcement details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                {viewAnnouncement.message}
              </p>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">Created By</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {viewAnnouncement.createdBy}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Created Date</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {viewAnnouncement.createdAt}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setViewAnnouncement(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    const selected = viewAnnouncement;
                    setViewAnnouncement(null);
                    openEditModal(selected);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  <Pencil size={16} />
                  Edit Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
