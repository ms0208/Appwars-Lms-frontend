
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  X,
  Pencil,
  Trash2,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  Video,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const ADMISSIONS_URL = `${API_ROOT}/counsellor/admissions`;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "block text-sm font-medium text-slate-700";

const emptyStudent = {
  name: "",
  email: "",
  phone: "",
  course: "",
  trainer: "",
  mode: "Online",
  batchType: "Mon-Th",
  batchStartDate: "",
  batchEndDate: "",
  batchTime: "",
  admissionDate: "",
  totalFee: "",
  feeStatus: "Pending",
  videoAccess: "Yes",
  status: "Active",
  notes: "",
};

function Field({ label, children }) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function displayDate(value) {
  if (!value) return "—";

  const date = String(value).slice(0, 10);
  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token") || 
    sessionStorage.getItem("token")
  );
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error ||
      (typeof result === "string" ? result : "") ||
      `Request failed with status ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed (${response.status}). Please sign in again and check your counsellor permissions.`
      );
    }

    throw new Error(message);
  }

  return result;
}

/*
 * Converts the backend User document into the shape used by this page.
 *
 * The backend stores course, fees, batch and access information inside
 * admissionDetails. Some fields, such as phone, may not exist in User.js.
 */
function normalizeStudent(raw) {
  const details = raw?.admissionDetails || {};

  const totalFee = Number(details.totalFee ?? raw.totalFee ?? 0);
  const totalPaid = Number(
    raw.totalPaid ?? details.totalPaid ?? details.paidAmount ?? 0
  );

  const calculatedFeeStatus =
    details.feeStatus ||
    (totalFee > 0 && totalPaid >= totalFee ? "Clear" : "Pending");

  const createdDate = raw.createdAt
    ? toDateInput(raw.createdAt)
    : "";

  const isActive =
    typeof raw.isActive === "boolean" ? raw.isActive : true;

  return {
    id: raw._id || raw.id,
    userId: raw.userId || "",
    name: raw.name || raw.studentName || "",
    email: raw.email || "",
    phone: raw.phone || details.phone || "",
    course: details.course || raw.course || "",
    trainer: details.trainer || raw.trainer || "",
    mode: details.mode || "Online",
    batchType: details.batchType || "Mon-Th",
    batchStartDate: toDateInput(details.batchStartDate),
    batchEndDate: toDateInput(details.batchEndDate),
    batchTime: details.time || details.batchTime || "",
    admissionDate: toDateInput(
      details.admissionDate || raw.admissionDate || raw.createdAt
    ),
    totalFee,
    totalPaid,
    feeStatus: calculatedFeeStatus,
    videoAccess: details.videoAccess || "Yes",
    status: details.status || (isActive ? "Active" : "On Hold"),
    notes: details.notes || "",
    isActive,
    raw,
  };
}

