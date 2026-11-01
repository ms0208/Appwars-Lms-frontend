
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  MessageCircleQuestion,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const DEFAULT_COURSES = [
  "MERN Stack",
  "Full Stack Development",
  "Next.js",
  "Java",
  "Python",
  "AWS Cloud Computing",
  "DevOps",
  "Software Testing",
];

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
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
      message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

function extractArray(response, keys) {
  if (Array.isArray(response)) return response;

  if (!response || typeof response !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(response[key])) return response[key];
  }

  if (response.data) {
    if (Array.isArray(response.data)) return response.data;

    for (const key of keys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key];
      }
    }
  }

  return [];
}

export default function DoubtsNotificationsPage() {
  const [discussions, setDiscussions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState(DEFAULT_COURSES);

  const [course, setCourse] = useState("MERN Stack");
  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Load discussions, notifications, and courses from backend.
  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Please sign in to view your doubts and notifications."
        );
      }

      // Verify the logged-in user.
      await apiRequest("/api/student/profile");

      const results = await Promise.allSettled([
        apiRequest("/api/student/doubts"),
        apiRequest("/api/student/notifications"),
        apiRequest("/api/student/courses"),
      ]);

      const [doubtsResult, notificationsResult, coursesResult] = results;

      if (doubtsResult.status === "fulfilled") {
        setDiscussions(
          extractArray(doubtsResult.value, [
            "doubts",
            "discussions",
            "questions",
          ])
        );
      } else {
        setDiscussions([]);
      }

      if (notificationsResult.status === "fulfilled") {
        setNotifications(
          extractArray(notificationsResult.value, ["notifications"])
        );
      } else {
        setNotifications([]);
      }

      if (coursesResult.status === "fulfilled") {
        const courseData = extractArray(coursesResult.value, ["courses"]);

        if (courseData.length > 0) {
          const courseNames = courseData
            .map((item) =>
              typeof item === "string"
                ? item
                : item.courseName || item.name || item.title
            )
            .filter(Boolean);

          if (courseNames.length > 0) {
            setCourses(courseNames);
            setCourse((current) =>
              courseNames.includes(current) ? current : courseNames[0]
            );
          }
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load page data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Submit a new doubt to the backend.
  async function postDoubt(event) {
    event.preventDefault();

    const trimmed = question.trim();

    if (!trimmed) {
      setError("Please enter your question.");
      return;
    }

    setPosting(true);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest("/api/student/doubts", {
        method: "POST",
        body: JSON.stringify({
          title: trimmed,
          question: trimmed,
          course,
          courseName: course,
        }),
      });

      const createdDoubt =
        response?.doubt ||
        response?.data?.doubt ||
        response?.data ||
        null;

      if (createdDoubt && typeof createdDoubt === "object") {
        setDiscussions((current) => [
          createdDoubt,
          ...current.filter(
            (item) =>
              item._id !== createdDoubt._id &&
              item.id !== createdDoubt.id
          ),
        ]);
      } else {
        // If the API doesn't return the created doubt, reload the list.
        await loadPageData();
      }

      setQuestion("");
      setNotice("Your question has been posted successfully.");
    } catch (err) {
      setError(err.message || "Failed to post your question.");
    } finally {
      setPosting(false);
    }
  }

  function getDiscussionTitle(item) {
    return item.title || item.question || item.subject || "Untitled question";
  }

  function getDiscussionCourse(item) {
    if (typeof item.course === "object" && item.course !== null) {
      return (
        item.course.courseName ||
        item.course.name ||
        item.course.title ||
        "Course"
      );
    }

    return (
      item.courseName ||
      item.course ||
      item.detail ||
      "Course"
    );
  }

  function getReplyCount(item) {
    if (Array.isArray(item.replies)) return item.replies.length;

    if (typeof item.replies === "number") return item.replies;

    if (Array.isArray(item.answers)) return item.answers.length;

    return Number(item.replyCount ?? item.answersCount ?? 0);
  }

  function getDiscussionStatus(item) {
    const status = item.status || item.doubtStatus || "Open";
    const normalized = String(status).toLowerCase();

    if (
      normalized === "answered" ||
      normalized === "resolved" ||
      normalized === "closed"
    ) {
      return "Answered";
    }

    return "Open";
  }

  function getNotificationType(item) {
    return (
      item.type ||
      item.category ||
      item.notificationType ||
      "Notice"
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-7">
      {/* Page Header */}
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">
            Doubts &amp; Notifications
          </h1>

          <p className="text-xs text-slate-500">
            Course-based discussion and reminders
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            document.getElementById("ask-a-doubt")?.focus()
          }
          className="flex items-center justify-center gap-2 self-start rounded-md bg-[#2864ed] px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700 sm:self-auto"
        >
          <MessageCircleQuestion size={14} />
          Ask a doubt
        </button>
      </header>

      {/* Success Message */}
      {notice && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800"
        >
          <CheckCircle2 size={15} />
          {notice}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Refresh */}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={loadPageData}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-[#17345f] hover:bg-blue-50 disabled:opacity-60"
        >
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#d9e6ff] bg-white p-10 text-center">
          <RefreshCw
            size={25}
            className="mx-auto mb-3 animate-spin text-[#2864ed]"
          />
          <p className="text-sm text-slate-500">
            Loading your doubts and notifications...
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-[1.4fr_0.95fr]">
          {/* Discussion Forum */}
          <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-[#17345f]">
              Discussion Forum
            </h2>

            {discussions.length === 0 ? (
              <div className="py-8 text-center">
                <MessageCircleQuestion
                  size={26}
                  className="mx-auto mb-2 text-slate-400"
                />

                <p className="text-sm font-medium text-slate-600">
                  No discussions yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Post your first question using the form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {discussions.map((item, index) => {
                  const id = item._id || item.id || index;
                  const status = getDiscussionStatus(item);
                  const replies = getReplyCount(item);

                  return (
                    <article
                      key={id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-1"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words text-xs font-bold text-[#17345f]">
                          {getDiscussionTitle(item)}
                        </h3>

                        <p className="mt-1 text-[11px] text-slate-500">
                          {getDiscussionCourse(item)} · {replies}{" "}
                          {replies === 1 ? "reply" : "replies"}
                        </p>

                        {item.createdAt && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          status === "Answered"
                            ? "bg-[#2864ed] text-white"
                            : "bg-sky-100 text-[#214d80]"
                        }`}
                      >
                        {status}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Ask a Doubt */}
          <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-[#17345f]">
              Ask in a Course
            </h2>

            <form onSubmit={postDoubt} className="space-y-3">
              <label className="block text-xs font-semibold text-[#17345f]">
                Course

                <select
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-md border border-[#cfe0ff] bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500"
                >
                  {courses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-[#17345f]">
                Your Question

                <textarea
                  id="ask-a-doubt"
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    setNotice("");
                  }}
                  rows={3}
                  required
                  maxLength={300}
                  placeholder="Type your question..."
                  className="mt-1.5 w-full resize-y rounded-md border border-[#cfe0ff] px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500"
                />

                <span className="mt-1 block text-right font-normal text-slate-400">
                  {question.length}/300
                </span>
              </label>

              <button
                type="submit"
                disabled={posting || !question.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2864ed] px-3 py-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {posting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}

                {posting ? "Posting..." : "Post Doubt"}
              </button>
            </form>
          </section>

          {/* Notifications */}
          <section className="rounded-xl border border-[#d9e6ff] bg-white p-4 xl:col-span-2">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#17345f]">
              <Bell size={15} />
              Notifications
            </h2>

            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell
                  size={25}
                  className="mx-auto mb-2 text-slate-400"
                />

                <p className="text-sm font-medium text-slate-600">
                  No notifications available
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your class, assignment, test, and payment reminders will
                  appear here when provided by the backend.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((item, index) => {
                  const id = item._id || item.id || index;
                  const title =
                    item.title ||
                    item.subject ||
                    item.message ||
                    "Notification";

                  const detail =
                    item.detail ||
                    item.description ||
                    item.content ||
                    "";

                  const type = getNotificationType(item);

                  return (
                    <article
                      key={id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words text-xs font-bold text-[#17345f]">
                          {title}
                        </h3>

                        {detail && (
                          <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-500">
                            {detail}
                          </p>
                        )}

                        {item.createdAt && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold text-[#214d80]">
                        {type}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
