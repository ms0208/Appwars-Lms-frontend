"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  RefreshCw,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Eye,
  X,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const STATUSES = ["Present", "Absent"];

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const emptyForm = () => ({
  studentId: "",
  batchId: "",
  trainerId: "",
  date: today(),
  status: "Present",
  remarks: "",
});

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("appwars_token") ||
        sessionStorage.getItem("token")
      : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

function getItems(result) {
  if (Array.isArray(result)) return result;

  for (const key of ["data", "items", "attendance", "users", "batches"]) {
    if (Array.isArray(result?.[key])) {
      return result[key];
    }
  }

  return [];
}

function getId(value) {
  if (!value) return "";

  return typeof value === "string"
    ? value
    : value._id || value.id || "";
}

function getName(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return (
    value.name ||
    value.fullName ||
    value.title ||
    value.userId ||
    ""
  );
}

function mapAttendance(record) {
  return {
    ...record,
    id: getId(record),
    studentId: getId(record.student),
    batchId: getId(record.batch),
    trainerId: getId(record.trainer),
    name: getName(record.student),
    email: record.student?.email || "",
    batch: getName(record.batch),
    course: getName(record.batch?.course),
    trainerName: getName(record.trainer),
    date: record.date ? String(record.date).slice(0, 10) : "",
    status: record.status || "Absent",
    remarks: record.remarks || "",
  };
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        status === "Present"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
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

export default function AttendancePage() {
  const [records, setRecords] = useState([]);

  const [studentOptions, setStudentOptions] = useState([]);
  const [trainerOptions, setTrainerOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState(emptyForm());

  // ==========================================
  // LOAD STUDENT ATTENDANCE
  // GET /api/admin/attendance
  // ==========================================

  const loadAttendance = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    setPageError("");

    try {
      const result = await apiRequest("/admin/attendance");

      setRecords(getItems(result).map(mapAttendance));
    } catch (error) {
      setPageError(
        error.message || "Unable to load student attendance."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  // ==========================================
  // LOAD STUDENTS, TRAINERS AND BATCHES
  // ==========================================

  const loadOptions = useCallback(async () => {
    try {
      const [usersResult, batchesResult] = await Promise.all([
        apiRequest("/admin/users"),
        apiRequest("/admin/batches"),
      ]);

      const users = getItems(usersResult);
      const batches = getItems(batchesResult);

      setStudentOptions(
        users.filter((user) => user.role === "Student")
      );

      setTrainerOptions(
        users.filter((user) => user.role === "Trainer")
      );

      setBatchOptions(batches);
    } catch (error) {
      setPageError(
        error.message ||
          "Unable to load students, trainers and batches."
      );
    }
  }, []);

  useEffect(() => {
    loadAttendance();
    loadOptions();
  }, [loadAttendance, loadOptions]);

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.name,
          record.email,
          record.batch,
          record.course,
          record.trainerName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      const matchesDate =
        !filterDate || record.date === filterDate;

      const matchesStatus =
        filterStatus === "All" ||
        record.status === filterStatus;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [records, search, filterDate, filterStatus]);

  // ==========================================
  // SUMMARY CARDS
  // ==========================================

  const summary = useMemo(
    () => ({
      total: records.length,

      present: records.filter(
        (record) => record.status === "Present"
      ).length,

      absent: records.filter(
        (record) => record.status === "Absent"
      ).length,
    }),
    [records]
  );

  // ==========================================
  // RESET FILTERS
  // ==========================================

  function resetFilters() {
    setSearch("");
    setFilterDate("");
    setFilterStatus("All");
  }

  // ==========================================
  // ADD ATTENDANCE MODAL
  // ==========================================

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  }

  // ==========================================
  // EDIT ATTENDANCE MODAL
  // ==========================================

  function openEditModal(record) {
    setEditingId(record.id);

    setForm({
      studentId: record.studentId,
      batchId: record.batchId,
      trainerId: record.trainerId,
      date: record.date,
      status: record.status,
      remarks: record.remarks,
    });

    setFormError("");
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // ==========================================
  // CREATE / UPDATE ATTENDANCE
  // POST /api/admin/attendance
  // PATCH /api/admin/attendance/:attendanceId
  // ==========================================

  async function saveRecord(event) {
    event.preventDefault();

    setFormError("");
    setNotice("");

    if (!form.date) {
      setFormError("Attendance date is required.");
      return;
    }

    if (!STATUSES.includes(form.status)) {
      setFormError("Status must be Present or Absent.");
      return;
    }

    if (
      !editingId &&
      (!form.studentId || !form.batchId || !form.trainerId)
    ) {
      setFormError(
        "Please select a student, batch and trainer."
      );
      return;
    }

    // Update controller accepts only date, status and remarks.
    const payload = editingId
      ? {
          date: form.date,
          status: form.status,
          remarks: form.remarks?.trim() || "",
        }
      : {
          batchId: form.batchId,
          studentId: form.studentId,
          trainerId: form.trainerId,
          date: form.date,
          status: form.status,
          remarks: form.remarks?.trim() || "",
        };

    setSaving(true);

    try {
      if (editingId) {
        await apiRequest(
          `/admin/attendance/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest("/admin/attendance", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);

      setNotice(
        editingId
          ? "Student attendance updated successfully."
          : "Student attendance created successfully."
      );

      await loadAttendance(false);
    } catch (error) {
      setFormError(
        error.message || "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DELETE ATTENDANCE
  // DELETE /api/admin/attendance/:attendanceId
  // ==========================================

  async function deleteRecord(record) {
    const confirmed = window.confirm(
      `Delete attendance for ${record.name} on ${record.date}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/admin/attendance/${encodeURIComponent(record.id)}`,
        {
          method: "DELETE",
        }
      );

      setRecords((previous) =>
        previous.filter((item) => item.id !== record.id)
      );

      if (viewRecord?.id === record.id) {
        setViewRecord(null);
      }

      setNotice("Student attendance deleted successfully.");
    } catch (error) {
      setPageError(
        error.message || "Unable to delete attendance."
      );
    }
  }

  // ==========================================
  // MARK STUDENT ABSENT
  // PATCH /api/admin/attendance/:attendanceId
  // ==========================================

  async function markAbsent(record) {
    const confirmed = window.confirm(
      `Mark ${record.name} absent on ${record.date}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/admin/attendance/${encodeURIComponent(record.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "Absent",
            remarks: record.remarks || "",
          }),
        }
      );

      await loadAttendance(false);

      setNotice(`${record.name} marked absent.`);
    } catch (error) {
      setPageError(
        error.message || "Unable to update attendance."
      );
    }
  }

  // ==========================================
  // EXPORT CSV
  // ==========================================

  function exportCSV() {
    const headers = [
      "Student",
      "Email",
      "Batch",
      "Course",
      "Trainer",
      "Date",
      "Status",
      "Remarks",
    ];

    const rows = filteredRecords.map((record) => [
      record.name,
      record.email,
      record.batch,
      record.course,
      record.trainerName,
      record.date,
      record.status,
      record.remarks,
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
    link.download = `student-attendance-${today()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <ClipboardCheck size={17} />
              APPWARS LMS / Attendance
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Student Attendance
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage and track student class attendance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadAttendance()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={16} />
              Export CSV
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
            >
              <Plus size={17} />
              Add Student Attendance
            </button>
          </div>
        </div>

        {/* ALERTS */}

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Records"
            value={summary.total}
            icon={ClipboardCheck}
            color="blue"
          />

          <StatCard
            title="Present"
            value={summary.present}
            icon={CheckCircle2}
            color="green"
          />

          <StatCard
            title="Absent"
            value={summary.absent}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* SEARCH AND FILTERS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Search and Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student, email, batch or trainer..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <input
              type="date"
              value={filterDate}
              onChange={(event) =>
                setFilterDate(event.target.value)
              }
              className={inputClass}
            />

            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value)
              }
              className={inputClass}
            >
              <option value="All">All statuses</option>

              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
          >
            Clear filters
          </button>
        </div>

        {/* ATTENDANCE TABLE */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">
              Student Attendance Records
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Showing {filteredRecords.length} of {records.length} records
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-gray-600">
              <RefreshCw size={18} className="animate-spin" />
              Loading attendance...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-4 py-4">Course / Batch</th>
                    <th className="px-4 py-4">Trainer</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-5 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.length ? (
                    filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {record.name || "Unknown"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {record.email || "No email"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-800">
                            {record.course || "—"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {record.batch || "No batch"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-gray-600">
                          {record.trainerName || "—"}
                        </td>

                        <td className="px-4 py-4 text-gray-600">
                          {record.date || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={record.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              title="View"
                              onClick={() => setViewRecord(record)}
                              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                            >
                              <Eye size={17} />
                            </button>

                            {record.status !== "Absent" && (
                              <button
                                title="Mark absent"
                                onClick={() => markAbsent(record)}
                                className="rounded-lg p-2 text-amber-700 hover:bg-amber-50"
                              >
                                <XCircle size={17} />
                              </button>
                            )}

                            <button
                              title="Edit"
                              onClick={() => openEditModal(record)}
                              className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              title="Delete"
                              onClick={() => deleteRecord(record)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        No student attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId
                    ? "Edit Student Attendance"
                    : "Add Student Attendance"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Record student class attendance
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={saveRecord}
              className="space-y-4 p-6"
            >
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Student" required>
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={form.studentId}
                    onChange={(event) =>
                      updateForm("studentId", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select student</option>

                    {studentOptions.map((user) => (
                      <option
                        key={getId(user)}
                        value={getId(user)}
                      >
                        {getName(user)} (
                        {user.userId || user.email || "Student"})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Batch" required>
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={form.batchId}
                    onChange={(event) =>
                      updateForm("batchId", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select batch</option>

                    {batchOptions.map((batch) => (
                      <option
                        key={getId(batch)}
                        value={getId(batch)}
                      >
                        {getName(batch)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Trainer" required>
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={form.trainerId}
                    onChange={(event) =>
                      updateForm("trainerId", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select trainer</option>

                    {trainerOptions.map((user) => (
                      <option
                        key={getId(user)}
                        value={getId(user)}
                      >
                        {getName(user)} (
                        {user.userId || user.email || "Trainer"})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Attendance Date" required>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) =>
                      updateForm("date", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Status" required>
                  <select
                    required
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                    className={inputClass}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Remarks">
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(event) =>
                    updateForm("remarks", event.target.value)
                  }
                  placeholder="Optional remarks..."
                  className={inputClass}
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-[#173b70] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53] disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Attendance"
                      : "Save Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ATTENDANCE MODAL */}

      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Attendance Details
              </h2>

              <button
                onClick={() => setViewRecord(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Student</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {viewRecord.name || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {viewRecord.email || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Course</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {viewRecord.course || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Batch</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {viewRecord.batch || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Trainer</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {viewRecord.trainerName || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {viewRecord.date || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Status</p>
                <div className="mt-1">
                  <StatusBadge status={viewRecord.status} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500">Remarks</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {viewRecord.remarks || "No remarks"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}