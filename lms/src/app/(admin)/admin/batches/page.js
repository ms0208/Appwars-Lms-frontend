
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
  Eye,
  Users,
  CheckCircle2,
  Clock,
  GraduationCap,
  RefreshCw,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const EMPTY_BATCH = {
  name: "",
  code: "",
  course: "",
  trainer: "",
  startDate: "",
  endDate: "",
  capacity: 30,
  status: "Upcoming",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

async function apiRequest(path, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        data.message || "Authentication failed. Please log in again."
      );
    }

    throw new Error(
      data.message || data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

function getItems(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
}

function getName(value) {
  if (!value) return "Not assigned";
  if (typeof value === "string") return value;
  return value.name || value.title || value.userId || "Not assigned";
}

function dateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function mapBatch(batch) {
  const students = Array.isArray(batch.students) ? batch.students : [];

  return {
    id: getId(batch),
    name: batch.name || "",
    code: batch.code || "",
    courseId: getId(batch.course),
    course: getName(batch.course),
    trainerId: getId(batch.trainer),
    trainer: getName(batch.trainer),
    studentIds: students.map(getId).filter(Boolean),
    enrolled: students.length,
    startDate: dateInputValue(batch.startDate),
    endDate: dateInputValue(batch.endDate),
    capacity: Number(batch.capacity || 0),
    status: batch.status || "Upcoming",
  };
}

function displayStatus(status) {
  return status === "Running" ? "Ongoing" : status;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modal, setModal] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_BATCH });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [batchData, courseData, trainerData] = await Promise.all([
        apiRequest("/admin/batches"),
        apiRequest("/admin/courses"),
        apiRequest("/admin/users?role=Trainer&active=true&limit=100"),
      ]);

      setBatches(getItems(batchData, "items").map(mapBatch));
      setCourses(getItems(courseData, "items"));

      const trainerList = getItems(trainerData, "users");
      setTrainers(trainerList);
    } catch (err) {
      setError(err.message || "Unable to load batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ongoing = batches.filter((b) => b.status === "Running").length;
  const upcoming = batches.filter((b) => b.status === "Upcoming").length;

  const totalStudents = batches.reduce(
    (sum, batch) => sum + batch.enrolled,
    0
  );

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch = [
        batch.name,
        batch.code,
        batch.course,
        batch.trainer,
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" || batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, search, statusFilter]);

  function openAdd() {
    setSelectedBatch(null);
    setForm({ ...EMPTY_BATCH });
    setError("");
    setNotice("");
    setModal("form");
  }

  function openEdit(batch) {
    setSelectedBatch(batch);
    setForm({
      name: batch.name,
      code: batch.code,
      course: batch.courseId,
      trainer: batch.trainerId,
      startDate: batch.startDate,
      endDate: batch.endDate,
      capacity: batch.capacity,
      status: batch.status,
    });
    setError("");
    setNotice("");
    setModal("form");
  }

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function saveBatch(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !form.name.trim() ||
      !form.code.trim() ||
      !form.course ||
      !form.trainer ||
      !form.startDate ||
      !form.endDate
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) {
      setError("Capacity must be a whole number greater than zero.");
      return;
    }

    const duplicateCode = batches.some(
      (batch) =>
        batch.code.trim().toLowerCase() ===
          form.code.trim().toLowerCase() &&
        batch.id !== selectedBatch?.id
    );

    if (duplicateCode) {
      setError("This batch code already exists.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      course: form.course,
      trainer: form.trainer,
      startDate: form.startDate,
      endDate: form.endDate,
      capacity: Number(form.capacity),
      status: form.status,
    };

    setSaving(true);

    try {
      if (selectedBatch) {
        await apiRequest(`/admin/batches/${selectedBatch.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice("Batch updated successfully.");
      } else {
        await apiRequest("/admin/batches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Batch created successfully.");
      }

      setModal(null);
      setSelectedBatch(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save batch.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBatch(batch) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${batch.name}"? This will delete the record from the database.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/batches/${batch.id}`, {
        method: "DELETE",
      });

      setBatches((previous) =>
        previous.filter((item) => item.id !== batch.id)
      );

      setNotice("Batch deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete batch.");
    }
  }

  function exportCSV() {
    const headers = [
      "Batch Code",
      "Batch Name",
      "Course",
      "Trainer",
      "Start Date",
      "End Date",
      "Capacity",
      "Enrolled Students",
      "Status",
    ];

    const rows = filteredBatches.map((batch) => [
      batch.code,
      batch.name,
      batch.course,
      batch.trainer,
      batch.startDate,
      batch.endDate,
      batch.capacity,
      batch.enrolled,
      displayStatus(batch.status),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "appwars-batches.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Batches Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Schedule training batches, assign trainers and monitor enrollment.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              onClick={openAdd}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus size={18} /> Create Batch
            </button>
          </div>
        </div>

        {error && !modal && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Batches" value={batches.length} icon={CalendarDays} />
          <StatCard title="Ongoing Batches" value={ongoing} icon={CheckCircle2} />
          <StatCard title="Upcoming Batches" value={upcoming} icon={Clock} />
          <StatCard title="Enrolled Students" value={totalStudents} icon={Users} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch, code, course or trainer..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass + " lg:w-48"}
            >
              <option value="All">All Statuses</option>
              <option value="Running">Ongoing</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>

            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">All Batches</h2>
            <span className="text-sm text-slate-500">
              {filteredBatches.length} results
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Batch</th>
                  <th className="px-5 py-4">Course / Trainer</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Enrollment</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Loading batches...
                    </td>
                  </tr>
                ) : filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{batch.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{batch.code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{batch.course}</p>
                      <p className="mt-1 text-xs text-slate-500">{batch.trainer}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-700">{formatDate(batch.startDate)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        to {formatDate(batch.endDate)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {batch.enrolled} / {batch.capacity}
                      </p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${
                              batch.capacity
                                ? Math.min((batch.enrolled / batch.capacity) * 100, 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={batch.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <ActionButton
                          label="View"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setModal("view");
                          }}
                        >
                          <Eye size={16} />
                        </ActionButton>
                        <ActionButton label="Edit" onClick={() => openEdit(batch)}>
                          <Pencil size={16} />
                        </ActionButton>
                        <ActionButton
                          label="Delete"
                          danger
                          onClick={() => deleteBatch(batch)}
                        >
                          <Trash2 size={16} />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredBatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      No batches found. Try another search or create a new batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === "form" && (
        <Modal
          title={selectedBatch ? "Edit Batch" : "Create New Batch"}
          onClose={() => {
            if (!saving) setModal(null);
          }}
        >
          <form onSubmit={saveBatch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Batch Name *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass}
                  placeholder="MERN Weekend Batch"
                />
              </FormField>

              <FormField label="Batch Code *">
                <input
                  required
                  value={form.code}
                  onChange={(e) => updateField("code", e.target.value)}
                  className={inputClass}
                  placeholder="BATCH-MERN-01"
                />
              </FormField>

              <FormField label="Course *">
                <select
                  required
                  value={form.course}
                  onChange={(e) => updateField("course", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={getId(course)} value={getId(course)}>
                      {course.title || course.name || "Unnamed course"}
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No courses found. Create a course first.
                  </p>
                )}
              </FormField>

              <FormField label="Trainer *">
                <select
                  required
                  value={form.trainer}
                  onChange={(e) => updateField("trainer", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a trainer</option>
                  {trainers.map((trainer) => (
                    <option key={getId(trainer)} value={getId(trainer)}>
                      {trainer.name} ({trainer.userId})
                    </option>
                  ))}
                </select>
                {trainers.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No active trainers found. Create or activate a trainer first.
                  </p>
                )}
              </FormField>

              <FormField label="Start Date *">
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className={inputClass}
                />
              </FormField>

              <FormField label="End Date *">
                <input
                  type="date"
                  required
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Batch Capacity *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.capacity}
                  onChange={(e) => updateField("capacity", e.target.value)}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className={inputClass}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Running">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </FormField>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : selectedBatch
                    ? "Save Changes"
                    : "Create Batch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selectedBatch && (
        <Modal title="Batch Details" onClose={() => setModal(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <CalendarDays size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedBatch.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{selectedBatch.code}</p>
                <div className="mt-2">
                  <StatusBadge status={selectedBatch.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Course" value={selectedBatch.course} />
              <Detail label="Trainer" value={selectedBatch.trainer} />
              <Detail label="Start Date" value={formatDate(selectedBatch.startDate)} />
              <Detail label="End Date" value={formatDate(selectedBatch.endDate)} />
              <Detail label="Capacity" value={selectedBatch.capacity} />
              <Detail
                label="Enrolled Students"
                value={`${selectedBatch.enrolled} / ${selectedBatch.capacity}`}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = displayStatus(status);

  const styles = {
    Running: "bg-green-50 text-green-700",
    Upcoming: "bg-blue-50 text-blue-700",
    Completed: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.Completed
      }`}
    >
      {label}
    </span>
  );
}

function ActionButton({ children, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-2 ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value ?? "—"}
      </p>
    </div>
  );
}
