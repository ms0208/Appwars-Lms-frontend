
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
  Wallet,
  BookOpen,
  CalendarDays,
  UserRound,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// --------------------------------------------------
// API REQUEST
// --------------------------------------------------

async function apiRequest(endpoint) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("appwars_token") ||
        sessionStorage.getItem("token")
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

// --------------------------------------------------
// RESPONSE HELPERS
// --------------------------------------------------

function extractArray(response, keys) {
  if (Array.isArray(response)) return response;

  if (!response || typeof response !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

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

// --------------------------------------------------
// COURSE PROGRESS HELPERS
// --------------------------------------------------

function getProgress(course) {
  if (
    course.progress !== undefined &&
    course.progress !== null &&
    course.progress !== ""
  ) {
    return Math.max(
      0,
      Math.min(100, getNumber(course.progress))
    );
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
    return Math.max(
      0,
      Math.min(100, (completed / total) * 100)
    );
  }

  return 0;
}

function getLessonLabel(course, progress) {
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
    return `${completed} of ${total} lessons`;
  }

  if (progress === 0) return "Not started";
  if (progress === 100) return "Completed";

  return `${Math.round(progress)}% completed`;
}

function getCourseName(course, index) {
  const value =
    course.name ||
    course.courseName ||
    course.title ||
    course.course?.name ||
    course.course?.title ||
    course.course?.courseName ||
    course.batch?.course?.title ||
    course.batch?.course?.name;

  if (typeof value === "string") return value;

  return `Course ${index + 1}`;
}

// --------------------------------------------------
// PAYMENT HELPERS
// --------------------------------------------------

function getPaymentStatus(payment) {
  return String(
    payment.status ||
      payment.paymentStatus ||
      payment.transactionStatus ||
      "Unknown"
  );
}

function isPaid(status) {
  return [
    "paid",
    "success",
    "successful",
    "completed",
  ].some((value) => status.toLowerCase().includes(value));
}

function isPending(status) {
  return [
    "pending",
    "processing",
    "initiated",
  ].some((value) => status.toLowerCase().includes(value));
}

function isFailed(status) {
  return [
    "failed",
    "cancelled",
    "canceled",
    "rejected",
  ].some((value) => status.toLowerCase().includes(value));
}

function isRefunded(status) {
  return status.toLowerCase().includes("refund");
}

function paymentStatusClass(status) {
  if (isPaid(status)) {
    return "bg-green-100 text-green-700";
  }

  if (isPending(status)) {
    return "bg-amber-100 text-amber-700";
  }

  if (isFailed(status)) {
    return "bg-red-100 text-red-700";
  }

  if (isRefunded(status)) {
    return "bg-purple-100 text-purple-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getPaymentTitle(payment) {
  const batch = payment.batch;

  // Course can be a populated object or a string.
  const course =
    typeof batch?.course === "object" && batch?.course !== null
      ? batch.course.title ||
        batch.course.name ||
        batch.course.courseName
      : typeof batch?.course === "string"
        ? batch.course
        : "";

  return (
    payment.courseName ||
    payment.course?.name ||
    payment.course?.title ||
    course ||
    batch?.name ||
    batch?.batch ||
    payment.description ||
    payment.feeType ||
    payment.purpose ||
    payment.notes ||
    "Course payment"
  );
}

function getPaymentReference(payment) {
  return (
    payment.reference ||
    payment.transactionId ||
    payment.referenceId ||
    payment.receiptNumber ||
    ""
  );
}

function getPaymentMethod(payment) {
  return (
    payment.method ||
    payment.paymentMethod ||
    "Not specified"
  );
}

function getPaymentDate(payment) {
  return (
    payment.paidAt ||
    payment.paymentDate ||
    payment.createdAt ||
    payment.date ||
    null
  );
}

// --------------------------------------------------
// FORMATTING
// --------------------------------------------------

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

// --------------------------------------------------
// REUSABLE SUMMARY CARD
// --------------------------------------------------

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          {title}
        </p>

        <Icon size={20} className="text-blue-600" />
      </div>

      <p className="mt-3 text-2xl font-bold text-[#102e60]">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function ProgressPaymentsPage() {
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rankData, setRankData] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        sessionStorage.getItem("appwars_token") ||
        sessionStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Please sign in to view your progress and payment records."
        );
      }

      // Verify logged-in student
      await apiRequest("/api/student/profile");

      // Fetch all dashboard sections
      const results = await Promise.allSettled([
        apiRequest("/api/student/progress"),
        apiRequest("/api/student/rank"),
        apiRequest("/api/student/payments"),
      ]);

      const [
        coursesResult,
        rankResult,
        paymentsResult,
      ] = results;

      // COURSE PROGRESS
      if (coursesResult.status === "fulfilled") {
        const response = coursesResult.value;

        setCourses(
          extractArray(response, [
            "courses",
            "enrollments",
          ])
        );
      } else {
        setCourses([]);
      }

      // STUDENT RANK
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

      // STUDENT PAYMENTS
      if (paymentsResult.status === "fulfilled") {
        const response = paymentsResult.value;

        setPayments(
          extractArray(response, [
            "payments",
            "transactions",
            "records",
          ])
        );

        // Updated backend payment summary
        setPaymentSummary(
          response?.summary ||
            response?.data?.summary ||
            null
        );
      } else {
        setPayments([]);
        setPaymentSummary(null);
      }

      // Show error only when all three sections fail
      if (
        results.every(
          (result) => result.status === "rejected"
        )
      ) {
        setError(
          "Unable to load progress and payment information. Please check your backend routes."
        );
      }
    } catch (err) {
      setError(
        err.message || "Failed to load your information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------
  // COURSE CALCULATIONS
  // --------------------------------------------------

  const progressValues = courses.map((course) =>
    getProgress(course)
  );

  const averageProgress =
    progressValues.length > 0
      ? Math.round(
          progressValues.reduce(
            (sum, value) => sum + value,
            0
          ) / progressValues.length
        )
      : null;

  // --------------------------------------------------
  // RANK CALCULATIONS
  // --------------------------------------------------

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

  // --------------------------------------------------
  // PAYMENT CALCULATIONS
  // --------------------------------------------------

  const paidPayments = payments.filter((payment) =>
    isPaid(getPaymentStatus(payment))
  );

  const pendingPayments = payments.filter((payment) =>
    isPending(getPaymentStatus(payment))
  );

  const failedPayments = payments.filter((payment) =>
    isFailed(getPaymentStatus(payment))
  );

  const refundedPayments = payments.filter((payment) =>
    isRefunded(getPaymentStatus(payment))
  );

  // Prefer backend calculated totals
  // Fallback to frontend calculations
  const totalPaid =
    paymentSummary?.paidTotal ??
    paidPayments.reduce(
      (sum, payment) =>
        sum + getNumber(payment.amount),
      0
    );

  const pendingTotal =
    paymentSummary?.pendingTotal ??
    pendingPayments.reduce(
      (sum, payment) =>
        sum + getNumber(payment.amount),
      0
    );

  const failedTotal =
    paymentSummary?.failedTotal ??
    failedPayments.reduce(
      (sum, payment) =>
        sum + getNumber(payment.amount),
      0
    );

  const refundedTotal =
    paymentSummary?.refundedTotal ??
    refundedPayments.reduce(
      (sum, payment) =>
        sum + getNumber(payment.amount),
      0
    );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-7">

      {/* HEADER */}
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

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0"
          />

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
          {/* ------------------------------------------ */}
          {/* SUMMARY CARDS */}
          {/* ------------------------------------------ */}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              icon={CheckCircle2}
              title="Average Course Progress"
              value={
                averageProgress === null
                  ? "—"
                  : `${averageProgress}%`
              }
              description={`${courses.length} enrolled course${
                courses.length === 1 ? "" : "s"
              }`}
            />

            <SummaryCard
              icon={Trophy}
              title="Batch Rank"
              value={
                rank !== null && rank !== ""
                  ? `#${rank}${
                      totalStudents !== null &&
                      totalStudents !== ""
                        ? ` / ${totalStudents}`
                        : ""
                    }`
                  : "—"
              }
              description={
                rankData
                  ? "Current ranking"
                  : "Ranking unavailable"
              }
            />

            <SummaryCard
              icon={Wallet}
              title="Total Paid"
              value={formatCurrency(totalPaid)}
              description={`${paidPayments.length} successful payment${
                paidPayments.length === 1 ? "" : "s"
              }`}
            />

            <SummaryCard
              icon={Clock}
              title="Pending Amount"
              value={formatCurrency(pendingTotal)}
              description={`${pendingPayments.length} pending payment${
                pendingPayments.length === 1 ? "" : "s"
              }`}
            />

          </section>

          {/* ------------------------------------------ */}
          {/* PAYMENT SUMMARY */}
          {/* ------------------------------------------ */}

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex items-center gap-2">
                <XCircle
                  size={18}
                  className="text-red-500"
                />

                <p className="text-xs font-semibold text-slate-600">
                  Failed Payments
                </p>
              </div>

              <p className="mt-2 text-lg font-bold text-red-600">
                {formatCurrency(failedTotal)}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {failedPayments.length} failed transaction
                {failedPayments.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex items-center gap-2">
                <RefreshCw
                  size={18}
                  className="text-purple-500"
                />

                <p className="text-xs font-semibold text-slate-600">
                  Refunded Payments
                </p>
              </div>

              <p className="mt-2 text-lg font-bold text-purple-600">
                {formatCurrency(refundedTotal)}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {refundedPayments.length} refunded transaction
                {refundedPayments.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex items-center gap-2">
                <ReceiptText
                  size={18}
                  className="text-blue-600"
                />

                <p className="text-xs font-semibold text-slate-600">
                  Total Payment Records
                </p>
              </div>

              <p className="mt-2 text-lg font-bold text-[#102e60]">
                {paymentSummary?.totalPayments ??
                  payments.length}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                All payment transactions
              </p>
            </div>

          </section>

          {/* ------------------------------------------ */}
          {/* COURSE COMPLETION */}
          {/* ------------------------------------------ */}

          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-4 sm:p-5">

            <div className="mb-4 flex items-center gap-2">
              <BookOpen
                size={18}
                className="text-blue-600"
              />

              <div>
                <h2 className="text-sm font-bold text-[#17345f]">
                  Course Completion
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Progress based on your course enrollment and completed lessons.
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

                  const name = getCourseName(
                    course,
                    index
                  );

                  return (
                    <div
                      key={course._id || course.id || index}
                    >
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
                          style={{
                            width: `${progress}%`,
                          }}
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

          {/* ------------------------------------------ */}
          {/* PAYMENT RECORDS */}
          {/* ------------------------------------------ */}

          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-4 sm:p-5">

            <div className="mb-4 flex items-center gap-2">
              <ReceiptText
                size={18}
                className="text-blue-600"
              />

              <div>
                <h2 className="text-sm font-bold text-[#17345f]">
                  Payment Records
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your payment transactions, batch details and payment statuses.
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
                  Your payment history will appear here when recorded by the administration.
                </p>
              </div>
            ) : (
              <div className="space-y-3">

                {payments.map((payment, index) => {
                  const id =
                    payment._id ||
                    payment.id ||
                    payment.reference ||
                    index;

                  const amount = getNumber(
                    payment.amount ??
                      payment.paidAmount ??
                      payment.totalAmount ??
                      0
                  );

                  const status = getPaymentStatus(payment);

                  const title = getPaymentTitle(payment);

                  const transactionId =
                    getPaymentReference(payment);

                  const date = getPaymentDate(payment);

                  const currency =
                    payment.currency || "INR";

                  const method = getPaymentMethod(payment);

                  const batch =
                    payment.batch?.batch ||
                    payment.batch?.name ||
                    payment.batch?.code ||
                    "";

                  const trainer =
                    payment.batch?.trainer?.name || "";

                  const dueDate = payment.dueDate;

                  return (
                    <article
                      key={id}
                      className="rounded-lg border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/20"
                    >

                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                        {/* PAYMENT DETAILS */}

                        <div className="flex min-w-0 items-start gap-3">

                          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                            <CreditCard size={19} />
                          </div>

                          <div className="min-w-0">

                            <h3 className="break-words text-xs font-bold text-[#17345f]">
                              {title}
                            </h3>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">

                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                <CalendarDays size={12} />
                                {formatDate(date)}
                              </span>

                              {batch && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <BookOpen size={12} />
                                  {batch}
                                </span>
                              )}

                              {trainer && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <UserRound size={12} />
                                  {trainer}
                                </span>
                              )}

                            </div>

                            {transactionId && (
                              <p className="mt-2 break-all text-[10px] text-slate-400">
                                Reference: {transactionId}
                              </p>
                            )}

                            <p className="mt-1 text-[10px] text-slate-400">
                              Payment Method: {method}
                            </p>

                            {dueDate && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                Due Date: {formatDate(dueDate)}
                              </p>
                            )}

                            {payment.notes && (
                              <p className="mt-1 break-words text-[10px] text-slate-400">
                                Note: {payment.notes}
                              </p>
                            )}

                          </div>
                        </div>

                        {/* AMOUNT AND STATUS */}

                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">

                          <div className="text-left sm:text-right">

                            <p className="text-sm font-bold text-[#102e60]">
                              {formatCurrency(amount, currency)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Payment Amount
                            </p>

                          </div>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${paymentStatusClass(
                              status
                            )}`}
                          >
                            {isPaid(status) ? (
                              <CheckCircle2 size={12} />
                            ) : isPending(status) ? (
                              <Clock size={12} />
                            ) : isFailed(status) ? (
                              <XCircle size={12} />
                            ) : null}

                            {status}
                          </span>

                        </div>

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
