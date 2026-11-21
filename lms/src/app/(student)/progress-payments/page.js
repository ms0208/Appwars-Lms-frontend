
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
  Users,
  GraduationCap,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
).replace(/\/$/, "");

// ======================================================
// AUTHENTICATION
// ======================================================

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("appwars_token") ||
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token")
  );
}

function getAuthHeaders() {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Please sign in to view your progress and payment records."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ======================================================
// API REQUEST
// ======================================================

async function apiRequest(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const contentType =
    response.headers.get("content-type") || "";

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

// ======================================================
// RESPONSE HELPERS
// ======================================================

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function getArray(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractArray(response, keys = []) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isObject(response)) {
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

  if (isObject(response.data)) {
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

function getPercentage(value) {
  return Math.max(0, Math.min(100, getNumber(value)));
}

// ======================================================
// STUDENT PROFILE HELPERS
// Same extraction logic as Student Dashboard
// ======================================================

function getUser(data) {
  return (
    data?.user ||
    data?.data?.user ||
    data?.data?.data?.user ||
    data?.data ||
    data ||
    {}
  );
}

function getDashboard(data) {
  return (
    data?.dashboard ||
    data?.data?.dashboard ||
    data?.data?.data?.dashboard ||
    data?.data ||
    data ||
    {}
  );
}

// ======================================================
// BATCH DETAILS EXTRACTION
// ======================================================

function getBatchDetails(...responses) {
  for (const response of responses) {
    if (!isObject(response)) continue;

    const user = getUser(response);
    const dashboard = getDashboard(response);

    const candidates = [
      response.batchDetails,
      response.data?.batchDetails,
      response.user?.batchDetails,
      response.data?.user?.batchDetails,
      response.dashboard?.batchDetails,
      dashboard?.batchDetails,
      dashboard?.batch,
      dashboard?.student?.batch,
      user?.batchDetails,
      user?.batch,
      user?.student?.batch,
      response.batch,
      response.data?.batch,
    ];

    for (const candidate of candidates) {
      if (!isObject(candidate)) continue;

      if (isObject(candidate.batch)) {
        return {
          ...candidate,
          ...candidate.batch,
          _id:
            candidate._id ||
            candidate.batch._id ||
            candidate.batch.id,
        };
      }

      return candidate;
    }
  }

  return {};
}

function getBatchId(batchDetails, user) {
  const batch = user?.batch;

  return (
    batchDetails?._id ||
    batchDetails?.id ||
    batchDetails?.batchId ||
    user?.batchDetails?._id ||
    user?.batchDetails?.id ||
    (isObject(batch)
      ? batch._id || batch.id || batch.batchId
      : null) ||
    user?.batchId ||
    user?.assignedBatch?._id ||
    user?.assignedBatch?.id ||
    (typeof batch === "string" ? batch : null) ||
    null
  );
}

function getBatchName(batchDetails, user) {
  const batch = user?.batch;

  return (
    batchDetails?.batch ||
    batchDetails?.name ||
    batchDetails?.batchName ||
    batchDetails?.code ||
    (isObject(batch)
      ? batch.batch ||
        batch.name ||
        batch.batchName ||
        batch.code
      : batch) ||
    "Not assigned"
  );
}

// ======================================================
// TRAINER PROGRESS HELPERS
// ======================================================

function extractBatchProgress(response) {
  if (!isObject(response)) {
    return null;
  }

  const candidates = [
    response.batchProgress,
    response.data?.batchProgress,
    response.data?.data?.batchProgress,
    response.progress,
    response.data?.progress,
    response.data,
    response,
  ];

  for (const candidate of candidates) {
    if (isObject(candidate)) {
      if (
        Array.isArray(candidate.topics) ||
        candidate.overallProgress !== undefined ||
        candidate.totalTopics !== undefined
      ) {
        return candidate;
      }
    }
  }

  return null;
}

function getTopics(response) {
  return getArray(
    response?.topics,
    response?.data?.topics,
    response?.data?.data?.topics,
    response?.progress?.topics,
    response?.batchProgress?.topics
  );
}

function getTopicName(topic, index) {
  return (
    topic?.topicName ||
    topic?.name ||
    topic?.title ||
    topic?.topic ||
    `Topic ${index + 1}`
  );
}

function getTopicProgress(topic) {
  return getPercentage(
    topic?.completionPercentage ??
      topic?.progressPercentage ??
      topic?.progress ??
      topic?.percentage ??
      0
  );
}

function getTopicStatus(topic, progress) {
  if (topic?.status) {
    return String(topic.status);
  }

  if (progress >= 100) {
    return "Completed";
  }

  if (progress > 0) {
    return "In Progress";
  }

  return "Pending";
}

function getTopicStatusClass(status, progress) {
  const normalized = String(status).toLowerCase();

  if (
    normalized.includes("complete") ||
    progress >= 100
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalized.includes("progress") ||
    progress > 0
  ) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function calculateAverage(topics) {
  if (!topics.length) return 0;

  const total = topics.reduce(
    (sum, topic) => sum + getTopicProgress(topic),
    0
  );

  return Math.round(total / topics.length);
}

// ======================================================
// PAYMENT HELPERS
// ======================================================

function getPaymentStatus(payment) {
  return String(
    payment?.status ||
      payment?.paymentStatus ||
      payment?.transactionStatus ||
      "Unknown"
  );
}

function isPaid(status) {
  return [
    "paid",
    "success",
    "successful",
    "completed",
  ].some((value) =>
    status.toLowerCase().includes(value)
  );
}

function isPending(status) {
  return [
    "pending",
    "processing",
    "initiated",
  ].some((value) =>
    status.toLowerCase().includes(value)
  );
}

function isFailed(status) {
  return [
    "failed",
    "cancelled",
    "canceled",
    "rejected",
  ].some((value) =>
    status.toLowerCase().includes(value)
  );
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
  const batch = payment?.batch;

  const course =
    isObject(batch?.course)
      ? batch.course.title ||
        batch.course.name ||
        batch.course.courseName
      : typeof batch?.course === "string"
        ? batch.course
        : "";

  return (
    payment?.courseName ||
    payment?.course?.name ||
    payment?.course?.title ||
    course ||
    batch?.name ||
    batch?.batch ||
    payment?.description ||
    payment?.feeType ||
    payment?.purpose ||
    payment?.notes ||
    "Course payment"
  );
}

function getPaymentReference(payment) {
  return (
    payment?.reference ||
    payment?.transactionId ||
    payment?.referenceId ||
    payment?.receiptNumber ||
    ""
  );
}

function getPaymentMethod(payment) {
  return (
    payment?.method ||
    payment?.paymentMethod ||
    "Not specified"
  );
}

function getPaymentDate(payment) {
  return (
    payment?.paidAt ||
    payment?.paymentDate ||
    payment?.createdAt ||
    payment?.date ||
    null
  );
}

// ======================================================
// FORMATTING
// ======================================================

function formatCurrency(amount, currency = "INR") {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "—";
  }

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
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getBatchStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized === "running" ||
    normalized === "active" ||
    normalized === "completed"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "upcoming") {
    return "bg-orange-100 text-orange-700";
  }

  if (
    normalized === "inactive" ||
    normalized === "cancelled"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

// ======================================================
// REUSABLE SUMMARY CARD
// ======================================================

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          {title}
        </p>

        <Icon size={20} className="text-blue-600" />
      </div>

      <p className="mt-3 break-words text-2xl font-bold text-[#102e60]">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

// ======================================================
// BATCH INFORMATION CARD
// ======================================================

function BatchInfoCard({
  icon: Icon,
  title,
  value,
  subtitle,
  iconBackground = "bg-blue-50",
  iconColor = "text-blue-600",
}) {
  return (
    <div className="flex min-w-0 items-start gap-4 rounded-xl border border-blue-100 bg-white p-4">
      <div
        className={`shrink-0 rounded-lg ${iconBackground} ${iconColor} p-3`}
      >
        {Icon && <Icon size={23} />}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-600">
          {title}
        </p>

        <p className="mt-2 break-words text-base font-bold text-[#102e60]">
          {value ?? "Not available"}
        </p>

        {subtitle && (
          <p className="mt-1 text-[11px] text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ======================================================
// PROGRESS BAR
// ======================================================

function ProgressBar({ percentage, color = "bg-blue-600" }) {
  const safePercentage = getPercentage(percentage);

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{
          width: `${safePercentage}%`,
        }}
      />
    </div>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function ProgressPaymentsPage() {
  const [payments, setPayments] = useState([]);

  const [rankData, setRankData] = useState(null);

  const [paymentSummary, setPaymentSummary] = useState(null);

  const [batchProgress, setBatchProgress] = useState(null);

  const [batchDetails, setBatchDetails] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ====================================================
  // LOAD DATA
  // ====================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Please sign in to view your progress and payment records."
        );
      }

      // ----------------------------------------------
      // 1. FETCH STUDENT PROFILE
      // ----------------------------------------------

      const profileResponse = await fetch(
        `${API_URL}/api/student/profile`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      const profileData = await profileResponse
        .json()
        .catch(() => ({}));

      if (!profileResponse.ok) {
        throw new Error(
          profileData.message ||
            profileData.error ||
            "Unable to fetch student profile."
        );
      }

      // ----------------------------------------------
      // 2. EXTRACT STUDENT
      // ----------------------------------------------

      const student = getUser(profileData);

      if (!isObject(student)) {
        throw new Error(
          "Invalid student profile received from server."
        );
      }

      // ----------------------------------------------
      // 3. EXTRACT BATCH DETAILS
      // Same logic as Student Dashboard
      // ----------------------------------------------

      const batch = getBatchDetails(
        profileData,
        student
      );

      const batchId = getBatchId(batch, student);

      const batchName = getBatchName(batch, student);

      console.log("STUDENT PROFILE RESPONSE:", profileData);
      console.log("EXTRACTED STUDENT:", student);
      console.log("EXTRACTED BATCH DETAILS:", batch);
      console.log("EXTRACTED BATCH ID:", batchId);

      // ----------------------------------------------
      // 4. SAVE COMPLETE BATCH INFORMATION
      // ----------------------------------------------

      setBatchDetails({
        ...batch,
        batch: batchName,
        _id: batchId,
      });

      // ----------------------------------------------
      // 5. FETCH DASHBOARD DATA
      // ----------------------------------------------

      const results = await Promise.allSettled([
        // Trainer batch progress
        batchId
          ? apiRequest(
              `/api/progress/student/${batchId}/trainer`
            )
          : Promise.reject(
              new Error(
                "No batch assigned to your student account. Please check your student profile."
              )
            ),

        // Student rank
        apiRequest("/api/student/rank"),

        // Student payments
        apiRequest("/api/student/payments"),
      ]);

      const [
        progressResult,
        rankResult,
        paymentsResult,
      ] = results;

      // ----------------------------------------------
      // 6. TRAINER BATCH PROGRESS
      // ----------------------------------------------

      if (progressResult.status === "fulfilled") {
        const progressResponse = progressResult.value;

        const progressData =
          extractBatchProgress(progressResponse);

        setBatchProgress(progressData);

        console.log(
          "TRAINER BATCH PROGRESS:",
          progressResponse
        );
      } else {
        setBatchProgress(null);

        console.error(
          "Trainer batch progress error:",
          progressResult.reason
        );
      }

      // ----------------------------------------------
      // 7. STUDENT RANK
      // ----------------------------------------------

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

        console.error(
          "Student rank error:",
          rankResult.reason
        );
      }

      // ----------------------------------------------
      // 8. STUDENT PAYMENTS
      // ----------------------------------------------

      if (paymentsResult.status === "fulfilled") {
        const response = paymentsResult.value;

        setPayments(
          extractArray(response, [
            "payments",
            "transactions",
            "records",
          ])
        );

        setPaymentSummary(
          response?.summary ||
            response?.data?.summary ||
            response?.data?.data?.summary ||
            null
        );

        console.log("STUDENT PAYMENTS:", response);
      } else {
        setPayments([]);
        setPaymentSummary(null);

        console.error(
          "Student payments error:",
          paymentsResult.reason
        );
      }

    } catch (err) {
      console.error(
        "Progress and payments error:",
        err
      );

      setError(
        err.message ||
          "Failed to load your information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ====================================================
  // TRAINER BATCH PROGRESS CALCULATIONS
  // ====================================================

  const trainerTopics = getTopics(batchProgress);

  const overallProgress = getPercentage(
    batchProgress?.overallProgress ??
      batchProgress?.batchProgress ??
      batchProgress?.progress ??
      calculateAverage(trainerTopics)
  );

  const totalTopics = getNumber(
    batchProgress?.totalTopics ?? trainerTopics.length
  );

  const completedTopics = getNumber(
    batchProgress?.completedTopics ??
      trainerTopics.filter(
        (topic) => getTopicProgress(topic) >= 100
      ).length
  );

  // ====================================================
  // RANK CALCULATIONS
  // ====================================================

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

  // ====================================================
  // PAYMENT CALCULATIONS
  // ====================================================

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

  const totalPaid =
    paymentSummary?.paidTotal ??
    paidPayments.reduce(
      (sum, payment) =>
        sum +
        getNumber(
          payment.amount ??
            payment.paidAmount ??
            payment.totalAmount
        ),
      0
    );

  const pendingTotal =
    paymentSummary?.pendingTotal ??
    pendingPayments.reduce(
      (sum, payment) =>
        sum +
        getNumber(
          payment.amount ??
            payment.paidAmount ??
            payment.totalAmount
        ),
      0
    );

  const failedTotal =
    paymentSummary?.failedTotal ??
    failedPayments.reduce(
      (sum, payment) => sum + getNumber(payment.amount),
      0
    );

  const refundedTotal =
    paymentSummary?.refundedTotal ??
    refundedPayments.reduce(
      (sum, payment) => sum + getNumber(payment.amount),
      0
    );

  // ====================================================
  // BATCH INFORMATION
  // ====================================================

  const batchName =
    batchDetails?.batch ||
    batchDetails?.name ||
    batchDetails?.batchName ||
    "Not assigned";

  const batchId =
    batchDetails?._id ||
    batchDetails?.id ||
    "Not available";

  const trainerName =
    batchDetails?.trainer?.name ||
    batchDetails?.trainerName ||
    (typeof batchDetails?.trainer === "string"
      ? batchDetails.trainer
      : "Not assigned");

  const trainerEmail =
    batchDetails?.trainer?.email ||
    "";

  const batchDuration =
    batchDetails?.durationMonths != null
      ? `${batchDetails.durationMonths} Months`
      : batchDetails?.duration || "Not available";

  const batchStartDate = batchDetails?.startDate;

  const batchStatus =
    batchDetails?.status || "Not available";

  const batchDescription =
    batchDetails?.description ||
    "No description available.";

  const batchIsActive = batchDetails?.isActive;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-7">

      {/* ============================================== */}
      {/* HEADER */}
      {/* ============================================== */}

      <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

        <div>
          <h1 className="text-xl font-bold text-[#102e60] sm:text-2xl">
            Progress &amp; Payments
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Your trainer batch progress, rank, batch details and payment overview.
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

      {/* ============================================== */}
      {/* ERROR */}
      {/* ============================================== */}

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

      {/* ============================================== */}
      {/* LOADING */}
      {/* ============================================== */}

      {loading ? (
        <div className="rounded-xl border border-blue-100 bg-white p-10 text-center">

          <RefreshCw
            size={26}
            className="mx-auto mb-3 animate-spin text-blue-600"
          />

          <p className="text-sm text-slate-500">
            Loading your progress, batch information and payments...
          </p>

        </div>
      ) : (
        <>

          {/* ========================================== */}
          {/* SUMMARY CARDS */}
          {/* ========================================== */}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              icon={BookOpen}
              title="Trainer Batch Progress"
              value={
                batchProgress
                  ? `${Math.round(overallProgress)}%`
                  : "—"
              }
              description={
                batchProgress
                  ? `${completedTopics} of ${totalTopics} topics completed`
                  : "Trainer progress unavailable"
              }
            />

            <SummaryCard
              icon={Trophy}
              title="Batch Rank"
              value={
                rank !== null && rank !== ""
                  ? `${rank}${
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

          {/* ========================================== */}
          {/* COMPLETE BATCH INFORMATION */}
          {/* ========================================== */}

          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                  <GraduationCap size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#102e60]">
                    Batch Information
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Complete details about your assigned batch.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                {batchName}
              </span>

            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

              <BatchInfoCard
                icon={BookOpen}
                title="Batch Name"
                value={batchName}
                subtitle="Your assigned batch"
              />
{/* 
              <BatchInfoCard
                icon={ReceiptText}
                title="Batch ID"
                value={batchId}
                subtitle="Unique batch identifier"
                iconBackground="bg-indigo-50"
                iconColor="text-indigo-600"
              /> */}

              <BatchInfoCard
                icon={UserRound}
                title="Assigned Trainer"
                value={trainerName}
                subtitle={trainerEmail || "Batch trainer"}
                iconBackground="bg-purple-50"
                iconColor="text-purple-600"
              />

              <BatchInfoCard
                icon={Clock}
                title="Batch Duration"
                value={batchDuration}
                subtitle="Total training duration"
                iconBackground="bg-orange-50"
                iconColor="text-orange-600"
              />

              <BatchInfoCard
                icon={CalendarDays}
                title="Start Date"
                value={formatDate(batchStartDate)}
                subtitle="Training commencement date"
                iconBackground="bg-green-50"
                iconColor="text-green-600"
              />

              <div className="flex min-w-0 items-start gap-4 rounded-xl border border-blue-100 bg-white p-4">

                <div className="shrink-0 rounded-lg bg-blue-50 p-3 text-blue-600">
                  <CheckCircle2 size={23} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-600">
                    Batch Status
                  </p>

                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getBatchStatusClass(
                      batchStatus
                    )}`}
                  >
                    {batchStatus}
                  </span>

                  <p className="mt-2 text-[11px] text-slate-500">
                    Current batch status
                  </p>
                </div>

              </div>

              <div className="flex min-w-0 items-start gap-4 rounded-xl border border-blue-100 bg-white p-4">

                <div className="shrink-0 rounded-lg bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 size={23} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-600">
                    Batch Availability
                  </p>

                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                      batchIsActive === true
                        ? "bg-green-100 text-green-700"
                        : batchIsActive === false
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {batchIsActive === true
                      ? "Active"
                      : batchIsActive === false
                        ? "Inactive"
                        : "Not available"}
                  </span>

                  <p className="mt-2 text-[11px] text-slate-500">
                    Batch active status
                  </p>
                </div>

              </div>

            </div>

            {/* BATCH DESCRIPTION */}

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5">

              <div className="mb-3 flex items-center gap-2">
                <BookOpen
                  size={19}
                  className="text-blue-700"
                />

                <h3 className="text-sm font-bold text-[#102e60]">
                  Batch Description
                </h3>
              </div>

              <p className="text-xs leading-6 text-slate-600">
                {batchDescription}
              </p>

            </div>

          </section>

          {/* ========================================== */}
          {/* PAYMENT SUMMARY */}
          {/* ========================================== */}

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

          {/* ========================================== */}
          {/* TRAINER BATCH PROGRESS */}
          {/* ========================================== */}

          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">

            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <div className="flex items-center gap-2">
                <BookOpen
                  size={19}
                  className="text-blue-600"
                />

                <div>
                  <h2 className="text-sm font-bold text-[#17345f]">
                    Trainer Batch Progress
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Syllabus completion updated by your trainer.
                  </p>
                </div>
              </div>

              <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-[#102e60]">
                {batchName}
              </span>

            </div>

            {!batchProgress ? (
              <div className="py-8 text-center">

                <AlertCircle
                  size={26}
                  className="mx-auto mb-2 text-slate-400"
                />

                <p className="text-sm font-medium text-slate-600">
                  Trainer progress unavailable
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your trainer's batch syllabus progress will appear here.
                </p>

              </div>
            ) : (
              <>

                {/* OVERALL PROGRESS */}

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <p className="text-xs font-semibold text-[#17345f]">
                        Overall Syllabus Completion
                      </p>

                      <p className="mt-1 text-[11px] text-slate-500">
                        Trainer-updated batch progress
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-blue-700">
                      {Math.round(overallProgress)}%
                    </p>

                  </div>

                  <div
                    className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100"
                    role="progressbar"
                    aria-label="Trainer batch progress"
                    aria-valuenow={Math.round(overallProgress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${overallProgress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {completedTopics} Topics Completed
                    </span>

                    <span className="text-[11px] text-slate-500">
                      {totalTopics} Total Topics
                    </span>
                  </div>

                </div>

                {/* TOPIC DETAILS */}

                <div className="mt-5">

                  <h3 className="mb-3 text-xs font-bold text-[#17345f]">
                    Syllabus Topic Details
                  </h3>

                  {trainerTopics.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs text-slate-500">
                        No syllabus topics have been added by your trainer.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">

                      {trainerTopics.map((topic, index) => {
                        const percentage =
                          getTopicProgress(topic);

                        const status = getTopicStatus(
                          topic,
                          percentage
                        );

                        const completed =
                          percentage >= 100 ||
                          status.toLowerCase() === "completed";

                        return (
                          <div
                            key={
                              topic._id ||
                              topic.id ||
                              index
                            }
                            className="rounded-lg border border-slate-100 p-3 transition hover:border-blue-200"
                          >

                            <div className="flex items-center justify-between gap-3">

                              <div className="flex min-w-0 items-center gap-2">

                                {completed ? (
                                  <CheckCircle2
                                    size={16}
                                    className="shrink-0 text-green-600"
                                  />
                                ) : (
                                  <Clock
                                    size={16}
                                    className="shrink-0 text-amber-500"
                                  />
                                )}

                                <p className="break-words text-xs font-semibold text-[#17345f]">
                                  {getTopicName(topic, index)}
                                </p>

                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getTopicStatusClass(
                                  status,
                                  percentage
                                )}`}
                              >
                                {status}
                              </span>

                            </div>

                            <div className="mt-3 flex items-center gap-3">

                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">

                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    completed
                                      ? "bg-green-500"
                                      : "bg-blue-600"
                                  }`}
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                />

                              </div>

                              <span className="w-10 text-right text-[10px] font-semibold text-slate-600">
                                {Math.round(percentage)}%
                              </span>

                            </div>

                            {topic.completedAt && (
                              <p className="mt-2 text-[10px] text-slate-400">
                                Completed on:{" "}
                                {formatDate(topic.completedAt)}
                              </p>
                            )}

                          </div>
                        );
                      })}

                    </div>
                  )}

                </div>

              </>
            )}

          </section>

          {/* ========================================== */}
          {/* PAYMENT RECORDS */}
          {/* ========================================== */}

          <section className="mt-5 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">

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

                  const paymentBatch = payment.batch;

                  const paymentBatchName =
                    paymentBatch?.batch ||
                    paymentBatch?.name ||
                    paymentBatch?.code ||
                    "";

                  const paymentTrainer =
                    paymentBatch?.trainer?.name ||
                    "";

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

                              {paymentBatchName && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <BookOpen size={12} />
                                  {paymentBatchName}
                                </span>
                              )}

                              {paymentTrainer && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <UserRound size={12} />
                                  {paymentTrainer}
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
