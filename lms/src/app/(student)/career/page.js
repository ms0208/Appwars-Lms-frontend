
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Target,
  Code2,
  Video,
  FolderKanban,
  FileText,
  Upload,
  RefreshCw,
  CalendarDays,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  BookOpen,
  Clock,
  Globe,
  Award,
  MessageSquare,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// ------------------------------------------------------
// API HELPERS
// ------------------------------------------------------

function token() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

async function api(endpoint, options = {}) {
  const isForm =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token()
        ? { Authorization: `Bearer ${token()}` }
        : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  const contentType =
    response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        (typeof data === "string" ? data : "") ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

// ------------------------------------------------------
// RESUME FILE URL HELPER
// Always serves uploaded files from the backend.
// ------------------------------------------------------

function getFileUrl(filePath) {
  if (!filePath) return "";

  const value = String(filePath).trim();

  if (!value) return "";

  // Already a complete URL
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);

      // Correct old frontend-hosted upload URLs.
      if (
        ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
        parsed.port === "3000" &&
        parsed.pathname.startsWith("/uploads/")
      ) {
        return `${API}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return value;
    } catch {
      return value;
    }
  }

  // Convert relative upload path to backend URL.
  const normalizedPath = value.replace(/^\/+/, "");

  return `${API}/${normalizedPath}`;
}

// ------------------------------------------------------
// RESPONSE HELPERS
// ------------------------------------------------------

function findValue(data, keys, depth = 0) {
  if (!data || typeof data !== "object" || depth > 5) {
    return undefined;
  }

  for (const key of keys) {
    if (
      data[key] !== undefined &&
      data[key] !== null
    ) {
      return data[key];
    }
  }

  if (data.data && typeof data.data === "object") {
    const result = findValue(data.data, keys, depth + 1);

    if (result !== undefined) return result;
  }

  if (data.result && typeof data.result === "object") {
    const result = findValue(data.result, keys, depth + 1);

    if (result !== undefined) return result;
  }

  return undefined;
}

function getArray(data, keys) {
  if (Array.isArray(data)) return data;

  const value = findValue(data, keys);

  return Array.isArray(value) ? value : [];
}

function getObject(data, keys) {
  const value = findValue(data, keys);

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  if (
    data?.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    return data.data;
  }

  return null;
}

function normalizeStatus(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

function normalizeType(value) {
  const type = normalizeStatus(value);

  if (
    ["aptitude", "aptitude_test", "mcq"].includes(type)
  ) {
    return "aptitude";
  }

  if (
    ["coding", "dsa", "programming", "coding_challenge"].includes(type)
  ) {
    return "coding";
  }

  return type;
}

function isApproved(status) {
  return ["approved", "completed", "selected"].includes(
    normalizeStatus(status)
  );
}

function isSubmitted(status) {
  return [
    "submitted",
    "under_review",
    "approved",
    "completed",
    "rejected",
    "revision_required",
  ].includes(normalizeStatus(status));
}

function pct(value) {
  return Math.max(
    0,
    Math.min(100, Number(value) || 0)
  );
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status) {
  const s = normalizeStatus(status);

  if (
    ["approved", "completed", "selected"].includes(s)
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    [
      "pending",
      "submitted",
      "scheduled",
      "upcoming",
      "under_review",
    ].includes(s)
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    [
      "rejected",
      "revision",
      "revision_required",
      "cancelled",
    ].includes(s)
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

function getTaskStatus(task) {
  return (
    task?.submission?.status ||
    task?.submissionStatus ||
    task?.status ||
    "Not submitted"
  );
}

// ------------------------------------------------------
// SHARED COMPONENTS
// ------------------------------------------------------

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2864ed] focus:ring-2 focus:ring-blue-100";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Empty({
  icon: Icon = BookOpen,
  title,
  text,
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <Icon
        className="mx-auto mb-2 text-slate-400"
        size={28}
      />

      <p className="text-sm font-semibold text-slate-600">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {text}
      </p>
    </div>
  );
}

function Progress({
  label,
  value,
  detail,
  icon: Icon,
}) {
  const n = pct(value);

  return (
    <div className="rounded-xl border border-[#dce7f7] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
          <Icon size={20} />
        </div>

        <span className="text-xl font-bold text-[#17345f]">
          {Math.round(n)}%
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-[#17345f]">
        {label}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#2864ed] transition-all duration-500"
          style={{ width: `${n}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
        status
      )}`}
    >
      {String(status || "Pending").replace(/_/g, " ")}
    </span>
  );
}

// ------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------

export default function CareerPlacementPage() {
  const [tab, setTab] = useState("overview");

  const [career, setCareer] = useState({});
  const [tasks, setTasks] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [resume, setResume] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Assignment modal
  const [activeTask, setActiveTask] = useState(null);
  const [taskAnswers, setTaskAnswers] = useState({});
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [githubUrl, setGithubUrl] = useState("");

  // Project modal
  const [activeProject, setActiveProject] = useState(null);

  const [projectForm, setProjectForm] = useState({
    githubUrl: "",
    liveUrl: "",
    submissionNotes: "",
  });

  // ----------------------------------------------------
  // LOAD ALL CAREER DATA
  // ----------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const endpoints = [
      "/api/student/career",
      "/api/student/career/tasks",
      "/api/student/mock-interviews",
      "/api/student/portfolio-projects",
      "/api/student/resume",
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map((endpoint) => api(endpoint))
      );

      const [
        careerResult,
        taskResult,
        interviewResult,
        projectResult,
        resumeResult,
      ] = results;

      let loaded = 0;
      const failed = [];

      if (careerResult.status === "fulfilled") {
        const value = getObject(careerResult.value, [
          "career",
          "overview",
        ]);

        setCareer(value || {});
        loaded++;
      } else {
        failed.push("Career overview");
      }

      if (taskResult.status === "fulfilled") {
        setTasks(
          getArray(taskResult.value, [
            "tasks",
            "careerTasks",
            "assignments",
          ])
        );
        loaded++;
      } else {
        failed.push("Assignments");
      }

      if (interviewResult.status === "fulfilled") {
        setInterviews(
          getArray(interviewResult.value, [
            "interviews",
            "mockInterviews",
          ])
        );
        loaded++;
      } else {
        failed.push("Mock interviews");
      }

      if (projectResult.status === "fulfilled") {
        setProjects(
          getArray(projectResult.value, [
            "projects",
            "portfolioProjects",
          ])
        );
        loaded++;
      } else {
        failed.push("Portfolio projects");
      }

      if (resumeResult.status === "fulfilled") {
        setResume(
          getObject(resumeResult.value, ["resume"])
        );
        loaded++;
      } else {
        failed.push("Resume");
      }

      if (loaded === 0) {
        throw careerResult.status === "rejected"
          ? careerResult.reason
          : new Error("Unable to load career information.");
      }

      if (failed.length) {
        setError(
          `${failed.join(", ")} could not be loaded. Check the corresponding backend API endpoints.`
        );
      }
    } catch (e) {
      setError(
        e.message || "Unable to load career information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ----------------------------------------------------
  // DERIVED DATA
  // ----------------------------------------------------

  const aptitudeTasks = useMemo(
    () =>
      tasks.filter(
        (task) => normalizeType(task.type) === "aptitude"
      ),
    [tasks]
  );

  const codingTasks = useMemo(
    () =>
      tasks.filter(
        (task) => normalizeType(task.type) === "coding"
      ),
    [tasks]
  );

  const completedInterviews = useMemo(
    () =>
      interviews.filter(
        (item) =>
          normalizeStatus(item.status) === "completed"
      ).length,
    [interviews]
  );

  const approvedProjects = useMemo(
    () =>
      projects.filter((item) => isApproved(item.status)).length,
    [projects]
  );

  // ----------------------------------------------------
  // PROGRESS CALCULATION
  // ----------------------------------------------------

  const progress = useMemo(() => {
    const calculate = (list) => {
      if (!list.length) return 0;

      const completed = list.filter((item) =>
        isApproved(getTaskStatus(item))
      ).length;

      return (completed / list.length) * 100;
    };

    const aptitude =
      career.aptitudeProgress ??
      career.aptitudePercentage ??
      calculate(aptitudeTasks);

    const coding =
      career.dsaProgress ??
      career.codingProgress ??
      career.dsaPercentage ??
      calculate(codingTasks);

    const interviewProgress =
      career.mockInterviewsCompleted !== undefined
        ? Number(career.mockInterviewsTotal) > 0
          ? (Number(career.mockInterviewsCompleted) /
              Number(career.mockInterviewsTotal)) *
            100
          : 0
        : interviews.length
          ? (completedInterviews / interviews.length) * 100
          : 0;

    const projectProgress =
      career.portfolioProjectsCompleted !== undefined
        ? Number(career.portfolioProjectsTotal) > 0
          ? (Number(career.portfolioProjectsCompleted) /
              Number(career.portfolioProjectsTotal)) *
            100
          : 0
        : projects.length
          ? (approvedProjects / projects.length) * 100
          : 0;

    return {
      aptitude: pct(aptitude),
      coding: pct(coding),
      interviews: pct(interviewProgress),
      projects: pct(projectProgress),
    };
  }, [
    career,
    aptitudeTasks,
    codingTasks,
    interviews,
    completedInterviews,
    approvedProjects,
  ]);

  // ----------------------------------------------------
  // CLEAR NOTIFICATIONS
  // ----------------------------------------------------

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  // ----------------------------------------------------
  // SUBMIT APTITUDE / CODING ASSIGNMENT
  // ----------------------------------------------------

  async function submitTask(e) {
    e.preventDefault();

    if (!activeTask?._id) return;

    const id = String(activeTask._id);

    setBusy(id);
    clearMessages();

    try {
      const type = normalizeType(activeTask.type);

      let body;

      if (type === "aptitude") {
        const questions = activeTask.questions || [];

        const missing = questions.some(
          (question, index) =>
            taskAnswers[question._id || index] === undefined
        );

        if (missing) {
          throw new Error(
            "Please answer all aptitude questions before submitting."
          );
        }

        body = {
          answer: taskAnswers,
        };
      } else {
        if (!code.trim()) {
          throw new Error("Please enter your coding solution.");
        }

        body = {
          code,
          language,
          githubUrl,
        };
      }

      await api(
        `/api/student/career/tasks/${id}/submit`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      setSuccess(
        "Your assignment has been submitted successfully."
      );

      setActiveTask(null);
      setTaskAnswers({});
      setCode("");
      setGithubUrl("");

      await load();
    } catch (e) {
      setError(
        e.message || "Unable to submit assignment."
      );
    } finally {
      setBusy("");
    }
  }

  // ----------------------------------------------------
  // SUBMIT PORTFOLIO PROJECT
  // ----------------------------------------------------

  async function submitProject(e) {
    e.preventDefault();

    if (!activeProject?._id) return;

    setBusy(String(activeProject._id));
    clearMessages();

    try {
      if (!projectForm.githubUrl.trim()) {
        throw new Error(
          "Please provide your GitHub repository URL."
        );
      }

      await api(
        `/api/student/portfolio-projects/${activeProject._id}/submit`,
        {
          method: "POST",
          body: JSON.stringify(projectForm),
        }
      );

      setSuccess(
        "Portfolio project submitted successfully."
      );

      setActiveProject(null);

      setProjectForm({
        githubUrl: "",
        liveUrl: "",
        submissionNotes: "",
      });

      await load();
    } catch (e) {
      setError(
        e.message || "Unable to submit project."
      );
    } finally {
      setBusy("");
    }
  }

  // ----------------------------------------------------
  // RESUME UPLOAD
  // ----------------------------------------------------

  async function uploadResume(e) {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    clearMessages();

    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError("Upload a PDF or DOCX resume.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must not exceed 5 MB.");
      return;
    }

    const formData = new FormData();

    formData.append("resume", file);

    setUploading(true);

    try {
      await api("/api/student/resume", {
        method: "POST",
        body: formData,
      });

      const refreshed = await api("/api/student/resume");

      setResume(
        getObject(refreshed, ["resume"])
      );

      setSuccess("Resume uploaded successfully.");
    } catch (e) {
      setError(
        e.message || "Resume upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  // ----------------------------------------------------
  // RESUME INFORMATION
  // ----------------------------------------------------

  const resumeName =
    resume?.originalName ||
    resume?.fileName ||
    resume?.filename ||
    resume?.name ||
    "";

  const resumeFilePath =
    resume?.url ||
    resume?.fileUrl ||
    resume?.resumeUrl ||
    resume?.filePath ||
    resume?.resumePath ||
    resume?.path ||
    resume?.file?.url ||
    resume?.file?.path ||
    "";

  const resumeUrl = getFileUrl(resumeFilePath);

  // ----------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------

  const nav = [
    ["overview", "Overview", GraduationCap],
    ["tasks", "Aptitude & Coding", Target],
    ["interviews", "Mock Interviews", Video],
    ["projects", "Portfolio Projects", FolderKanban],
    ["resume", "My Resume", FileText],
  ];

  // ----------------------------------------------------
  // OPEN ASSIGNMENT
  // ----------------------------------------------------

  function openTask(task) {
    setActiveTask(task);

    const existingAnswers =
      task.submission?.answer ||
      task.submission?.answers ||
      {};

    setTaskAnswers(existingAnswers);

    setCode(
      task.submission?.code ||
      task.starterCode ||
      ""
    );

    setGithubUrl(
      task.submission?.githubUrl || ""
    );

    const allowed = task.allowedLanguages?.length
      ? task.allowedLanguages
      : ["javascript", "python", "java"];

    setLanguage(
      allowed.includes(task.submission?.language)
        ? task.submission.language
        : allowed[0]
    );

    clearMessages();
  }

  // ----------------------------------------------------
  // OPEN PROJECT
  // ----------------------------------------------------

  function openProject(project) {
    setActiveProject(project);

    setProjectForm({
      githubUrl: project.githubUrl || "",
      liveUrl: project.liveUrl || "",
      submissionNotes: project.submissionNotes || "",
    });

    clearMessages();
  }

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2864ed]">
              <GraduationCap size={18} />
              Career Development
            </p>

            <h1 className="text-2xl font-bold text-[#17345f] sm:text-3xl">
              Career & Placement
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Prepare for placements, complete trainer assignments,
              practice interviews and build your professional portfolio.
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9e6ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#17345f] hover:bg-blue-50 disabled:opacity-60"
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
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* NAVIGATION */}

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-[#dce7f7] bg-white p-2">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                tab === id
                  ? "bg-[#17345f] text-white"
                  : "text-slate-600 hover:bg-blue-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="rounded-xl border border-[#dce7f7] bg-white p-12 text-center">
            <RefreshCw
              className="mx-auto mb-3 animate-spin text-[#2864ed]"
              size={28}
            />

            <p className="text-sm text-slate-500">
              Loading career dashboard...
            </p>
          </div>
        ) : (
          <>

            {/* =========================================
                OVERVIEW
            ========================================= */}

            {tab === "overview" && (
              <>
                <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <Progress
                    label="Aptitude Progress"
                    value={progress.aptitude}
                    detail={`${aptitudeTasks.length} assigned tasks`}
                    icon={Target}
                  />

                  <Progress
                    label="Coding & DSA Progress"
                    value={progress.coding}
                    detail={`${codingTasks.length} coding challenges`}
                    icon={Code2}
                  />

                  <Progress
                    label="Mock Interviews"
                    value={progress.interviews}
                    detail={`${completedInterviews} completed`}
                    icon={Video}
                  />

                  <Progress
                    label="Portfolio Projects"
                    value={progress.projects}
                    detail={`${approvedProjects} approved`}
                    icon={FolderKanban}
                  />

                </section>

                <div className="grid gap-6 lg:grid-cols-3">

                  {/* ASSIGNMENTS */}

                  <section className="rounded-xl border border-[#dce7f7] bg-white p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#17345f]">
                        Recent Career Assignments
                      </h2>

                      <button
                        onClick={() => setTab("tasks")}
                        className="text-xs font-semibold text-[#2864ed] hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    {tasks.length ? (
                      <div className="space-y-3">
                        {tasks.slice(0, 5).map((task) => (
                          <div
                            key={task._id}
                            className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-semibold text-[#17345f]">
                                {task.title}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {normalizeType(task.type).toUpperCase()}
                                {" · "}
                                {task.topic || "General"}
                                {" · "}
                                {task.difficulty || "—"}
                              </p>
                            </div>

                            <StatusBadge
                              status={getTaskStatus(task)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="No assignments yet"
                        text="Your trainer's aptitude and coding assignments will appear here."
                      />
                    )}
                  </section>

                  {/* RESUME SUMMARY */}

                  <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                    <h2 className="mb-4 text-base font-bold text-[#17345f]">
                      Resume Status
                    </h2>

                    {resumeName ? (
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="break-all text-sm font-semibold text-green-800">
                          {resumeName}
                        </p>

                        <p className="mt-2 text-xs text-green-700">
                          Review: {resume.reviewStatus || "Pending review"}
                        </p>

                        {resumeUrl && (
                          <a
                            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-green-800 underline"
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View resume
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <Empty
                        icon={FileText}
                        title="Resume not uploaded"
                        text="Upload your latest resume to get trainer feedback."
                      />
                    )}

                    <button
                      onClick={() => setTab("resume")}
                      className="mt-4 w-full rounded-lg bg-[#2864ed] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Manage Resume
                    </button>
                  </section>

                </div>

                {/* ADDITIONAL SUMMARY */}

                <section className="mt-6 grid gap-4 md:grid-cols-2">

                  <div className="rounded-xl border border-[#dce7f7] bg-white p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-3 text-[#2864ed]">
                        <Video size={20} />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#17345f]">
                          Upcoming Interviews
                        </h3>

                        <p className="text-xs text-slate-500">
                          Your next scheduled sessions
                        </p>
                      </div>
                    </div>

                    {interviews.filter(
                      (item) =>
                        normalizeStatus(item.status) === "scheduled" ||
                        normalizeStatus(item.status) === "upcoming"
                    ).length ? (
                      <div className="mt-4 space-y-3">
                        {interviews
                          .filter((item) =>
                            ["scheduled", "upcoming"].includes(
                              normalizeStatus(item.status)
                            )
                          )
                          .slice(0, 3)
                          .map((item) => (
                            <div
                              key={item._id}
                              className="rounded-lg bg-slate-50 p-3"
                            >
                              <p className="text-sm font-semibold text-[#17345f]">
                                {item.title || "Mock Interview"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(item.scheduledAt)}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">
                        No upcoming interviews.
                      </p>
                    )}

                    <button
                      onClick={() => setTab("interviews")}
                      className="mt-4 text-xs font-semibold text-[#2864ed]"
                    >
                      View interviews →
                    </button>
                  </div>

                  <div className="rounded-xl border border-[#dce7f7] bg-white p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                        <Award size={20} />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#17345f]">
                          Portfolio Overview
                        </h3>

                        <p className="text-xs text-slate-500">
                          Your project submission progress
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 p-3 text-center">
                        <p className="text-xl font-bold text-[#17345f]">
                          {projects.length}
                        </p>
                        <p className="text-xs text-slate-500">
                          Assigned
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3 text-center">
                        <p className="text-xl font-bold text-amber-600">
                          {projects.filter((p) =>
                            isSubmitted(p.status)
                          ).length}
                        </p>
                        <p className="text-xs text-slate-500">
                          Submitted
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3 text-center">
                        <p className="text-xl font-bold text-green-600">
                          {approvedProjects}
                        </p>
                        <p className="text-xs text-slate-500">
                          Approved
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setTab("projects")}
                      className="mt-4 text-xs font-semibold text-[#2864ed]"
                    >
                      View projects →
                    </button>
                  </div>

                </section>
              </>
            )}

            {/* =========================================
                APTITUDE AND CODING
            ========================================= */}

            {tab === "tasks" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">

                <div className="mb-5">
                  <h2 className="text-lg font-bold text-[#17345f]">
                    Aptitude & Coding Assignments
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Complete assignments published by your trainer.
                  </p>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <Progress
                    label="Aptitude"
                    value={progress.aptitude}
                    detail={`${aptitudeTasks.filter((t) =>
                      isApproved(getTaskStatus(t))
                    ).length} / ${aptitudeTasks.length} completed`}
                    icon={Target}
                  />

                  <Progress
                    label="Coding & DSA"
                    value={progress.coding}
                    detail={`${codingTasks.filter((t) =>
                      isApproved(getTaskStatus(t))
                    ).length} / ${codingTasks.length} completed`}
                    icon={Code2}
                  />
                </div>

                {!tasks.length ? (
                  <Empty
                    title="No assignments available"
                    text="Your trainer has not published any career assignments yet."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {tasks.map((task) => {
                      const status = getTaskStatus(task);
                      const done = isApproved(status);
                      const submitted = isSubmitted(status);

                      return (
                        <article
                          key={task._id}
                          className="rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wide text-[#2864ed]">
                                {normalizeType(task.type)}
                              </span>

                              <h3 className="mt-1 font-bold text-[#17345f]">
                                {task.title}
                              </h3>
                            </div>

                            <StatusBadge status={status} />
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            {task.description ||
                              task.instructions ||
                              "Complete this assignment and submit your work."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded bg-slate-100 px-2 py-1">
                              {task.topic || "General"}
                            </span>

                            <span className="rounded bg-slate-100 px-2 py-1">
                              {task.difficulty || "All levels"}
                            </span>

                            <span className="rounded bg-slate-100 px-2 py-1">
                              {task.maxScore || 0} marks
                            </span>
                          </div>

                          {task.dueDate && (
                            <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={13} />
                              Due: {formatDate(task.dueDate)}
                            </p>
                          )}

                          {task.submission?.score != null && (
                            <p className="mt-3 text-sm font-semibold text-[#17345f]">
                              Score: {task.submission.score}/
                              {task.maxScore || "—"}
                            </p>
                          )}

                          {task.submission?.feedback && (
                            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                              <strong>Trainer feedback:</strong>
                              <p className="mt-1">
                                {task.submission.feedback}
                              </p>
                            </div>
                          )}

                          <button
                            disabled={done}
                            onClick={() => openTask(task)}
                            className="mt-4 w-full rounded-lg bg-[#2864ed] px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {done
                              ? "Approved"
                              : submitted
                                ? "Update Submission"
                                : "Open & Submit"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* =========================================
                MOCK INTERVIEWS
            ========================================= */}

            {tab === "interviews" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">

                <div className="mb-5">
                  <h2 className="text-lg font-bold text-[#17345f]">
                    Mock Interviews
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View your interview schedules, meeting links,
                    results and trainer feedback.
                  </p>
                </div>

                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-2xl font-bold text-[#17345f]">
                      {interviews.length}
                    </p>
                    <p className="text-xs text-slate-500">
                      Total Interviews
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-2xl font-bold text-green-700">
                      {completedInterviews}
                    </p>
                    <p className="text-xs text-slate-500">
                      Completed
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-2xl font-bold text-amber-700">
                      {interviews.filter((item) =>
                        ["scheduled", "upcoming"].includes(
                          normalizeStatus(item.status)
                        )
                      ).length}
                    </p>
                    <p className="text-xs text-slate-500">
                      Upcoming
                    </p>
                  </div>
                </div>

                {!interviews.length ? (
                  <Empty
                    icon={Video}
                    title="No interviews scheduled"
                    text="Your trainer will publish mock interview schedules here."
                  />
                ) : (
                  <div className="space-y-3">
                    {interviews.map((item, index) => (
                      <div
                        key={item._id || index}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row">

                          <div>
                            <h3 className="font-bold text-[#17345f]">
                              {item.title || "Mock Interview"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.interviewType || "Interview"}
                              {" · "}
                              {item.duration || 0} minutes
                            </p>

                            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <CalendarDays size={14} />
                              {formatDate(item.scheduledAt)}
                            </p>

                            {item.interviewer && (
                              <p className="mt-1 text-xs text-slate-500">
                                Interviewer: {item.interviewer}
                              </p>
                            )}
                          </div>

                          <StatusBadge
                            status={item.status || "Scheduled"}
                          />
                        </div>

                        {item.description && (
                          <p className="mt-3 text-sm text-slate-600">
                            {item.description}
                          </p>
                        )}

                        {item.feedback && (
                          <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">

                            <p className="font-semibold">
                              <MessageSquare
                                className="mr-1 inline"
                                size={15}
                              />
                              Trainer Feedback
                              {item.score != null
                                ? ` · ${item.score}/100`
                                : ""}
                            </p>

                            <p className="mt-1">
                              {item.feedback}
                            </p>

                            {item.strengths?.length > 0 && (
                              <p className="mt-2 text-xs">
                                <strong>Strengths:</strong>{" "}
                                {item.strengths.join(", ")}
                              </p>
                            )}

                            {item.improvements?.length > 0 && (
                              <p className="mt-1 text-xs">
                                <strong>Areas to improve:</strong>{" "}
                                {item.improvements.join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {item.meetingUrl && (
                          <a
                            href={item.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Join Meeting
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* =========================================
                PORTFOLIO PROJECTS
            ========================================= */}

            {tab === "projects" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">

                <div className="mb-5">
                  <h2 className="text-lg font-bold text-[#17345f]">
                    Portfolio Projects
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Build projects assigned by your trainer and
                    submit repository and deployment links.
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Total", projects.length],
                    [
                      "Submitted",
                      projects.filter((p) =>
                        isSubmitted(p.status)
                      ).length,
                    ],
                    ["Approved", approvedProjects],
                    [
                      "Pending",
                      projects.filter((p) =>
                        !isSubmitted(p.status)
                      ).length,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-slate-50 p-4"
                    >
                      <p className="text-xl font-bold text-[#17345f]">
                        {value}
                      </p>
                      <p className="text-xs text-slate-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {!projects.length ? (
                  <Empty
                    icon={FolderKanban}
                    title="No projects assigned"
                    text="Your trainer's portfolio projects will appear here."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((project, index) => (
                      <article
                        key={project._id || index}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-[#17345f]">
                              {project.title}
                            </h3>

                            <p className="mt-1 text-xs text-slate-400">
                              {project.category || "Portfolio Project"}
                            </p>
                          </div>

                          <StatusBadge
                            status={project.status || "Assigned"}
                          />
                        </div>

                        <p className="mt-3 text-sm text-slate-500">
                          {project.description ||
                            "Complete the assigned project and submit your work."}
                        </p>

                        {project.techStack?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {project.techStack.map((tech, i) => (
                              <span
                                key={`${tech}-${i}`}
                                className="rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-700"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                          <CalendarDays size={13} />
                          Due: {formatDate(project.dueDate)}
                        </p>

                        {project.feedback && (
                          <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                            <strong>Trainer Feedback:</strong>

                            <p className="mt-1">
                              {project.feedback}
                            </p>

                            {project.score != null && (
                              <p className="mt-1 font-semibold">
                                Score: {project.score}/100
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#2864ed]"
                            >
                              <Code2 size={14} />
                              Repository
                            </a>
                          )}

                          {project.liveUrl && (
                            <a
                              href={project.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#2864ed]"
                            >
                              <Globe size={14} />
                              Live Project
                            </a>
                          )}
                        </div>

                        <button
                          disabled={isApproved(project.status)}
                          onClick={() => openProject(project)}
                          className="mt-4 w-full rounded-lg bg-[#2864ed] px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isApproved(project.status)
                            ? "Project Approved"
                            : isSubmitted(project.status)
                              ? "Update Submission"
                              : "Submit Project"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* =========================================
                RESUME MANAGEMENT
            ========================================= */}

            {tab === "resume" && (
              <section className="max-w-2xl rounded-xl border border-[#dce7f7] bg-white p-5">

                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
                    <FileText size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-[#17345f]">
                      My Resume
                    </h2>

                    <p className="text-xs text-slate-500">
                      Upload a PDF or DOCX file (maximum 5 MB).
                    </p>
                  </div>
                </div>

                {resumeName ? (
                  <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-4">

                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 shrink-0 text-green-600"
                        size={18}
                      />

                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-green-800">
                          {resumeName}
                        </p>

                        <p className="mt-1 text-xs text-green-700">
                          Uploaded: {formatDate(resume.uploadedAt)}
                        </p>

                        <p className="mt-1 text-xs text-green-700">
                          Review status: {resume.reviewStatus || "Pending review"}
                        </p>

                        {resume.trainerFeedback && (
                          <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-green-900">
                            <strong>Trainer Feedback:</strong>

                            <p className="mt-1">
                              {resume.trainerFeedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {resumeUrl && (
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-green-800 underline"
                      >
                        View Resume
                        <ExternalLink size={13} />
                      </a>
                    )}

                    {!resumeUrl && (
                      <p className="mt-3 text-xs text-amber-700">
                        Resume file path was not returned by the server.
                      </p>
                    )}
                  </div>
                ) : (
                  <Empty
                    icon={FileText}
                    title="No resume uploaded"
                    text="Upload your latest resume for placement review."
                  />
                )}

                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 ${
                    uploading ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {uploading ? (
                    <RefreshCw
                      className="animate-spin"
                      size={17}
                    />
                  ) : (
                    <Upload size={17} />
                  )}

                  {uploading
                    ? "Uploading..."
                    : resumeName
                      ? "Replace Resume"
                      : "Upload Resume"}

                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    disabled={uploading}
                    onChange={uploadResume}
                  />
                </label>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Supported formats: PDF and DOCX · Maximum size: 5 MB
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {/* =============================================
          ASSIGNMENT MODAL
      ============================================= */}

      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">

            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-[#2864ed]">
                  {normalizeType(activeTask.type)} assignment
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#17345f]">
                  {activeTask.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveTask(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {activeTask.instructions && (
              <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                {activeTask.instructions}
              </p>
            )}

            {activeTask.problemStatement && (
              <div className="mb-4 rounded-lg border border-slate-100 p-3">
                <p className="mb-1 text-xs font-bold text-slate-500">
                  PROBLEM STATEMENT
                </p>

                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {activeTask.problemStatement}
                </p>
              </div>
            )}

            {activeTask.dueDate && (
              <p className="mb-3 text-xs text-slate-500">
                Due: {formatDate(activeTask.dueDate)}
              </p>
            )}

            {/* APTITUDE FORM */}

            {normalizeType(activeTask.type) === "aptitude" ? (
              <form
                onSubmit={submitTask}
                className="space-y-4"
              >
                {(activeTask.questions || []).map(
                  (question, index) => {
                    const answerKey =
                      question._id || index;

                    return (
                      <div
                        key={answerKey}
                        className="rounded-lg border border-slate-100 p-4"
                      >
                        <p className="mb-3 text-sm font-semibold text-[#17345f]">
                          {index + 1}. {question.question}
                        </p>

                        <div className="space-y-2">
                          {(question.options || []).map(
                            (option, optionIndex) => (
                              <label
                                key={optionIndex}
                                className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm text-slate-600 hover:bg-blue-50"
                              >
                                <input
                                  type="radio"
                                  name={`q-${answerKey}`}
                                  checked={
                                    String(
                                      taskAnswers[answerKey] ?? ""
                                    ) === String(option)
                                  }
                                  onChange={() =>
                                    setTaskAnswers((previous) => ({
                                      ...previous,
                                      [answerKey]: option,
                                    }))
                                  }
                                  className="accent-[#2864ed]"
                                />

                                {option}
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

                {!activeTask.questions?.length && (
                  <Empty
                    title="No questions available"
                    text="This aptitude assignment does not contain any questions."
                  />
                )}

                <button
                  type="submit"
                  disabled={
                    busy === String(activeTask._id) ||
                    !activeTask.questions?.length
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Send size={16} />

                  {busy === String(activeTask._id)
                    ? "Submitting..."
                    : "Submit Answers"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={submitTask}
                className="space-y-4"
              >
                <Field label="Programming Language">
                  <select
                    className={inputClass}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {(activeTask.allowedLanguages?.length
                      ? activeTask.allowedLanguages
                      : ["javascript", "python", "java"]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Your Code">
                  <textarea
                    required
                    rows={12}
                    className={`${inputClass} font-mono text-xs`}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Write your solution here..."
                  />
                </Field>

                <Field label="GitHub Repository URL (optional)">
                  <input
                    type="url"
                    className={inputClass}
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={busy === String(activeTask._id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Send size={16} />

                  {busy === String(activeTask._id)
                    ? "Submitting..."
                    : "Submit Coding Solution"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =============================================
          PROJECT SUBMISSION MODAL
      ============================================= */}

      {activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">

          <form
            onSubmit={submitProject}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-[#17345f]">
                  Submit Portfolio Project
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {activeProject.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveProject(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">

              <Field label="GitHub Repository URL">
                <input
                  required
                  type="url"
                  className={inputClass}
                  value={projectForm.githubUrl}
                  onChange={(e) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      githubUrl: e.target.value,
                    }))
                  }
                  placeholder="https://github.com/username/project"
                />
              </Field>

              <Field label="Live Project URL">
                <input
                  type="url"
                  className={inputClass}
                  value={projectForm.liveUrl}
                  onChange={(e) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      liveUrl: e.target.value,
                    }))
                  }
                  placeholder="https://your-project.vercel.app"
                />
              </Field>

              <Field label="Submission Notes">
                <textarea
                  rows={4}
                  className={inputClass}
                  value={projectForm.submissionNotes}
                  onChange={(e) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      submissionNotes: e.target.value,
                    }))
                  }
                  placeholder="Describe your implementation, features and technologies..."
                />
              </Field>

            </div>

            <button
              type="submit"
              disabled={busy === String(activeProject._id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send size={16} />

              {busy === String(activeProject._id)
                ? "Submitting..."
                : "Submit Project"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
