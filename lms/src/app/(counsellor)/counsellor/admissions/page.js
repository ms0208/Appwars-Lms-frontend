
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  X,
  Users,
  IndianRupee,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const API_ROOT = API_BASE.endsWith("/api")
  ? API_BASE
  : `${API_BASE}/api`;

const emptyAdmission = {
  studentName: "",
  email: "",
  batch: "",
  course: "",
  totalFee: "",
  registrationFee: "",
  installment0: "",
  installment1: "",
  installment2: "",
  installment3: "",
  bajajFinance: "No",
  paymentMode: "UPI",
  feeStatus: "Pending",
  trainer: "",
  mode: "Online",
  batchType: "Mon-Th",
  batchStartDate: "",
  time: "",
  batchEndDate: "",
  videoAccess: "Yes",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "block text-sm font-medium text-slate-700";

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

function dateOnly(value) {
  if (!value) return "";

  const date = String(value).slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function displayDate(value) {
  const date = dateOnly(value);

  if (!date) return "—";

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function mapAdmission(student) {
  const details = student.admissionDetails || {};
  const payments = student.payments || [];

  const paidFromPayments = payments
    .filter((payment) => payment.status === "Paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const pendingFromPayments = payments
    .filter((payment) => payment.status === "Pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const paid = Number(student.totalPaid ?? paidFromPayments);
  const pending = Number(student.totalPending ?? pendingFromPayments);

  return {
    id: student._id,
    userId: student.userId || "",
    studentName: student.name || "",
    email: student.email || "",
    batch: student.batch || "",
    course: details.course || payments[0]?.courseName || "",
    totalFee: details.totalFee ?? 0,
    registrationFee: details.registrationFee ?? 0,
    installment0: details.installment0 ?? 0,
    installment1: details.installment1 ?? 0,
    installment2: details.installment2 ?? 0,
    installment3: details.installment3 ?? 0,
    bajajFinance: details.bajajFinance || "No",
    paymentMode: details.paymentMode || "UPI",
    feeStatus:
      pending > 0
        ? "Pending"
        : paid > 0
          ? "Clear"
          : details.feeStatus || "Pending",
    trainer: details.trainer || "",
    mode: details.mode || "Online",
    batchType: details.batchType || "Mon-Th",
    batchStartDate: dateOnly(details.batchStartDate),
    time: details.time || "",
    batchEndDate: dateOnly(details.batchEndDate),
    videoAccess: details.videoAccess || "Yes",
    admissionDate: dateOnly(student.createdAt),
    totalPaid: paid,
    totalPending: pending,
    isActive: student.isActive !== false,
    payments,
  };
}

async function apiRequest(endpoint, options = {}) {
  const token =
   typeof window !== "undefined"
    ? (
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token")
      )
    : null;

if (!token) {
  throw new Error(
    "Your session has expired. Please log in again."
  );
}
  const response = await fetch(`${API_ROOT}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      result.message ||
        "You are not authorized to manage admissions. Please sign in again or check your permissions."
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function downloadCSV(rows) {
  const columns = [
    "userId",
    "studentName",
    "email",
    "batch",
    "course",
    "totalFee",
    "registrationFee",
    "installment0",
    "installment1",
    "installment2",
    "installment3",
    "bajajFinance",
    "paymentMode",
    "feeStatus",
    "trainer",
    "mode",
    "batchType",
    "batchStartDate",
    "time",
    "batchEndDate",
    "videoAccess",
    "admissionDate",
  ];

  const csvCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "appwars-admissions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  const [form, setForm] = useState(emptyAdmission);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch all records so the frontend filters and CSV export
      // operate on the complete admission list.
      const result = await apiRequest(
        "/counsellor/admissions?limit=100"
      );

      const records = Array.isArray(result.data) ? result.data : [];

      setAdmissions(records.map(mapAdmission));

      const now = new Date();

      setCurrentMonth(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      );
    } catch (err) {
      setError(err.message || "Unable to load admissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  const months = useMemo(
    () =>
      [
        ...new Set(
          admissions
            .map((item) => item.admissionDate?.slice(0, 7))
            .filter(Boolean)
        ),
      ].sort((a, b) => b.localeCompare(a)),
    [admissions]
  );

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((item) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        item.studentName.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.userId.toLowerCase().includes(term) ||
        item.batch.toLowerCase().includes(term) ||
        item.course.toLowerCase().includes(term) ||
        item.trainer.toLowerCase().includes(term);

      const matchesFee =
        feeFilter === "All" || item.feeStatus === feeFilter;

      const matchesMode =
        modeFilter === "All" || item.mode === modeFilter;

      const matchesMonth =
        monthFilter === "All" ||
        item.admissionDate?.startsWith(monthFilter);

      return (
        matchesSearch &&
        matchesFee &&
        matchesMode &&
        matchesMonth
      );
    });
  }, [admissions, search, feeFilter, modeFilter, monthFilter]);

  const totalFees = filteredAdmissions.reduce(
    (sum, item) => sum + Number(item.totalFee || 0),
    0
  );

  const pendingCount = filteredAdmissions.filter(
    (item) => item.feeStatus === "Pending"
  ).length;

  function openAddModal() {
    setEditingId(null);

    setForm({
      ...emptyAdmission,
      ...(currentMonth
        ? {
            batchStartDate: "",
          }
        : {}),
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(admission) {
    setEditingId(admission.id);

    setForm({
      ...emptyAdmission,
      ...admission,
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function buildPayload() {
    return {
      name: form.studentName.trim(),
      email: form.email.trim().toLowerCase(),
      batch: form.batch.trim(),

      admissionDetails: {
        course: form.course.trim(),
        totalFee: Number(form.totalFee) || 0,
        registrationFee: Number(form.registrationFee) || 0,

        installment0: Number(form.installment0) || 0,
        installment1: Number(form.installment1) || 0,
        installment2: Number(form.installment2) || 0,
        installment3: Number(form.installment3) || 0,

        bajajFinance: form.bajajFinance,
        paymentMode: form.paymentMode,
        feeStatus: form.feeStatus,
        trainer: form.trainer.trim(),

        mode: form.mode,
        batchType: form.batchType,
        batchStartDate: form.batchStartDate || null,
        time: form.time.trim(),
        batchEndDate: form.batchEndDate || null,

        videoAccess: form.videoAccess,
      },
    };
  }

  async function saveAdmission(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = buildPayload();

      let result;

      if (editingId) {
        result = await apiRequest(
          `/counsellor/admissions/${editingId}`,
          {
            method: "PATCH",
            body: payload,
          }
        );

        setNotice("Admission updated successfully.");
      } else {
        result = await apiRequest("/counsellor/admissions", {
          method: "POST",
          body: payload,
        });

        setNotice("Admission created successfully.");

        const student = result.data?.student;

        // Display generated credentials once, only when returned
        // by the existing backend credential-generation workflow.
        if (student?.userId && result.data?.temporaryPassword) {
          window.alert(
            `Student admission created successfully.\n\n` +
              `Student ID: ${student.userId}\n` +
              `Temporary password: ${result.data.temporaryPassword}\n\n` +
              `Share these credentials securely.`
          );
        }
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyAdmission);

      await fetchAdmissions();
    } catch (err) {
      setError(err.message || "Unable to save admission.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAdmission(id) {
    const confirmed = window.confirm(
      "This will deactivate the student account. Existing payment history will be preserved. Continue?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/counsellor/admissions/${id}`, {
        method: "DELETE",
      });

      setAdmissions((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, isActive: false } : item
        )
      );

      if (selectedAdmission?.id === id) {
        setSelectedAdmission(null);
      }

      setNotice("Student account deactivated successfully.");
      await fetchAdmissions();
    } catch (err) {
      setError(err.message || "Unable to deactivate student.");
    } finally {
      setDeletingId(null);
    }
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
            Admissions
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage student registrations, course fees, and batch details.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadCSV(filteredAdmissions)}
            disabled={loading || filteredAdmissions.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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
            Add Admission
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchAdmissions}
            className="inline-flex shrink-0 items-center gap-2 font-semibold underline"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {notice}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Admissions",
            value: filteredAdmissions.length,
            icon: Users,
            color: "bg-blue-100 text-blue-700",
          },
          {
            label: "Total Course Fees",
            value: money(totalFees),
            icon: IndianRupee,
            color: "bg-indigo-100 text-indigo-700",
          },
          {
            label: "Pending Fee Accounts",
            value: pendingCount,
            icon: Clock,
            color: "bg-amber-100 text-amber-700",
          },
          {
            label: "Fee Clear Accounts",
            value: filteredAdmissions.filter(
              (item) => item.feeStatus === "Clear"
            ).length,
            icon: CheckCircle2,
            color: "bg-green-100 text-green-700",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {loading ? "—" : stat.value}
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-semibold text-slate-800">
            Search and Filter Admissions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, course, ID..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Admission Months</option>

            {months.map((month) => {
              const [year, monthNumber] = month.split("-");

              const label = new Date(
                Number(year),
                Number(monthNumber) - 1,
                1
              ).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              });

              return (
                <option key={month} value={month}>
                  {label}
                </option>
              );
            })}
          </select>

          <select
            value={feeFilter}
            onChange={(event) => setFeeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Fee Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Clear">Clear</option>
          </select>

          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Batch Modes</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* Admissions table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Student Admission Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredAdmissions.length} admission(s)
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAdmissions}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Total Fee",
                  "Registration",
                  "Installments",
                  "Payment",
                  "Fee Status",
                  "Trainer",
                  "Batch",
                  "Start Date",
                  "Time",
                  "Video",
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
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-700" />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading admissions from the server...
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredAdmissions.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t border-slate-100 hover:bg-slate-50 ${
                        !item.isActive ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {item.studentName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.userId}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.email}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {displayDate(item.admissionDate)}
                        </p>

                        {!item.isActive && (
                          <span className="mt-1 inline-block text-xs font-semibold text-red-600">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.course || "—"}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {money(item.totalFee)}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {money(item.registrationFee)}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {[0, 1, 2, 3].map((number) => (
                          <p key={number}>
                            {number}:{" "}
                            {money(item[`installment${number}`])}
                          </p>
                        ))}
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-slate-700">
                          {item.paymentMode}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Bajaj: {item.bajajFinance}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.feeStatus === "Clear"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.feeStatus}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.trainer || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-700">
                          {item.batch || "Not assigned"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.mode} · {item.batchType}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {displayDate(item.batchStartDate)}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.time || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            item.videoAccess === "Yes"
                              ? "font-medium text-green-700"
                              : "font-medium text-slate-400"
                          }
                        >
                          {item.videoAccess}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => setSelectedAdmission(item)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Edit admission"
                            onClick={() => openEditModal(item)}
                            disabled={!item.isActive}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            title="Deactivate student"
                            onClick={() => deleteAdmission(item.id)}
                            disabled={
                              !item.isActive || deletingId === item.id
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            {deletingId === item.id ? (
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

                  {filteredAdmissions.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-4 py-16 text-center">
                        <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />

                        <p className="font-semibold text-slate-700">
                          No admissions found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Change the filters or add a new admission.
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit Admission" : "Add New Admission"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter student, fee, and batch details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveAdmission} className="space-y-6 p-5">
              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Student and Course Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Student Name *">
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      name="studentName"
                      value={form.studentName}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Enter full name"
                    />
                  </Field>

                  <Field label="Student Email *">
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

                  <Field label="Batch Name">
                    <input
                      name="batch"
                      value={form.batch}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Existing active batch name"
                    />
                  </Field>

                  <Field label="Course *">
                    <input
                      required
                      name="course"
                      value={form.course}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="e.g. MERN Stack"
                    />
                  </Field>

                  <Field label="Total Course Fee (₹) *">
                    <input
                      required
                      min="0"
                      type="number"
                      name="totalFee"
                      value={form.totalFee}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Registration Fee (₹)">
                    <input
                      min="0"
                      type="number"
                      name="registrationFee"
                      value={form.registrationFee}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Trainer">
                    <input
                      name="trainer"
                      value={form.trainer}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Trainer name"
                    />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Installment Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["installment0", "Installment 0 (₹)"],
                    ["installment1", "Installment 1 (₹)"],
                    ["installment2", "Installment 2 (₹)"],
                    ["installment3", "Installment 3 (₹)"],
                  ].map(([name, label]) => (
                    <Field key={name} label={label}>
                      <input
                        min="0"
                        type="number"
                        name={name}
                        value={form[name]}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Bajaj Finance">
                    <select
                      name="bajajFinance"
                      value={form.bajajFinance}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </Field>

                  <Field label="Payment Mode">
                    <select
                      name="paymentMode"
                      value={form.paymentMode}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Debit/Credit Card</option>
                      <option>Bajaj Finance</option>
                      <option>Other</option>
                    </select>
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
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Batch Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Batch Mode">
                    <select
                      name="mode"
                      value={form.mode}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Online</option>
                      <option>Offline</option>
                      <option>Hybrid</option>
                    </select>
                  </Field>

                  <Field label="Batch Type">
                    <select
                      name="batchType"
                      value={form.batchType}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Mon-Th</option>
                      <option>Weekend</option>
                      <option>Custom</option>
                    </select>
                  </Field>

                  <Field label="Batch Time">
                    <input
                      name="time"
                      value={form.time}
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
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Admission"
                      : "Save Admission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View admission details */}
      {selectedAdmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Admission Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedAdmission.studentName}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {selectedAdmission.userId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {[
                ["Email", selectedAdmission.email],
                ["Batch", selectedAdmission.batch],
                ["Course", selectedAdmission.course],
                ["Admission Date", displayDate(selectedAdmission.admissionDate)],
                ["Total Fee", money(selectedAdmission.totalFee)],
                ["Registration Fee", money(selectedAdmission.registrationFee)],
                ["Installment 0", money(selectedAdmission.installment0)],
                ["Installment 1", money(selectedAdmission.installment1)],
                ["Installment 2", money(selectedAdmission.installment2)],
                ["Installment 3", money(selectedAdmission.installment3)],
                ["Recorded Payments", money(selectedAdmission.totalPaid)],
                ["Recorded Pending", money(selectedAdmission.totalPending)],
                ["Payment Mode", selectedAdmission.paymentMode],
                ["Bajaj Finance", selectedAdmission.bajajFinance],
                ["Fee Status", selectedAdmission.feeStatus],
                ["Trainer", selectedAdmission.trainer],
                ["Batch Mode", selectedAdmission.mode],
                ["Batch Type", selectedAdmission.batchType],
                ["Batch Start", displayDate(selectedAdmission.batchStartDate)],
                ["Batch End", displayDate(selectedAdmission.batchEndDate)],
                ["Batch Time", selectedAdmission.time],
                ["Video Access", selectedAdmission.videoAccess],
                ["Account Status", selectedAdmission.isActive ? "Active" : "Inactive"],
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
              {selectedAdmission.isActive && (
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(selectedAdmission);
                    setSelectedAdmission(null);
                  }}
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Edit Admission
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
