
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Trophy,
  RefreshCw,
  AlertCircle,
  Clock,
  XCircle,
  ReceiptText,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiRequest(endpoint) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error
        : data;

    throw new Error(
      message || `Request failed (${response.status})`
    );
  }

  return data;
}

function extractArray(response, keys) {
  if (Array.isArray(response)) return response;

  if (!response || typeof response !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(response[key])) return response[key];
  }

  if (Array.isArray(response.data)) return response.data;

  if (response.data && typeof response.data === "object") {
    for (const key of keys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key];
      }
    }
  }

  return [];
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getProgress(course) {
  if (
    course.progress !== undefined &&
    course.progress !== null &&
    course.progress !== ""
  ) {
    return Math.max(0, Math.min(100, getNumber(course.progress)));
  }

  const completed = getNumber(
    course.completedLessons ??
      course.lessonsCompleted ??
      course.completed ??
      0
  );

  const total = getNumber(
    course.totalLessons ??
      course.lessonsCount ??
      course.total ??
      0
  );

  if (total > 0) {
    return Math.max(0, Math.min(100, (completed / total) * 100));
  }

  return 0;
}

function getLessonLabel(course, progress) {
  const completed = getNumber(
    course.completedLessons ??
      course.lessonsCompleted ??
      course.completed
  );

  const total = getNumber(
    course.totalLessons ??
      course.lessonsCount ??
      course.total
  );

  if (total > 0) {
    return `${completed} of ${total} lessons`;
  }

  if (progress === 0) return "Not started";
  if (progress === 100) return "Completed";

  return `${Math.round(progress)}% completed`;
}

