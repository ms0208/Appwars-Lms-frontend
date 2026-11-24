"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Upload,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  UserRound,
  X,
  CheckCircle2,
  Clock,
  LockKeyhole,
  AlertCircle,
  FileText,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const ASSIGNMENTS_ENDPOINT = "/api/student/resources";

// ======================================================
// HELPERS
// ======================================================

function normalizeStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "complete" || normalized === "completed") {
    return "Complete";
  }

  if (normalized === "pending") {
    return "Pending";
  }

  if (
    normalized === "not access" ||
    normalized === "not-access" ||
    normalized === "no access" ||
    normalized === "locked"
  ) {
    return "Not Access";
  }

  return "Not Access";
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
}

function getObjectValue(value, fields = []) {
  if (!value) return "";

  if (typeof value === "string") return value;

  for (const field of fields) {
    if (value[field]) return value[field];
  }

  return "";
}

function getTrainerProgressStatus(item) {
  const progress =
    item.assignmentProgress ||
    item.progress ||
    item.studentProgress ||
    item.trainerProgress ||
    {};

  const directStatus =
    item.progressStatus ||
    item.trainerStatus ||
    item.assignmentStatus ||
    item.studentAssignmentStatus;

  const nestedStatus =
    progress.status ||
    progress.progressStatus ||
    progress.assignmentStatus;

  return normalizeStatus(directStatus || nestedStatus || "Not Access");
}

function getSubmission(item) {
  return (
    item.submission ||
    item.studentSubmission ||
    item.submissions?.[0] ||
    {}
  );
}

function getSubmissionStatus(item, submission) {
  return (
    submission.result ||
    submission.status ||
    item.submissionStatus ||
    item.studentSubmissionStatus ||
    ""
  );
}

function getBatch(item) {
  return getObjectValue(item.batch, [
    "batch",
    "batchName",
    "name",
  ]);
}

function getTrainer(item) {
  return getObjectValue(item.trainer, [
    "name",
    "fullName",
    "trainerName",
  ]);
}

function getAttachment(item) {
  return (
    item.attachmentUrl ||
    item.fileUrl ||
    item.attachment?.url ||
    item.document ||
    ""
  );
}

function getFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return "";

  const value = fileUrl.trim();

  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  return `${API_URL}/${value.replace(/^\/+/, "")}`;
}

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

function isOverdue(assignment) {
  if (!assignment.dueDate) return false;

  const dueDate = new Date(assignment.dueDate).getTime();

  return dueDate < Date.now() && !assignment.isSubmitted;
}

function isSubmitted(assignment) {
  const submission = assignment.submission || {};

  const submissionStatus = String(
    assignment.submissionStatus || ""
  ).toLowerCase();

  return Boolean(
    submission._id ||
      submission.submittedAt ||
      submission.submissionUrl ||
      submission.answerText ||
      submissionStatus === "submitted" ||
      submissionStatus === "graded" ||
      submissionStatus === "needs revision"
  );
}

// ======================================================
// STATUS STYLES
// ======================================================

