
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MessageCircle,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_ROOT.endsWith("/api")
  ? API_ROOT
  : `${API_ROOT}/api`;

// Read the authentication token from browser storage.
function getToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("appwars_token") ||
    localStorage.getItem("appwars_token") ||
    ""
  );
}

// Make authenticated requests to the trainer API.
async function trainerRequest(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Login session not found. Please sign in again.");
  }

  const response = await fetch(`${API_URL}/trainer${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

// Handle common API response formats.
function unwrap(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  return [];
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not scheduled";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;

  return value._id || value.id || value.batchId || "";
}

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-bold text-slate-900">
            {value ?? 0}
          </h3>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function TrainerDashboard() {
  const [trainer, setTrainer] = useState({
    name: "",
    userId: "",
  });

  const [trainerLoaded, setTrainerLoaded] = useState(false);
  const [dashboard, setDashboard] = useState({});
  const [batches, setBatches] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [doubts, setDoubts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementBatch, setAnnouncementBatch] = useState("");

  const [replyMessages, setReplyMessages] = useState({});
  const [busyDoubt, setBusyDoubt] = useState("");

  // Read the logged-in trainer from storage only after mounting.
  // This prevents server/client hydration mismatches.
  useEffect(() => {
    try {
      const storedUser =
        sessionStorage.getItem("user") ||
        localStorage.getItem("user");

      if (storedUser) {
        const user = JSON.parse(storedUser);

        setTrainer({
          name: user.name || user.fullName || "",
          userId: user.userId || user.id || "",
        });
      }
    } catch (storageError) {
      console.error("Unable to read trainer details:", storageError);
    } finally {
      setTrainerLoaded(true);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.all([
        trainerRequest("/dashboard"),
        trainerRequest("/batches"),
        trainerRequest("/announcements"),
        trainerRequest("/doubts"),
      ]);

      const dashboardData =
        results[0]?.data && !Array.isArray(results[0].data)
          ? results[0].data
          : results[0];

      setDashboard(dashboardData || {});

      // Use the API name as a fallback if storage has no name.
      const apiTrainer =
        dashboardData?.trainer ||
        dashboardData?.user ||
        dashboardData?.data?.trainer ||
        {};

      const apiName =
        apiTrainer.name ||
        dashboardData?.trainerName ||
        dashboardData?.name ||
        "";

      const apiUserId =
        apiTrainer.userId ||
        apiTrainer.id ||
        "";

      setTrainer((previous) => ({
        name: previous.name || apiName,
        userId: previous.userId || apiUserId,
      }));

      const batchList = unwrap(results[1], "batches");

      setBatches(batchList);
      setAnnouncements(unwrap(results[2], "announcements"));
      setDoubts(unwrap(results[3], "doubts"));

      const firstBatch = batchList[0];

      setAnnouncementBatch((previous) =>
        previous || getId(firstBatch)
      );
    } catch (err) {
      setError(err.message || "Unable to load the trainer dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleAnnouncementSubmit(event) {
    event.preventDefault();
    setNotice("");
    setError("");

    if (!announcementBatch) {
      setError("Please select a batch for the announcement.");
      return;
    }

    if (!announcementMessage.trim()) {
      setError("Please enter an announcement.");
      return;
    }

    try {
      await trainerRequest("/announcements", {
        method: "POST",
        body: JSON.stringify({
          batchId: announcementBatch,
          message: announcementMessage.trim(),
        }),
      });

      setAnnouncementMessage("");
      setNotice("Announcement published successfully.");

      const result = await trainerRequest("/announcements");
      setAnnouncements(unwrap(result, "announcements"));
    } catch (err) {
      setError(err.message || "Unable to publish announcement.");
    }
  }

  async function handleDoubtReply(event, doubtId) {
    event.preventDefault();

    const message = (replyMessages[doubtId] || "").trim();

    if (!message) {
      setError("Please enter a reply before submitting.");
      return;
    }

    setBusyDoubt(doubtId);
    setError("");
    setNotice("");

    try {
      await trainerRequest(`/doubts/${doubtId}/replies`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      setReplyMessages((previous) => ({
        ...previous,
        [doubtId]: "",
      }));

      setNotice("Your reply has been submitted.");

      const result = await trainerRequest("/doubts");
      setDoubts(unwrap(result, "doubts"));
    } catch (err) {
      setError(err.message || "Unable to submit the reply.");
    } finally {
      setBusyDoubt("");
    }
  }

  const stats = dashboard.stats || dashboard.summary || dashboard;

  const totalStudents =
    stats.totalStudents ??
    stats.studentCount ??
    batches.reduce(
      (total, batch) =>
        total + Number(batch.studentCount ?? batch.studentsCount ?? 0),
      0
    );

  const assignedBatches =
    stats.assignedBatches ?? stats.totalBatches ?? batches.length;

  const pendingReviews =
    stats.pendingReviews ??
    stats.pendingSubmissions ??
    stats.pendingAssignments ??
    0;

  const openDoubts =
    stats.openDoubts ??
    doubts.filter(
      (doubt) =>
        String(doubt.status || "Open").toLowerCase() === "open"
    ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard header */}
      <header className="border-b border-slate-200 bg-white px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#102e60]">
              APPWARS LMS / Trainer
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Welcome
              {trainer.name ? `, ${trainer.name}` : ""}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your batches, attendance, assignments and student doubts.
            </p>

            {trainerLoaded && trainer.userId && (
              <p className="mt-2 text-xs text-slate-500">
                Trainer ID: {trainer.userId}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/trainer/attendance-grading"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d79]"
            >
              Attendance & Grading
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-7 md:px-8">
        {/* Errors and success messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {/* Statistics */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Overview</h2>

            {loading && (
              <span className="text-xs text-slate-500">
                Loading data...
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Assigned Batches"
              value={assignedBatches}
              description="Batches assigned to you"
              icon={BookOpen}
              color="bg-blue-50 text-blue-700"
            />

            <StatCard
              title="Students"
              value={totalStudents}
              description="Students in your batches"
              icon={Users}
              color="bg-emerald-50 text-emerald-700"
            />

            <StatCard
              title="Pending Reviews"
              value={pendingReviews}
              description="Assignments awaiting review"
              icon={Clock}
              color="bg-amber-50 text-amber-700"
            />

            <StatCard
              title="Open Doubts"
              value={openDoubts}
              description="Student questions to address"
              icon={MessageCircle}
              color="bg-purple-50 text-purple-700"
            />
          </div>
        </section>

        {/* My batches */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Batches</h2>
              <p className="mt-1 text-sm text-slate-500">
                Batches assigned to your trainer account.
              </p>
            </div>

            <BookOpen className="text-[#102e60]" size={22} />
          </div>

          {batches.length === 0 ? (
            <EmptyState
              message={
                loading
                  ? "Loading your batches..."
                  : "No batches have been assigned to you yet."
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {batches.map((batch) => {
                const batchId = getId(batch);
                const batchName =
                  batch.batch ||
                  batch.name ||
                  batch.batchName ||
                  "Unnamed batch";

                const status = batch.status || "Upcoming";

                return (
                  <div
                    key={batchId || batchName}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#102e60]">
                        <GraduationCap size={23} />
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          status === "Running"
                            ? "bg-green-100 text-green-700"
                            : status === "Completed"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-slate-900">
                      {batchName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {batch.course || "Course not specified"}
                    </p>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <Users size={16} />
                          Students
                        </span>

                        <span className="font-semibold">
                          {batch.studentCount ??
                            batch.studentsCount ??
                            "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <CalendarDays size={16} />
                          Start date
                        </span>

                        <span>{formatDate(batch.startDate)}</span>
                      </div>
                    </div>

                    <Link
                      href={`/trainer/attendance-grading?batchId=${encodeURIComponent(batchId)}`}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#102e60] px-4 py-2.5 text-sm font-semibold text-[#102e60] hover:bg-blue-50"
                    >
                      Manage Batch
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Announcements and student doubts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Announcements */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-[#102e60]">
                <Bell size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Announcements
                </h2>
                <p className="text-sm text-slate-500">
                  Share updates with your students.
                </p>
              </div>
            </div>

            <form onSubmit={handleAnnouncementSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="announcementBatch"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Select batch
                </label>

                <select
                  id="announcementBatch"
                  value={announcementBatch}
                  onChange={(event) =>
                    setAnnouncementBatch(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Choose a batch</option>

                  {batches.map((batch) => (
                    <option key={getId(batch)} value={getId(batch)}>
                      {batch.batch || batch.name || "Unnamed batch"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="announcementMessage"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Announcement message
                </label>

                <textarea
                  id="announcementMessage"
                  rows={3}
                  maxLength={2000}
                  value={announcementMessage}
                  onChange={(event) =>
                    setAnnouncementMessage(event.target.value)
                  }
                  placeholder="Write an announcement for your students..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {announcementMessage.length}/2000
                </p>
              </div>

              <button
                type="submit"
                disabled={!batches.length}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-4 py-3 text-sm font-semibold text-white hover:bg-[#173d79] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
                Publish Announcement
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="mb-3 font-semibold text-slate-800">
                Recent announcements
              </h3>

              {announcements.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No announcements found.
                </p>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 5).map((announcement, index) => (
                    <div
                      key={announcement._id || index}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {announcement.message}
                      </p>

                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {announcement.batch?.batch ||
                            announcement.batchName ||
                            "Batch announcement"}
                        </span>

                        <span>
                          {formatDate(
                            announcement.createdAt || announcement.date
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Student doubts */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-700">
                <MessageCircle size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Student Doubts
                </h2>
                <p className="text-sm text-slate-500">
                  Respond to questions from your batches.
                </p>
              </div>
            </div>

            {doubts.length === 0 ? (
              <EmptyState message="No student doubts are currently available." />
            ) : (
              <div className="space-y-4">
                {doubts.slice(0, 8).map((doubt, index) => {
                  const doubtId = getId(doubt);
                  const isOpen =
                    String(doubt.status || "Open").toLowerCase() === "open";

                  return (
                    <div
                      key={doubtId || index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {doubt.title || doubt.topic || "Student question"}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isOpen
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {doubt.status || "Open"}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {doubt.message ||
                          doubt.question ||
                          "No message provided."}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Student:{" "}
                        {doubt.student?.name ||
                          doubt.studentName ||
                          "Student"}
                        {" · "}
                        {doubt.batch?.batch ||
                          doubt.batchName ||
                          "Batch"}
                      </p>

                      {Array.isArray(doubt.replies) &&
                        doubt.replies.length > 0 && (
                          <div className="mt-3 rounded-lg bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Previous replies
                            </p>

                            {doubt.replies.slice(-2).map((reply, replyIndex) => (
                              <p
                                key={reply._id || replyIndex}
                                className="mb-2 whitespace-pre-wrap text-sm text-slate-700 last:mb-0"
                              >
                                <span className="font-semibold">
                                  {reply.trainer?.name || "Trainer"}:
                                </span>{" "}
                                {reply.message}
                              </p>
                            ))}
                          </div>
                        )}

                      {isOpen && (
                        <form
                          onSubmit={(event) =>
                            handleDoubtReply(event, doubtId)
                          }
                          className="mt-4 space-y-2"
                        >
                          <textarea
                            rows={2}
                            value={replyMessages[doubtId] || ""}
                            onChange={(event) =>
                              setReplyMessages((previous) => ({
                                ...previous,
                                [doubtId]: event.target.value,
                              }))
                            }
                            placeholder="Write your reply..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />

                          <button
                            type="submit"
                            disabled={busyDoubt === doubtId || !doubtId}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#102e60] px-3 py-2 text-sm font-semibold text-white hover:bg-[#173d79] disabled:opacity-50"
                          >
                            <Send size={14} />
                            {busyDoubt === doubtId
                              ? "Sending..."
                              : "Send Reply"}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Quick actions */}
        <section className="rounded-2xl bg-[#102e60] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-blue-200">
                <Activity size={19} />
                <span className="text-sm font-medium">
                  Trainer workspace
                </span>
              </div>

              <h2 className="mt-3 text-xl font-bold">
                Keep your batches on track
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                Record student attendance, review submissions, and update
                assignment results from one place.
              </p>
            </div>

            <Link
              href="/trainer/attendance-grading"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#102e60] hover:bg-blue-50"
            >
              Open Attendance & Grading
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
