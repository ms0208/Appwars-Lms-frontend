
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
  GraduationCap,
  TrendingUp,
} from "lucide-react";

import StatCard from "@/src/components/student/StatCard";
import RankCard from "@/src/components/student/RankCard";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
).replace(/\/$/, "");

// ==========================================
// DEFAULT DATA
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

const defaultRank = {
  rank: null,
  totalStudents: 0,
  rankAssignedBy: null,
  rankAssignedAt: null,
  message: "",
};

// ==========================================
// RESPONSE HELPERS
// ==========================================

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

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

function getArray(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

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
          _id: candidate._id || candidate.batch._id,
        };
      }

      return candidate;
    }
  }

  return {};
}

function getBatchId(batchDetails, user) {
  return (
    batchDetails?._id ||
    batchDetails?.id ||
    user?.batchDetails?._id ||
    user?.batch?._id ||
    user?.batchId ||
    null
  );
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

function getStatusClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (
    normalizedStatus === "running" ||
    normalizedStatus === "active" ||
    normalizedStatus === "present" ||
    normalizedStatus === "confident" ||
    normalizedStatus === "completed"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalizedStatus === "upcoming" ||
    normalizedStatus === "learning" ||
    normalizedStatus === "in progress"
  ) {
    return "bg-orange-100 text-orange-700";
  }

  if (
    normalizedStatus === "inactive" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "absent"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.min(100, Math.max(0, number));
}

function getTopics(data) {
  const candidates = [
    data?.topics,
    data?.data?.topics,
    data?.data?.data?.topics,
    data?.progress?.topics,
    data?.batchProgress?.topics,
  ];

  return getArray(...candidates);
}

function getProgressValue(topic, type) {
  if (type === "trainer") {
    return getPercentage(
      topic?.completionPercentage ??
      topic?.progressPercentage ??
      topic?.progress ??
      topic?.percentage ??
      0
    );
  }

  return getPercentage(
    topic?.knowledgePercentage ??
    topic?.studentProgress ??
    topic?.progressPercentage ??
    0
  );
}

function calculateAverage(topics, type) {
  if (!topics.length) return 0;

  const total = topics.reduce(
    (sum, topic) => sum + getProgressValue(topic, type),
    0
  );

  return Math.round(total / topics.length);
}

// ==========================================
// STUDENT VIDEO LEARNING PROGRESS
// ==========================================

function getLearningVideoPercentage(data) {
  if (!data) return 0;

  const summary =
    data?.summary ||
    data?.data?.summary ||
    data?.progress?.summary ||
    {};

  // First preference: backend-calculated percentage.
  const backendPercentage =
    summary.progressPercentage ??
    summary.videoProgress ??
    summary.overallProgress ??
    summary.completionPercentage ??
    data?.progressPercentage ??
    data?.overallProgress ??
    data?.videoProgress;

  if (
    backendPercentage !== undefined &&
    backendPercentage !== null
  ) {
    return getPercentage(backendPercentage);
  }

  // Second preference: duration summary.
  const totalDuration = Number(
    summary.totalDuration ??
    summary.totalVideoDuration ??
    data?.totalDuration ??
    0
  );

  const watchedDuration = Number(
    summary.watchedDuration ??
    summary.totalWatchedDuration ??
    summary.watchedSeconds ??
    data?.watchedDuration ??
    data?.watchedSeconds ??
    0
  );

  if (totalDuration > 0) {
    return getPercentage(
      Math.round((watchedDuration / totalDuration) * 100)
    );
  }

  // Third preference: calculate from video resource records.
  const resources = getArray(
    data?.resources,
    data?.videos,
    data?.data?.resources,
    data?.data?.videos,
    data?.progress?.resources
  );

  if (!resources.length) return 0;

  const videos = resources.filter(
    (item) =>
      item?.type === "video" ||
      item?.resource?.type === "video"
  );

  let totalVideoDuration = 0;
  let totalWatchedDuration = 0;

  videos.forEach((item) => {
    const duration = Number(
      item?.duration ||
      item?.resource?.duration ||
      item?.progress?.duration ||
      0
    );

    const watched = Number(
      item?.watchedSeconds ??
      item?.progress?.watchedSeconds ??
      item?.progress?.watchedDuration ??
      0
    );

    totalVideoDuration += duration;
    totalWatchedDuration += Math.min(duration, watched);
  });

  if (totalVideoDuration <= 0) return 0;

  return getPercentage(
    Math.round(
      (totalWatchedDuration / totalVideoDuration) * 100
    )
  );
}

// ==========================================
// VIDEO STATISTICS
// ==========================================

function getVideoStatistics(data) {
  const summary =
    data?.summary ||
    data?.data?.summary ||
    {};

  return {
    totalVideos: Number(
      summary.totalVideos ??
      summary.totalPublishedVideos ??
      data?.totalVideos ??
      0
    ),

    completedVideos: Number(
      summary.completedVideos ??
      summary.completed ??
      data?.completedVideos ??
      0
    ),
  };
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
// PROGRESS BAR
// ==========================================

function ProgressBar({
  label,
  percentage,
  color = "bg-blue-600",
}) {
  const safePercentage = getPercentage(percentage);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600">
          {label}
        </span>

        <span className="font-bold text-slate-800">
          {safePercentage}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${safePercentage}%` }}
        />
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

  const [attendanceData, setAttendanceData] = useState(
    defaultAttendance
  );

  const [rankData, setRankData] = useState(defaultRank);

  const [results, setResults] = useState([]);

  // ==========================================
  // BATCH PROGRESS STATES
  // ==========================================

  const [studentBatchProgress, setStudentBatchProgress] =
    useState(null);

  const [trainerBatchProgress, setTrainerBatchProgress] =
    useState(null);

  const [batchProgressLoading, setBatchProgressLoading] =
    useState(false);

  const [batchProgressError, setBatchProgressError] =
    useState("");

  // ==========================================
  // VIDEO STATISTICS
  // ==========================================

  const [totalVideos, setTotalVideos] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);

  // ==========================================
  // LOADING STATES
  // ==========================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [rankLoading, setRankLoading] = useState(false);

  const [resultsLoading, setResultsLoading] = useState(false);

  const [resultsError, setResultsError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [rankError, setRankError] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ==========================================
  // AUTHENTICATION HEADERS
  // ==========================================

  const getAuthHeaders = useCallback(() => {
    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("appwars_token") ||
      localStorage.getItem("token");

    if (!token) {
      throw new Error(
        "You are not logged in. Please sign in again."
      );
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  // ==========================================
  // LOAD STUDENT RANK
  // GET /api/student/rank
  // ==========================================

  const loadStudentRank = useCallback(async (headers) => {
    setRankLoading(true);
    setRankError("");

    try {
      const response = await fetch(
        `${API_URL}/api/student/rank`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Unable to fetch your batch rank."
        );
      }

      const rank =
        data?.rank ??
        data?.data?.rank ??
        null;

      const totalStudents =
        data?.totalStudents ??
        data?.data?.totalStudents ??
        0;

      setRankData({
        rank:
          rank !== null && rank !== undefined
            ? Number(rank)
            : null,

        totalStudents: Number(totalStudents) || 0,

        rankAssignedBy:
          data?.rankAssignedBy ??
          data?.data?.rankAssignedBy ??
          null,

        rankAssignedAt:
          data?.rankAssignedAt ??
          data?.data?.rankAssignedAt ??
          null,

        message: data?.message || "",
      });
    } catch (err) {
      console.error("Student rank error:", err);

      setRankData(defaultRank);
      setRankError(
        err.message || "Unable to load your rank."
      );
    } finally {
      setRankLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD STUDENT VIDEO + TRAINER PROGRESS
  //
  // STUDENT:
  // GET /api/learning-resources/my-progress
  //
  // TRAINER:
  // GET /api/progress/student/:batchId/trainer
  // ==========================================

  const loadBatchProgress = useCallback(
    async (batchId, headers) => {
      if (!batchId) {
        setBatchProgressError(
          "Your batch ID is not available. Please contact your administrator."
        );

        setStudentBatchProgress(null);
        setTrainerBatchProgress(null);
        setTotalVideos(0);
        setCompletedVideos(0);

        return;
      }

      setBatchProgressLoading(true);
      setBatchProgressError("");

      try {
        const [studentResponse, trainerResponse] =
          await Promise.all([
            // Student video learning progress
            fetch(
              `${API_URL}/api/learning-resources/my-progress`,
              {
                method: "GET",
                headers,
                cache: "no-store",
              }
            ),

            // Existing trainer batch progress
            fetch(
              `${API_URL}/api/progress/student/${batchId}/trainer`,
              {
                method: "GET",
                headers,
                cache: "no-store",
              }
            ),
          ]);

        const [studentData, trainerData] = await Promise.all([
          studentResponse.json().catch(() => ({})),
          trainerResponse.json().catch(() => ({})),
        ]);

        // STUDENT VIDEO PROGRESS
        if (!studentResponse.ok) {
          throw new Error(
            studentData.message ||
            studentData.error ||
            "Unable to fetch video learning progress."
          );
        }

        setStudentBatchProgress(studentData);

        const videoStats = getVideoStatistics(studentData);

        setTotalVideos(videoStats.totalVideos);
        setCompletedVideos(videoStats.completedVideos);

        // TRAINER PROGRESS
        if (!trainerResponse.ok) {
          setTrainerBatchProgress(null);

          setBatchProgressError(
            trainerData.message ||
            trainerData.error ||
            "Student video progress loaded, but trainer progress could not be loaded."
          );
        } else {
          setTrainerBatchProgress(trainerData);
        }

        console.log(
          "STUDENT VIDEO LEARNING PROGRESS:",
          studentData
        );

        console.log(
          "TRAINER BATCH PROGRESS:",
          trainerData
        );
      } catch (err) {
        console.error("Batch progress error:", err);

        setBatchProgressError(
          err.message || "Unable to load batch progress."
        );
      } finally {
        setBatchProgressLoading(false);
      }
    },
    []
  );

  // ==========================================
  // LOAD STUDENT ATTENDANCE
  // GET /api/student/attendance
  // ==========================================

  const loadAttendance = useCallback(async (headers) => {
    setAttendanceLoading(true);
    setAttendanceError("");

    try {
      const response = await fetch(
        `${API_URL}/api/student/attendance`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Unable to fetch student attendance."
        );
      }

      const statistics = data.statistics || {};

      const records = getArray(
        data.attendance,
        data.data?.attendance,
        data.records
      );

      setAttendanceData({
        statistics: {
          totalClasses: Number(statistics.totalClasses) || 0,
          present: Number(statistics.present) || 0,
          absent: Number(statistics.absent) || 0,
          attendancePercentage:
            Number(statistics.attendancePercentage) || 0,
        },
        attendance: records,
      });
    } catch (err) {
      console.error("Student attendance error:", err);

      setAttendanceError(
        err.message || "Unable to load attendance."
      );

      setAttendanceData(defaultAttendance);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD STUDENT RESULTS
  // GET /api/student/marks
  // ==========================================

  const loadResults = useCallback(async (headers) => {
    setResultsLoading(true);
    setResultsError("");

    try {
      const response = await fetch(
        `${API_URL}/api/student/marks`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Unable to fetch student results."
        );
      }

      setResults(
        getArray(
          data.results,
          data.data?.results,
          data.data?.data?.results
        )
      );
    } catch (err) {
      console.error("Student results error:", err);

      setResults([]);
      setResultsError(
        err.message || "Unable to load results."
      );
    } finally {
      setResultsLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD STUDENT DASHBOARD
  // ==========================================

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        const headers = getAuthHeaders();

        // FETCH STUDENT PROFILE
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

        if (!isObject(user) || !user.name) {
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

        // EXTRACT BATCH DETAILS
        const completeBatch = getBatchDetails(
          profileData,
          user
        );

        const batchId = getBatchId(
          completeBatch,
          user
        );

        const studentBatch = isObject(user.batch)
          ? user.batch.batch ||
            user.batch.name ||
            user.batch.batchName
          : user.batch;

        const resolvedBatchName =
          completeBatch.batch ||
          completeBatch.name ||
          completeBatch.batchName ||
          studentBatch ||
          "Not assigned";

        // SET STUDENT
        setStudent({
          id:
            user.userId ||
            user.id ||
            user._id ||
            "",

          name: user.name || "Student",
          email: user.email || "",
          role: user.role || "Student",
          batch: resolvedBatchName,
          batchId,
        });

        // INITIAL DASHBOARD DATA
        setDashboard({
          ...getDashboard(profileData),
          batchDetails: completeBatch,
          batchId,
        });

        console.log("STUDENT PROFILE RESPONSE:", profileData);
        console.log("EXTRACTED BATCH DETAILS:", completeBatch);
        console.log("STUDENT BATCH ID:", batchId);

        // FETCH PENDING ASSIGNMENTS
        const pendingPromise = fetch(
          `${API_URL}/api/student/pending-assignments`,
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        )
          .then(async (response) => {
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(
                data.message ||
                "Unable to fetch pending assignments."
              );
            }

            return data;
          })
          .catch((err) => {
            console.error("Pending assignments error:", err);
            return null;
          });

        // FETCH ALL DASHBOARD SECTIONS
        await Promise.all([
          loadStudentRank(headers),
          loadAttendance(headers),
          loadResults(headers),
          loadBatchProgress(batchId, headers),
        ]);

        // PENDING ASSIGNMENTS
        const pendingData = await pendingPromise;

        if (pendingData) {
          const pendingCount =
            pendingData.pendingAssignments ??
            pendingData.data?.pendingAssignments ??
            pendingData.assignments?.pending ??
            pendingData.data?.assignments?.pending ??
            0;

          const completedCount =
            pendingData.assignments?.completed ??
            pendingData.data?.assignments?.completed ??
            0;

          const totalCount =
            pendingData.assignments?.total ??
            pendingData.data?.assignments?.total ??
            Number(pendingCount) + Number(completedCount);

          setDashboard((previous) => ({
            ...(previous || {}),
            pendingAssignments: Number(pendingCount),
            assignments: {
              ...(previous?.assignments || {}),
              total: Number(totalCount),
              pending: Number(pendingCount),
              completed: Number(completedCount),
            },
          }));
        }
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
    },
    [
      getAuthHeaders,
      loadStudentRank,
      loadAttendance,
      loadResults,
      loadBatchProgress,
    ]
  );

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ==========================================
  // REFRESH RANK
  // ==========================================

  const handleRefreshRank = () => {
    try {
      const headers = getAuthHeaders();
      loadStudentRank(headers);
    } catch (err) {
      setRankError(err.message);
    }
  };

  // ==========================================
  // REFRESH BATCH PROGRESS
  // ==========================================

  const handleRefreshBatchProgress = () => {
    try {
      const headers = getAuthHeaders();

      const batchId =
        student?.batchId ||
        dashboard?.batchId ||
        dashboard?.batchDetails?._id;

      loadBatchProgress(batchId, headers);
    } catch (err) {
      setBatchProgressError(err.message);
    }
  };

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
  // EXAM RESULTS CALCULATION
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
    ? Math.round(
        (totalObtained / totalMaximum) * 100
      )
    : 0;

  // ==========================================
  // ATTENDANCE STATISTICS
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

  // ==========================================
  // ASSIGNMENT STATISTICS
  // ==========================================

  const pendingAssignments =
    dashboard?.pendingAssignments ??
    dashboard?.assignments?.pending ??
    null;

  // ==========================================
  // BATCH DETAILS
  // ==========================================

  const batchDetails = dashboard?.batchDetails || {};

  const batchName =
    batchDetails.batch ||
    batchDetails.name ||
    batchDetails.batchName ||
    student?.batch ||
    "Not assigned";

  const batchId =
    student?.batchId ||
    batchDetails._id ||
    dashboard?.batchId ||
    "Not available";

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

  // ==========================================
  // RANK VALUES
  // ==========================================

  const assignedRank = rankData.rank;

  const totalBatchStudents = rankData.totalStudents;

  const hasAssignedRank =
    assignedRank !== null &&
    assignedRank !== undefined &&
    Number.isFinite(Number(assignedRank)) &&
    Number(assignedRank) > 0;

  // ==========================================
  // TRAINER PROGRESS
  // ==========================================

  const trainerTopics = getTopics(trainerBatchProgress);

  // Student percentage is now based on video watch duration.
  const studentOverallProgress =
    getLearningVideoPercentage(studentBatchProgress);

  // Keep existing trainer progress calculation.
  const trainerOverallProgress = getPercentage(
    trainerBatchProgress?.overallProgress ??
    trainerBatchProgress?.batchProgress ??
    trainerBatchProgress?.progress ??
    trainerBatchProgress?.data?.overallProgress ??
    calculateAverage(trainerTopics, "trainer")
  );

  // ==========================================
  // DASHBOARD STATISTICS CARDS
  // ==========================================

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
      title: "Attendance",
      value: attendanceLoading
        ? "Loading..."
        : `${attendancePercentage}%`,
      subtitle: attendanceLoading
        ? "Fetching attendance"
        : `${attendanceAttended} of ${attendanceTotal} classes`,
    },
    {
      title: "Pending Assignments",
      value:
        pendingAssignments != null
          ? String(pendingAssignments)
          : "—",
      subtitle: "Assignments awaiting submission",
    },
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">

      {/* DASHBOARD HEADER */}

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

          Refresh Dashboard
        </button>
      </header>

      {/* LOADING STATE */}

      {loading && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"
        >
          <RefreshCw size={18} className="animate-spin" />
          Fetching your profile and dashboard data...
        </div>
      )}

      {/* ERROR MESSAGE */}

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

      {/* NOTIFICATION */}

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
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

      {/* DASHBOARD STATISTICS + RANK */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}

        <RankCard
          rank={
            rankLoading
              ? "..."
              : hasAssignedRank
                ? assignedRank
                : "Not Assigned"
          }
          total={totalBatchStudents}
        />
      </section>

      {/* ==========================================
          STUDENT + TRAINER BATCH PROGRESS
      ========================================== */}

      <section className="mt-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap
                size={24}
                className="text-blue-700"
              />

              <h2 className="text-xl font-bold text-[#102e60]">
                My Learning Progress
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Track your video learning progress and trainer syllabus completion.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Batch: {batchName} · ID: {batchId}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshBatchProgress}
            disabled={batchProgressLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                batchProgressLoading ? "animate-spin" : ""
              }
            />

            Refresh Progress
          </button>
        </div>

        {batchProgressLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-10 text-blue-700">
            <RefreshCw size={18} className="animate-spin" />
            Loading student and trainer progress...
          </div>
        ) : (
          <>
            {batchProgressError && (
              <div className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                {batchProgressError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

              {/* TRAINER BATCH PROGRESS */}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">
                      Batch Progress
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Syllabus completion
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3 text-blue-700">
                    <BookOpen size={23} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-[#102e60]">
                  {trainerBatchProgress
                    ? `${trainerOverallProgress}%`
                    : "—"}
                </p>

                <div className="mt-4">
                  <ProgressBar
                    label="Trainer completion"
                    percentage={trainerOverallProgress}
                    color="bg-blue-600"
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {trainerTopics.length} syllabus topics
                </p>
              </div>

              {/* STUDENT VIDEO LEARNING PROGRESS */}

              <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">
                      Your Learning Progress
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Based on video lectures watched
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3 text-green-700">
                    <TrendingUp size={23} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-green-700">
                  {studentBatchProgress
                    ? `${studentOverallProgress}%`
                    : "—"}
                </p>

                <div className="mt-4">
                  <ProgressBar
                    label="Video learning completion"
                    percentage={studentOverallProgress}
                    color="bg-green-600"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {completedVideos} videos completed
                  </span>

                  <span>
                    {totalVideos} total videos
                  </span>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Your learning progress increases as you watch
                  published video lectures. Notes and PDFs are
                  not included in this calculation.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ==========================================
          BATCH RANK INFORMATION
      ========================================== */}

      <section className="mt-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
              <Users size={23} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#102e60]">
                My Batch Rank
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your performance rank assigned by your trainer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshRank}
            disabled={rankLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={rankLoading ? "animate-spin" : ""}
            />

            Refresh Rank
          </button>
        </div>

        {rankLoading ? (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <RefreshCw size={17} className="animate-spin" />
            Fetching your batch rank...
          </div>
        ) : rankError ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Unable to load your rank
            </p>

            <p className="mt-1 text-sm text-red-600">
              {rankError}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-medium text-slate-600">
                Your Rank
              </p>

              <p className="mt-2 text-3xl font-extrabold text-[#102e60]">
                {hasAssignedRank
                  ? `#${assignedRank}`
                  : "Not Assigned"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {hasAssignedRank
                  ? "Your position in the batch"
                  : "Your trainer has not assigned your rank yet"}
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-sm font-medium text-slate-600">
                Total Batch Students
              </p>

              <p className="mt-2 text-3xl font-extrabold text-indigo-700">
                {totalBatchStudents}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Students in {batchName}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-5">
              <p className="text-sm font-medium text-slate-600">
                Rank Assigned By
              </p>

              <p className="mt-2 break-words text-lg font-bold text-green-700">
                {rankData.rankAssignedBy?.name ||
                  "Not assigned"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {rankData.rankAssignedAt
                  ? `Assigned on ${formatDate(
                      rankData.rankAssignedAt
                    )}`
                  : "Trainer assignment details"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ==========================================
          STUDENT ATTENDANCE
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

        {attendanceError && (
          <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Unable to load attendance
            </p>

            <p className="mt-1">{attendanceError}</p>

            <button
              type="button"
              onClick={() => {
                try {
                  loadAttendance(getAuthHeaders());
                } catch (err) {
                  setAttendanceError(err.message);
                }
              }}
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
                attendanceData.attendance.map((record, index) => (
                  <tr
                    key={record._id || index}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                      {formatDate(record.date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.batch?.name ||
                        record.batch?.batchName ||
                        record.batch?.code ||
                        batchName}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.trainer?.name || trainerName}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                          record.status
                        )}`}
                      >
                        {record.status === "Present" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <X size={14} />
                        )}

                        {record.status || "Not available"}
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
          STUDENT EXAM RESULTS
      ========================================== */}

      <section className="mt-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">

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

        {!resultsLoading && resultsError && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Unable to load results
            </p>

            <p className="mt-1">{resultsError}</p>

            <button
              type="button"
              onClick={() => {
                try {
                  loadResults(getAuthHeaders());
                } catch (err) {
                  setResultsError(err.message);
                }
              }}
              className="mt-3 rounded-md bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
            >
              Retry Results
            </button>
          </div>
        )}

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

        {!resultsLoading &&
          !resultsError &&
          results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
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
          COMPLETE BATCH INFORMATION
      ========================================== */}

      <section className="mt-8 rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

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

          <BatchInfoCard
            icon={CalendarDays}
            title="Start Date"
            value={formatDate(batchStartDate)}
            subtitle="Training commencement date"
            iconBackground="bg-green-50"
            iconColor="text-green-600"
          />

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

          <BatchInfoCard
            icon={GraduationCap}
            title="Trainer"
            value={trainerName}
            subtitle="Assigned batch trainer"
            iconBackground="bg-purple-50"
            iconColor="text-purple-600"
          />
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

              {batchDetails.trainer?.email && (
                <p className="mt-1 text-sm text-slate-500">
                  {batchDetails.trainer.email}
                </p>
              )}
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
      </section>
    </main>
  );
}
