
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
import LiveClassSchedule from "@/src/components/student/LiveClassSchedule";
import Announcements from "@/src/components/student/Announcements";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
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

// ==========================================
// EXTRACT BATCH DETAILS
// ==========================================

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
      <div
        className={`shrink-0 rounded-lg ${iconBackground} ${iconColor} p-3`}
      >
        {Icon && <Icon size={25} />}
      </div>

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
// ATTENDANCE DEFAULT DATA
// ==========================================

const defaultAttendance = {
  statistics: {
    totalClasses: 0,
    present: 0,
    absent: 0,
    attendancePercentage: 0,
  },
  attendance: [],
};

// ==========================================
// MAIN STUDENT DASHBOARD
// ==========================================

export default function DashboardPage() {
  const [student, setStudent] = useState(null);

  const [dashboard, setDashboard] = useState(null);

  const [attendanceData, setAttendanceData] = useState(
    defaultAttendance
  );

  // STUDENT RESULTS
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [error, setError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");

  const [notice, setNotice] = useState("");

  // ==========================================
  // LOAD STUDENT PROFILE, DASHBOARD,
  // ATTENDANCE AND RESULTS
  // ==========================================

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setAttendanceError("");
    setResultsError("");

    try {
      // ==========================================
      // GET AUTHENTICATION TOKEN
      // ==========================================

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
      // GET /api/student/profile
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
        if (profileResponse.status === 401) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        if (profileResponse.status === 403) {
          throw new Error(
            "You do not have permission to access this dashboard."
          );
        }

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

      const studentBatch = isObject(user.batch)
        ? user.batch.batch || user.batch.name
        : user.batch;

      // ==========================================
      // SET STUDENT PROFILE
      // ==========================================

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

      // ==========================================
      // SET DASHBOARD DATA
      // ==========================================

      setDashboard({
        ...dashboardResult,
        batchDetails: completeBatch,
      });

      // ==========================================
      // FETCH STUDENT ATTENDANCE
      // GET /api/student/attendance
      // ==========================================

      setAttendanceLoading(true);

      try {
        const attendanceResponse = await fetch(
          `${API_URL}/api/student/attendance`,
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

        const attendanceResult = await attendanceResponse
          .json()
          .catch(() => ({}));

        if (!attendanceResponse.ok) {
          if (attendanceResponse.status === 401) {
            throw new Error(
              "Your session has expired. Please sign in again."
            );
          }

          if (attendanceResponse.status === 403) {
            throw new Error(
              "You are not authorized to access attendance."
            );
          }

          throw new Error(
            attendanceResult.message ||
              attendanceResult.error ||
              "Unable to fetch student attendance."
          );
        }

        const statistics = attendanceResult.statistics || {};

        const attendanceRecords = Array.isArray(
          attendanceResult.attendance
        )
          ? attendanceResult.attendance
          : [];

        setAttendanceData({
          statistics: {
            totalClasses: Number(statistics.totalClasses) || 0,
            present: Number(statistics.present) || 0,
            absent: Number(statistics.absent) || 0,
            attendancePercentage:
              Number(statistics.attendancePercentage) || 0,
          },

          attendance: attendanceRecords,
        });

        console.log(
          "STUDENT ATTENDANCE RESPONSE:",
          attendanceResult
        );
      } catch (attendanceErr) {
        console.error(
          "Student attendance error:",
          attendanceErr
        );

        setAttendanceError(
          attendanceErr.message || "Unable to load attendance."
        );

        setAttendanceData(defaultAttendance);
      } finally {
        setAttendanceLoading(false);
      }

      // ==========================================
      // FETCH STUDENT RESULTS
      // GET /api/student/progress
      // ==========================================

      setResultsLoading(true);

      try {
        const resultsResponse = await fetch(
          `${API_URL}/api/student/progress`,
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

        const resultsData = await resultsResponse
          .json()
          .catch(() => ({}));

        if (!resultsResponse.ok) {
          throw new Error(
            resultsData.message ||
              resultsData.error ||
              "Unable to fetch student results."
          );
        }

        const studentResults = Array.isArray(resultsData.results)
          ? resultsData.results
          : [];

        setResults(studentResults);

        console.log(
          "STUDENT RESULTS RESPONSE:",
          resultsData
        );
      } catch (resultError) {
        console.error("Student results error:", resultError);

        setResults([]);

        setResultsError(
          resultError.message || "Unable to load results."
        );
      } finally {
        setResultsLoading(false);
      }

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
  // OVERALL PROGRESS FROM EXAM RESULTS
  // ==========================================

  const totalObtained = results.reduce(
    (sum, result) =>
      sum + (Number(result.obtained) || 0),
    0
  );

  const totalMaximum = results.reduce(
    (sum, result) =>
      sum + (Number(result.total) || 0),
    0
  );

  const hasResults =
    results.length > 0 && totalMaximum > 0;

  const overallProgress = hasResults
    ? Math.round((totalObtained / totalMaximum) * 100)
    : 0;

  // ==========================================
  // COURSE PROGRESS FROM PROFILE API
  // ==========================================

  const rawCourseProgress =
    dashboard?.overallProgress ??
    dashboard?.progress ??
    null;

  const courseProgress = Number(rawCourseProgress);

  const hasCourseProgress =
    rawCourseProgress !== null &&
    rawCourseProgress !== undefined &&
    rawCourseProgress !== "" &&
    Number.isFinite(courseProgress);

  const safeCourseProgress = hasCourseProgress
    ? Math.min(100, Math.max(0, courseProgress))
    : 0;

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const attendancePercentage = Number(
    attendanceData?.statistics?.attendancePercentage ?? 0
  );

  const attendanceAttended =
    attendanceData?.statistics?.present ?? 0;

  const attendanceTotal =
    attendanceData?.statistics?.totalClasses ?? 0;

  const attendanceAbsent =
    attendanceData?.statistics?.absent ?? 0;

  const pendingAssignments =
    dashboard?.pendingAssignments ??
    dashboard?.assignments?.pending;

  const nextLiveClass = dashboard?.nextLiveClass;

  const stats = [
    {
      title: "Overall Results",
      value: resultsLoading
        ? "Loading..."
        : hasResults
          ? `${overallProgress}%`
          : "—",
      subtitle: hasResults
        ? "Based on exam results"
        : "No exam results available",
      progress: overallProgress,
    },
    {
      title: "Student Batch Progress",
      value: hasCourseProgress
        ? `${safeCourseProgress}%`
        : "—",
      subtitle: hasCourseProgress
        ? "Batch completion"
        : "Batch progress not available",
      progress: safeCourseProgress,
    },
       {
      title: "Batch Progress",
      value: hasCourseProgress
        ? `${safeCourseProgress}%`
        : "—",
      subtitle: hasCourseProgress
        ? "Batch completion"
        : "Batch progress not available",
      progress: safeCourseProgress,
    },
    {
      title: "Attendance",
      value: attendanceLoading
        ? "Loading..."
        : `${attendancePercentage}%`,
      subtitle: attendanceLoading
        ? "Fetching attendance"
        : `${attendanceAttended} of ${attendanceTotal} classes`,
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
                refreshing || loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
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
          <RefreshCw size={18} className="animate-spin" />
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

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
          STUDENT ATTENDANCE HISTORY
      ========================================== */}

      <section className="mt-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">

          <div>
            <h2 className="text-xl font-bold text-[#102e60]">
              My Attendance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your attendance records from your assigned batch.
            </p>
          </div>

          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            {attendanceLoading
              ? "Loading..."
              : `${attendancePercentage}% Attendance`}
          </div>

        </div>

        {/* ATTENDANCE SUMMARY */}

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-slate-600">
              Total Classes
            </p>

            <p className="mt-2 text-2xl font-bold text-[#102e60]">
              {attendanceLoading ? "..." : attendanceTotal}
            </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">
              Present
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {attendanceLoading ? "..." : attendanceAttended}
            </p>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Absent
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {attendanceLoading ? "..." : attendanceAbsent}
            </p>
          </div>

        </div>

        {/* ATTENDANCE ERROR */}

        {attendanceError && (
          <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <p className="font-semibold">
              Unable to load attendance
            </p>

            <p className="mt-1">
              {attendanceError}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              className="mt-3 rounded-md bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
            >
              Retry Attendance
            </button>

          </div>
        )}

        {/* ATTENDANCE TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[700px] text-left">

            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Batch</th>
                <th className="px-5 py-4 font-semibold">Trainer</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Remarks</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {attendanceLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />

                      <span className="text-sm font-medium">
                        Loading attendance records...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!attendanceLoading &&
                !attendanceError &&
                attendanceData.attendance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">

                      <CalendarDays
                        size={35}
                        className="mx-auto mb-3 text-slate-300"
                      />

                      <p className="font-semibold text-slate-700">
                        No attendance records found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Your attendance will appear here once your trainer marks it.
                      </p>

                    </td>
                  </tr>
                )}

              {!attendanceLoading &&
                attendanceData.attendance.map((record) => (
                  <tr
                    key={record._id}
                    className="transition hover:bg-slate-50"
                  >

                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                      {formatDate(record.date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.batch?.name ||
                        record.batch?.batchName ||
                        record.batch?.code ||
                        "Not available"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.trainer?.name || "Not assigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                          record.status === "Present"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {record.status === "Present" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <X size={14} />
                        )}

                        {record.status}
                      </span>
                    </td>

                    <td className="max-w-[250px] px-5 py-4 text-sm text-slate-500">
                      {record.remarks || "—"}
                    </td>

                  </tr>
                ))}

            </tbody>
          </table>

        </div>

      </section>

      {/* ==========================================
          STUDENT RESULTS
      ========================================== */}

      <section className="mt-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">

        {/* RESULTS HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">

          <div>
            <h2 className="text-xl font-bold text-[#102e60]">
              My Exam Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View your published examination results.
            </p>
          </div>

          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {resultsLoading
              ? "Loading results..."
              : `${results.length} Published ${
                  results.length === 1 ? "Result" : "Results"
                }`}
          </div>

        </div>

        {/* RESULTS LOADING */}

        {resultsLoading && (
          <div className="flex items-center justify-center gap-2 p-10 text-blue-700">
            <RefreshCw
              size={20}
              className="animate-spin"
            />

            <span className="text-sm font-medium">
              Loading your results...
            </span>
          </div>
        )}

        {/* RESULTS ERROR */}

        {!resultsLoading && resultsError && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <p className="font-semibold">
              Unable to load results
            </p>

            <p className="mt-1">
              {resultsError}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              className="mt-3 rounded-md bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
            >
              Retry Results
            </button>

          </div>
        )}

        {/* NO RESULTS */}

        {!resultsLoading &&
          !resultsError &&
          results.length === 0 && (
            <div className="p-10 text-center">

              <FileText
                size={38}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="font-semibold text-slate-700">
                No results available
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Your published exam results will appear here.
              </p>

            </div>
          )}

        {/* RESULTS TABLE */}

        {!resultsLoading &&
          !resultsError &&
          results.length > 0 && (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[650px] text-left">

                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Exam
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Course
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Date
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Marks
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {results.map((result, index) => (
                    <tr
                      key={result.resultId || result._id || index}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {result.exam || "Assessment"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {result.course?.courseName ||
                          result.course?.code ||
                          "Not available"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(result.date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                        {Number(result.obtained) || 0} /{" "}
                        {Number(result.total) || 0}
                      </td>

                      <td className="max-w-[250px] px-5 py-4 text-sm text-slate-500">
                        {result.remarks || "—"}
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

      </section>

      {/* ==========================================
          LIVE CLASS AND ANNOUNCEMENTS
      ========================================== */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

        <LiveClassSchedule
          onJoin={handleJoin}
        />

        <Announcements />

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
                : batchDetails.duration || "Not available"
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

            {/* CREATED AT */}

            <div className="rounded-lg bg-slate-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Batch Created At
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                {formatDate(batchCreatedAt)}
              </p>

            </div>

            {/* UPDATED AT */}

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

    </main>
  );
}
