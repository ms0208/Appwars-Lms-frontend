"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  GraduationCap,
  Clock,
  CalendarDays,
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Timer,
  ClipboardCheck,
  Filter,
  LogIn,
  LogOut,
  Eye,
  RefreshCw,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const COMPANY_START = "10:00";
const COMPANY_END = "19:00";
const STATUSES = ["Present", "Late", "Absent", "Half Day", "Leave"];

const emptyStudent = () => ({
  name: "",
  email: "",
  batch: "",
  course: "",
  date: new Date().toLocaleDateString("en-CA"),
  checkIn: "",
  checkOut: "",
  status: "Present",
  remarks: "",
});

const emptyTrainer = () => ({
  name: "",
  email: "",
  specialization: "",
  date: new Date().toLocaleDateString("en-CA"),
  checkIn: "",
  checkOut: "",
  status: "Present",
  remarks: "",
});

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;

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

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.attendance)) return data.attendance;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getName(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.name || value.fullName || value.title || value.code || "";
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

function mapAttendance(record, type) {
  const person = type === "student" ? record.student : record.trainer;
  const batch = record.batch;
  const course =
    record.course || (typeof batch === "object" ? batch?.course : null);

  return {
    ...record,
    id: record._id || record.id,
    type: record.type || type,
    name: record.name || getName(person),
    email: record.email || person?.email || "",
    batch:
      typeof batch === "object"
        ? batch?.code || batch?.name || ""
        : batch || "",
    course: getName(course) || record.courseName || "",
    specialization:
      record.specialization ||
      person?.specialization ||
      person?.expertise ||
      "",
    date: record.date ? String(record.date).slice(0, 10) : "",
    checkIn: record.checkIn || "",
    checkOut: record.checkOut || "",
    status: record.status || "Absent",
    remarks: record.remarks || "",
  };
}

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function durationBetween(start, end) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes < startMinutes
  ) {
    return null;
  }

  return endMinutes - startMinutes;
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return "—";

  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function getTrainerTiming(record) {
  const checkIn = timeToMinutes(record.checkIn);
  const checkOut = timeToMinutes(record.checkOut);

  return {
    late: checkIn !== null && checkIn > timeToMinutes(COMPANY_START),
    earlyDeparture:
      checkOut !== null && checkOut < timeToMinutes(COMPANY_END),
    duration: durationBetween(record.checkIn, record.checkOut),
    missingCheckout: Boolean(record.checkIn) && !record.checkOut,
  };
}

function calculateStatus(record, type) {
  if (!record.checkIn) return "Absent";

  if (type === "trainer") {
    return getTrainerTiming(record).late ? "Late" : "Present";
  }

  return timeToMinutes(record.checkIn) > timeToMinutes(COMPANY_START)
    ? "Late"
    : "Present";
}