function exportStudents(students) {
  const columns = [
    ["userId", "Student ID"],
    ["name", "Student Name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["course", "Course"],
    ["trainer", "Trainer"],
    ["mode", "Mode"],
    ["batchType", "Batch Type"],
    ["batchStartDate", "Batch Start Date"],
    ["batchEndDate", "Batch End Date"],
    ["batchTime", "Batch Time"],
    ["admissionDate", "Admission Date"],
    ["totalFee", "Total Fee"],
    ["feeStatus", "Fee Status"],
    ["videoAccess", "Video Access"],
    ["status", "Student Status"],
  ];

  const escapeCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.map(([, heading]) => escapeCell(heading)).join(","),
    ...students.map((student) =>
      columns.map(([key]) => escapeCell(student[key])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "appwars-students.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getResponseStudents(result) {
  // Supports common controller response shapes:
  // { success: true, data: [...] }
  // { success: true, data: { admissions: [...] } }
  // { admissions: [...] }
  // [...]

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.admissions)) return result.admissions;
  if (Array.isArray(result?.data?.admissions)) {
    return result.data.admissions;
  }
  if (Array.isArray(result?.data?.students)) {
    return result.data.students;
  }
  if (Array.isArray(result?.students)) return result.students;

  return [];
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [feeFilter, setFeeFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest(ADMISSIONS_URL, {
        method: "GET",
      });

      const records = getResponseStudents(result);
      setStudents(records.map(normalizeStudent));
    } catch (err) {
      setError(err.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const courses = useMemo(
    () =>
      [
        ...new Set(
          students.map((student) => student.course).filter(Boolean)
        ),
      ].sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !term ||
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.phone.includes(term) ||
        student.course.toLowerCase().includes(term) ||
        student.trainer.toLowerCase().includes(term) ||
        student.userId.toLowerCase().includes(term);

      return (
        matchesSearch &&
        (courseFilter === "All" || student.course === courseFilter) &&
        (statusFilter === "All" || student.status === statusFilter) &&
        (modeFilter === "All" || student.mode === modeFilter) &&
        (feeFilter === "All" || student.feeStatus === feeFilter)
      );
    });
  }, [
    students,
    search,
    courseFilter,
    statusFilter,
    modeFilter,
    feeFilter,
  ]);

  const activeCount = students.filter(
    (student) => student.status === "Active"
  ).length;

  const totalFees = students.reduce(
    (sum, student) => sum + Number(student.totalFee || 0),
    0
  );

  const pendingCount = students.filter(
    (student) => student.feeStatus !== "Clear"
  ).length;

  function openAddModal() {
    setEditingId(null);
    setForm({
      ...emptyStudent,
      admissionDate: toDateInput(new Date()),
    });
    setSelectedStudent(null);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingId(student.id);
    setForm({
      ...emptyStudent,
      ...student,
      totalFee: String(student.totalFee ?? ""),
      batchStartDate: toDateInput(student.batchStartDate),
      batchEndDate: toDateInput(student.batchEndDate),
      admissionDate: toDateInput(student.admissionDate),
    });
    setSelectedStudent(null);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function closeForm() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyStudent);
  }

  async function saveStudent(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const record = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        course: form.course.trim(),
        trainer: form.trainer.trim(),
        mode: form.mode,
        batchType: form.batchType,
        batchStartDate: form.batchStartDate || null,
        batchEndDate: form.batchEndDate || null,
        time: form.batchTime.trim(),
        admissionDate: form.admissionDate || null,
        totalFee: Number(form.totalFee) || 0,
        feeStatus: form.feeStatus,
        videoAccess: form.videoAccess,
        status: form.status,
        isActive: form.status === "Active",
        notes: form.notes.trim(),
      };

      /*
       * This payload matches the counsellor admissions controller:
       * student identity fields are top-level and course/batch/fee
       * metadata is saved in admissionDetails.
       */
      const payload = {
        name: record.name,
        email: record.email,
        phone: record.phone,
        isActive: record.isActive,
        admissionDetails: {
          course: record.course,
          totalFee: record.totalFee,
          feeStatus: record.feeStatus,
          trainer: record.trainer,
          mode: record.mode,
          batchType: record.batchType,
          batchStartDate: record.batchStartDate,
          batchEndDate: record.batchEndDate,
          time: record.time,
          admissionDate: record.admissionDate,
          videoAccess: record.videoAccess,
          status: record.status,
          notes: record.notes,
        },
      };

      const isEditing = editingId !== null;
      const url = isEditing
        ? `${ADMISSIONS_URL}/${encodeURIComponent(editingId)}`
        : ADMISSIONS_URL;

      const result = await apiRequest(url, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      /*
       * Reload from MongoDB instead of assuming the server saved
       * every field exactly as submitted.
       */
      await loadStudents();

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyStudent);
      setNotice(
        result?.message ||
          (isEditing
            ? "Student updated successfully."
            : "Student added successfully.")
      );
    } catch (err) {
      setError(err.message || "Unable to save student.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(student) {
    const confirmed = window.confirm(
      `Delete student record for ${student.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(student.id);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `${ADMISSIONS_URL}/${encodeURIComponent(student.id)}`,
        { method: "DELETE" }
      );

      setStudents((previous) =>
        previous.filter((item) => item.id !== student.id)
      );

      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }

      setNotice(result?.message || "Student deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete student.");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = [
    {
      label: "Total Students",
      value: students.length,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Active Students",
      value: activeCount,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Pending Fee Accounts",
      value: pendingCount,
      icon: Clock,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Total Course Fees",
      value: money(totalFees),
      icon: GraduationCap,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  function avatarText(name) {
    return String(name || "Student")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Counsellor Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Students
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage student profiles, courses, batches, fees, and learning access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportStudents(filteredStudents)}
            disabled={loading || filteredStudents.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Student
          </button>
        </div>
      </div>

      {/* API error and success messages */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Request failed</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                    {loading ? "…" : stat.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-semibold text-slate-800">
            Search and Filter Students
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, phone, ID..."
              aria-label="Search students"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className={inputClass}
            aria-label="Filter by course"
          >
            <option value="All">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="All">All Student Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Dropped">Dropped</option>
          </select>

          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
            className={inputClass}
            aria-label="Filter by batch mode"
          >
            <option value="All">All Batch Modes</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <select
            value={feeFilter}
            onChange={(event) => setFeeFilter(event.target.value)}
            className={inputClass}
            aria-label="Filter by fee status"
          >
            <option value="All">All Fee Statuses</option>
            <option value="Clear">Clear</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </section>

      {/* Student table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Student Directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading students from the backend..."
                : `Showing ${filteredStudents.length} of ${students.length} student(s)`}
            </p>
          </div>

          <button
            type="button"
            onClick={loadStudents}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Contact",
                  "Course",
                  "Trainer",
                  "Batch",
                  "Total Fee",
                  "Fee Status",
                  "Video Access",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
                    <p className="font-semibold text-slate-700">
                      Loading student records
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Connecting to the APPWARS LMS backend.
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {avatarText(student.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {student.name}
                            </p>
                            {student.userId && (
                              <p className="mt-1 text-xs text-blue-700">
                                ID: {student.userId}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-slate-400">
                              Joined {displayDate(student.admissionDate)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="flex items-center gap-2 text-slate-600">
                          <Mail size={14} className="shrink-0 text-slate-400" />
                          {student.email || "—"}
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-slate-600">
                          <Phone size={14} className="shrink-0 text-slate-400" />
                          {student.phone || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {student.course || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {student.trainer || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-700">
                          {student.mode}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {student.batchType} · {student.batchTime || "Time not set"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {displayDate(student.batchStartDate)}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {money(student.totalFee)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            student.feeStatus === "Clear"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {student.feeStatus}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            student.videoAccess === "Yes"
                              ? "text-green-700"
                              : "text-slate-400"
                          }`}
                        >
                          <Video size={15} />
                          {student.videoAccess}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            student.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : student.status === "Completed"
                                ? "bg-blue-100 text-blue-700"
                                : student.status === "On Hold"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="View student"
                            onClick={() => setSelectedStudent(student)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            type="button"
                            title="Edit student"
                            onClick={() => openEditModal(student)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            title="Delete student"
                            disabled={deletingId === student.id}
                            onClick={() => deleteStudent(student)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingId === student.id ? (
                              <RefreshCw size={17} className="animate-spin" />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-16 text-center">
                        <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p className="font-semibold text-slate-700">
                          No students found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Change your filters or add a new student.
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / edit student modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId !== null ? "Edit Student" : "Add New Student"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the student profile, course, and batch details.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveStudent} className="space-y-6 p-5">
              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Full Name *">
                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Student full name"
                    />
                  </Field>

                  <Field label="Email Address *">
                    <input
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="student@example.com"
                    />
                  </Field>

                  <Field label="Phone Number">
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Phone number"
                      pattern="[0-9+() -]{7,20}"
                    />
                  </Field>

                  <Field label="Admission Date">
                    <input
                      type="date"
                      name="admissionDate"
                      value={form.admissionDate}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Course and Fees
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Course Name *">
                    <input
                      required
                      name="course"
                      value={form.course}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Course name"
                    />
                  </Field>

                  <Field label="Trainer Name">
                    <input
                      name="trainer"
                      value={form.trainer}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Assigned trainer"
                    />
                  </Field>

                  <Field label="Total Course Fee (₹)">
                    <input
                      min="0"
                      type="number"
                      name="totalFee"
                      value={form.totalFee}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Fee Status">
                    <select
                      name="feeStatus"
                      value={form.feeStatus}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Clear">Clear</option>
                    </select>
                  </Field>

                  <Field label="Student Status">
                    <select
                      name="status"
                      value={form.status}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Dropped">Dropped</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Batch and Learning Access
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Batch Mode">
                    <select
                      name="mode"
                      value={form.mode}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </Field>

                  <Field label="Batch Type">
                    <select
                      name="batchType"
                      value={form.batchType}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="Mon-Th">Mon-Th</option>
                      <option value="Weekend">Weekend</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </Field>

                  <Field label="Batch Time">
                    <input
                      name="batchTime"
                      value={form.batchTime}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="e.g. 10:00 AM"
                    />
                  </Field>

                  <Field label="Batch Start Date">
                    <input
                      type="date"
                      name="batchStartDate"
                      value={form.batchStartDate}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Batch End Date">
                    <input
                      type="date"
                      name="batchEndDate"
                      value={form.batchEndDate}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Video Access">
                    <select
                      name="videoAccess"
                      value={form.videoAccess}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </Field>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <Field label="Internal Notes">
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={updateField}
                        rows={3}
                        className={inputClass}
                        placeholder="Optional student or counselling notes"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <RefreshCw size={16} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Student"
                      : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student profile modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {avatarText(selectedStudent.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedStudent.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Student Profile
                    {selectedStudent.userId
                      ? ` · ${selectedStudent.userId}`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {[
                ["Email", selectedStudent.email],
                ["Phone", selectedStudent.phone],
                ["Course", selectedStudent.course],
                ["Trainer", selectedStudent.trainer],
                ["Total Course Fee", money(selectedStudent.totalFee)],
                ["Fee Status", selectedStudent.feeStatus],
                ["Admission Date", displayDate(selectedStudent.admissionDate)],
                ["Batch Mode", selectedStudent.mode],
                ["Batch Type", selectedStudent.batchType],
                ["Batch Time", selectedStudent.batchTime],
                ["Batch Start Date", displayDate(selectedStudent.batchStartDate)],
                ["Batch End Date", displayDate(selectedStudent.batchEndDate)],
                ["Video Access", selectedStudent.videoAccess],
                ["Student Status", selectedStudent.status],
                ["Notes", selectedStudent.notes || "No notes"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={() => openEditModal(selectedStudent)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Pencil size={16} />
                Edit Student
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        APPWARS LMS · Student records are loaded from the counsellor backend.
      </p>
    </div>
  );
}
