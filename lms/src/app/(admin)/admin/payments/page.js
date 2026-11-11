
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Receipt,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const initialFormData = {
  student: "",
  batch: "",
  amount: "",
  totalFees: "",
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

const getToken = () => {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getStudentName = (student) => {
  if (!student) return "N/A";
  if (typeof student === "string") return student;
  return student.name || student.userId || "N/A";
};

const getBatchName = (batch) => {
  if (!batch) return "N/A";
  if (typeof batch === "string") return batch;
  return batch.batch || batch.name || batch.code || "N/A";
};

const formatAmount = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getPaymentArray = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.payments)) return result.payments;
  if (Array.isArray(result?.data?.payments)) return result.data.payments;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState(initialFormData);

  // --------------------------------------------------
  // API REQUEST HELPER
  // --------------------------------------------------

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = getToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Request failed with status ${response.status}`
      );
    }

    return result;
  }, []);

  // --------------------------------------------------
  // FETCH PAYMENTS, STUDENTS AND BATCHES
  // --------------------------------------------------

  const fetchPayments = useCallback(async () => {
    try {
      const result = await apiRequest("/api/admin/payments");
      setPayments(getPaymentArray(result));
    } catch (error) {
      console.error("Fetch payments error:", error);
      alert(error.message || "Unable to fetch payments.");
    }
  }, [apiRequest]);

  const fetchStudents = useCallback(async () => {
    try {
      const result = await apiRequest(
        "/api/admin/users?role=Student&limit=100"
      );

      const studentList = Array.isArray(result.users)
        ? result.users
        : Array.isArray(result.data?.users)
        ? result.data.users
        : Array.isArray(result.data)
        ? result.data
        : [];

      setStudents(studentList);
    } catch (error) {
      console.error("Fetch students error:", error);
    }
  }, [apiRequest]);

  const fetchBatches = useCallback(async () => {
    try {
      const result = await apiRequest("/api/admin/batches");

      const batchList = Array.isArray(result.batches)
        ? result.batches
        : Array.isArray(result.data?.batches)
        ? result.data.batches
        : Array.isArray(result.data)
        ? result.data
        : [];

      setBatches(batchList);
    } catch (error) {
      console.error("Fetch batches error:", error);
    }
  }, [apiRequest]);

  const loadPageData = useCallback(async () => {
    setLoading(true);

    await Promise.all([
      fetchPayments(),
      fetchStudents(),
      fetchBatches(),
    ]);

    setLoading(false);
  }, [fetchPayments, fetchStudents, fetchBatches]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {
    return payments.reduce(
      (result, payment) => {
        const total = Number(
          payment.totalFees ?? payment.amount ?? 0
        );

        const collected = Number(payment.collectedFees ?? 0);

        const pending = Number(
          payment.pendingFees ?? Math.max(0, total - collected)
        );

        result.totalFees += total;
        result.collectedFees += collected;
        result.pendingFees += pending;

        if (payment.status === "Paid") {
          result.paidCount += 1;
        } else if (payment.status === "Pending") {
          result.pendingCount += 1;
        } else if (payment.status === "Failed") {
          result.failedCount += 1;
        }

        return result;
      },
      {
        totalFees: 0,
        collectedFees: 0,
        pendingFees: 0,
        paidCount: 0,
        pendingCount: 0,
        failedCount: 0,
      }
    );
  }, [payments]);

  // --------------------------------------------------
  // SEARCH AND FILTER
  // --------------------------------------------------

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const studentName = getStudentName(payment.student).toLowerCase();
      const studentId =
        payment.student?.userId?.toLowerCase() || "";

      const batchName = getBatchName(payment.batch).toLowerCase();

      const query = search.toLowerCase();

      const matchesSearch =
        studentName.includes(query) ||
        studentId.includes(query) ||
        batchName.includes(query) ||
        String(payment.reference || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedPayment(null);
    setIsEditing(false);
    setFormError("");
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // --------------------------------------------------
  // OPEN UPDATE MODAL
  // --------------------------------------------------

  const openEditModal = async (payment) => {
    try {
      setFormError("");

      const result = await apiRequest(
        `/api/admin/payments/${payment._id}`
      );

      const selected =
        result.payment ||
        result.data?.payment ||
        result.data ||
        payment;

      setSelectedPayment(selected);
      setIsEditing(true);

      const totalFees = Number(
        selected.totalFees ?? selected.amount ?? 0
      );

      const collectedFees = Number(
        selected.collectedFees ?? 0
      );

      const pendingFees = Number(
        selected.pendingFees ??
          Math.max(0, totalFees - collectedFees)
      );

      setFormData({
        student: getId(selected.student),
        batch: getId(selected.batch),

        // Keep amount and totalFees synchronized.
        amount: String(totalFees),
        totalFees: String(totalFees),

        collectedFees: String(collectedFees),
        pendingFees: String(pendingFees),

        currency: selected.currency || "INR",
        dueDate: toInputDate(selected.dueDate),
        paidAt: toInputDate(selected.paidAt),
        method: selected.method || "UPI",
        reference: selected.reference || "",
        status: selected.status || "Pending",
        notes: selected.notes || "",
      });

      setIsModalOpen(true);
    } catch (error) {
      console.error("Fetch payment details error:", error);
      alert(error.message || "Unable to load payment details.");
    }
  };

  // --------------------------------------------------
  // EDIT PAYMENT DETAILS
  // --------------------------------------------------

  const validateFees = () => {
    const totalFees = Number(formData.totalFees);
    const collectedFees = Number(formData.collectedFees);
    const pendingFees = Number(formData.pendingFees);

    if (
      !Number.isFinite(totalFees) ||
      !Number.isFinite(collectedFees) ||
      !Number.isFinite(pendingFees)
    ) {
      return "Please enter valid fee amounts.";
    }

    if (totalFees <= 0) {
      return "Total fees must be greater than zero.";
    }

    if (collectedFees < 0 || pendingFees < 0) {
      return "Collected and remaining fees cannot be negative.";
    }

    if (collectedFees > totalFees) {
      return "Collected fees cannot exceed total fees.";
    }

    if (pendingFees > totalFees) {
      return "Remaining fees cannot exceed total fees.";
    }

    const calculatedTotal = collectedFees + pendingFees;

    if (Math.abs(totalFees - calculatedTotal) > 0.01) {
      return "Total Fees must equal Collected Fees + Remaining Fees.";
    }

    return "";
  };

  // --------------------------------------------------
  // SAVE / UPDATE PAYMENT
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.student) {
      setFormError("Please select a student.");
      return;
    }

    if (!formData.dueDate) {
      setFormError("Please select a due date.");
      return;
    }

    const feeError = validateFees();

    if (feeError) {
      setFormError(feeError);
      return;
    }

    const totalFees = Number(formData.totalFees);
    const collectedFees = Number(formData.collectedFees);
    const pendingFees = Number(formData.pendingFees);

    const payload = {
      student: formData.student,
      batch: formData.batch || null,

      // The existing Payment controller uses amount.
      amount: totalFees,

      // Fee summary fields.
      totalFees,
      collectedFees,
      pendingFees,

      currency: formData.currency || "INR",
      dueDate: formData.dueDate,
      method: formData.method,
      reference: formData.reference.trim(),
      status: formData.status,
      notes: formData.notes.trim(),

      paidAt:
        formData.status === "Paid"
          ? formData.paidAt || new Date().toISOString()
          : null,
    };

    setSaving(true);

    try {
      if (isEditing && selectedPayment?._id) {
        await apiRequest(
          `/api/admin/payments/${selectedPayment._id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        alert("Payment updated successfully.");
      } else {
        await apiRequest("/api/admin/payments", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        alert("Payment created successfully.");
      }

      setIsModalOpen(false);
      resetForm();

      await fetchPayments();
    } catch (error) {
      console.error("Save payment error:", error);
      setFormError(error.message || "Unable to save payment.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DELETE PAYMENT
  // --------------------------------------------------

  const handleDelete = async (payment) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the payment record for ${getStudentName(
        payment.student
      )}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/payments/${payment._id}`, {
        method: "DELETE",
      });

      alert("Payment deleted successfully.");
      await fetchPayments();
    } catch (error) {
      console.error("Delete payment error:", error);
      alert(error.message || "Unable to delete payment.");
    }
  };

  // --------------------------------------------------
  // VIEW PAYMENT
  // --------------------------------------------------

  const openViewModal = (payment) => {
    setSelectedPayment(payment);
    setIsViewOpen(true);
  };

  // --------------------------------------------------
  // COMMON UI COMPONENTS
  // --------------------------------------------------

  const statusClass = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700";

      case "Failed":
        return "bg-red-100 text-red-700";

      case "Refunded":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-gray-700";

  const getProgress = (total, collected) => {
    if (!total || total <= 0) return 0;

    return Math.min(
      100,
      Math.max(0, (collected / total) * 100)
    );
  };

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* HEADER */}

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102e60]">
            Payment Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage student fees, collected amounts and remaining balances.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadPageData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#183e7b]"
          >
            <Plus size={17} />
            Add Payment
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Fees"
          value={formatAmount(summary.totalFees)}
          icon={<Receipt size={21} />}
          iconClass="bg-blue-100 text-blue-700"
        />

        <SummaryCard
          title="Collected Fees"
          value={formatAmount(summary.collectedFees)}
          icon={<CheckCircle2 size={21} />}
          iconClass="bg-green-100 text-green-700"
        />

        <SummaryCard
          title="Remaining Fees"
          value={formatAmount(summary.pendingFees)}
          icon={<Wallet size={21} />}
          iconClass="bg-amber-100 text-amber-700"
        />

        <SummaryCard
          title="Pending Records"
          value={summary.pendingCount}
          icon={<Clock size={21} />}
          iconClass="bg-orange-100 text-orange-700"
        />
      </div>

      {/* PAYMENT TABLE */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-semibold text-gray-800">
              All Payment Records
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {filteredPayments.length} payment records found
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, batch..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600"
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw
              size={28}
              className="animate-spin text-[#102e60]"
            />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <Receipt size={42} className="mb-3 text-gray-300" />

            <h3 className="font-semibold text-gray-700">
              No payment records found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add a payment record or change your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-4">Student</th>
                  <th className="px-4 py-4">Batch</th>
                  <th className="px-4 py-4">Total Fees</th>
                  <th className="px-4 py-4">Collected</th>
                  <th className="px-4 py-4">Remaining</th>
                  <th className="px-4 py-4">Progress</th>
                  <th className="px-4 py-4">Due Date</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => {
                  const total = Number(
                    payment.totalFees ?? payment.amount ?? 0
                  );

                  const collected = Number(
                    payment.collectedFees ?? 0
                  );

                  const pending = Number(
                    payment.pendingFees ??
                      Math.max(0, total - collected)
                  );

                  const progress = getProgress(total, collected);

                  return (
                    <tr
                      key={payment._id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">
                          {getStudentName(payment.student)}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {payment.student?.userId || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {getBatchName(payment.batch)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-gray-800">
                        {formatAmount(total, payment.currency)}
                      </td>

                      <td className="px-4 py-4 font-medium text-green-700">
                        {formatAmount(collected, payment.currency)}
                      </td>

                      <td className="px-4 py-4 font-medium text-amber-700">
                        {formatAmount(pending, payment.currency)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="w-28">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-gray-500">
                              {Math.round(progress)}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(payment.dueDate)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            payment.status
                          )}`}
                        >
                          {payment.status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="View payment"
                            onClick={() => openViewModal(payment)}
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Update payment"
                            onClick={() => openEditModal(payment)}
                            className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            title="Delete payment"
                            onClick={() => handleDelete(payment)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={17} />
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

      {/* ADD / UPDATE MODAL */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 md:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#102e60]">
                  {isEditing ? "Update Payment" : "Add Payment"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Manage total fees, collected fees and remaining fees.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {/* STUDENT AND BATCH */}

              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Student <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="student"
                    value={formData.student}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">Select Student</option>

                    {students.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.userId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Batch</label>

                  <select
                    name="batch"
                    value={formData.batch}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select Batch</option>

                    {batches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {getBatchName(batch)}
                        {batch.code ? ` (${batch.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FEE EDITING SECTION */}

              <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="mb-4">
                  <h3 className="font-semibold text-[#102e60]">
                    Fee Details
                  </h3>

                  <p className="mt-1 text-xs text-gray-600">
                    Edit all three amounts. Their total must remain balanced.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* TOTAL FEES */}

                  <div>
                    <label className={labelClass}>
                      Total Fees (₹) <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <IndianRupee
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="number"
                        name="totalFees"
                        min="0"
                        step="0.01"
                        value={formData.totalFees}
                        onChange={(event) => {
                          const value = event.target.value;

                          setFormData((previous) => ({
                            ...previous,
                            totalFees: value,
                            amount: value,
                          }));

                          setFormError("");
                        }}
                        required
                        placeholder="Enter total fees"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>

                  {/* COLLECTED FEES */}

                  <div>
                    <label className={labelClass}>
                      Collected Fees (₹) <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <IndianRupee
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="number"
                        name="collectedFees"
                        min="0"
                        step="0.01"
                        value={formData.collectedFees}
                        onChange={handleChange}
                        required
                        placeholder="Enter collected fees"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>

                  {/* REMAINING FEES - EDITABLE */}

                  <div>
                    <label className={labelClass}>
                      Remaining Fees (₹) <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <IndianRupee
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="number"
                        name="pendingFees"
                        min="0"
                        step="0.01"
                        value={formData.pendingFees}
                        onChange={handleChange}
                        required
                        placeholder="Enter remaining fees"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>
                </div>

                {/* FEE CALCULATION PREVIEW */}

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-blue-100 bg-white p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Fees</p>
                    <p className="mt-1 font-bold text-gray-800">
                      {formatAmount(formData.totalFees)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Collected</p>
                    <p className="mt-1 font-bold text-green-700">
                      {formatAmount(formData.collectedFees)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="mt-1 font-bold text-amber-700">
                      {formatAmount(formData.pendingFees)}
                    </p>
                  </div>
                </div>

                {Number(formData.totalFees || 0) > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-gray-600">
                      <span>Collection Progress</span>

                      <span>
                        {Math.round(
                          getProgress(
                            Number(formData.totalFees),
                            Number(formData.collectedFees)
                          )
                        )}
                        %
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${getProgress(
                            Number(formData.totalFees),
                            Number(formData.collectedFees)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-600">
                  Validation: Total Fees = Collected Fees + Remaining Fees.
                </p>
              </div>

              {/* OTHER PAYMENT DETAILS */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Currency</label>

                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Due Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Payment Method</label>

                  <select
                    name="method"
                    value={formData.method}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Payment Status</label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Failed">Failed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Payment Date</label>

                  <input
                    type="date"
                    name="paidAt"
                    value={formData.paidAt}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Reference Number</label>

                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder="Enter transaction reference"
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Notes</label>

                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter payment notes..."
                    className={inputClass}
                  />
                </div>
              </div>

              {/* VALIDATION ERROR */}

              {formError && (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* FOOTER */}

              <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-gray-200 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#183e7b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : isEditing
                    ? "Update Payment"
                    : "Create Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PAYMENT MODAL */}

      {isViewOpen && selectedPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-3">
          <div className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h2 className="font-bold text-[#102e60]">
                  Payment Details
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Student fee record
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem
                  label="Student"
                  value={getStudentName(selectedPayment.student)}
                />

                <DetailItem
                  label="Student ID"
                  value={selectedPayment.student?.userId || "—"}
                />

                <DetailItem
                  label="Batch"
                  value={getBatchName(selectedPayment.batch)}
                />

                <DetailItem
                  label="Course"
                  value={
                    selectedPayment.batch?.course?.name ||
                    selectedPayment.batch?.course ||
                    "—"
                  }
                />

                <DetailItem
                  label="Total Fees"
                  value={formatAmount(
                    selectedPayment.totalFees ?? selectedPayment.amount,
                    selectedPayment.currency
                  )}
                />

                <DetailItem
                  label="Collected Fees"
                  value={formatAmount(
                    selectedPayment.collectedFees,
                    selectedPayment.currency
                  )}
                />

                <DetailItem
                  label="Remaining Fees"
                  value={formatAmount(
                    selectedPayment.pendingFees,
                    selectedPayment.currency
                  )}
                />

                <DetailItem
                  label="Due Date"
                  value={formatDate(selectedPayment.dueDate)}
                />

                <DetailItem
                  label="Payment Method"
                  value={selectedPayment.method || "—"}
                />

                <DetailItem
                  label="Payment Date"
                  value={formatDate(selectedPayment.paidAt)}
                />

                <DetailItem
                  label="Reference"
                  value={selectedPayment.reference || "—"}
                />

                <div>
                  <p className="text-xs text-gray-500">Status</p>

                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                      selectedPayment.status
                    )}`}
                  >
                    {selectedPayment.status || "Pending"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Notes</p>

                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {selectedPayment.notes || "No notes available."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsViewOpen(false);
                  openEditModal(selectedPayment);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183e7b]"
              >
                <Pencil size={16} />
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({ title, value, icon, iconClass }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <h3 className="mt-2 text-xl font-bold text-gray-800">
            {value}
          </h3>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// VIEW DETAILS ITEM
// --------------------------------------------------

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-1 break-words text-sm font-semibold text-gray-800">
        {value || "—"}
      </p>
    </div>
  );
}
