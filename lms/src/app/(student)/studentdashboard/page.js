"use client";

import { useCallback, useEffect, useState } from "react";

import {
  X,
  CalendarDays,
  Users,
  Clock3,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  FileText,
} from "lucide-react";

import StatCard from "@/src/components/student/StatCard";
import RankCard from "@/src/components/student/RankCard";
import CourseProgress from "@/src/components/student/CourseProgress";
import LiveClassSchedule from "@/src/components/student/LiveClassSchedule";
import Announcements from "@/src/components/student/Announcements";
import BatchDetailsModal from "@/src/components/student/BatchDetailsModal";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// ==========================================
// RESPONSE HELPERS
// ==========================================

function getUser(data) {
  return (
    data?.user ||
    data?.data?.user ||
    data?.data?.data?.user ||
    data?.data ||
    data
  );
}

function getDashboard(data) {
  return (
    data?.dashboard ||
    data?.data?.dashboard ||
    data?.data?.data?.dashboard ||
    data?.data ||
    data
  );
}

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

// Extract batch details from different possible API response structures.
function getBatchDetails(...responses) {
  for (const response of responses) {
    if (!isObject(response)) continue;

    const user = getUser(response);
    const dashboard = getDashboard(response);

    const candidates = [
      response.batchDetails,
      response.data?.batchDetails,
      response.data?.data?.batchDetails,

      response.dashboard?.batchDetails,
      response.data?.dashboard?.batchDetails,
      response.data?.data?.dashboard?.batchDetails,

      response.user?.batchDetails,
      response.data?.user?.batchDetails,
      response.data?.data?.user?.batchDetails,

      dashboard?.batchDetails,
      dashboard?.batch,
      dashboard?.student?.batch,

      user?.batchDetails,
      user?.batch,
      user?.student?.batch,

      response.batch,
      response.data?.batch,
      response.data?.data?.batch,
    ];

    for (const candidate of candidates) {
      if (isObject(candidate)) {
        // Some APIs return batch inside another batch property.
        if (isObject(candidate.batch)) {
          return {
            ...candidate,
            ...candidate.batch,
          };
        }

        return candidate;
      }
    }
  }

  return {};
}

// ==========================================
// DATE FORMATTER
// ==========================================

function formatDate(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date);
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ==========================================
// STATUS STYLING
// ==========================================

function getStatusClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (
    normalizedStatus === "running" ||
    normalizedStatus === "active"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (normalizedStatus === "completed") {
    return "bg-blue-100 text-blue-700";
  }

  if (normalizedStatus === "upcoming") {
    return "bg-orange-100 text-orange-700";
  }

  if (
    normalizedStatus === "inactive" ||
    normalizedStatus === "cancelled"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

// ==========================================
// BATCH INFORMATION CARD
// ==========================================

function BatchInfoCard({
  icon: Icon,
  title,
  value,
  subtitle,
  iconBackground = "bg-blue-50",
  iconColor = "text-blue-600",
}) {
  return (
    <div className="flex min-w-0 items-start gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700 sm:text-base">
          {title}
        </p>

        <p className="mt-2 break-words text-lg font-bold text-[#102e60]">
          {value ?? "Not available"}
        </p>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

    </div>
  );
}

// ==========================================
// MAIN STUDENT DASHBOARD
// ==========================================

export default function DashboardPage() {
  const [student, setStudent] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showBatchDetails, setShowBatchDetails] = useState(false);

  // ==========================================
  // LOAD STUDENT PROFILE AND DASHBOARD
  // ==========================================

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // Get authentication token.
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("token") ||
            localStorage.getItem("appwars_token") ||
            localStorage.getItem("token")
          : null;

      if (!token) {
        throw new Error(
          "You are not logged in. Please sign in again."
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // ==========================================
      // FETCH STUDENT PROFILE
      // ==========================================

      const profileResponse = await fetch(
        `${API_URL}/api/student/profile`,
        {
          method: "GET",
          headers,
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
            "Unable to load your student profile."
        );
      }

      const user = getUser(profileData);

      if (
        !user ||
        typeof user !== "object" ||
        !user.name
      ) {
        throw new Error(
          "The server did not return valid student profile data."
        );
      }

      if (
        user.role &&
        String(user.role).toLowerCase() !== "student"
      ) {
        throw new Error(
          "This dashboard is available only to student accounts."
        );
      }

      // ==========================================
      // FETCH DASHBOARD DATA
      // ==========================================

      // Your existing implementation uses the same profile endpoint.
      const dashboardResponse = await fetch(
        `${API_URL}/api/student/profile`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      const dashboardData = await dashboardResponse
        .json()
        .catch(() => ({}));

      if (!dashboardResponse.ok) {
        if (dashboardResponse.status === 401) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        if (dashboardResponse.status === 403) {
          throw new Error(
            "You do not have permission to access this dashboard."
          );
        }

        throw new Error(
          dashboardData.message ||
            dashboardData.error ||
            "Unable to fetch student dashboard data."
        );
      }

      const dashboardResult = getDashboard(dashboardData);

      // ==========================================
      // EXTRACT COMPLETE BATCH OBJECT
      // ==========================================

      const completeBatch = getBatchDetails(
        profileData,
        dashboardData,
        user,
        dashboardResult
      );

      // Preserve the batch object instead of storing only its name.
      const studentBatch = isObject(user.batch)
        ? user.batch.batch || user.batch.name
        : user.batch;

      setStudent({
        id: user.userId || user.id || user._id || "",
        name: user.name || "Student",
        email: user.email || "",
        role: user.role || "Student",

        batch:
          completeBatch.batch ||
          completeBatch.name ||
          studentBatch ||
          "Not assigned",
      });

      // Merge batch details into dashboard state.
      setDashboard({
        ...dashboardResult,
        batchDetails: completeBatch,
      });

      // ==========================================
      // DEBUG LOGS
      // ==========================================

      console.log(
        "STUDENT PROFILE RESPONSE:",
        profileData
      );

      console.log(
        "STUDENT DASHBOARD RESPONSE:",
        dashboardData
      );

      console.log(
        "EXTRACTED BATCH DETAILS:",
        completeBatch
      );

    } catch (err) {
      console.error("Student dashboard error:", err);

      setError(
        err.message ||
          "Unable to connect to the backend. Check your API URL and server."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ==========================================
  // JOIN LIVE CLASS
  // ==========================================

  const handleJoin = (className) => {
    setNotice("");

    const meetingUrl =
      dashboard?.nextLiveClass?.meetingUrl ||
      dashboard?.nextLiveClass?.meetingLink;

    if (!meetingUrl) {
      setNotice(
        `${className}: the meeting link is not available yet. Please contact your trainer.`
      );

      return;
    }

    try {
      const url = new URL(meetingUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid meeting URL.");
      }

      window.open(
        url.href,
        "_blank",
        "noopener,noreferrer"
      );

    } catch {
      setNotice(
        "The meeting URL provided by the server is invalid."
      );
    }
  };

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const overallProgress = Number(
    dashboard?.overallProgress ?? dashboard?.progress
  );

  const attendancePercentage = Number(
    dashboard?.attendance?.percentage ??
      dashboard?.attendancePercentage
  );

  const attendanceAttended =
    dashboard?.attendance?.attendedClasses ??
    dashboard?.attendedClasses;

  const attendanceTotal =
    dashboard?.attendance?.totalClasses ??
    dashboard?.totalClasses;

  const pendingAssignments =
    dashboard?.pendingAssignments ??
    dashboard?.assignments?.pending;

  const nextLiveClass = dashboard?.nextLiveClass;

  const stats = [
    {
      title: "Overall progress",
      value: Number.isFinite(overallProgress)
        ? `${overallProgress}%`
        : "—",
      subtitle: "Course completion",
      progress: Number.isFinite(overallProgress)
        ? Math.min(100, Math.max(0, overallProgress))
        : 0,
    },
    {
      title: "Attendance",
      value: Number.isFinite(attendancePercentage)
        ? `${attendancePercentage}%`
        : "—",
      subtitle:
        attendanceAttended != null &&
        attendanceTotal != null
          ? `${attendanceAttended} of ${attendanceTotal} classes`
          : "Attendance summary",
    },
    {
      title: "Pending assignments",
      value:
        pendingAssignments != null
          ? String(pendingAssignments)
          : "—",
      subtitle: "Assignments awaiting submission",
    },
    {
      title: "Next live class",
      value: nextLiveClass?.date
        ? formatDate(nextLiveClass.date)
        : nextLiveClass?.time || "—",
      subtitle:
        nextLiveClass?.title || "No upcoming class",
    },
  ];

  // ==========================================
  // COMPLETE BATCH INFORMATION
  // ==========================================

  const batchDetails = dashboard?.batchDetails || {};

  const batchName =
    batchDetails.batch ||
    batchDetails.name ||
    student?.batch ||
    "Not assigned";

  const trainerName =
    batchDetails.trainer?.name ||
    batchDetails.trainerName ||
    dashboard?.trainerName ||
    "Not assigned";

  const batchDurationMonths =
    batchDetails.durationMonths ??
    dashboard?.durationMonths;

  const batchStartDate =
    batchDetails.startDate ||
    dashboard?.batchStartDate;

  const batchStatus =
    batchDetails.status ||
    dashboard?.batchStatus ||
    "Not available";

  const batchDescription =
    batchDetails.description ||
    dashboard?.batchDescription ||
    "No description available.";

  const batchIsActive =
    batchDetails.isActive ??
    dashboard?.batchIsActive;

  const batchCreatedAt =
    batchDetails.createdAt ||
    dashboard?.batchCreatedAt;

  const batchUpdatedAt =
    batchDetails.updatedAt ||
    dashboard?.batchUpdatedAt;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">

      {/* ==========================================
          DASHBOARD HEADER
      ========================================== */}

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102e60] sm:text-3xl">
            {loading
              ? "Loading dashboard..."
              : `Welcome back, ${student?.name || "Student"}`}
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {student?.id
              ? `ID: ${student.id} · `
              : ""}

            Batch: {batchName}

            {" · "}

            Trainer: {trainerName}
          </p>

          {student?.email && (
            <p className="mt-1 text-sm text-slate-500">
              {student.email}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                refreshing || loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              handleJoin(
                nextLiveClass?.title || "Live class"
              )
            }
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:text-base"
          >
            Join live class
          </button>

        </div>
      </header>

      {/* ==========================================
          LOADING STATE
      ========================================== */}

      {loading && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"
        >
          <RefreshCw
            size={18}
            className="animate-spin"
          />

          Fetching your profile and dashboard data...
        </div>
      )}

      {/* ==========================================
          ERROR MESSAGE
      ========================================== */}

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <div>
            <p className="font-semibold">
              Unable to load dashboard
            </p>

            <p className="mt-1">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            className="shrink-0 rounded-md px-3 py-1 font-semibold hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* ==========================================
          NOTIFICATION
      ========================================== */}

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:text-base"
        >
          <p>{notice}</p>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
            className="shrink-0 rounded-md p-1 hover:bg-blue-100"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* ==========================================
          STATISTICS CARDS
      ========================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}

        <RankCard
          rank={dashboard?.rank ?? "—"}
          total={dashboard?.rankTotal ?? 0}
        />

      </section>

      {/* ==========================================
          COURSE PROGRESS AND RIGHT SIDEBAR
      ========================================== */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">

        <CourseProgress
          onDetails={() => setShowBatchDetails(true)}
        />

        <div className="flex min-w-0 flex-col gap-5">

          <LiveClassSchedule
            onJoin={handleJoin}
          />

          <Announcements />

        </div>
      </div>

      {/* ==========================================
          COMPLETE BATCH INFORMATION
      ========================================== */}

      <section className="mt-8 rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

        {/* SECTION HEADER */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

          <div>
            <h2 className="text-xl font-bold text-[#102e60] sm:text-2xl">
              Batch Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Complete details about your assigned batch.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {batchName}
          </span>

        </div>

        {/* BATCH DETAILS GRID */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

          {/* BATCH DURATION */}

          <BatchInfoCard
            icon={CalendarDays}
            title="Batch Duration"
            value={
              batchDurationMonths != null
                ? `${batchDurationMonths} Months`
                : "Not available"
            }
            subtitle="Total training duration"
            iconBackground="bg-blue-50"
            iconColor="text-blue-600"
          />

          {/* START DATE */}

          <BatchInfoCard
            icon={CalendarDays}
            title="Start Date"
            value={formatDate(batchStartDate)}
            subtitle="Training commencement date"
            iconBackground="bg-green-50"
            iconColor="text-green-600"
          />

          {/* BATCH STATUS */}

          <div className="flex min-w-0 items-start gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">

            <div className="shrink-0 rounded-lg bg-indigo-50 p-3 text-indigo-600">
              <Clock3 size={25} />
            </div>

            <div className="min-w-0">

              <p className="text-sm font-semibold text-slate-700 sm:text-base">
                Batch Status
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-bold ${getStatusClass(
                  batchStatus
                )}`}
              >
                {batchStatus}
              </span>

              <p className="mt-2 text-xs text-slate-500">
                Current batch status
              </p>

            </div>
          </div>

          {/* ACTIVE STATUS */}

          <div className="flex min-w-0 items-start gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">

            <div className="shrink-0 rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 size={25} />
            </div>

            <div className="min-w-0">

              <p className="text-sm font-semibold text-slate-700 sm:text-base">
                Batch Availability
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-bold ${
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

              <p className="mt-2 text-xs text-slate-500">
                Batch active status
              </p>

            </div>
          </div>

        </div>

        {/* TRAINER INFORMATION */}

        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-5">

          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
              <Users size={22} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">
                Assigned Trainer
              </p>

              <p className="mt-1 font-bold text-[#102e60]">
                {trainerName}
              </p>
            </div>

          </div>

        </div>

        {/* BATCH DESCRIPTION */}

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5">

          <div className="mb-3 flex items-center gap-2">

            <BookOpen
              size={20}
              className="text-blue-700"
            />

            <h3 className="font-bold text-[#102e60]">
              Batch Description
            </h3>

          </div>

          <p className="text-sm leading-7 text-slate-700">
            {batchDescription}
          </p>

        </div>

        {/* RECORD INFORMATION */}

        <div className="mt-5 border-t border-slate-100 pt-5">

          <div className="mb-4 flex items-center gap-2">

            <FileText
              size={19}
              className="text-slate-500"
            />

            <h3 className="font-bold text-slate-800">
              Record Information
            </h3>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-lg bg-slate-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Batch Created At
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                {formatDate(batchCreatedAt)}
              </p>

            </div>

            <div className="rounded-lg bg-slate-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Last Updated
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                {formatDate(batchUpdatedAt)}
              </p>

            </div>

          </div>
        </div>

      </section>

      {/* ==========================================
          BATCH DETAILS MODAL
      ========================================== */}

      {showBatchDetails && (
        <BatchDetailsModal
          onClose={() => setShowBatchDetails(false)}
        />
      )}

    </main>
  );
}