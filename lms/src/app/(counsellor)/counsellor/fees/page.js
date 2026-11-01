"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Search,
  Plus,
  Download,
  X,
  Pencil,
  Receipt,
  Clock,
  CheckCircle2,
  Wallet,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const API_ROOT = API_BASE.endsWith("/api")
  ? API_BASE
  : `${API_BASE}/api`;

const blankForm = {
  studentName: "",
  course: "",
  trainer: "",
  totalFee: "",
  registrationFee: "",
  installment0: "",
  installment1: "",
  installment2: "",
  installment3: "",
  bajajFinance: "No",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

function dateLabel(value) {
  if (!value) return "—";

  const date = String(value).slice(0, 10);
  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Your session has expired. Please log in again."
    );
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
    throw new Error(
      "Your session has expired. Please log in again."
    );
  }

  if (response.status === 403) {
    throw new Error(
      result.message ||
        "You are not authorized to manage fee records."
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function normalizeFeeRecord(record) {
  const details = record.admissionDetails || {};

  const rawPayments = Array.isArray(record.payments)
    ? record.payments
    : [];

  const id = record.studentId || record._id || record.id;

  return {
    id,
    studentId: id,
    studentName: record.studentName || record.name || "",
    course:
      record.course ||
      details.course ||
      record.courseName ||
      "",
    trainer: record.trainer || details.trainer || "",
    totalFee: Number(
      record.totalFee ?? details.totalFee ?? 0
    ),
    registrationFee: Number(
      record.registrationFee ?? details.registrationFee ?? 0
    ),
    installment0: Number(
      record.installment0 ?? details.installment0 ?? 0
    ),
    installment1: Number(
      record.installment1 ?? details.installment1 ?? 0
    ),
    installment2: Number(
      record.installment2 ?? details.installment2 ?? 0
    ),
    installment3: Number(
      record.installment3 ?? details.installment3 ?? 0
    ),
    bajajFinance:
      record.bajajFinance ?? details.bajajFinance ?? "No",
    payments: rawPayments.map((payment) => ({
      id:
        payment._id ||
        payment.id ||
        payment.transactionId,
      amount: Number(payment.amount || 0),
      status: payment.status || "Paid",
      date: payment.paymentDate
        ? String(payment.paymentDate).slice(0, 10)
        : payment.date
          ? String(payment.date).slice(0, 10)
          : "",
      mode:
        payment.paymentMethod ||
        payment.mode ||
        "Other",
      note:
        payment.note ||
        payment.providerReference ||
        "Fee payment",
    })),
  };
}

function getCollected(student) {
  return (Array.isArray(student.payments) ? student.payments : [])
    .filter(
      (payment) =>
        !payment.status ||
        String(payment.status).toLowerCase() === "paid"
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );
}

function getPending(student) {
  return Math.max(
    0,
    Number(student.totalFee || 0) - getCollected(student)
  );
}

function getStatus(student) {
  return getPending(student) === 0 ? "Clear" : "Pending";
}

function downloadCSV(rows) {
  const headers = [
    "Student",
    "Course",
    "Trainer",
    "Total Fee",
    "Registration Fee",
    "Installment 0",
    "Installment 1",
    "Installment 2",
    "Installment 3",
    "Bajaj Finance",
    "Collected",
    "Pending",
    "Status",
  ];

  const cell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.map(cell).join(","),
    ...rows.map((student) =>
      [
        student.studentName,
        student.course,
        student.trainer,
        student.totalFee,
        student.registrationFee,
        student.installment0,
        student.installment1,
        student.installment2,
        student.installment3,
        student.bajajFinance,
        getCollected(student),
        getPending(student),
        getStatus(student),
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
  link.download = "appwars-fee-management.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function FeeManagementPage() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentModeFilter, setPaymentModeFilter] =
    useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  const [currentMonth, setCurrentMonth] = useState("");
  const [today, setToday] = useState("");

  const [modal, setModal] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ ...blankForm });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    mode: "UPI",
    note: "",
  });

  const fetchFees = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    setError("");

    try {
      const result = await apiRequest("/counsellor/fees");

      const records = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.fees)
          ? result.data.fees
          : Array.isArray(result.fees)
            ? result.fees
            : [];

      setFees(records.map(normalizeFeeRecord));
    } catch (err) {
      setError(err.message || "Unable to load fee records.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const now = new Date();

    setCurrentMonth(
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`
    );

    const localToday = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    setToday(localToday);
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const filteredFees = useMemo(() => {
    return fees.filter((student) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        student.studentName.toLowerCase().includes(term) ||
        student.course.toLowerCase().includes(term) ||
        student.trainer.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        getStatus(student) === statusFilter;

      const matchesMonth =
        monthFilter === "All" ||
        student.payments.some((payment) =>
          payment.date.startsWith(monthFilter)
        );

      const matchesMode =
        paymentModeFilter === "All" ||
        student.payments.some(
          (payment) => payment.mode === paymentModeFilter
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMonth &&
        matchesMode
      );
    });
  }, [
    fees,
    search,
    statusFilter,
    monthFilter,
    paymentModeFilter,
  ]);

  const totalFees = filteredFees.reduce(
    (sum, student) =>
      sum + Number(student.totalFee || 0),
    0
  );

  const totalCollected = filteredFees.reduce(
    (sum, student) => sum + getCollected(student),
    0
  );

  const totalPending = filteredFees.reduce(
    (sum, student) => sum + getPending(student),
    0
  );

  const months = useMemo(() => {
    return [
      ...new Set(
        fees.flatMap((student) =>
          student.payments.map((payment) =>
            payment.date.slice(0, 7)
          )
        )
      ),
    ].filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [fees]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openAddFee() {
    setError("");
    setNotice("");
    setEditingId(null);
    setForm({ ...blankForm });
    setModal("fee");
  }

  function openEditFee(student) {
    setError("");
    setNotice("");

    setEditingId(student.studentId);

    setForm({
      studentName: student.studentName,
      course: student.course,
      trainer: student.trainer,
      totalFee: String(student.totalFee),
      registrationFee: String(student.registrationFee),
      installment0: String(student.installment0),
      installment1: String(student.installment1),
      installment2: String(student.installment2),
      installment3: String(student.installment3),
      bajajFinance: student.bajajFinance,
    });

    setModal("fee");
  }

  async function saveFee(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        studentName: form.studentName.trim(),
        course: form.course.trim(),
        trainer: form.trainer.trim(),
        totalFee: Number(form.totalFee),
        registrationFee: Number(form.registrationFee || 0),
        installment0: Number(form.installment0 || 0),
        installment1: Number(form.installment1 || 0),
        installment2: Number(form.installment2 || 0),
        installment3: Number(form.installment3 || 0),
        bajajFinance: form.bajajFinance,
      };

      if (
        !payload.studentName ||
        !payload.course ||
        !Number.isFinite(payload.totalFee) ||
        payload.totalFee < 0
      ) {
        throw new Error(
          "Enter a valid student name, course, and total fee."
        );
      }

      const feeAmounts = [
        payload.registrationFee,
        payload.installment0,
        payload.installment1,
        payload.installment2,
        payload.installment3,
      ];

      if (
        feeAmounts.some(
          (amount) => !Number.isFinite(amount) || amount < 0
        )
      ) {
        throw new Error(
          "Fee amounts cannot be negative or invalid."
        );
      }

      if (editingId) {
        await apiRequest(
          `/counsellor/fees/${editingId}`,
          {
            method: "PATCH",
            body: payload,
          }
        );

        setNotice("Fee record updated successfully.");
      } else {
        await apiRequest("/counsellor/fees", {
          method: "POST",
          body: payload,
        });

        setNotice("Fee record saved successfully.");
      }

      setModal(null);
      await fetchFees(false);
    } catch (err) {
      setError(err.message || "Unable to save fee record.");
    } finally {
      setSaving(false);
    }
  }

  function openPayment(student) {
    setError("");
    setNotice("");
    setSelectedStudent(student);

    setPaymentForm({
      amount: "",
      date: today,
      mode: "UPI",
      note: "",
    });

    setModal("payment");
  }

  async function recordPayment(event) {
    event.preventDefault();

    if (!selectedStudent || saving) return;

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (!paymentForm.date) {
      setError("Select a payment date.");
      return;
    }

    if (amount > getPending(selectedStudent)) {
      setError(
        `Payment cannot exceed ${money(
          getPending(selectedStudent)
        )}.`
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/counsellor/fees/${selectedStudent.studentId}/payments`,
        {
          method: "POST",
          body: {
            amount,
            paymentDate: paymentForm.date,
            paymentMethod: paymentForm.mode,
            note: paymentForm.note.trim() || "Fee payment",
          },
        }
      );

      setModal(null);
      setSelectedStudent(null);
      setNotice("Payment recorded successfully.");

      await fetchFees(false);
    } catch (err) {
      setError(err.message || "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(student) {
    const confirmed = window.confirm(
      `Remove fee details for ${student.studentName}? ` +
        "This action should preserve the student account and payment history."
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/counsellor/fees/${student.studentId}`,
        { method: "DELETE" }
      );

      setNotice("Fee details removed successfully.");
      await fetchFees(false);
    } catch (err) {
      setError(err.message || "Unable to remove fee details.");
    }
  }

  const stats = [
    {
      label: "Total Course Fees",
      value: money(totalFees),
      icon: IndianRupee,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Collected Amount",
      value: money(totalCollected),
      icon: Wallet,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Pending Amount",
      value: money(totalPending),
      icon: Clock,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Students with Pending Fees",
      value: filteredFees.filter(
        (student) => getPending(student) > 0
      ).length,
      icon: Receipt,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Counsellor Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Fee Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Track student fees, installments, payments, and outstanding dues.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadCSV(filteredFees)}
            disabled={loading || filteredFees.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAddFee}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Fee Record
          </button>

          <button
            type="button"
            onClick={() => fetchFees()}
            disabled={loading}
            title="Refresh fee records"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* API messages */}
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

      {/* Summary cards */}
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

      {/* Collection progress */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">
              Fee Collection Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Collection summary for the currently filtered student records.
            </p>
          </div>

          <p className="text-lg font-bold text-blue-700">
            {totalFees > 0
              ? `${Math.round(
                  (totalCollected / totalFees) * 100
                )}% collected`
              : "0% collected"}
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{
              width: `${
                totalFees > 0
                  ? Math.min(
                      100,
                      (totalCollected / totalFees) * 100
                    )
                  : 0
              }%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>Collected: {money(totalCollected)}</span>
          <span>Outstanding: {money(totalPending)}</span>
        </div>
      </section>

      {/* Filters */}
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
              placeholder="Search student, course, trainer..."
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
                {new Date(
                  `${month}-01T12:00:00`
                ).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Fee Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Clear">Clear</option>
          </select>

          <select
            value={paymentModeFilter}
            onChange={(event) =>
              setPaymentModeFilter(event.target.value)
            }
            className={inputClass}
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Debit/Credit Card">Debit/Credit Card</option>
            <option value="Bajaj Finance">Bajaj Finance</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </section>

      {/* Fee records table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Student Fee Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading records..."
                : `${filteredFees.length} student record(s)`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Total Fee",
                  "Collected",
                  "Pending",
                  "Installments",
                  "Status",
                  "Bajaj Finance",
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
                filteredFees.map((student) => (
                  <tr
                    key={student.studentId}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">
                        {student.studentName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {student.trainer || "No trainer assigned"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {student.course || "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {money(student.totalFee)}
                    </td>

                    <td className="px-4 py-4 font-semibold text-green-700">
                      {money(getCollected(student))}
                    </td>

                    <td className="px-4 py-4 font-semibold text-amber-700">
                      {money(getPending(student))}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <p>
                        Registration: {money(student.registrationFee)}
                      </p>

                      {[0, 1, 2, 3].map((number) => (
                        <p
                          key={number}
                          className="mt-1 text-xs text-slate-500"
                        >
                          Installment {number}:{" "}
                          {money(student[`installment${number}`])}
                        </p>
                      ))}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          getStatus(student) === "Clear"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {getStatus(student) === "Clear" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Clock size={14} />
                        )}

                        {getStatus(student)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {student.bajajFinance}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="View payment history"
                          onClick={() => {
                            setError("");
                            setSelectedStudent(student);
                            setModal("history");
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          title="Record payment"
                          disabled={getPending(student) <= 0}
                          onClick={() => openPayment(student)}
                          className="rounded-lg p-2 text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Plus size={17} />
                        </button>

                        <button
                          type="button"
                          title="Edit fee record"
                          onClick={() => openEditFee(student)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title="Remove fee details"
                          onClick={() => deleteStudent(student)}
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
                    colSpan={9}
                    className="px-4 py-14 text-center text-slate-500"
                  >
                    <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
                    Loading fee records from the server...
                  </td>
                </tr>
              )}

              {!loading && filteredFees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <Receipt className="mx-auto mb-3 h-9 w-9 text-slate-300" />

                    <p className="font-semibold text-slate-700">
                      No fee records found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Change the filters or add a fee record for an existing student.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / edit fee modal */}
      {modal === "fee" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
                    ? "Edit Fee Record"
                    : "Add Fee Record"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update fee details for the existing student."
                    : "Add fee details for a student who already has an admission record."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close fee form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveFee} className="space-y-6 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Student Name *">
                  <input
                    required
                    name="studentName"
                    value={form.studentName}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Existing student's full name"
                    disabled={Boolean(editingId)}
                  />
                </Field>

                <Field label="Course *">
                  <input
                    required
                    name="course"
                    value={form.course}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Course name"
                  />
                </Field>

                <Field label="Trainer">
                  <input
                    name="trainer"
                    value={form.trainer}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Trainer name"
                  />
                </Field>

                <Field label="Total Course Fee (₹) *">
                  <input
                    required
                    min="0"
                    type="number"
                    name="totalFee"
                    value={form.totalFee}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="45000"
                  />
                </Field>

                <Field label="Registration Fee (₹)">
                  <input
                    min="0"
                    type="number"
                    name="registrationFee"
                    value={form.registrationFee}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="5000"
                  />
                </Field>

                <Field label="Bajaj Finance">
                  <select
                    name="bajajFinance"
                    value={form.bajajFinance}
                    onChange={updateForm}
                    className={inputClass}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </Field>

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
                      onChange={updateForm}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </div>

              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Planned installments are separate from actual recorded payments.
                The outstanding balance is calculated from successful payments.
                The student must already exist in the backend.
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
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Fee Record"
                      : "Save Fee Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {modal === "payment" && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Record Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudent.studentName}
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

            <form onSubmit={recordPayment} className="space-y-4 p-5">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  Outstanding Balance
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {money(getPending(selectedStudent))}
                </p>
              </div>

              <Field label="Payment Amount (₹) *">
                <input
                  required
                  min="1"
                  max={getPending(selectedStudent)}
                  type="number"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      amount: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Enter amount received"
                />
              </Field>

              <Field label="Payment Date *">
                <input
                  required
                  type="date"
                  value={paymentForm.date}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      date: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Payment Mode *">
                <select
                  required
                  value={paymentForm.mode}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      mode: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Debit/Credit Card">
                    Debit/Credit Card
                  </option>
                  <option value="Bajaj Finance">Bajaj Finance</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Payment Note">
                <input
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      note: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="e.g. Installment 1"
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment history modal */}
      {modal === "history" && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Payment History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudent.studentName} · {selectedStudent.course}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close payment history"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Course Fee</p>

                <p className="mt-1 font-bold text-slate-900">
                  {money(selectedStudent.totalFee)}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs text-green-700">Collected</p>

                <p className="mt-1 font-bold text-green-800">
                  {money(getCollected(selectedStudent))}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Outstanding</p>

                <p className="mt-1 font-bold text-amber-800">
                  {money(getPending(selectedStudent))}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Note</th>
                    <th className="px-3 py-3">Mode</th>
                    <th className="px-3 py-3">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedStudent.payments || []).map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-3">
                        {dateLabel(payment.date)}
                      </td>

                      <td className="px-3 py-3">
                        {payment.note}
                      </td>

                      <td className="px-3 py-3">
                        {payment.mode}
                      </td>

                      <td className="px-3 py-3 font-semibold text-green-700">
                        {money(payment.amount)}
                      </td>
                    </tr>
                  ))}

                  {(!selectedStudent.payments ||
                    selectedStudent.payments.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
              {getPending(selectedStudent) > 0 && (
                <button
                  type="button"
                  onClick={() => openPayment(selectedStudent)}
                  className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Record Payment
                </button>
              )}

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Fee details and payments are loaded from your APPWARS LMS backend.
      </p>
    </div>
  );
}
