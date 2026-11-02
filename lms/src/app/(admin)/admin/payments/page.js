
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  X,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Wallet,
  Receipt,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ==========================================
// INITIAL FORM DATA
// ==========================================

const initialFormData = {
  student: "",
  batch: "",
  amount: "",
  currency: "INR",
  dueDate: "",
  paidAt: "",
  method: "UPI",
  reference: "",
  status: "Pending",
  notes: "",
};

// ==========================================
// PAYMENT METHODS
// ==========================================

const paymentMethods = [
  {
    label: "Digital Payments",
    options: [
      "UPI",
      "Wallet",
    ],
  },
  {
    label: "Card Payments",
    options: [
      "Credit Card",
      "Debit Card",
      "Credit/Debit Card",
    ],
  },
  {
    label: "Bank Payments",
    options: [
      "Net Banking",
      "Bank Transfer",
      "NEFT",
      "RTGS",
      "IMPS",
    ],
  },
  {
    label: "Other Payments",
    options: [
      "Cash",
      "Cheque",
      "Other",
    ],
  },
];

const paymentStatuses = [
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getArray(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ==========================================
// STUDENT HELPERS
// ==========================================

function getStudentName(student) {
  if (!student) return "Unknown Student";

  if (typeof student === "string") {
    return student;
  }

  return (
    student.name ||
    student.userId ||
    student.email ||
    "Unknown Student"
  );
}

// ==========================================
// BATCH HELPERS
// Supports batch + batchDetails response
// ==========================================

function getBatchDetails(batch, separateBatchDetails = null) {
  if (separateBatchDetails) {
    return separateBatchDetails.batchDetails || separateBatchDetails;
  }

  if (!batch) return null;

  if (typeof batch === "object") {
    return batch.batchDetails || batch;
  }

  return null;
}

function getBatchName(batch, separateBatchDetails = null) {
  const details = getBatchDetails(
    batch,
    separateBatchDetails
  );

  if (details?.batch) {
    return details.batch;
  }

  if (typeof batch === "string") {
    return batch;
  }

  return batch?.batch || batch?.name || "No Batch";
}

function getBatchId(batch, separateBatchDetails = null) {
  const details = getBatchDetails(
    batch,
    separateBatchDetails
  );

  return details?._id || batch?._id || "";
}

function getBatchCourse(batch, separateBatchDetails = null) {
  const details = getBatchDetails(
    batch,
    separateBatchDetails
  );

  const course = details?.course;

  if (typeof course === "string") {
    return course;
  }

  return (
    course?.courseName ||
    course?.title ||
    course?.name ||
    ""
  );
}

function getBatchTrainer(batch, separateBatchDetails = null) {
  const details = getBatchDetails(
    batch,
    separateBatchDetails
  );

  const trainer = details?.trainer;

  if (typeof trainer === "string") {
    return trainer;
  }

  return trainer?.name || "";
}

// ==========================================
// NORMALIZE BATCH RESPONSE
// ==========================================

function normalizeBatch(item) {
  if (!item) return null;

  const details = item.batchDetails || item;

  return {
    _id: details._id || item._id || "",
    batch: details.batch || item.batch || item.name || "",
    course: getBatchCourse(details),
    trainer: getBatchTrainer(details),
    original: item,
  };
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  const [report, setReport] = useState({
    totalAmount: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    refundedAmount: 0,
    paymentCount: 0,
  });

  // ==========================================
  // API REQUEST
  // ==========================================

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const currentToken = sessionStorage.getItem("token");

    if (!currentToken) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message ||
          `Request failed with status ${response.status}`
      );
    }

    return result;
  }, []);

  // ==========================================
  // FETCH PAYMENTS
  // ==========================================

  const fetchPayments = useCallback(async () => {
    try {
      const result = await apiRequest("/api/admin/payments");

      const list = getArray(result, ["payments"]);

      setPayments(list);
    } catch (err) {
      setError(err.message || "Unable to fetch payments.");
    }
  }, [apiRequest]);

  // ==========================================
  // FETCH STUDENTS
  // ==========================================

  const fetchStudents = useCallback(async () => {
    try {
      const result = await apiRequest(
        "/api/admin/users?role=Student&limit=100"
      );

      const list = getArray(result, ["users"]);

      setStudents(list);
    } catch (err) {
      console.error("Students fetch error:", err);
    }
  }, [apiRequest]);

  // ==========================================
  // FETCH BATCHES
  // ==========================================

  const fetchBatches = useCallback(async () => {
    try {
      const result = await apiRequest("/api/admin/batches");

      const list = getArray(result, ["batches"]);

      const normalizedBatches = list
        .map(normalizeBatch)
        .filter((batch) => batch && batch._id);

      setBatches(normalizedBatches);

      console.log("Fetched batches:", normalizedBatches);
    } catch (err) {
      console.error("Batches fetch error:", err);
    }
  }, [apiRequest]);

  // ==========================================
  // FETCH PAYMENT REPORT
  // ==========================================

  const fetchPaymentReport = useCallback(async () => {
    try {
      const result = await apiRequest(
        "/api/admin/reports/payments"
      );

      const data = result.summary || result.data || result;

      setReport({
        totalAmount: Number(data.totalAmount || 0),
        collectedAmount: Number(data.collectedAmount || 0),
        pendingAmount: Number(data.pendingAmount || 0),
        refundedAmount: Number(data.refundedAmount || 0),
        paymentCount: Number(
          data.paymentCount || data.totalPayments || 0
        ),
      });
    } catch (err) {
      console.error("Payment report error:", err);
    }
  }, [apiRequest]);

  // ==========================================
  // LOAD ALL DATA
  // ==========================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        fetchPayments(),
        fetchStudents(),
        fetchBatches(),
        fetchPaymentReport(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    fetchPayments,
    fetchStudents,
    fetchBatches,
    fetchPaymentReport,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // FORM CHANGE HANDLER
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // OPEN CREATE MODAL
  // ==========================================

  const openCreateModal = () => {
    setEditingPayment(null);
    setFormData({ ...initialFormData });
    setError("");
    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = (payment) => {
    setEditingPayment(payment);

    const batchId = getBatchId(
      payment.batch,
      payment.batchDetails
    );

    setFormData({
      student:
        typeof payment.student === "object"
          ? payment.student?._id || ""
          : payment.student || "",

      batch: batchId,

      amount: payment.amount ?? "",
      currency: payment.currency || "INR",

      dueDate: toInputDate(payment.dueDate),
      paidAt: toInputDate(payment.paidAt),

      method: payment.method || "UPI",
      reference: payment.reference || "",
      status: payment.status || "Pending",
      notes: payment.notes || "",
    });

    setError("");
    setShowModal(true);
  };

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const closeModal = () => {
    setShowModal(false);
    setEditingPayment(null);
    setFormData({ ...initialFormData });
    setError("");
  };

  // ==========================================
  // CREATE / UPDATE PAYMENT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.student) {
      setError("Please select a student.");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    if (!formData.dueDate) {
      setError("Please select a due date.");
      return;
    }

    if (!formData.method) {
      setError("Please select a payment method.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        student: formData.student,

        // Actual MongoDB Batch ObjectId
        batch: formData.batch || null,

        amount: Number(formData.amount),
        currency: formData.currency || "INR",

        dueDate: formData.dueDate,

        method: formData.method,
        reference: formData.reference.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
      };

      if (formData.status === "Paid") {
        payload.paidAt = formData.paidAt || new Date().toISOString();
      }

      const endpoint = editingPayment
        ? `/api/admin/payments/${editingPayment._id}`
        : "/api/admin/payments";

      const requestMethod = editingPayment ? "PATCH" : "POST";

      await apiRequest(endpoint, {
        method: requestMethod,
        body: JSON.stringify(payload),
      });

      setSuccess(
        editingPayment
          ? "Payment updated successfully."
          : "Payment created successfully."
      );

      closeModal();

      await Promise.all([
        fetchPayments(),
        fetchPaymentReport(),
      ]);
    } catch (err) {
      setError(err.message || "Unable to save payment.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE PAYMENT
  // ==========================================

  const handleDelete = async (paymentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/payments/${paymentId}`, {
        method: "DELETE",
      });

      setSuccess("Payment deleted successfully.");

      await Promise.all([
        fetchPayments(),
        fetchPaymentReport(),
      ]);
    } catch (err) {
      setError(err.message || "Unable to delete payment.");
    }
  };

  // ==========================================
  // FILTER PAYMENTS
  // ==========================================

  const filteredPayments = payments.filter((payment) => {
    const studentName = getStudentName(payment.student);

    const batchName = getBatchName(
      payment.batch,
      payment.batchDetails
    );

    const batchCourse = getBatchCourse(
      payment.batch,
      payment.batchDetails
    );

    const trainerName = getBatchTrainer(
      payment.batch,
      payment.batchDetails
    );

    const searchText = [
      studentName,
      payment.student?.userId,
      batchName,
      batchCourse,
      trainerName,
      payment.reference,
      payment.method,
      payment.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(
      search.toLowerCase()
    );

    const matchesStatus =
      statusFilter === "All" ||
      payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ==========================================
  // STATUS BADGE
  // ==========================================

  const StatusBadge = ({ status }) => {
    const styles = {
      Paid: "bg-green-100 text-green-700",
      Pending: "bg-yellow-100 text-yellow-700",
      Failed: "bg-red-100 text-red-700",
      Refunded: "bg-purple-100 text-purple-700",
    };

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          styles[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {status || "Unknown"}
      </span>
    );
  };

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage student fees, payment records and transactions.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183d78]"
          >
            <Plus size={18} />
            Add Payment
          </button>
        </div>
      </div>

      {/* ALERTS */}

      {error && !showModal && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} />

          {error}

          <button
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 size={18} />

          {success}

          <button
            onClick={() => setSuccess("")}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Payments
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                {report.paymentCount}
              </h2>
            </div>

            <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
              <Receipt size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Amount
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                {formatAmount(report.totalAmount)}
              </h2>
            </div>

            <div className="rounded-lg bg-indigo-100 p-3 text-indigo-700">
              <IndianRupee size={23} />
            </div>
          </div>
        </div>

        {/* <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Collected Amount
              </p>

              <h2 className="mt-2 text-2xl font-bold text-green-700">
                {formatAmount(report.collectedAmount)}
              </h2>
            </div>

            <div className="rounded-lg bg-green-100 p-3 text-green-700">
              <Wallet size={23} />
            </div>
          </div>
        </div> */}

        {/* <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Pending Amount
              </p>

              <h2 className="mt-2 text-2xl font-bold text-yellow-700">
                {formatAmount(report.pendingAmount)}
              </h2>
            </div>

            <div className="rounded-lg bg-yellow-100 p-3 text-yellow-700">
              <Clock size={23} />
            </div>
          </div>
        </div> */}

      </div>

      {/* PAYMENT RECORDS */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* FILTERS */}

        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center">

          <div>
            <h2 className="font-semibold text-gray-900">
              Payment Records
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {filteredPayments.length} records found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, batch, method..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-72"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>

              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

          </div>
        </div>

        {/* TABLE */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-gray-500">
            <Loader2 className="animate-spin" size={22} />
            Loading payment records...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <CreditCard
              size={40}
              className="mb-3 text-gray-300"
            />

            <h3 className="font-semibold text-gray-700">
              No payments found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add a payment or change your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px] text-left">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Batch Details</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Due Date</th>
                  <th className="px-5 py-4">Method</th>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredPayments.map((payment) => {
                  const batchName = getBatchName(
                    payment.batch,
                    payment.batchDetails
                  );

                  const batchCourse = getBatchCourse(
                    payment.batch,
                    payment.batchDetails
                  );

                  const batchTrainer = getBatchTrainer(
                    payment.batch,
                    payment.batchDetails
                  );

                  return (
                    <tr
                      key={payment._id}
                      className="hover:bg-gray-50"
                    >

                      {/* STUDENT */}

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">
                          {getStudentName(payment.student)}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {payment.student?.userId || ""}
                        </p>
                      </td>

                      {/* BATCH */}

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">
                          {batchName}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {batchCourse || "Course not assigned"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Trainer: {batchTrainer || "Not Assigned"}
                        </p>
                      </td>

                      {/* AMOUNT */}

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatAmount(payment.amount)}
                      </td>

                      {/* DUE DATE */}

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(payment.dueDate)}
                      </td>

                      {/* METHOD */}

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {payment.method || "—"}
                      </td>

                      {/* REFERENCE */}

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {payment.reference || "—"}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <StatusBadge status={payment.status} />
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">

                          <button
                            onClick={() => openEditModal(payment)}
                            title="Edit payment"
                            className="rounded-lg border border-blue-200 p-2 text-blue-700 hover:bg-blue-50"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(payment._id)}
                            title="Delete payment"
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}

              </tbody>
            </table>

          </div>
        )}

      </div>

      {/* ==========================================
          ADD / EDIT PAYMENT MODAL
      ========================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">

          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPayment
                    ? "Edit Payment"
                    : "Create Payment"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter student, batch and payment details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={21} />
              </button>

            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit}>

              <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">

                {/* FORM ERROR */}

                {error && (
                  <div className="col-span-full flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                {/* STUDENT */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Select Student *
                  </label>

                  <select
                    name="student"
                    value={formData.student}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Choose Student
                    </option>

                    {students.map((student) => (
                      <option
                        key={student._id}
                        value={student._id}
                      >
                        {student.name} (
                        {student.userId || student.email}
                        )
                      </option>
                    ))}

                  </select>

                </div>

                {/* BATCH */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Select Batch
                  </label>

                  <select
                    name="batch"
                    value={formData.batch}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select Batch (Optional)
                    </option>

                    {batches.map((batch) => (
                      <option
                        key={batch._id}
                        value={batch._id}
                      >
                        {batch.batch}
                        {batch.course
                          ? ` - ${batch.course}`
                          : ""}
                        {batch.trainer
                          ? ` | Trainer: ${batch.trainer}`
                          : ""}
                      </option>
                    ))}

                  </select>

                  <p className="mt-1.5 text-xs text-gray-500">
                    {batches.length > 0
                      ? `${batches.length} batches available. Select the student's batch.`
                      : "No batches loaded. Check the batches API response and authentication."}
                  </p>

                </div>

                {/* AMOUNT */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Amount (₹) *
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    min="1"
                    step="0.01"
                    required
                    placeholder="Enter amount"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                {/* CURRENCY */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Currency
                  </label>

                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="INR">
                      INR - Indian Rupee
                    </option>
                  </select>

                </div>

                {/* DUE DATE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Due Date *
                  </label>

                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                {/* PAYMENT METHOD */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Payment Method *
                  </label>

                  <select
                    name="method"
                    value={formData.method}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >

                    {paymentMethods.map((group) => (
                      <optgroup
                        key={group.label}
                        label={group.label}
                      >
                        {group.options.map((method) => (
                          <option
                            key={method}
                            value={method}
                          >
                            {method}
                          </option>
                        ))}
                      </optgroup>
                    ))}

                  </select>

                </div>

                {/* PAYMENT STATUS */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Payment Status
                  </label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {paymentStatuses.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>

                </div>

                {/* PAYMENT DATE */}

                {formData.status === "Paid" && (
                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Payment Date
                    </label>

                    <input
                      type="date"
                      name="paidAt"
                      value={formData.paidAt}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />

                  </div>
                )}

                {/* REFERENCE */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Transaction Reference
                  </label>

                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder="Enter transaction ID / reference number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                {/* NOTES */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter additional payment details..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-[#102e60] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#183d78] disabled:opacity-50"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingPayment
                        ? "Update Payment"
                        : "Create Payment"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