function StatusBadge({ status }) {
  const styles = {
    Present: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Late: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Absent: "bg-red-50 text-red-700 ring-red-600/20",
    "Half Day": "bg-blue-50 text-blue-700 ring-blue-600/20",
    Leave: "bg-purple-50 text-purple-700 ring-purple-600/20",
  };

  const icons = {
    Present: CheckCircle2,
    Late: Timer,
    Absent: XCircle,
    "Half Day": Clock,
    Leave: CalendarDays,
  };

  const Icon = icons[status] || ClipboardCheck;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-gray-50 text-gray-700 ring-gray-600/20"
      }`}
    >
      <Icon size={13} />
      {status}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className={`rounded-xl p-3 ${colors[color] || colors.blue}`}>
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

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("student");
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
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
  const [form, setForm] = useState(emptyStudent());
  const [formError, setFormError] = useState("");

  const records = activeTab === "student" ? students : trainers;
  const setRecords = activeTab === "student" ? setStudents : setTrainers;
  const isTrainer = activeTab === "trainer";

  const loadAttendance = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setPageError("");

    try {
      const [studentData, trainerData] = await Promise.all([
        apiRequest("/admin/attendance?type=student"),
        apiRequest("/admin/attendance?type=trainer"),
      ]);

      setStudents(
        getItems(studentData).map((item) => mapAttendance(item, "student"))
      );

      setTrainers(
        getItems(trainerData).map((item) => mapAttendance(item, "trainer"))
      );
    } catch (error) {
      setPageError(error.message || "Failed to load attendance records.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch = [
        record.name,
        record.email,
        record.batch,
        record.course,
        record.specialization,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const matchesDate = !filterDate || record.date === filterDate;
      const matchesStatus =
        filterStatus === "All" || record.status === filterStatus;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [records, search, filterDate, filterStatus]);

  const summary = useMemo(
    () => ({
      total: records.length,
      present: records.filter((r) => r.status === "Present").length,
      late: records.filter((r) => r.status === "Late").length,
      absent: records.filter((r) => r.status === "Absent").length,
      halfDay: records.filter((r) => r.status === "Half Day").length,
      leave: records.filter((r) => r.status === "Leave").length,
    }),
    [records]
  );

  function resetFilters() {
    setSearch("");
    setFilterDate("");
    setFilterStatus("All");
  }

  function openAddModal() {
    setEditingId(null);
    setForm(activeTab === "student" ? emptyStudent() : emptyTrainer());
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(record) {
    setEditingId(record.id);
    setForm({ ...record });
    setFormError("");
    setModalOpen(true);
  }

  function changeTab(tab) {
    setActiveTab(tab);
    resetFilters();
    setViewRecord(null);
    setNotice("");
    setPageError("");
  }

  function updateForm(field, value) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };

      if (
        (field === "checkIn" || field === "checkOut") &&
        next.status !== "Leave" &&
        next.status !== "Half Day"
      ) {
        next.status = calculateStatus(next, activeTab);
      }

      return next;
    });
  }

  async function saveRecord(event) {
    event.preventDefault();
    setFormError("");
    setPageError("");
    setNotice("");

    if (!form.name.trim() || !form.date) {
      setFormError("Name and attendance date are required.");
      return;
    }

    if (form.checkOut && !form.checkIn) {
      setFormError("Enter check-in time before adding a check-out time.");
      return;
    }

    if (
      form.checkIn &&
      form.checkOut &&
      durationBetween(form.checkIn, form.checkOut) === null
    ) {
      setFormError("Check-out must be later than or equal to check-in.");
      return;
    }

    const duplicate = records.some(
      (record) =>
        String(record.id) !== String(editingId) &&
        record.email?.toLowerCase() === form.email.trim().toLowerCase() &&
        record.date === form.date &&
        form.email.trim()
    );

    if (duplicate) {
      setFormError(
        "An attendance record for this email and date already exists."
      );
      return;
    }

    const payload = {
      type: activeTab,
      name: form.name.trim(),
      email: form.email.trim(),
      date: form.date,
      checkIn: form.checkIn || "",
      checkOut: form.checkOut || "",
      status:
        form.status === "Leave" || form.status === "Half Day"
          ? form.status
          : calculateStatus(form, activeTab),
      remarks: form.remarks?.trim() || "",
      ...(activeTab === "student"
        ? {
            batch: form.batch?.trim() || "",
            course: form.course?.trim() || "",
          }
        : {
            specialization: form.specialization?.trim() || "",
          }),
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
          ? "Attendance updated successfully."
          : "Attendance added successfully."
      );

      await loadAttendance(false);
    } catch (error) {
      setFormError(error.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    if (
      !window.confirm(
        `Delete attendance for ${record.name} on ${record.date}?`
      )
    ) {
      return;
    }

    setPageError("");
    setNotice("");

    try {
      await apiRequest(
        `/admin/attendance/${encodeURIComponent(record.id)}`,
        {
          method: "DELETE",
        }
      );

      setStudents((previous) =>
        previous.filter((item) => item.id !== record.id)
      );

      setTrainers((previous) =>
        previous.filter((item) => item.id !== record.id)
      );

      if (viewRecord?.id === record.id) setViewRecord(null);

      setNotice("Attendance deleted successfully.");
    } catch (error) {
      setPageError(error.message || "Failed to delete attendance.");
    }
  }

  async function markAbsent(record) {
    if (
      !window.confirm(`Mark ${record.name} absent on ${record.date}?`)
    ) {
      return;
    }

    try {
      await apiRequest(
        `/admin/attendance/${encodeURIComponent(record.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "Absent",
            checkIn: "",
            checkOut: "",
          }),
        }
      );

      await loadAttendance(false);
      setNotice(`${record.name} marked absent.`);
    } catch (error) {
      setPageError(error.message || "Failed to mark attendance absent.");
    }
  }

  function exportCSV() {
    const headers = isTrainer
      ? [
          "Name",
          "Email",
          "Specialization",
          "Date",
          "Scheduled Check In",
          "Scheduled Check Out",
          "Check In",
          "Check Out",
          "Working Duration",
          "Late Arrival",
          "Early Departure",
          "Status",
          "Remarks",
        ]
      : [
          "Name",
          "Email",
          "Batch",
          "Course",
          "Date",
          "Check In",
          "Check Out",
          "Status",
          "Remarks",
        ];

    const rows = filteredRecords.map((record) => {
      if (!isTrainer) {
        return [
          record.name,
          record.email,
          record.batch,
          record.course,
          record.date,
          record.checkIn,
          record.checkOut,
          record.status,
          record.remarks,
        ];
      }

      const timing = getTrainerTiming(record);

      return [
        record.name,
        record.email,
        record.specialization,
        record.date,
        COMPANY_START,
        COMPANY_END,
        record.checkIn,
        record.checkOut,
        formatDuration(timing.duration),
        timing.late ? "Yes" : "No",
        timing.earlyDeparture ? "Yes" : "No",
        record.status,
        record.remarks,
      ];
    });

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
    link.download = `${activeTab}-attendance-${new Date().toLocaleDateString("en-CA")}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <ClipboardCheck size={17} />
              APPWARS LMS / Attendance
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Attendance Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage student attendance and trainer working hours from one
              dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              <Download size={17} />
              Export CSV
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102b53]"
            >
              <Plus size={18} />
              Add {isTrainer ? "Trainer" : "Student"} Attendance
            </button>
          </div>
        </div>
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

        {isTrainer && (
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
                <Clock size={21} />
              </div>
              <div>
                <p className="font-semibold text-blue-950">
                  Fixed Company Working Hours
                </p>
                <p className="mt-1 text-sm text-blue-800">
                  Company check-in: <strong>10:00 AM</strong> · Company
                  check-out: <strong>7:00 PM</strong>
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Late arrival is detected after 10:00 AM. Early departure is
                  flagged before 7:00 PM.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <LogIn size={16} className="text-emerald-600" />
              Admin-recorded check-in/out
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <button
            onClick={() => changeTab("student")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              !isTrainer
                ? "bg-[#173b70] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <GraduationCap size={18} />
            Student Attendance
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                !isTrainer
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {students.length}
            </span>
          </button>

          <button
            onClick={() => changeTab("trainer")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              isTrainer
                ? "bg-[#173b70] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users size={18} />
            Trainer Attendance
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isTrainer
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {trainers.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-12 text-sm text-gray-600">
            <RefreshCw size={18} className="animate-spin" />
            Loading attendance records...
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={`Total ${isTrainer ? "Trainers" : "Students"}`}
                value={summary.total}
                subtitle="Attendance records"
                icon={isTrainer ? Users : GraduationCap}
                color="blue"
              />
              <StatCard
                title="Present"
                value={summary.present}
                subtitle="Marked present"
                icon={CheckCircle2}
                color="green"
              />
              <StatCard
                title="Late Arrivals"
                value={summary.late}
                subtitle="Marked late"
                icon={Timer}
                color="amber"
              />
              <StatCard
                title="Absent"
                value={summary.absent}
                subtitle="Marked absent"
                icon={XCircle}
                color="red"
              />
            </div>

            {/* Search and filters */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Filter size={18} className="text-gray-500" />
                <h2 className="font-semibold text-gray-900">
                  Search and Filters
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      isTrainer
                        ? "Search trainer, email, specialization..."
                        : "Search student, email, course..."
                    }
                    className={`${inputClass} pl-10`}
                  />
                </div>

                <input
                  type="date"
                  value={filterDate}
                  onChange={(event) => setFilterDate(event.target.value)}
                  className={inputClass}
                  aria-label="Filter attendance date"
                />

                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className={inputClass}
                  aria-label="Filter attendance status"
                >
                  <option value="All">All statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetFilters}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Attendance table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">
                    {isTrainer
                      ? "Trainer Attendance Records"
                      : "Student Attendance Records"}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Showing {filteredRecords.length} of {records.length} records
                  </p>
                </div>

                {isTrainer && (
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <LogIn size={14} className="text-emerald-600" />
                      Check-in 10:00 AM
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LogOut size={14} className="text-blue-600" />
                      Check-out 7:00 PM
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">
                        {isTrainer ? "Trainer" : "Student"}
                      </th>

                      {isTrainer ? (
                        <>
                          <th className="px-4 py-4 font-semibold">
                            Specialization
                          </th>
                          <th className="px-4 py-4 font-semibold">Date</th>
                          <th className="px-4 py-4 font-semibold">Check In</th>
                          <th className="px-4 py-4 font-semibold">Check Out</th>
                          <th className="px-4 py-4 font-semibold">
                            Working Hours
                          </th>
                          <th className="px-4 py-4 font-semibold">
                            Timing Notes
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-4 font-semibold">
                            Course / Batch
                          </th>
                          <th className="px-4 py-4 font-semibold">Date</th>
                          <th className="px-4 py-4 font-semibold">Check In</th>
                          <th className="px-4 py-4 font-semibold">Check Out</th>
                        </>
                      )}

                      <th className="px-4 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((record) => {
                      const timing = isTrainer
                        ? getTrainerTiming(record)
                        : null;

                      return (
                        <tr
                          key={record.id}
                          className="transition hover:bg-gray-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                                {(record.name || "?")
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">
                                  {record.name}
                                </p>
                                <p className="mt-1 max-w-[200px] truncate text-xs text-gray-500">
                                  {record.email || "No email provided"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {isTrainer ? (
                            <>
                              <td className="px-4 py-4 text-gray-600">
                                {record.specialization || "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                                {record.date || "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4">
                                <span className="font-medium text-gray-800">
                                  {record.checkIn || "—"}
                                </span>
                                {timing.late && (
                                  <p className="mt-1 text-xs font-medium text-amber-700">
                                    Late arrival
                                  </p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4">
                                <span className="font-medium text-gray-800">
                                  {record.checkOut || "—"}
                                </span>
                                {timing.earlyDeparture && (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    Early departure
                                  </p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-700">
                                {formatDuration(timing.duration)}
                                {timing.missingCheckout && (
                                  <p className="mt-1 text-xs font-normal text-amber-700">
                                    Checkout pending
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col items-start gap-1">
                                  {timing.late && (
                                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                                      Late
                                    </span>
                                  )}
                                  {timing.earlyDeparture && (
                                    <span className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                                      Left early
                                    </span>
                                  )}
                                  {!timing.late &&
                                    !timing.earlyDeparture && (
                                      <span className="text-xs text-gray-400">
                                        {record.checkIn && record.checkOut
                                          ? "Within schedule"
                                          : "—"}
                                      </span>
                                    )}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-4">
                                <p className="font-medium text-gray-800">
                                  {record.course || "—"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {record.batch || "No batch"}
                                </p>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                                {record.date || "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                                {record.checkIn || "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                                {record.checkOut || "—"}
                              </td>
                            </>
                          )}

                          <td className="px-4 py-4">
                            <StatusBadge status={record.status} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() =>
                                  setViewRecord({
                                    ...record,
                                    type: activeTab,
                                  })
                                }
                                title="View attendance"
                                className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                onClick={() => openEditModal(record)}
                                title="Edit attendance"
                                className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                onClick={() => deleteRecord(record)}
                                title="Delete attendance"
                                className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRecords.length === 0 && (
                      <tr>
                        <td
                          colSpan={isTrainer ? 9 : 7}
                          className="px-5 py-16 text-center"
                        >
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                            <CalendarDays size={24} />
                          </div>
                          <p className="mt-3 font-semibold text-gray-800">
                            No attendance records found
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Try changing your filters or add a new attendance
                            record.
                          </p>
                          <button
                            onClick={openAddModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#173b70] px-3 py-2 text-sm font-semibold text-white hover:bg-[#102b53]"
                          >
                            <Plus size={16} />
                            Add Attendance
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={19} className="text-blue-700" />
                  <h3 className="font-semibold text-gray-900">
                    Attendance Summary
                  </h3>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">Half Day</p>
                    <p className="mt-1 text-xl font-bold text-blue-900">
                      {summary.halfDay}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3">
                    <p className="text-xs text-purple-700">Leave</p>
                    <p className="mt-1 text-xl font-bold text-purple-900">
                      {summary.leave}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-600">Records</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {summary.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Clock size={19} className="text-blue-700" />
                  <h3 className="font-semibold text-gray-900">
                    {isTrainer
                      ? "Trainer Timing Policy"
                      : "Student Attendance Policy"}
                  </h3>
                </div>

                {isTrainer ? (
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p className="flex items-center justify-between gap-3">
                      Scheduled check-in
                      <strong className="text-gray-900">10:00 AM</strong>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      Late if after
                      <strong className="text-amber-700">10:00 AM</strong>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      Early departure if before
                      <strong className="text-red-600">7:00 PM</strong>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    Record each student&apos;s attendance for the selected
                    date. Use course and batch details to organize students,
                    and update the status for absences, late arrivals, half
                    days, and approved leave.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit" : "Add"}{" "}
                  {isTrainer ? "Trainer" : "Student"} Attendance
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {isTrainer
                    ? "Enter the trainer's actual check-in and check-out times."
                    : "Record the student's attendance for the selected date."}
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

            <form onSubmit={saveRecord} className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Full Name" required>
                  <input
                    required
                    value={form.name || ""}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Enter full name"
                  />
                </FormField>

                <FormField label="Email Address">
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    className={inputClass}
                    placeholder="name@example.com"
                  />
                </FormField>

                {isTrainer ? (
                  <FormField label="Specialization">
                    <input
                      value={form.specialization || ""}
                      onChange={(event) =>
                        updateForm("specialization", event.target.value)
                      }
                      className={inputClass}
                      placeholder="e.g. MERN Stack"
                    />
                  </FormField>
                ) : (
                  <>
                    <FormField label="Course">
                      <input
                        value={form.course || ""}
                        onChange={(event) =>
                          updateForm("course", event.target.value)
                        }
                        className={inputClass}
                        placeholder="e.g. MERN Stack Development"
                      />
                    </FormField>

                    <FormField label="Batch">
                      <input
                        value={form.batch || ""}
                        onChange={(event) =>
                          updateForm("batch", event.target.value)
                        }
                        className={inputClass}
                        placeholder="e.g. MERN-01"
                      />
                    </FormField>
                  </>
                )}

                <FormField label="Attendance Date" required>
                  <input
                    type="date"
                    required
                    value={form.date || ""}
                    onChange={(event) =>
                      updateForm("date", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>
              </div>

              {isTrainer && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-950">
                    Fixed Company Schedule
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Scheduled Check In
                      </p>
                      <p className="mt-1 font-bold text-gray-900">10:00 AM</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Scheduled Check Out
                      </p>
                      <p className="mt-1 font-bold text-gray-900">7:00 PM</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-blue-800">
                    These scheduled times are fixed. Enter actual times below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Actual Check In">
                  <input
                    type="time"
                    value={form.checkIn || ""}
                    onChange={(event) =>
                      updateForm("checkIn", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Actual Check Out">
                  <input
                    type="time"
                    value={form.checkOut || ""}
                    onChange={(event) =>
                      updateForm("checkOut", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Attendance Status" required>
                  <select
                    required
                    value={form.status || "Present"}
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
                </FormField>

                <FormField label="Remarks">
                  <input
                    value={form.remarks || ""}
                    onChange={(event) =>
                      updateForm("remarks", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Optional note"
                  />
                </FormField>
              </div>

              {isTrainer && form.checkIn && form.checkOut && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Working Duration
                      </p>
                      <p className="mt-1 font-bold text-gray-900">
                        {formatDuration(
                          durationBetween(form.checkIn, form.checkOut)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Late Arrival</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {getTrainerTiming(form).late ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Early Departure</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {getTrainerTiming(form).earlyDeparture ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
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
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingId ? "Save Changes" : "Save Attendance"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewRecord(null);
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Attendance Details
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {viewRecord.name}
                </p>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">Status</span>
                <StatusBadge status={viewRecord.status} />
              </div>

              {[
                ["Name", viewRecord.name],
                ["Email", viewRecord.email || "—"],
                ["Date", viewRecord.date || "—"],
                [
                  viewRecord.type === "trainer"
                    ? "Specialization"
                    : "Course",
                  viewRecord.type === "trainer"
                    ? viewRecord.specialization || "—"
                    : viewRecord.course || "—",
                ],
                ...(viewRecord.type === "student"
                  ? [["Batch", viewRecord.batch || "—"]]
                  : [
                      ["Scheduled Check In", "10:00 AM"],
                      ["Scheduled Check Out", "7:00 PM"],
                    ]),
                ["Actual Check In", viewRecord.checkIn || "—"],
                ["Actual Check Out", viewRecord.checkOut || "—"],
                ["Remarks", viewRecord.remarks || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
                >
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="max-w-[65%] break-words text-right text-sm font-medium text-gray-900">
                    {value}
                  </span>
                </div>
              ))}

              {viewRecord.type === "trainer" && (
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-blue-950">
                    Timing Analysis
                  </p>
                  <div className="space-y-2 text-sm text-blue-900">
                    <p>
                      Working duration:{" "}
                      <strong>
                        {formatDuration(
                          getTrainerTiming(viewRecord).duration
                        )}
                      </strong>
                    </p>
                    <p>
                      Late arrival:{" "}
                      <strong>
                        {getTrainerTiming(viewRecord).late ? "Yes" : "No"}
                      </strong>
                    </p>
                    <p>
                      Early departure:{" "}
                      <strong>
                        {getTrainerTiming(viewRecord).earlyDeparture
                          ? "Yes"
                          : "No"}
                      </strong>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => {
                    setViewRecord(null);
                    openEditModal(
                      records.find(
                        (record) => record.id === viewRecord.id
                      ) || viewRecord
                    );
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  <Pencil size={16} />
                  Edit Attendance
                </button>

                <button
                  onClick={() => markAbsent(viewRecord)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  <XCircle size={16} />
                  Mark Absent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}