
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  AlertCircle,
  X,
  Save,
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

  if (!token) throw new Error("Please login again.");

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
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function ProgressBar({ value, color = "bg-blue-600" }) {
  const percentage = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function TrainerBatchProgressPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");

  const [topics, setTopics] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const [topicName, setTopicName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // FETCH ASSIGNED BATCHES
  // ==========================================

  const loadBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Uses the existing trainer batches endpoint.
      const data = await apiRequest("/api/trainer/batches");

      const list = Array.isArray(data.batches)
        ? data.batches
        : Array.isArray(data.data?.batches)
        ? data.data.batches
        : Array.isArray(data.data)
        ? data.data
        : [];

      setBatches(list);

      if (list.length > 0) {
        const firstId = list[0]._id || list[0].id;

        setSelectedBatch((previous) => {
          const exists = list.some(
            (batch) => String(batch._id || batch.id) === previous
          );

          return exists ? previous : String(firstId);
        });
      } else {
        setSelectedBatch("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // FETCH SYLLABUS PROGRESS
  // ==========================================

  const loadProgress = useCallback(async () => {
    if (!selectedBatch) {
      setTopics([]);
      setOverallProgress(0);
      return;
    }

    try {
      setTopicLoading(true);
      setError("");

      const data = await apiRequest(
        `/api/progress/trainer/${selectedBatch}`
      );

      setTopics(Array.isArray(data.topics) ? data.topics : []);

      setOverallProgress(
        Number(data.overallProgress) || 0
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setTopicLoading(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // ==========================================
  // ADD TOPIC
  // ==========================================

  const handleAddTopic = async (e) => {
    e.preventDefault();

    if (!topicName.trim() || !selectedBatch) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/progress/trainer/${selectedBatch}/topics`,
        {
          method: "POST",
          body: JSON.stringify({
            topicName: topicName.trim(),
          }),
        }
      );

      setTopicName("");

      setTopics(data.topics || []);
      setOverallProgress(Number(data.overallProgress) || 0);

      setSuccess("Syllabus topic added successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // UPDATE TOPIC COMPLETION
  // ==========================================

  const handleUpdateTopic = async (topicId, percentage) => {
    try {
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/progress/trainer/${selectedBatch}/topics/${topicId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            completionPercentage: Number(percentage),
          }),
        }
      );

      setTopics(data.topics || []);
      setOverallProgress(Number(data.overallProgress) || 0);

      setSuccess("Topic progress updated successfully.");
    } catch (err) {
      setError(err.message);
      await loadProgress();
    }
  };

  // ==========================================
  // DELETE TOPIC
  // ==========================================

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Are you sure you want to delete this topic?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/progress/trainer/${selectedBatch}/topics/${topicId}`,
        { method: "DELETE" }
      );

      setTopics(data.topics || []);
      setOverallProgress(Number(data.overallProgress) || 0);

      setSuccess("Topic deleted successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedBatchData = batches.find(
    (batch) =>
      String(batch._id || batch.id) === selectedBatch
  );

  const completedTopics = topics.filter(
    (topic) => Number(topic.completionPercentage) === 100
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#102e60]" size={32} />
      </div>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102e60] sm:text-3xl">
            Batch Syllabus Progress
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage syllabus topics and track batch completion.
          </p>
        </div>

        <button
          onClick={() => {
            loadBatches();
            loadProgress();
          }}
          disabled={topicLoading}
          className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw
            size={16}
            className={topicLoading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button className="ml-auto" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* BATCH SELECTOR */}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Select Assigned Batch
        </label>

        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#102e60] sm:max-w-md"
        >
          <option value="">Select batch</option>

          {batches.map((batch) => (
            <option
              key={batch._id || batch.id}
              value={batch._id || batch.id}
            >
              {batch.batch || batch.name || "Unnamed Batch"}
            </option>
          ))}
        </select>

        {selectedBatchData && (
          <p className="mt-2 text-xs text-slate-500">
            {selectedBatchData.course?.courseName ||
              selectedBatchData.courseName ||
              selectedBatchData.course ||
              "Batch syllabus management"}
          </p>
        )}
      </section>

      {!selectedBatch ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <BookOpen className="mx-auto mb-3 text-slate-400" size={40} />
          <h3 className="font-semibold text-slate-700">
            No assigned batches found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Your assigned batches will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* STATISTICS */}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <BookOpen className="mb-3 text-blue-600" size={24} />
              <p className="text-sm text-slate-500">Total Topics</p>
              <h2 className="mt-1 text-2xl font-bold text-[#102e60]">
                {topics.length}
              </h2>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <CheckCircle2 className="mb-3 text-green-600" size={24} />
              <p className="text-sm text-slate-500">Completed Topics</p>
              <h2 className="mt-1 text-2xl font-bold text-green-700">
                {completedTopics}
              </h2>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <GraduationCap className="mb-3 text-indigo-600" size={24} />
              <p className="text-sm text-slate-500">Overall Batch Progress</p>
              <h2 className="mt-1 text-2xl font-bold text-[#102e60]">
                {overallProgress}%
              </h2>
              <div className="mt-3">
                <ProgressBar value={overallProgress} />
              </div>
            </div>
          </section>

          {/* ADD TOPIC */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-[#102e60]">
              <Plus size={20} />
              Add Syllabus Topic
            </h2>

            <form
              onSubmit={handleAddTopic}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="Enter topic name (e.g. React Hooks)"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#102e60]"
                required
              />

              <button
                type="submit"
                disabled={saving || !topicName.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-6 py-3 font-semibold text-white hover:bg-[#183e79] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                Add Topic
              </button>
            </form>
          </section>

          {/* TOPIC LIST */}

          <section className="rounded-xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-[#102e60]">
                  Syllabus Topics
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Update the completion percentage for each topic.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {topics.length} Topics
              </span>
            </div>

            {topicLoading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="animate-spin text-[#102e60]" size={28} />
              </div>
            ) : topics.length === 0 ? (
              <div className="p-10 text-center">
                <BookOpen className="mx-auto mb-3 text-slate-300" size={40} />
                <p className="font-semibold text-slate-700">
                  No syllabus topics added yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Add your first topic above.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {topics.map((topic) => (
                  <TopicRow
                    key={topic._id}
                    topic={topic}
                    onUpdate={handleUpdateTopic}
                    onDelete={handleDeleteTopic}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function TopicRow({ topic, onUpdate, onDelete }) {
  const [percentage, setPercentage] = useState(
    Number(topic.completionPercentage) || 0
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPercentage(Number(topic.completionPercentage) || 0);
  }, [topic.completionPercentage]);

  const status =
    percentage === 100
      ? "Completed"
      : percentage > 0
      ? "In Progress"
      : "Pending";

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(topic._id, percentage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <BookOpen size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-slate-800">
              {topic.topicName}
            </h3>

            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                status === "Completed"
                  ? "bg-green-100 text-green-700"
                  : status === "In Progress"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(topic._id)}
          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
          title="Delete topic"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar
            value={topic.completionPercentage}
            color="bg-blue-600"
          />
        </div>
        <span className="w-12 text-right text-sm font-bold text-[#102e60]">
          {topic.completionPercentage}%
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Completion
          </label>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
            className="flex-1 accent-[#102e60]"
          />

          <span className="w-12 text-sm font-semibold">
            {percentage}%
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            percentage === Number(topic.completionPercentage)
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183e79] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Progress
        </button>
      </div>
    </div>
  );
}