function formatCurrency(amount, currency = "INR") {
  const value = Number(amount);

  if (!Number.isFinite(value)) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString("en-IN")}`;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPaymentStatus(payment) {
  return String(
    payment.status ||
      payment.paymentStatus ||
      payment.transactionStatus ||
      "Unknown"
  );
}

function paymentStatusClass(status) {
  const normalized = status.toLowerCase();

  if (
    ["paid", "success", "successful", "completed"].some((value) =>
      normalized.includes(value)
    )
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    ["pending", "processing", "initiated"].some((value) =>
      normalized.includes(value)
    )
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (
    ["failed", "cancelled", "canceled", "rejected"].some((value) =>
      normalized.includes(value)
    )
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function ProgressPaymentsPage() {
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rankData, setRankData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Please sign in to view your progress and payment records."
        );
      }

      // Verify the logged-in user first.
      await apiRequest("/api/student/profile");

      // Load each section independently.
      const results = await Promise.allSettled([
        apiRequest("/api/student/progress"),
        apiRequest("/api/student/rank"),
        apiRequest("/api/student/payments"),
      ]);

      const [coursesResult, rankResult, paymentsResult] = results;

      if (coursesResult.status === "fulfilled") {
        const response = coursesResult.value;

        setCourses(
          extractArray(response, ["courses", "enrollments"])
        );
      } else {
        setCourses([]);
      }

      if (rankResult.status === "fulfilled") {
        const response = rankResult.value;

        setRankData(
          response?.rankData ||
            response?.ranking ||
            response?.data ||
            response
        );
      } else {
        setRankData(null);
      }

      if (paymentsResult.status === "fulfilled") {
        setPayments(
          extractArray(paymentsResult.value, [
            "payments",
            "transactions",
            "records",
          ])
        );
      } else {
        setPayments([]);
      }

      if (results.every((result) => result.status === "rejected")) {
        setError(
          "Unable to load progress and payment information. Check that the backend routes are available."
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load your information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const progressValues = courses.map((course) => getProgress(course));

  const averageProgress =
    progressValues.length > 0
      ? Math.round(
          progressValues.reduce((sum, value) => sum + value, 0) /
            progressValues.length
        )
      : null;

  const rank =
    rankData?.rank ??
    rankData?.batchRank ??
    rankData?.position ??
    null;

  const totalStudents =
    rankData?.totalStudents ??
    rankData?.batchSize ??
    rankData?.total ??
    null;

  const paidPayments = payments.filter((payment) =>
    ["paid", "success", "successful", "completed"].some((status) =>
      getPaymentStatus(payment).toLowerCase().includes(status)
    )
  );

  const totalPaid = paidPayments.reduce(
    (sum, payment) =>
      sum +
      getNumber(
        payment.amount ??
          payment.paidAmount ??
          payment.totalAmount ??
          0
      ),
    0
  );

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-7">
      {/* Header */}
      <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-[#102e60]">
            Progress &amp; Payments
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Your learning progress, batch rank and payment overview.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-blue-100 bg-white px-4 py-2.5 text-xs font-semibold text-[#102e60] hover:bg-blue-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </header>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-blue-100 bg-white p-10 text-center">
          <RefreshCw
            size={26}
            className="mx-auto mb-3 animate-spin text-blue-600"
          />
          <p className="text-sm text-slate-500">
            Loading your progress and payments...
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <CheckCircle2 className="text-blue-600" size={20} />

              <p className="mt-3 text-xs text-slate-500">
                Average course progress
              </p>

              <p className="mt-1 text-2xl font-bold text-[#102e60]">
                {averageProgress === null
                  ? "—"
                  : `${averageProgress}%`}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {courses.length} enrolled course
                {courses.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <Trophy className="text-blue-600" size={20} />

              <p className="mt-3 text-xs text-slate-500">
                Batch rank
              </p>

              <p className="mt-1 text-2xl font-bold text-[#102e60]">
                {rank !== null && rank !== ""
                  ? `#${rank}`
                  : "—"}
                {totalStudents !== null && totalStudents !== ""
                  ? ` of ${totalStudents}`
                  : ""}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {rankData ? "Current ranking" : "Ranking unavailable"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <CreditCard className="text-blue-600" size={20} />

              <p className="mt-3 text-xs text-slate-500">
                Total successful payments
              </p>

              <p className="mt-1 text-2xl font-bold text-[#102e60]">
                {formatCurrency(totalPaid)}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {paidPayments.length} successful transaction
                {paidPayments.length === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          {/* Course completion */}
          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#17345f]">
                  Course Completion
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Progress based on your course enrollment and completed
                  lessons.
                </p>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2
                  size={25}
                  className="mx-auto mb-2 text-slate-400"
                />

                <p className="text-sm font-medium text-slate-600">
                  No course progress available
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your enrolled courses will appear here when available.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {courses.map((course, index) => {
                  const progress = getProgress(course);

                  const name =
                    course.name ||
                    course.courseName ||
                    course.title ||
                    course.course?.name ||
                    course.course?.courseName ||
                    `Course ${index + 1}`;

                  return (
                    <div key={course._id || course.id || name}>
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <p className="text-xs font-semibold text-[#17345f]">
                          {name}
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {getLessonLabel(course, progress)}
                        </p>
                      </div>

                      <div
                        className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100"
                        role="progressbar"
                        aria-label={`${name} progress`}
                        aria-valuenow={Math.round(progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className="mt-1 text-right text-[10px] font-semibold text-blue-700">
                        {Math.round(progress)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Payment records */}
          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText size={18} className="text-blue-600" />

              <div>
                <h2 className="text-sm font-bold text-[#17345f]">
                  Payment Records
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your payment transactions and their current statuses.
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="py-8 text-center">
                <CreditCard
                  size={26}
                  className="mx-auto mb-2 text-slate-400"
                />

                <p className="text-sm font-medium text-slate-600">
                  No payment records available
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Payment history will appear here when provided by the
                  backend.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, index) => {
                  const id =
                    payment._id ||
                    payment.id ||
                    payment.transactionId ||
                    index;

                  const amount =
                    payment.amount ??
                    payment.paidAmount ??
                    payment.totalAmount;

                  const status = getPaymentStatus(payment);

                  const title =
                    payment.courseName ||
                    payment.course?.name ||
                    payment.description ||
                    payment.feeType ||
                    payment.purpose ||
                    "Course payment";

                  const transactionId =
                    payment.transactionId ||
                    payment.referenceId ||
                    payment.receiptNumber ||
                    "";

                  const date =
                    payment.paymentDate ||
                    payment.paidAt ||
                    payment.createdAt ||
                    payment.date;

                  const currency = payment.currency || "INR";

                  return (
                    <article
                      key={id}
                      className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                          <CreditCard size={18} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-xs font-bold text-[#17345f]">
                            {title}
                          </h3>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatDate(date)}
                          </p>

                          {transactionId && (
                            <p className="mt-1 break-all text-[10px] text-slate-400">
                              Transaction ID: {transactionId}
                            </p>
                          )}

                          {payment.paymentMethod && (
                            <p className="mt-1 text-[10px] text-slate-400">
                              Method: {payment.paymentMethod}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <p className="text-sm font-bold text-[#102e60]">
                          {formatCurrency(amount, currency)}
                        </p>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${paymentStatusClass(
                            status
                          )}`}
                        >
                          {status.toLowerCase().includes("paid") ||
                          status.toLowerCase().includes("success") ||
                          status.toLowerCase().includes("completed") ? (
                            <CheckCircle2 size={12} />
                          ) : status.toLowerCase().includes("pending") ? (
                            <Clock size={12} />
                          ) : status.toLowerCase().includes("failed") ? (
                            <XCircle size={12} />
                          ) : null}

                          {status}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
