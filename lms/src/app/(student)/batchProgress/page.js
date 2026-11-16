
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Save,
  UserRound,
  Award,
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

async function apiRequest(url, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Unable to process request.");
  }

  return data;
}

function ProgressBar({ value, color }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function getStatusClass(status) {
  if (status === "Confident") {
    return "bg-green-100 text-green-700";
  }

  if (status === "Learning") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function StudentBatchProgress({ batchId: propBatchId }) {
  const [resolvedBatchId, setResolvedBatchId] = useState("");
  const [batchName, setBatchName] = useState("");

  const [topics, setTopics] = useState([]);
  const [studentProgress, setStudentProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);
  const [completedTopics, setCompletedTopics] = useState(0);
  const [totalTopics, setTotalTopics] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingTopic, setSavingTopic] = useState("");

  const [drafts, setDrafts] = useState({});

  // --------------------------------------------------
  // 1. RESOLVE ACTUAL BATCH ID
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const resolveBatch = async () => {
      try {
        setLoading(true);
        setError("");

        // A valid batch ID must be a MongoDB ObjectId.
        // Student IDs like STU6A151C5D are not batch IDs.
        if (
          propBatchId &&
          /^[a-fA-F0-9]{24}$/.test(String(propBatchId))
        ) {
          if (!cancelled) {
            setResolvedBatchId(String(propBatchId));
          }
          return;
        }

        // Otherwise fetch the student's actual profile.
        const profileData = await apiRequest("/api/student/profile");

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
            "Your batch has not been assigned yet. Please contact your counsellor or administrator."
          );
        }

        if (!/^[a-fA-F0-9]{24}$/.test(String(assignedBatchId))) {
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
  // 2. FETCH STUDENT + TRAINER PROGRESS
  // --------------------------------------------------

  const loadProgress = useCallback(async () => {
    if (!resolvedBatchId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/progress/student/${resolvedBatchId}`
      );

      const topicList = Array.isArray(data.topics)
        ? data.topics
        : [];

      setTopics(topicList);

      setBatchName(data.batch?.name || batchName);

      // Student self-assessed knowledge
      setStudentProgress(
        Number(data.overallProgress) || 0
      );

      // Trainer syllabus progress
      setBatchProgress(
        Number(data.trainerOverallProgress) || 0
      );

      setCompletedTopics(
        topicList.filter(
          (topic) => topic.trainerStatus === "Completed"
        ).length
      );

      setTotalTopics(
        Number(data.totalTopics) || topicList.length
      );

      const initialDrafts = {};

      topicList.forEach((topic) => {
        initialDrafts[topic._id] =
          Number(topic.knowledgePercentage) || 0;
      });

      setDrafts(initialDrafts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resolvedBatchId, batchName]);

  useEffect(() => {
    if (resolvedBatchId) {
      loadProgress();
    }
  }, [resolvedBatchId, loadProgress]);

  // --------------------------------------------------
  // 3. CHANGE STUDENT KNOWLEDGE PERCENTAGE
  // --------------------------------------------------

  const handlePercentageChange = (topicId, value) => {
    setDrafts((previous) => ({
      ...previous,
      [topicId]: Number(value),
    }));

    setSuccess("");
  };

  // --------------------------------------------------
  // 4. SAVE STUDENT KNOWLEDGE PROGRESS
  // --------------------------------------------------

  const updateKnowledge = async (topic) => {
    const topicId = topic._id;
    const percentage = Number(drafts[topicId] ?? 0);

    if (!topicId) {
      setError("Trainer syllabus topic ID is missing.");
      return;
    }

    if (percentage < 0 || percentage > 100) {
      setError("Progress must be between 0 and 100.");
      return;
    }

    try {
      setSavingTopic(topicId);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/progress/student/${resolvedBatchId}/${topicId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            knowledgePercentage: percentage,
          }),
        }
      );

      // Update the visible topic data.
      if (Array.isArray(data.topics)) {
        setTopics((previous) =>
          previous.map((item) => {
            const updated = data.topics.find(
              (saved) =>
                saved.topicName?.trim().toLowerCase() ===
                item.topicName?.trim().toLowerCase()
            );

            return updated
              ? {
                  ...item,
                  knowledgePercentage:
                    updated.knowledgePercentage,
                  status: updated.status,
                  updatedAt: updated.updatedAt,
                }
              : item;
          })
        );
      }

      setStudentProgress(
        Number(data.overallProgress) || 0
      );

      setSuccess(
        `${topic.topicName} learning progress saved successfully.`
      );

      // Reload the merged trainer + student response.
      await loadProgress();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTopic("");
    }
  };

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
  // 6. ERROR / NO BATCH UI
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
  // 7. MAIN UI
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
            Track your learning and your trainer's syllabus progress.
          </p>

          {batchName && (
            <p className="mt-1 text-sm font-semibold text-blue-700">
              Batch: {batchName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={loadProgress}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
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

      {/* SUCCESS */}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* PROGRESS CARDS */}

      <div className="grid gap-5 md:grid-cols-2">
        {/* STUDENT PROGRESS */}

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
                Your self-assessed knowledge
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <span className="text-sm text-slate-500">
              Overall knowledge
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
        </div>

        {/* TRAINER PROGRESS */}

        <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <GraduationCap size={24} />
            </div>

            <div>
              <h3 className="font-bold text-[#102e60]">
                Trainer Batch Progress
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

          <p className="mt-3 text-xs text-slate-500">
            {completedTopics} of {totalTopics} topics completed
          </p>
        </div>
      </div>

      {/* LEARNING TOPICS */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="flex items-center gap-2 font-bold text-[#102e60]">
            <BookOpen size={20} />
            My Learning Process
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Adjust your understanding level for every topic added by your trainer.
          </p>
        </div>

        {topics.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen
              className="mx-auto mb-3 text-slate-300"
              size={40}
            />

            <p className="font-semibold text-slate-700">
              No syllabus topics available
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Your trainer needs to add topics first.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {topics.map((topic) => {
              const percentage = Number(
                drafts[topic._id] ??
                  topic.knowledgePercentage ??
                  0
              );

              const savedPercentage = Number(
                topic.knowledgePercentage ?? 0
              );

              const saving = savingTopic === topic._id;

              return (
                <div
                  key={topic._id}
                  className="space-y-4 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {topic.topicName}
                      </h4>

                      <span
                        className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          topic.status
                        )}`}
                      >
                        {topic.status || "Not Started"}
                      </span>
                    </div>

                    <span className="text-xl font-bold text-blue-700">
                      {percentage}%
                    </span>
                  </div>

                  <ProgressBar
                    value={percentage}
                    color="bg-blue-600"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={percentage}
                      onChange={(event) =>
                        handlePercentageChange(
                          topic._id,
                          event.target.value
                        )
                      }
                      className="min-w-[150px] flex-1 accent-blue-600"
                    />

                    <button
                      type="button"
                      onClick={() => updateKnowledge(topic)}
                      disabled={
                        saving ||
                        percentage === savedPercentage
                      }
                      className="flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183e79] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Trainer completion:{" "}
                      {Number(topic.completionPercentage) || 0}%
                    </span>

                    <span>
                      Your saved progress: {savedPercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROGRESS GUIDE */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="flex items-center gap-2 font-bold text-[#102e60]">
            <Award size={20} />
            Understanding Your Progress
          </h3>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <Clock className="mb-2 text-slate-500" size={20} />

            <p className="font-semibold text-slate-800">
              Not Started
            </p>

            <p className="mt-1 text-xs text-slate-500">
              0% understanding
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <BookOpen className="mb-2 text-blue-600" size={20} />

            <p className="font-semibold text-blue-800">
              Learning
            </p>

            <p className="mt-1 text-xs text-blue-600">
              1% to 79% understanding
            </p>
          </div>

          <div className="rounded-lg bg-green-50 p-4">
            <CheckCircle2
              className="mb-2 text-green-600"
              size={20}
            />

            <p className="font-semibold text-green-800">
              Confident
            </p>

            <p className="mt-1 text-xs text-green-600">
              80% to 100% understanding
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
