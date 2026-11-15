
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Upload,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  UserRound,
  BookOpen,
  X,
  CheckCircle2,
  Clock,
  LockKeyhole,
  AlertCircle,
  FileText,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ASSIGNMENTS_ENDPOINT = "/api/student/resources";

const STATUS_OPTIONS = ["Pending", "Complete", "Not Access"];

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
  // Trainer's AssignmentProgress data may be nested in different fields.
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

function getCourse(item) {
  return getObjectValue(item.course, [
    "title",
    "courseName",
    "name",
    "code",
  ]);
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

  return (
    dueDate < Date.now() &&
    !assignment.isSubmitted
  );
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
      return "bg-green-50 text-green-700 border-green-200";

    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Not Access":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getProgressStatusIcon(status) {
  switch (normalizeStatus(status)) {
    case "Complete":
      return <CheckCircle2 size={13} />;

    case "Pending":
      return <Clock size={13} />;

    case "Not Access":
    default:
      return <LockKeyhole size={13} />;
  }
}

function getSubmissionStatusStyle(status) {
  switch (String(status || "").toLowerCase()) {
    case "submitted":
      return "bg-blue-50 text-blue-700";

    case "graded":
      return "bg-purple-50 text-purple-700";

    case "needs revision":
      return "bg-orange-50 text-orange-700";

    default:
      return "bg-slate-50 text-slate-600";
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
        throw new Error(
          "Please log in to access your assignments."
        );
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

        const course = getCourse(item);
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

          course: course || "Course not specified",

          batch: batch || "Batch not specified",

          trainer: trainer || "Trainer not specified",

          dueDate: item.dueDate || item.deadline || null,

          attachmentUrl: getAttachment(item),

          submission,

          // Trainer-managed progress
          progressStatus,

          // Student submission status
          submissionStatus,
        };

        assignment.isSubmitted = isSubmitted(assignment);

        return assignment;
      });

      setAssignments(formattedAssignments);
    } catch (err) {
      console.error("Fetch assignments:", err);

      setError(
        err.message || "Failed to fetch assignments."
      );
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
    const status = normalizeStatus(
      assignment.progressStatus
    );

    if (status === "Not Access") {
      return false;
    }

    if (status === "Complete") {
      return false;
    }

    if (assignment.isSubmitted) {
      return false;
    }

    if (isOverdue(assignment)) {
      return false;
    }

    return true;
  }

  function getActionLabel(assignment) {
    const status = normalizeStatus(
      assignment.progressStatus
    );

    if (status === "Not Access") {
      return "Access Locked";
    }

    if (status === "Complete") {
      return "Assignment Complete";
    }

    if (assignment.isSubmitted) {
      return "Submitted";
    }

    if (isOverdue(assignment)) {
      return "Deadline Passed";
    }

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

      // Recheck trainer progress before submitting.
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

      // Refresh assignment and submission details.
      await fetchAssignments();
    } catch (err) {
      console.error("Submit assignment:", err);

      setError(
        err.message || "Unable to submit assignment."
      );
    } finally {
      setSubmittingId(null);
    }
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <main className="p-4 sm:p-6 lg:p-7">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#102e60]">
            Assignments & Tests
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            View trainer assignments, track your progress,
            check deadlines, and submit your work.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={
              loading || refreshing ? "animate-spin" : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* STATUS EXPLANATION */}
      <div className="mt-5 flex flex-wrap gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
        <div className="flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 size={14} />
          <span>Complete</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-amber-700">
          <Clock size={14} />
          <span>Pending</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <LockKeyhole size={14} />
          <span>Not Access</span>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {notice && (
        <div
          role="status"
          className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{notice}</span>
          </div>

          <button
            type="button"
            onClick={() => setNotice("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ASSIGNMENT TABLE */}
      <div className="mt-5 overflow-hidden rounded-xl border border-blue-100">
        {/* DESKTOP HEADER */}
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto] gap-4 bg-blue-50 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 sm:grid">
          <span>Assignment</span>
          <span>Course / Batch</span>
          <span>Deadline</span>
          <span>Progress / Action</span>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <RefreshCw size={16} className="animate-spin" />

            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList
              size={35}
              className="mx-auto mb-3 text-slate-300"
            />

            <p className="text-sm font-semibold text-slate-700">
              No assignments available
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Your trainer has not published any assignments
              for your batch yet.
            </p>
          </div>
        ) : (
          assignments.map((item) => {
            const submitted = item.isSubmitted;
            const overdue = isOverdue(item);

            const progressStatus = normalizeStatus(
              item.progressStatus
            );

            const allowed = canSubmitAssignment(item);

            return (
              <div
                key={item.id}
                className="grid gap-3 border-t border-blue-50 p-4 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                {/* ASSIGNMENT DETAILS */}
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
                    <p className="mt-1 line-clamp-3 pl-6 text-xs text-slate-500">
                      {item.description}
                    </p>
                  )}

                  {/* TRAINER */}
                  <div className="mt-2 flex items-center gap-1 pl-6 text-xs text-slate-500">
                    <UserRound size={12} />

                    <span>Trainer: {item.trainer}</span>
                  </div>

                  {/* ATTACHMENT */}
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
                      <FileText size={12} />

                      View assignment attachment

                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* COURSE / BATCH */}
                <div className="space-y-2 text-xs text-slate-500">
                  <p className="flex items-center gap-1">
                    <BookOpen
                      size={13}
                      className="shrink-0 text-blue-500"
                    />

                    <span className="font-medium sm:hidden">
                      Course:
                    </span>

                    {item.course}
                  </p>

                  <p className="text-xs text-slate-500">
                    <span className="font-medium sm:hidden">
                      Batch:
                    </span>

                    {item.batch}
                  </p>
                </div>

                {/* DEADLINE */}
                <div className="text-xs text-slate-500">
                  <p className="flex items-center gap-1">
                    <CalendarDays
                      size={13}
                      className="shrink-0 text-blue-500"
                    />

                    <span className="font-medium sm:hidden">
                      Deadline:
                    </span>
                  </p>

                  <p className="mt-1">
                    {formatDeadline(item.dueDate)}
                  </p>

                  {overdue && (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
                      Overdue
                    </span>
                  )}
                </div>

                {/* PROGRESS / ACTION */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* TRAINER PROGRESS */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${getProgressStatusStyle(
                      progressStatus
                    )}`}
                  >
                    {getProgressStatusIcon(progressStatus)}

                    {progressStatus}
                  </span>

                  {/* SUBMISSION STATUS */}
                  {submitted && item.submissionStatus && (
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getSubmissionStatusStyle(
                        item.submissionStatus
                      )}`}
                    >
                      {item.submissionStatus}
                    </span>
                  )}

                  {/* ACTION BUTTON */}
                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => openSubmissionForm(item)}
                    className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      allowed
                        ? "border-blue-200 text-blue-700 hover:bg-blue-50"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    }`}
                  >
                    {progressStatus === "Not Access" ? (
                      <LockKeyhole size={13} />
                    ) : progressStatus === "Complete" ? (
                      <CheckCircle2 size={13} />
                    ) : submitted ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Upload size={13} />
                    )}

                    {getActionLabel(item)}
                  </button>
                </div>

                {/* MARKS / FEEDBACK */}
                {submitted &&
                  (item.submission?.marks != null ||
                    item.submission?.marksObtained != null ||
                    item.submission?.feedback) && (
                    <div className="text-xs text-green-700 sm:col-span-full">
                      {(item.submission?.marks != null ||
                        item.submission?.marksObtained != null) && (
                        <p>
                          Marks:{" "}
                          {item.submission?.marks ??
                            item.submission?.marksObtained}
                        </p>
                      )}

                      {item.submission?.feedback && (
                        <p className="mt-1">
                          Feedback: {item.submission.feedback}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            );
          })
        )}
      </div>

      {/* ================================================== */}
      {/* STUDENT SUBMISSION MODAL */}
      {/* ================================================== */}

      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#102e60]">
                Submit Assignment
              </h2>

              <button
                type="button"
                onClick={closeSubmissionModal}
                disabled={submittingId !== null}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* ASSIGNMENT TITLE */}
            <p className="mt-1 text-sm font-medium text-slate-700">
              {selectedAssignment.title}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Batch: {selectedAssignment.batch}
            </p>

            {/* PROGRESS STATUS */}
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getProgressStatusStyle(
                  selectedAssignment.progressStatus
                )}`}
              >
                {getProgressStatusIcon(
                  selectedAssignment.progressStatus
                )}

                {selectedAssignment.progressStatus}
              </span>
            </div>

            {/* INSTRUCTIONS */}
            {selectedAssignment.instructions && (
              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
                <p className="mb-1 font-semibold">
                  Instructions
                </p>

                {selectedAssignment.instructions}
              </div>
            )}

            {/* DESCRIPTION */}
            {selectedAssignment.description && (
              <div className="mt-3 rounded-lg border border-slate-100 p-3 text-sm text-slate-600">
                {selectedAssignment.description}
              </div>
            )}

            {/* ANSWER TEXT */}
            <label
              htmlFor="answerText"
              className="mt-4 block text-sm font-semibold text-slate-700"
            >
              Your Answer
            </label>

            <textarea
              id="answerText"
              value={answerText}
              onChange={(event) =>
                setAnswerText(event.target.value)
              }
              rows={5}
              placeholder="Enter your answer here..."
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />

            {/* SUBMISSION URL */}
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
              onChange={(event) =>
                setSubmissionUrl(event.target.value)
              }
              placeholder="https://github.com/username/project"
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Enter an answer, a URL, or both.
            </p>

            {/* BUTTONS */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={submittingId !== null}
                onClick={closeSubmissionModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submittingId !== null}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingId !== null && (
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />
                )}

                {submittingId !== null
                  ? "Submitting..."
                  : "Submit Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FOOTER */}
      <p className="mt-4 text-xs text-slate-500">
        Assignment progress is managed by your trainer.
        Submission and grading information are displayed separately.
      </p>
    </main>
  );
}
