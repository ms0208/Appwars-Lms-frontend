
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  UserRound,
  PlayCircle,
  Clock,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
).replace(/\/$/, "");

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token")
  );
}

async function apiRequest(url) {
  const token = getToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  const response = await fetch(`${API_URL}${url}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Unable to fetch data.");
  }

  return data;
}

function ProgressBar({ value, color }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

/*
  Supports common response formats from the learning resources
  progress API.

  Preferred backend response:
  {
    success: true,
    summary: {
      progressPercentage: 50,
      totalVideos: 10,
      completedVideos: 5,
      totalDuration: 6000,
      watchedDuration: 3000
    }
  }
*/

function getVideoProgress(data) {
  const summary =
    data?.summary ||
    data?.data?.summary ||
    data?.progress?.summary ||
    {};

  const progressObject =
    data?.progress && !Array.isArray(data.progress)
      ? data.progress
      : {};

  const percentage =
    summary.progressPercentage ??
    summary.overallProgress ??
    summary.completionPercentage ??
    summary.videoProgress ??
    progressObject.progressPercentage ??
    progressObject.percentage ??
    data?.progressPercentage ??
    data?.overallProgress ??
    data?.completionPercentage ??
    data?.videoProgress;

  if (percentage !== undefined && percentage !== null) {
    return Math.min(100, Math.max(0, Number(percentage) || 0));
  }

  /*
    Fallback:
    Calculate progress using completed video duration
    divided by total published video duration.
  */

  const resources =
    data?.resources ||
    data?.videos ||
    data?.data?.resources ||
    data?.data?.videos ||
    [];

  if (Array.isArray(resources) && resources.length > 0) {
    const videos = resources.filter(
      (item) =>
        item.type === "video" ||
        item.resource?.type === "video"
    );

    const totalDuration = videos.reduce((total, item) => {
      return (
        total +
        Number(
          item.duration ||
          item.resource?.duration ||
          item.progress?.duration ||
          0
        )
      );
    }, 0);

    const completedDuration = videos.reduce((total, item) => {
      const completed =
        item.completed ||
        item.progress?.completed ||
        item.isCompleted;

      const duration = Number(
        item.duration ||
        item.resource?.duration ||
        item.progress?.duration ||
        0
      );

      return total + (completed ? duration : 0);
    }, 0);

    if (totalDuration > 0) {
      return Math.min(
        100,
        Math.round((completedDuration / totalDuration) * 100)
      );
    }
  }

  return 0;
}

function getVideoStats(data) {
  const summary =
    data?.summary ||
    data?.data?.summary ||
    {};

  return {
    totalVideos: Number(
      summary.totalVideos ??
      summary.totalResources ??
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

export default function StudentBatchProgress({
  batchId: propBatchId,
}) {
  const [resolvedBatchId, setResolvedBatchId] = useState("");
  const [batchName, setBatchName] = useState("");

  const [studentProgress, setStudentProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);

  const [totalVideos, setTotalVideos] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [resourceError, setResourceError] = useState("");

  // --------------------------------------------------
  // 1. RESOLVE STUDENT BATCH ID
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const resolveBatch = async () => {
      try {
        setLoading(true);
        setError("");

        if (
          propBatchId &&
          /^[a-fA-F0-9]{24}$/.test(String(propBatchId))
        ) {
          if (!cancelled) {
            setResolvedBatchId(String(propBatchId));
          }

          return;
        }

        const profileData = await apiRequest(
          "/api/student/profile"
        );

        const student =
          profileData.user ||
          profileData.student ||
          profileData.data?.user ||
          profileData.data ||
          profileData;

        const assignedBatchId =
          student.batchDetails?._id ||
          student.batchDetails?.id ||
          student.batchId ||
          "";

        const assignedBatchName =
          student.batchDetails?.batch ||
          student.batch ||
          "";

        if (!assignedBatchId) {
          throw new Error(
            "Your batch has not been assigned yet. Please contact your administrator."
          );
        }

        if (
          !/^[a-fA-F0-9]{24}$/.test(String(assignedBatchId))
        ) {
          throw new Error(
            "Invalid batch ID received from your student profile."
          );
        }

        if (!cancelled) {
          setResolvedBatchId(String(assignedBatchId));
          setBatchName(assignedBatchName);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setResolvedBatchId("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    resolveBatch();

    return () => {
      cancelled = true;
    };
  }, [propBatchId]);

  // --------------------------------------------------
  // 2. FETCH STUDENT VIDEO LEARNING PROGRESS
  // --------------------------------------------------

  const loadStudentVideoProgress = useCallback(async () => {
    try {
      setResourceError("");

      const data = await apiRequest(
        "/api/learning-resources/my-progress"
      );

      const percentage = getVideoProgress(data);
      const stats = getVideoStats(data);

      setStudentProgress(percentage);
      setTotalVideos(stats.totalVideos);
      setCompletedVideos(stats.completedVideos);
    } catch (err) {
      setResourceError(err.message);
    }
  }, []);

  // --------------------------------------------------
  // 3. FETCH EXISTING TRAINER BATCH PROGRESS
  // --------------------------------------------------

  const loadTrainerBatchProgress = useCallback(async () => {
    if (!resolvedBatchId) return;

    const data = await apiRequest(
      `/api/progress/student/${resolvedBatchId}`
    );

    // Keep existing trainer progress calculation unchanged.
    setBatchProgress(
      Number(data.trainerOverallProgress) || 0
    );

    setBatchName(data.batch?.name || batchName);
  }, [resolvedBatchId, batchName]);

  // --------------------------------------------------
  // 4. LOAD BOTH PROGRESS VALUES
  // --------------------------------------------------

  const loadProgress = useCallback(async (showLoader = true) => {
    if (!resolvedBatchId) return;

    if (showLoader) {
      setRefreshing(true);
    }

    setError("");

    try {
      const results = await Promise.allSettled([
        loadStudentVideoProgress(),
        loadTrainerBatchProgress(),
      ]);

      const trainerResult = results[1];

      if (trainerResult.status === "rejected") {
        throw trainerResult.reason;
      }
    } catch (err) {
      setError(err.message || "Unable to fetch batch progress.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [
    resolvedBatchId,
    loadStudentVideoProgress,
    loadTrainerBatchProgress,
  ]);

  useEffect(() => {
    if (resolvedBatchId) {
      loadProgress(false);
    }
  }, [resolvedBatchId, loadProgress]);

  // --------------------------------------------------
  // 5. LOADING UI
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-white p-10">
        <Loader2
          className="animate-spin text-[#102e60]"
          size={28}
        />

        <span className="ml-3 text-sm text-slate-500">
          Loading your batch progress...
        </span>
      </div>
    );
  }

  // --------------------------------------------------
  // 6. BATCH NOT ASSIGNED
  // --------------------------------------------------

  if (!resolvedBatchId) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-center gap-2 text-orange-700">
          <AlertCircle size={20} />

          <p className="font-semibold">
            Batch not assigned
          </p>
        </div>

        <p className="mt-2 text-sm text-orange-700">
          {error ||
            "Your batch has not been assigned yet. Please contact your administrator."}
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // 7. MAIN UI - ONLY TWO PROGRESS CARDS
  // --------------------------------------------------

  return (
    <section className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#102e60]">
            Learning & Batch Progress
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track your video learning and trainer syllabus completion.
          </p>

          {batchName && (
            <p className="mt-1 text-sm font-semibold text-blue-700">
              Batch: {batchName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => loadProgress(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* VIDEO PROGRESS API ERROR */}

      {resourceError && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          <AlertCircle size={18} />
          Unable to load video learning progress: {resourceError}
        </div>
      )}

      {/* TWO PROGRESS CARDS */}

      <div className="grid gap-5 md:grid-cols-2">

        {/* STUDENT VIDEO LEARNING PROGRESS */}

        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <UserRound size={24} />
            </div>

            <div>
              <h3 className="font-bold text-[#102e60]">
                My Learning Progress
              </h3>

              <p className="text-xs text-slate-500">
                Based on video lectures watched
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <span className="text-sm text-slate-500">
              Video completion
            </span>

            <span className="text-3xl font-bold text-blue-700">
              {studentProgress}%
            </span>
          </div>

          <div className="mt-3">
            <ProgressBar
              value={studentProgress}
              color="bg-blue-600"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <PlayCircle size={15} />
              {completedVideos} videos completed
            </span>

            <span>
              {totalVideos} total videos
            </span>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-3">
            <p className="text-xs leading-5 text-blue-700">
              Your learning progress automatically increases
              as you watch and complete published video lectures.
              Notes and PDFs are not included.
            </p>
          </div>
        </div>

        {/* TRAINER BATCH PROGRESS */}

        <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <GraduationCap size={24} />
            </div>

            <div>
              <h3 className="font-bold text-[#102e60]">
                 Batch Progress
              </h3>

              <p className="text-xs text-slate-500">
                Syllabus completion by your trainer
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <span className="text-sm text-slate-500">
              Syllabus completion
            </span>

            <span className="text-3xl font-bold text-green-700">
              {batchProgress}%
            </span>
          </div>

          <div className="mt-3">
            <ProgressBar
              value={batchProgress}
              color="bg-green-600"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={15} className="text-green-600" />

            Trainer-managed syllabus progress
          </div>

          <div className="mt-4 rounded-lg bg-green-50 p-3">
            <p className="text-xs leading-5 text-green-700">
              This percentage is based on the syllabus completion
              updated by your trainer. It is independent of your
              video watching progress.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
