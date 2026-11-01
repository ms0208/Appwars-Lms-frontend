
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  CalendarDays,
  Users,
  Clock3,
  RefreshCw,
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

const DEFAULT_STATS = [
  {
    title: "Overall progress",
    value: "—",
    subtitle: "No data available",
    progress: 0,
  },
  {
    title: "Attendance",
    value: "—",
    subtitle: "No data available",
  },
  {
    title: "Pending assignments",
    value: "—",
    subtitle: "No data available",
  },
  {
    title: "Next live class",
    value: "—",
    subtitle: "No upcoming class",
  },
];

function getUser(data) {
  return data.user || data.data?.user || data.data || data;
}

function getDashboard(data) {
  return data.dashboard || data.data?.dashboard || data.data || data;
}

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

export default function DashboardPage() {
  const [student, setStudent] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showBatchDetails, setShowBatchDetails] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("token")
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

      // Fetch the currently authenticated user.
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

      if (!user || typeof user !== "object" || !user.name) {
        throw new Error(
          "The server did not return valid student profile data."
        );
      }

      if (user.role && user.role.toLowerCase() !== "student") {
        throw new Error(
          "This dashboard is available only to student accounts."
        );
      }

      setStudent({
        id: user.userId || user.id || user._id || "",
        name: user.name || "Student",
        email: user.email || "",
        role: user.role || "Student",
        batch: user.batch || "",
      });

      // Fetch student-specific dashboard statistics and batch details.
      // This endpoint must be implemented in your backend.
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
            "Student profile loaded, but dashboard statistics could not be fetched. Check the student dashboard API."
        );
      }

      setDashboard(getDashboard(dashboardData));
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Check your API URL and server."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

      window.open(url.href, "_blank", "noopener,noreferrer");
    } catch {
      setNotice("The meeting URL provided by the server is invalid.");
    }
  };

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
        attendanceAttended != null && attendanceTotal != null
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
      subtitle: nextLiveClass?.title || "No upcoming class",
    },
  ];

  const batchDetails = dashboard?.batchDetails || {};

  const batchName = batchDetails.name || student?.batch || "Not assigned";

  const trainerName =
    batchDetails.trainerName ||
    dashboard?.trainerName ||
    "Not assigned";

  const batchSize =
    batchDetails.batchSize ?? dashboard?.batchSize;

  const batchStartDate =
    batchDetails.startDate || dashboard?.batchStartDate;

  const batchEndDate =
    batchDetails.endDate || dashboard?.batchEndDate;

  const schedule =
    batchDetails.schedule || dashboard?.schedule;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102e60] sm:text-3xl">
            {loading
              ? "Loading dashboard..."
              : `Welcome back, ${student?.name || "Student"}`}
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {student?.id ? `ID: ${student.id} · ` : ""}
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
                refreshing || loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              handleJoin(nextLiveClass?.title || "Live class")
            }
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:text-base"
          >
            Join live class
          </button>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"
        >
          <RefreshCw size={18} className="animate-spin" />
          Fetching your profile and dashboard data...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <div>
            <p className="font-semibold">Unable to load dashboard</p>
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

      {/* Notification */}
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

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}

        <RankCard
          rank={dashboard?.rank ?? "—"}
          total={dashboard?.batchDetails?.batchSize ?? batchSize ?? 0}
        />
      </section>

      {/* Course Progress and Right Sidebar */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <CourseProgress
          onDetails={() => setShowBatchDetails(true)}
        />

        <div className="flex min-w-0 flex-col gap-5">
          <LiveClassSchedule onJoin={handleJoin} />

          <Announcements />
        </div>
      </div>

      {/* Batch Information */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Batch Duration */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <CalendarDays className="text-blue-600" size={26} />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              Batch duration
            </p>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {batchStartDate || batchEndDate
                ? `${formatDate(batchStartDate)} – ${formatDate(batchEndDate)}`
                : "Not available"}
            </p>
          </div>
        </div>

        {/* Batch Size */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Users className="text-blue-600" size={26} />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              Batch size
            </p>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {batchSize != null
                ? `${batchSize} students`
                : "Not available"}
            </p>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Clock3 className="text-blue-600" size={26} />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              Weekly schedule
            </p>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {schedule || "Not available"}
            </p>
          </div>
        </div>
      </section>

      {/* Batch Details Modal */}
      {showBatchDetails && (
        <BatchDetailsModal
          onClose={() => setShowBatchDetails(false)}
        />
      )}
    </main>
  );
}