function getProgressStatusStyle(status) {
  switch (normalizeStatus(status)) {
    case "Complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getProgressStatusIcon(status) {
  switch (normalizeStatus(status)) {
    case "Complete":
      return <CheckCircle2 size={13} />;

    case "Pending":
      return <Clock size={13} />;

    default:
      return <LockKeyhole size={13} />;
  }
}

function getSubmissionStatusStyle(status) {
  switch (String(status || "").toLowerCase()) {
    case "submitted":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "graded":
      return "bg-purple-50 text-purple-700 border-purple-100";

    case "needs revision":
      return "bg-orange-50 text-orange-700 border-orange-100";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [submittingId, setSubmittingId] = useState(null);

  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");

  // ======================================================
  // AUTH TOKEN
  // ======================================================

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;

    return (
      sessionStorage.getItem("appwars_token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("appwars_token") ||
      localStorage.getItem("token")
    );
  }, []);

  // ======================================================
  // COMMON API REQUEST
  // ======================================================

  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in to access your assignments.");
      }

      const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,

          ...(options.body && !isFormData
            ? { "Content-Type": "application/json" }
            : {}),

          ...options.headers,
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            result.error ||
            `Request failed with status ${response.status}.`
        );
      }

      return result;
    },
    [getToken]
  );

  // ======================================================
  // FETCH ASSIGNMENTS
  // ======================================================

  const fetchAssignments = useCallback(async () => {
    try {
      setError("");

      const result = await apiRequest(ASSIGNMENTS_ENDPOINT);

      const data =
        result.assignments ||
        result.data?.assignments ||
        result.resources ||
        result.data?.resources ||
        result.data ||
        [];

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid assignment data received from server."
        );
      }

      const formattedAssignments = data.map((item) => {
        const submission = getSubmission(item);

        const progressStatus = getTrainerProgressStatus(item);

        const batch = getBatch(item);
        const trainer = getTrainer(item);

        const submissionStatus = getSubmissionStatus(
          item,
          submission
        );

        const assignment = {
          ...item,

          id: getId(item),

          title: item.title || "Untitled Assignment",

          description: item.description || "",

          instructions: item.instructions || "",

          batch: batch || "Batch not specified",

          trainer: trainer || "Trainer not specified",

          dueDate: item.dueDate || item.deadline || null,

          attachmentUrl: getAttachment(item),

          submission,

          progressStatus,

          submissionStatus,
        };

        assignment.isSubmitted = isSubmitted(assignment);

        return assignment;
      });

      setAssignments(formattedAssignments);
    } catch (err) {
      console.error("Fetch assignments:", err);

      setError(err.message || "Failed to fetch assignments.");
    }
  }, [apiRequest]);

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    async function loadAssignments() {
      setLoading(true);
      await fetchAssignments();
      setLoading(false);
    }

    loadAssignments();
  }, [fetchAssignments]);

  // ======================================================
  // REFRESH
  // ======================================================

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAssignments();
    setRefreshing(false);
  }

  // ======================================================
  // SUBMISSION PERMISSION
  // ======================================================

  function canSubmitAssignment(assignment) {
    const status = normalizeStatus(assignment.progressStatus);

    if (status === "Not Access") return false;
    if (status === "Complete") return false;
    if (assignment.isSubmitted) return false;
    if (isOverdue(assignment)) return false;

    return true;
  }

  function getActionLabel(assignment) {
    const status = normalizeStatus(assignment.progressStatus);

    if (status === "Not Access") return "Access Locked";
    if (status === "Complete") return "Assignment Complete";
    if (assignment.isSubmitted) return "Submitted";
    if (isOverdue(assignment)) return "Deadline Passed";

    return "Submit Work";
  }

  // ======================================================
  // OPEN SUBMISSION MODAL
  // ======================================================

  function openSubmissionForm(assignment) {
    if (!canSubmitAssignment(assignment)) {
      setError(
        "You cannot submit this assignment because it is locked, completed, submitted, or overdue."
      );
      return;
    }

    setSelectedAssignment(assignment);

    setAnswerText(
      assignment.submission?.answerText ||
        assignment.submission?.description ||
        ""
    );

    setSubmissionUrl(
      assignment.submission?.submissionUrl ||
        assignment.submission?.url ||
        ""
    );

    setError("");
    setNotice("");
  }

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  function closeSubmissionModal() {
    if (submittingId !== null) return;

    setSelectedAssignment(null);
    setAnswerText("");
    setSubmissionUrl("");
  }

  // ======================================================
  // SUBMIT ASSIGNMENT
  // ======================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedAssignment) return;

    const assignmentId = selectedAssignment.id;

    try {
      setSubmittingId(assignmentId);

      setError("");
      setNotice("");

      if (!answerText.trim() && !submissionUrl.trim()) {
        throw new Error(
          "Please enter your answer or provide a submission URL."
        );
      }

      if (!canSubmitAssignment(selectedAssignment)) {
        throw new Error(
          "Your trainer has locked or completed this assignment."
        );
      }

      const result = await apiRequest(
        `/api/student/assignments/${encodeURIComponent(
          assignmentId
        )}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            answerText: answerText.trim(),
            submissionUrl: submissionUrl.trim(),
          }),
        }
      );

      if (result.success === false) {
        throw new Error(
          result.message || "Assignment submission failed."
        );
      }

      setSelectedAssignment(null);
      setAnswerText("");
      setSubmissionUrl("");

      setNotice(
        result.message ||
          "Assignment submitted successfully to your trainer."
      );

      await fetchAssignments();
    } catch (err) {
      console.error("Submit assignment:", err);

      setError(err.message || "Unable to submit assignment.");
    } finally {
      setSubmittingId(null);
    }
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <main className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#102e60]">
                <ClipboardList size={21} />
              </div>

              <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                Student Learning Portal
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#102e60] sm:text-3xl">
              Assignments 
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              View your assignments, track trainer progress, check
              deadlines, and submit your work.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
          >
            <RefreshCw
              size={15}
              className={
                loading || refreshing ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* STATUS LEGEND */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Progress status guide
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} />
              Complete
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <Clock size={14} />
              Pending
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <LockKeyhole size={14} />
              Not Access
            </span>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-md p-1 transition hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
              />
              <span>{notice}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotice("")}
              className="rounded-md p-1 transition hover:bg-emerald-100"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ASSIGNMENTS CONTAINER */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* SECTION HEADER */}
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                My Assignments
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Assignments published for your batch
              </p>
            </div>

            {!loading && (
              <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {assignments.length}{" "}
                {assignments.length === 1 ? "Assignment" : "Assignments"}
              </span>
            )}
          </div>

          {/* DESKTOP TABLE HEADER */}
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(100px,0.7fr)_minmax(130px,0.8fr)_minmax(220px,1fr)] gap-5 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:grid">
            <span>Assignment Details</span>
            <span>Batch</span>
            <span>Deadline</span>
            <span>Progress & Action</span>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <RefreshCw
                  size={21}
                  className="animate-spin text-blue-600"
                />
              </div>

              <p className="text-sm font-semibold text-slate-700">
                Loading assignments...
              </p>

              <p className="text-xs text-slate-400">
                Please wait while we fetch your assignments.
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <ClipboardList
                  size={30}
                  className="text-slate-400"
                />
              </div>

              <h3 className="text-base font-bold text-slate-800">
                No assignments available
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Your trainer has not published any assignments for
                your batch yet. New assignments will appear here.
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
                Check Again
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignments.map((item) => {
                const submitted = item.isSubmitted;
                const overdue = isOverdue(item);

                const progressStatus = normalizeStatus(
                  item.progressStatus
                );

                const allowed = canSubmitAssignment(item);

                return (
                  <article
                    key={item.id}
                    className="grid gap-5 px-5 py-5 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(0,1.6fr)_minmax(100px,0.7fr)_minmax(130px,0.8fr)_minmax(220px,1fr)] lg:items-center"
                  >
                    {/* ASSIGNMENT DETAILS */}
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <ClipboardList size={19} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-bold leading-5 text-slate-800">
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-1">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <UserRound
                            size={13}
                            className="text-slate-400"
                          />
                          {item.trainer}
                        </span>

                        {item.attachmentUrl && (
                          <a
                            href={getFileUrl(item.attachmentUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                          >
                            <FileText size={13} />
                            View attachment
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* BATCH */}
                    <div className="flex items-center gap-2 lg:block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">
                        Batch
                      </span>

                      <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {item.batch}
                      </span>
                    </div>

                    {/* DEADLINE */}
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">
                        Deadline
                      </span>

                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={15}
                          className="mt-0.5 shrink-0 text-blue-500"
                        />

                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {formatDeadline(item.dueDate)}
                          </p>

                          {overdue && (
                            <span className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                              Deadline passed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PROGRESS / ACTION */}
                    <div className="flex flex-col items-start gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${getProgressStatusStyle(
                            progressStatus
                          )}`}
                        >
                          {getProgressStatusIcon(progressStatus)}
                          {progressStatus}
                        </span>

                        {submitted && item.submissionStatus && (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1.5 text-[10px] font-bold capitalize ${getSubmissionStatusStyle(
                              item.submissionStatus
                            )}`}
                          >
                            {item.submissionStatus}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!allowed}
                        onClick={() => openSubmissionForm(item)}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition sm:w-auto ${
                          allowed
                            ? "bg-[#102e60] text-white shadow-sm hover:bg-blue-900 hover:shadow"
                            : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                      >
                        {progressStatus === "Not Access" ? (
                          <LockKeyhole size={14} />
                        ) : progressStatus === "Complete" || submitted ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Upload size={14} />
                        )}

                        {getActionLabel(item)}
                      </button>
                    </div>

                    {/* MARKS / FEEDBACK */}
                    {submitted &&
                      (item.submission?.marks != null ||
                        item.submission?.marksObtained != null ||
                        item.submission?.feedback) && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-800 lg:col-span-full">
                          {(item.submission?.marks != null ||
                            item.submission?.marksObtained != null) && (
                            <p className="font-semibold">
                              Marks:{" "}
                              {item.submission?.marks ??
                                item.submission?.marksObtained}
                            </p>
                          )}

                          {item.submission?.feedback && (
                            <p className="mt-1 leading-5">
                              Feedback: {item.submission.feedback}
                            </p>
                          )}
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <p className="text-xs leading-5 text-slate-600">
            Assignment progress is managed by your trainer.
            Submission and grading information are displayed
            separately. Contact your trainer if an assignment is
            locked or you need clarification.
          </p>
        </div>
      </div>

      {/* ================================================== */}
      {/* STUDENT SUBMISSION MODAL */}
      {/* ================================================== */}

      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              submittingId === null
            ) {
              closeSubmissionModal();
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[#102e60]">
                    <Upload size={17} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-[#102e60]">
                      Submit Assignment
                    </h2>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Submit your work for trainer review
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeSubmissionModal}
                disabled={submittingId !== null}
                aria-label="Close submission form"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5 sm:p-6">
              {/* ASSIGNMENT TITLE */}
              <div>
                <h3 className="text-sm font-bold leading-6 text-slate-800">
                  {selectedAssignment.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Batch: {selectedAssignment.batch}
                </p>

                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${getProgressStatusStyle(
                      selectedAssignment.progressStatus
                    )}`}
                  >
                    {getProgressStatusIcon(
                      selectedAssignment.progressStatus
                    )}
                    {selectedAssignment.progressStatus}
                  </span>
                </div>
              </div>

              {/* INSTRUCTIONS */}
              {selectedAssignment.instructions && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-800">
                    Instructions
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedAssignment.instructions}
                  </p>
                </div>
              )}

              {/* DESCRIPTION */}
              {selectedAssignment.description && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assignment Details
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedAssignment.description}
                  </p>
                </div>
              )}

              {/* ANSWER TEXT */}
              <div>
                <label
                  htmlFor="answerText"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Your Answer
                </label>

                <textarea
                  id="answerText"
                  value={answerText}
                  onChange={(event) =>
                    setAnswerText(event.target.value)
                  }
                  rows={6}
                  placeholder="Write your answer or explain your project..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* SUBMISSION URL */}
              <div>
                <label
                  htmlFor="submissionUrl"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Project / GitHub URL
                </label>

                <input
                  id="submissionUrl"
                  type="url"
                  value={submissionUrl}
                  onChange={(event) =>
                    setSubmissionUrl(event.target.value)
                  }
                  placeholder="https://github.com/username/project"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Enter an answer, a project URL, or both.
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={submittingId !== null}
                onClick={closeSubmissionModal}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submittingId !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingId !== null ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Submit Assignment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}