"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Upload,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("token");
  };

  const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Please log in to access your assignments.");
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message ||
          result.error ||
          `Request failed with status ${response.status}.`
      );
    }

    return result;
  };

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await apiRequest("/api/studentassignments/assignments");

      const data =
        result.assignments ??
        result.data?.assignments ??
        [];

      if (!Array.isArray(data)) {
        throw new Error("Invalid assignment data received from the server.");
      }

      setAssignments(
        data.map((item, index) => {
          const submission = item.submission || {};

          let status =
            submission.status ||
            item.status ||
            item.submissionStatus ||
            "Pending";

          // Translate the backend's status into a user-friendly status.
          if (
            !submission.status &&
            ["Submitted", "Graded"].includes(status)
          ) {
            status = "Submitted";
          }

          if (
            !submission.status &&
            status === "Late"
          ) {
            status = "Overdue";
          }

          return {
            ...item,
            id: item._id || item.id || index,
            title: item.title || item.name || "Untitled assignment",
            course:
              item.courseName ||
              (typeof item.course === "object"
                ? item.course?.courseName ||
                  item.course?.name ||
                  item.course?.title
                : item.course) ||
              "Course not specified",
            dueDate: item.dueDate || item.deadline || item.due || null,
            status,
            submission,
            attachmentUrl: item.attachmentUrl || "",
            instructions: item.instructions || "",
            description: item.description || "",
          };
        })
      );
    } catch (err) {
      setError(err.message || "Failed to fetch assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  function formatDeadline(value) {
    if (!value) return "No deadline";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function isSubmitted(status) {
    return ["submitted", "graded"].includes(
      String(status).toLowerCase()
    );
  }

  function isOverdue(assignment) {
    if (!assignment.dueDate) return false;

    return (
      new Date(assignment.dueDate).getTime() < Date.now() &&
      !isSubmitted(assignment.status)
    );
  }

  function openSubmissionForm(assignment) {
    setSelectedAssignment(assignment);
    setAnswerText(assignment.submission?.answerText || "");
    setSubmissionUrl(assignment.submission?.submissionUrl || "");
    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedAssignment) return;

    try {
      setSubmittingId(selectedAssignment.id);
      setError("");
      setNotice("");

      if (!answerText.trim() && !submissionUrl.trim()) {
        throw new Error(
          "Please enter your answer or provide a submission URL."
        );
      }

      const result = await apiRequest(
        `/api/student/assignments/${encodeURIComponent(
          selectedAssignment.id
        )}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            answerText: answerText.trim(),
            submissionUrl: submissionUrl.trim(),
          }),
        }
      );

      const submission = result.submission || {};

      setAssignments((current) =>
        current.map((item) =>
          item.id === selectedAssignment.id
            ? {
                ...item,
                status: submission.status || "Submitted",
                submission,
              }
            : item
        )
      );

      setSelectedAssignment(null);
      setAnswerText("");
      setSubmissionUrl("");
      setNotice(result.message || "Assignment submitted successfully.");
    } catch (err) {
      setError(err.message || "Unable to submit assignment.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-7">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#102e60]">
            Assignments & Tests
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            View assignments, check deadlines, and submit your work.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAssignments}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {notice}
        </div>
      )}

      {/* Assignment list */}
      <div className="mt-5 overflow-hidden rounded-xl border border-blue-100">
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto] gap-4 bg-blue-50 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 sm:grid">
          <span>Assignment</span>
          <span>Course</span>
          <span>Deadline</span>
          <span>Status / Action</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <RefreshCw size={16} className="animate-spin" />
            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No assignments have been assigned to you yet.
          </p>
        ) : (
          assignments.map((item) => {
            const submitted = isSubmitted(item.status);
            const overdue = isOverdue(item);
            const submitting = submittingId === item.id;

            return (
              <div
                key={item.id}
                className="grid gap-3 border-t border-blue-50 p-4 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardList
                      size={17}
                      className="shrink-0 text-blue-600"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-1 pl-6 text-xs text-slate-500">
                      {item.description}
                    </p>
                  )}

                  {item.attachmentUrl && (
                    <a
                      href={
                        item.attachmentUrl.startsWith("http")
                          ? item.attachmentUrl
                          : `${API_URL}${item.attachmentUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 pl-6 text-xs font-medium text-blue-600 hover:underline"
                    >
                      View attachment
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  <span className="font-medium sm:hidden">Course: </span>
                  {item.course}
                </p>

                <p className="text-xs text-slate-500">
                  <span className="font-medium sm:hidden">Deadline: </span>
                  {formatDeadline(item.dueDate)}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      submitted
                        ? "bg-green-50 text-green-700"
                        : overdue
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {overdue ? "Overdue" : item.status}
                  </span>

                  {!submitted && (
                    <button
                      type="button"
                      disabled={submitting || overdue}
                      onClick={() => openSubmissionForm(item)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={13} />
                      Submit work
                    </button>
                  )}
                </div>

                {submitted && item.submission?.marksObtained != null && (
                  <p className="text-xs text-green-700 sm:col-span-full">
                    Marks: {item.submission.marksObtained}
                    {item.submission.feedback
                      ? ` — ${item.submission.feedback}`
                      : ""}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Submission form */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-[#102e60]">
              Submit Assignment
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {selectedAssignment.title}
            </p>

            {selectedAssignment.instructions && (
              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
                {selectedAssignment.instructions}
              </div>
            )}

            <label
              htmlFor="answerText"
              className="mt-4 block text-sm font-semibold text-slate-700"
            >
              Your answer
            </label>

            <textarea
              id="answerText"
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              rows={5}
              placeholder="Enter your answer here..."
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />

            <label
              htmlFor="submissionUrl"
              className="mt-4 block text-sm font-semibold text-slate-700"
            >
              Project / GitHub URL
            </label>

            <input
              id="submissionUrl"
              type="url"
              value={submissionUrl}
              onChange={(event) => setSubmissionUrl(event.target.value)}
              placeholder="https://github.com/username/project"
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Enter an answer, a URL, or both. Your submission will be saved
              after the server confirms it.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={submittingId !== null}
                onClick={() => setSelectedAssignment(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submittingId !== null}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingId !== null && (
                  <RefreshCw size={14} className="animate-spin" />
                )}
                {submittingId !== null ? "Submitting..." : "Submit assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Assignments and submission statuses are retrieved from your authenticated
        student account. Submission changes are saved only after backend
        confirmation.
      </p>
    </main>
  );
}