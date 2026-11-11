
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  Download,
  X,
  Pencil,
  Receipt,
  Clock,
  Wallet,
  Filter,
  Trash2,
  RefreshCw,
  AlertCircle,
  IndianRupee,
} from "lucide-react";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const API_ROOT = API_BASE.endsWith("/api")
  ? API_BASE
  : `${API_BASE}/api`;

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const PAYMENT_METHODS = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Cash",
];

const PAYMENT_STATUSES = [
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

const EMPTY_FORM = {
  student: "",
  batch: "",
  amount: "",
  collectedFees: "0",
  pendingFees: "0",
  currency: "INR",
  dueDate: "",
  paidAt: "",
  method: "UPI",
  reference: "",
  status: "Pending",
  notes: "",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "block text-sm font-medium text-slate-700";

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function Field({ label, children }) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function dateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateLabel(value) {
  if (!value) return "—";

  const date = dateInput(value);
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function getAuthToken() {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem("appwars_token") ||
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
}

function extractArray(result, keys = []) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.data)) return result.data;

  for (const key of keys) {
    if (Array.isArray(result?.[key])) {
      return result[key];
    }

    if (Array.isArray(result?.data?.[key])) {
      return result.data[key];
    }
  }

  return [];
}

// --------------------------------------------------
// API REQUEST
// --------------------------------------------------

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  const response = await fetch(`${API_ROOT}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error(
      result.message || "You are not authorized to manage payments."
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

// --------------------------------------------------
// STUDENT / BATCH HELPERS
// --------------------------------------------------

function getStudentName(student) {
  if (!student) return "Unknown student";

  if (typeof student === "string") return student;

  return (
    student.name ||
    student.studentName ||
    student.userId ||
    "Unknown student"
  );
}

function getBatchName(batch) {
  if (!batch) return "No batch";

  if (typeof batch === "string") return batch;

  return batch.batch || batch.name || batch.code || "No batch";
}

function getTrainerName(batch) {
  if (!batch || typeof batch !== "object") return "";

  const trainer = batch.trainer;

  if (!trainer) return "";

  if (typeof trainer === "string") return trainer;

  return trainer.name || trainer.userId || "";
}

// --------------------------------------------------
// NORMALIZE PAYMENT
// --------------------------------------------------

function normalizePayment(payment) {
  const student =
    payment.student && typeof payment.student === "object"
      ? payment.student
      : null;

  const batch =
    payment.batch && typeof payment.batch === "object"
      ? payment.batch
      : null;

  // Backward compatibility for old payment records.
  const totalFees = Number(
    payment.totalFees ?? payment.amount ?? 0
  );

  const collectedFees = Number(
    payment.collectedFees ??
      (payment.status === "Paid" ? totalFees : 0)
  );

  const pendingFees = Number(
    payment.pendingFees ??
      Math.max(0, totalFees - collectedFees)
  );

  return {
    ...payment,

    id: payment._id || payment.id,

    studentId:
      student?._id ||
      (typeof payment.student === "string"
        ? payment.student
        : ""),

    studentName: getStudentName(payment.student),

    studentUserId: student?.userId || "",
    studentEmail: student?.email || "",

    batchId:
      batch?._id ||
      (typeof payment.batch === "string"
        ? payment.batch
        : ""),

    batchName: getBatchName(payment.batch),

    courseName:
      batch?.course?.courseName ||
      batch?.course?.title ||
      (typeof batch?.course === "string" ? batch.course : "") ||
      "",

    trainerName: getTrainerName(batch),

    // Fee amounts
    amount: totalFees,
    totalFees,
    collectedFees,
    pendingFees,

    currency: payment.currency || "INR",
    status: payment.status || "Pending",
    method: payment.method || "UPI",

    dueDate: payment.dueDate || "",
    paidAt: payment.paidAt || "",

    reference: payment.reference || "",
    notes: payment.notes || "",

    createdAt: payment.createdAt || "",
  };
}

// --------------------------------------------------
// STATUS STYLING
// --------------------------------------------------

function statusClass(status) {
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-700";

    case "Pending":
      return "bg-amber-100 text-amber-700";

    case "Failed":
      return "bg-red-100 text-red-700";

    case "Refunded":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

// --------------------------------------------------
// CSV EXPORT
// --------------------------------------------------

function downloadCSV(rows) {
  const headers = [
    "Student",
    "Student ID",
    "Batch",
    "Course",
    "Trainer",
    "Total Fees",
    "Collected Fees",
    "Pending Fees",
    "Currency",
    "Status",
    "Payment Method",
    "Due Date",
    "Paid Date",
    "Reference",
    "Notes",
  ];

  const cell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.map(cell).join(","),

    ...rows.map((payment) =>
      [
        payment.studentName,
        payment.studentUserId,
        payment.batchName,
        payment.courseName,
        payment.trainerName,
        payment.totalFees,
        payment.collectedFees,
        payment.pendingFees,
        payment.currency,
        payment.status,
        payment.method,
        dateInput(payment.dueDate),
        dateInput(payment.paidAt),
        payment.reference,
        payment.notes,
      ]
        .map(cell)
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "appwars-counsellor-payment-records.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

// ==================================================
// MAIN PAGE
// ==================================================

export default function FeeManagementPage() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [today, setToday] = useState("");

  // --------------------------------------------------
  // FETCH PAYMENTS
  // --------------------------------------------------

  const fetchPayments = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    setError("");

    try {
      const result = await apiRequest(
        "/counsellor/fees?limit=100&page=1"
      );

      const records = extractArray(result, ["payments"]);

      setPayments(records.map(normalizePayment));
    } catch (err) {
      setError(err.message || "Unable to fetch payment records.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // FETCH STUDENTS AND BATCHES
  // --------------------------------------------------

  const fetchOptions = useCallback(async () => {
    try {
      const [studentResult, batchResult] = await Promise.all([
        apiRequest("/counsellor/students?active=true"),
        apiRequest("/counsellor/batches"),
      ]);

      setStudents(
        extractArray(studentResult, ["students"]).filter(
          (student) => student._id
        )
      );

      setBatches(
        extractArray(batchResult, ["batches"]).filter(
          (batch) => batch._id
        )
      );
    } catch (err) {
      setError(err.message || "Unable to load students and batches.");
    }
  }, []);

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    setToday(dateInput(new Date()));
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchOptions();
  }, [fetchPayments, fetchOptions]);

  // --------------------------------------------------
  // FILTER PAYMENTS
  // --------------------------------------------------

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        payment.studentName.toLowerCase().includes(term) ||
        payment.studentUserId.toLowerCase().includes(term) ||
        payment.studentEmail.toLowerCase().includes(term) ||
        payment.batchName.toLowerCase().includes(term) ||
        payment.courseName.toLowerCase().includes(term) ||
        payment.reference.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        payment.status === statusFilter;

      const matchesMethod =
        methodFilter === "All" ||
        payment.method === methodFilter;

      const paymentDate = dateInput(
        payment.paidAt ||
          payment.dueDate ||
          payment.createdAt
      );

      const matchesMonth =
        monthFilter === "All" ||
        paymentDate.startsWith(monthFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod &&
        matchesMonth
      );
    });
  }, [
    payments,
    search,
    statusFilter,
    methodFilter,
    monthFilter,
  ]);

  // --------------------------------------------------
  // SUMMARY
  // IMPORTANT: USE ACTUAL FEE VALUES, NOT STATUS
  // --------------------------------------------------

  const summary = useMemo(() => {
    const totalFees = filteredPayments.reduce(
      (sum, payment) => sum + payment.totalFees,
      0
    );

    const collectedFees = filteredPayments.reduce(
      (sum, payment) => sum + payment.collectedFees,
      0
    );

    const pendingFees = filteredPayments.reduce(
      (sum, payment) => sum + payment.pendingFees,
      0
    );

    const failed = filteredPayments
      .filter((payment) => payment.status === "Failed")
      .reduce((sum, payment) => sum + payment.totalFees, 0);

    const refunded = filteredPayments
      .filter((payment) => payment.status === "Refunded")
      .reduce((sum, payment) => sum + payment.totalFees, 0);

    return {
      totalPayments: filteredPayments.length,
      totalFees,
      collectedFees,
      pendingFees,

      // Compatibility aliases
      paidTotal: collectedFees,
      pendingTotal: pendingFees,

      failedTotal: failed,
      refundedTotal: refunded,
    };
  }, [filteredPayments]);

  // --------------------------------------------------
  // MONTH OPTIONS
  // --------------------------------------------------

  const months = useMemo(() => {
    return [
      ...new Set(
        payments
          .map((payment) =>
            dateInput(
              payment.paidAt ||
                payment.dueDate ||
                payment.createdAt
            ).slice(0, 7)
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [payments]);

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      const total = Number(next.amount) || 0;
      const collected = Number(next.collectedFees) || 0;
      const pending = Number(next.pendingFees) || 0;

      // If total changes, preserve collected amount.
      if (name === "amount") {
        next.pendingFees = String(
          Math.max(0, total - collected)
        );
      }

      // If collected changes, calculate pending.
      if (name === "collectedFees") {
        next.pendingFees = String(
          Math.max(0, total - collected)
        );
      }

      // If pending changes, calculate collected.
      if (name === "pendingFees") {
        next.collectedFees = String(
          Math.max(0, total - pending)
        );
      }

      // Selecting Paid means fully collected.
      if (name === "status" && value === "Paid") {
        next.collectedFees = String(total);
        next.pendingFees = "0";
        next.paidAt = next.paidAt || today;
      }

      // Selecting another status does not erase a partial collection.
      return next;
    });
  }

  function openAddPayment() {
    setError("");
    setNotice("");
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
    });

    setModal("payment");
  }

  function openEditPayment(payment) {
    setError("");
    setNotice("");

    setEditingId(payment.id);

    setForm({
      student: payment.studentId || "",
      batch: payment.batchId || "",
      amount: String(payment.totalFees || ""),
      collectedFees: String(payment.collectedFees || 0),
      pendingFees: String(payment.pendingFees || 0),
      currency: payment.currency || "INR",
      dueDate: dateInput(payment.dueDate),
      paidAt: dateInput(payment.paidAt),
      method: payment.method || "UPI",
      reference: payment.reference || "",
      status: payment.status || "Pending",
      notes: payment.notes || "",
    });

    setModal("payment");
  }

  // --------------------------------------------------
  // STUDENT SELECTION
  // --------------------------------------------------

  function handleStudentChange(event) {
    const studentId = event.target.value;

    const selectedStudent = students.find(
      (student) => student._id === studentId
    );

    const studentBatch =
      typeof selectedStudent?.batch === "object"
        ? selectedStudent.batch.batch
        : selectedStudent?.batch;

    const matchingBatch = selectedStudent
      ? batches.find(
          (batch) =>
            String(batch.batch || "").trim() ===
            String(studentBatch || "").trim()
        )
      : null;

    setForm((previous) => ({
      ...previous,
      student: studentId,
      batch: matchingBatch?._id || "",
    }));
  }

  // --------------------------------------------------
  // SAVE PAYMENT
  // --------------------------------------------------

  async function savePayment(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setNotice("");

    const totalFees = Number(form.amount);
    const collectedFees = Number(form.collectedFees);
    const pendingFees = Number(form.pendingFees);

    if (!form.student) {
      setError("Please select a student.");
      return;
    }

    if (!Number.isFinite(totalFees) || totalFees <= 0) {
      setError("Enter valid total fees greater than zero.");
      return;
    }

    if (
      !Number.isFinite(collectedFees) ||
      collectedFees < 0
    ) {
      setError("Enter a valid collected amount.");
      return;
    }

    if (
      !Number.isFinite(pendingFees) ||
      pendingFees < 0
    ) {
      setError("Enter a valid pending amount.");
      return;
    }

    // Allow only a tiny floating-point difference.
    if (
      Math.abs(
        totalFees - (collectedFees + pendingFees)
      ) > 0.01
    ) {
      setError(
        "Total Fees must equal Collected Fees + Pending Fees."
      );
      return;
    }

    if (!PAYMENT_METHODS.includes(form.method)) {
      setError("Select a valid payment method.");
      return;
    }

    if (!PAYMENT_STATUSES.includes(form.status)) {
      setError("Select a valid payment status.");
      return;
    }

    if (
      form.dueDate &&
      Number.isNaN(new Date(form.dueDate).getTime())
    ) {
      setError("Select a valid due date.");
      return;
    }

    if (
      form.paidAt &&
      Number.isNaN(new Date(form.paidAt).getTime())
    ) {
      setError("Select a valid payment date.");
      return;
    }

    if (
      form.status === "Paid" &&
      pendingFees > 0.01
    ) {
      setError(
        "A fully Paid record cannot have pending fees. Set the pending amount to zero or select Pending."
      );
      return;
    }

    if (
      form.status === "Paid" &&
      !form.paidAt
    ) {
      setError("Select the payment date for a paid record.");
      return;
    }

    // The backend receives all three fee values.
    // amount is retained as the total fee for compatibility.
    const payload = {
      student: form.student,
      batch: form.batch || null,

      amount: totalFees,
      totalFees,
      collectedFees,
      pendingFees,

      currency: form.currency || "INR",
      dueDate: form.dueDate || null,
      paidAt: form.paidAt || null,

      method: form.method,
      reference: form.reference.trim(),
      status: form.status,
      notes: form.notes.trim(),
    };

    setSaving(true);

    try {
      if (editingId) {
        await apiRequest(`/counsellor/fees/${editingId}`, {
          method: "PATCH",
          body: payload,
        });

        setNotice("Payment record updated successfully.");
      } else {
        await apiRequest("/counsellor/fees", {
          method: "POST",
          body: payload,
        });

        setNotice("Payment record created successfully.");
      }

      setModal(null);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });

      await fetchPayments(false);
    } catch (err) {
      setError(err.message || "Unable to save payment record.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE PAYMENT
  // --------------------------------------------------

  async function deletePayment(payment) {
    const confirmed = window.confirm(
      `Are you sure you want to delete this payment record for ${payment.studentName}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/counsellor/fees/${payment.id}`, {
        method: "DELETE",
      });

      setNotice("Payment record deleted successfully.");

      await fetchPayments(false);
    } catch (err) {
      setError(err.message || "Unable to delete payment.");
    }
  }

  // --------------------------------------------------
  // EXPORT
  // --------------------------------------------------

  function exportPayments() {
    downloadCSV(filteredPayments);
  }

  // --------------------------------------------------
  // SUMMARY CARDS
  // --------------------------------------------------

  const stats = [
    {
      label: "Total Payment Records",
      value: summary.totalPayments,
      icon: Receipt,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Total Fees",
      value: money(summary.totalFees),
      icon: IndianRupee,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Collected Amount",
      value: money(summary.collectedFees),
      icon: Wallet,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Pending Amount",
      value: money(summary.pendingFees),
      icon: Clock,
      color: "bg-amber-100 text-amber-700",
    },
  ];

  const collectionTotal =
    summary.collectedFees + summary.pendingFees;

  const collectionPercentage =
    collectionTotal > 0
      ? Math.min(
          100,
          (summary.collectedFees / collectionTotal) * 100
        )
      : 0;

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">

      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Counsellor Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Fee & Payment Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage student fees, partial collections, due dates and payment records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPayments}
            disabled={loading || filteredPayments.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAddPayment}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Payment
          </button>

          <button
            type="button"
            onClick={() => {
              fetchPayments();
              fetchOptions();
            }}
            disabled={loading}
            title="Refresh payment records"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SUCCESS */}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
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

      {/* SUMMARY CARDS */}

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
                  <p className="text-sm text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                    {stat.value}
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

      {/* COLLECTION SUMMARY */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">
              Payment Collection Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Actual collected and remaining fees for the filtered records.
            </p>
          </div>

          <p className="text-lg font-bold text-blue-700">
            {Math.round(collectionPercentage)}% collected
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${collectionPercentage}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Total Fees</p>
            <p className="font-semibold text-slate-800">
              {money(summary.totalFees)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Collected</p>
            <p className="font-semibold text-green-700">
              {money(summary.collectedFees)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Remaining</p>
            <p className="font-semibold text-amber-700">
              {money(summary.pendingFees)}
            </p>
          </div>
        </div>
      </section>

      {/* FILTERS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />

          <h2 className="font-semibold text-slate-800">
            Search and Filter
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
              placeholder="Search student, batch, reference..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Payment Months</option>

            {months.map((month) => (
              <option key={month} value={month}>
                {new Date(`${month}-01T12:00:00`).toLocaleDateString(
                  "en-IN",
                  {
                    month: "long",
                    year: "numeric",
                  }
                )}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Payment Statuses</option>

            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Payment Methods</option>

            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* PAYMENT TABLE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Payment Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading payment records..."
                : `${filteredPayments.length} payment record(s)`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Batch / Course",
                  "Total Fees",
                  "Collected",
                  "Pending",
                  "Payment Date",
                  "Due Date",
                  "Method",
                  "Status",
                  "Reference",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-4 font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading &&
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">
                        {payment.studentName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {payment.studentUserId ||
                          payment.studentEmail ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-700">
                        {payment.batchName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {payment.courseName || "—"}
                      </p>

                      {payment.trainerName && (
                        <p className="mt-1 text-xs text-slate-400">
                          Trainer: {payment.trainerName}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-800">
                      {money(payment.totalFees, payment.currency)}
                    </td>

                    <td className="px-4 py-4 font-semibold text-green-700">
                      {money(payment.collectedFees, payment.currency)}
                    </td>

                    <td className="px-4 py-4 font-semibold text-amber-700">
                      {money(payment.pendingFees, payment.currency)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {dateLabel(payment.paidAt)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {dateLabel(payment.dueDate)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {payment.method}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {payment.reference || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit payment"
                          onClick={() => openEditPayment(payment)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title="Delete payment"
                          onClick={() => deletePayment(payment)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {loading && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-14 text-center text-slate-500"
                  >
                    <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />

                    Loading payment records from the server...
                  </td>
                </tr>
              )}

              {!loading && filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center">
                    <Receipt className="mx-auto mb-3 h-9 w-9 text-slate-300" />

                    <p className="font-semibold text-slate-700">
                      No payment records found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Change the filters or add a payment record.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD / EDIT PAYMENT MODAL */}

      {modal === "payment" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit Payment" : "Add Payment"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update total fees, collected amount and remaining balance."
                    : "Create a payment record with full or partial collection."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close payment form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={savePayment} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <Field label="Student *">
                  <select
                    required
                    name="student"
                    value={form.student}
                    onChange={handleStudentChange}
                    disabled={Boolean(editingId)}
                    className={inputClass}
                  >
                    <option value="">Select Student</option>

                    {students.map((student) => (
                      <option
                        key={student._id}
                        value={student._id}
                      >
                        {student.name} ({student.userId})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Batch">
                  <select
                    name="batch"
                    value={form.batch}
                    onChange={updateForm}
                    className={inputClass}
                  >
                    <option value="">No Batch</option>

                    {batches.map((batch) => (
                      <option
                        key={batch._id}
                        value={batch._id}
                      >
                        {batch.batch || batch.name || batch.code}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Total Course Fees *">
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Enter total course fees"
                  />
                </Field>

                <Field label="Collected Fees *">
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    name="collectedFees"
                    value={form.collectedFees}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Enter collected amount"
                  />
                </Field>

                <Field label="Pending Fees *">
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    name="pendingFees"
                    value={form.pendingFees}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Remaining fees"
                  />
                </Field>

                <Field label="Currency">
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={updateForm}
                    className={inputClass}
                  >
                    <option value="INR">INR - Indian Rupee</option>
                  </select>
                </Field>

                <Field label="Payment Status *">
                  <select
                    required
                    name="status"
                    value={form.status}
                    onChange={updateForm}
                    className={inputClass}
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment Method *">
                  <select
                    required
                    name="method"
                    value={form.method}
                    onChange={updateForm}
                    className={inputClass}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Due Date">
                  <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={updateForm}
                    className={inputClass}
                  />
                </Field>

                <Field label="Payment Date">
                  <input
                    type="date"
                    name="paidAt"
                    value={form.paidAt}
                    onChange={updateForm}
                    className={inputClass}
                  />
                </Field>

                <Field label="Transaction Reference">
                  <input
                    name="reference"
                    value={form.reference}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Transaction ID / Receipt number"
                  />
                </Field>

                <Field label="Notes">
                  <input
                    name="notes"
                    value={form.notes}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Payment details or remarks"
                  />
                </Field>
              </div>

              {/* LIVE FEE CALCULATION */}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">
                  Fee Calculation
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-blue-700">
                      Total Fees
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {money(form.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-green-700">
                      Collected
                    </p>

                    <p className="mt-1 font-bold text-green-700">
                      {money(form.collectedFees)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-amber-700">
                      Remaining
                    </p>

                    <p className="mt-1 font-bold text-amber-700">
                      {money(form.pendingFees)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-blue-800">
                  Total Fees = Collected Fees + Pending Fees.
                  Changing any one fee amount automatically recalculates
                  the corresponding balance.
                </p>
              </div>

              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                This form creates or updates a Payment record. It does not
                modify the student's course fee plan or admission details.
              </p>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Payment"
                      : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}

      <p className="text-center text-xs text-slate-400">
        Payment records are loaded from the APPWARS LMS Counsellor backend.
      </p>
    </div>
  );
}
