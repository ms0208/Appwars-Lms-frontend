"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Target, Video, FolderKanban, FileText, Plus,
  RefreshCw, Search, Pencil, Trash2, CheckCircle2, AlertCircle,
  ExternalLink, X, ClipboardCheck
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function token() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("appwars_token") || sessionStorage.getItem("token") || "";
}

async function api(endpoint, options = {}) {
  const isForm = options.body instanceof FormData;

  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(data?.message || data?.error || data || `Request failed (${res.status})`);
  }

  return data;
}

function arr(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function date(value) {
  if (!value) return "—";

  const d = new Date(value);

  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();

  if (["approved", "completed", "selected"].some(x => s.includes(x))) {
    return "bg-green-50 text-green-700";
  }

  if (["pending", "submitted", "scheduled", "upcoming", "under_review"].some(x => s.includes(x))) {
    return "bg-amber-50 text-amber-700";
  }

  if (["rejected", "revision"].some(x => s.includes(x))) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

const input =
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

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#17345f]">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

const emptyTask = {
  type: "aptitude",
  title: "",
  description: "",
  topic: "",
  difficulty: "Easy",
  instructions: "",
  questionsText:
    '[{"question":"What is 20% of 500?","options":["50","100","150","200"],"correctAnswer":"100","marks":10}]',
  problemStatement: "",
  starterCode: "",
  allowedLanguages: "javascript,python,java",
  maxScore: 100,
  dueDate: "",
  batch: "",
  status: "published",
};

const emptyInterview = {
  studentId: "",
  title: "",
  interviewType: "Technical",
  description: "",
  scheduledAt: "",
  duration: 30,
  meetingUrl: "",
};

const emptyProject = {
  studentId: "",
  title: "",
  description: "",
  instructions: "",
  techStack: "React, Node.js, Express, MongoDB",
  dueDate: "",
};

export default function TrainerCareerPlacementPage() {
  const [tab, setTab] = useState("overview");

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [resumes, setResumes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState("");
  const [editingId, setEditingId] = useState("");

  const [taskForm, setTaskForm] = useState(emptyTask);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [projectForm, setProjectForm] = useState(emptyProject);

  const [review, setReview] = useState({
    score: "",
    feedback: "",
    status: "approved",
  });

  const [reviewTarget, setReviewTarget] = useState(null);

  const [resumeReview, setResumeReview] = useState({
    reviewStatus: "reviewed",
    trainerFeedback: "",
  });

  const [resumeTarget, setResumeTarget] = useState(null);

  const [interviewReview, setInterviewReview] = useState({
    status: "completed",
    score: "",
    feedback: "",
    strengths: "",
    improvements: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const endpoints = [
      ["/api/trainer/career/tasks", setTasks, ["tasks", "careerTasks", "data"]],
      ["/api/trainer/career/submissions", setSubmissions, ["submissions", "data"]],
      ["/api/trainer/mock-interviews", setInterviews, ["interviews", "data"]],
      ["/api/trainer/portfolio-projects", setProjects, ["projects", "portfolioProjects", "data"]],
      ["/api/trainer/resumes", setResumes, ["resumes", "data"]],
    ];

    const results = await Promise.allSettled(
      endpoints.map(([url]) => api(url))
    );

    let failures = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        endpoints[index][1](arr(result.value, endpoints[index][2]));
      } else {
        failures++;
      }
    });

    if (failures === endpoints.length) {
      setError(
        "Unable to load trainer career data. Check your backend routes and authentication."
      );
    } else if (failures) {
      setError(
        `${failures} section(s) could not be loaded. Refresh after checking the API response.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const q = search.toLowerCase();

      const student =
        s.student?.name ||
        s.studentName ||
        s.student?.userId ||
        "";

      const title =
        s.task?.title ||
        s.taskTitle ||
        "";

      return `${student} ${title} ${s.type || ""} ${s.status || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [submissions, search]);

  function openTask(task = null) {
    setEditingId(task?._id || "");

    setTaskForm(
      task
        ? {
            ...emptyTask,
            ...task,
            questionsText: JSON.stringify(task.questions || [], null, 2),
            allowedLanguages: (task.allowedLanguages || []).join(", "),
            dueDate: task.dueDate
              ? new Date(task.dueDate).toISOString().slice(0, 16)
              : "",
          }
        : { ...emptyTask }
    );

    setModal("task");
  }

  async function saveTask(e) {
    e.preventDefault();

    setBusy("task");
    setError("");
    setSuccess("");

    try {
      const body = {
        ...taskForm,
        maxScore: Number(taskForm.maxScore),
        dueDate: taskForm.dueDate || null,
      };

      if (body.type === "aptitude") {
        body.questions = JSON.parse(body.questionsText || "[]");
        delete body.questionsText;

        body.maxScore =
          body.questions.reduce(
            (sum, q) => sum + Number(q.marks || 0),
            0
          ) || body.maxScore;
      } else {
        delete body.questionsText;

        body.allowedLanguages = body.allowedLanguages
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);
      }

      const id = editingId ? `/${editingId}` : "";

      await api(`/api/trainer/career/tasks${id}`, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });

      setSuccess(
        editingId
          ? "Career assignment updated."
          : "Career assignment created."
      );

      setModal("");
      await load();
    } catch (e) {
      setError(
        e.message ||
          "Unable to save assignment. Check aptitude question JSON."
      );
    } finally {
      setBusy("");
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this career assignment?")) return;

    setBusy(id);
    setError("");
    setSuccess("");

    try {
      await api(`/api/trainer/career/tasks/${id}`, {
        method: "DELETE",
      });

      setSuccess("Assignment deleted.");
      await load();
    } catch (e) {
      setError(e.message || "Unable to delete assignment.");
    } finally {
      setBusy("");
    }
  }

  function openReview(submission) {
    setReviewTarget(submission);

    setReview({
      score: submission.score ?? "",
      feedback: submission.feedback || "",
      status:
        submission.status === "rejected"
          ? "rejected"
          : "approved",
    });

    setModal("submission");
  }

  async function saveReview(e) {
    e.preventDefault();
    if (!reviewTarget) return;

    setBusy("review");
    setError("");
    setSuccess("");

    try {
      await api(
        `/api/trainer/career/submissions/${reviewTarget._id}/review`,
        {
          method: "PUT",
          body: JSON.stringify({
            score: Number(review.score),
            feedback: review.feedback,
            status: review.status,
          }),
        }
      );

      setSuccess("Submission review saved.");
      setModal("");
      await load();
    } catch (e) {
      setError(e.message || "Unable to review submission.");
    } finally {
      setBusy("");
    }
  }

  async function saveInterview(e) {
    e.preventDefault();

    setBusy("interview");
    setError("");
    setSuccess("");

    try {
      const body = {
        ...interviewForm,
        duration: Number(interviewForm.duration),
        scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
      };

      await api("/api/trainer/mock-interviews", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccess("Mock interview scheduled.");
      setModal("");
      setInterviewForm({ ...emptyInterview });

      await load();
    } catch (e) {
      setError(e.message || "Unable to schedule interview.");
    } finally {
      setBusy("");
    }
  }

  async function saveInterviewReview(e) {
    e.preventDefault();
    if (!reviewTarget) return;

    setBusy("interview-review");
    setError("");
    setSuccess("");

    try {
      const body = {
        ...interviewReview,
        score:
          interviewReview.score === ""
            ? null
            : Number(interviewReview.score),
        strengths: interviewReview.strengths
          .split(",")
          .map(x => x.trim())
          .filter(Boolean),
        improvements: interviewReview.improvements
          .split(",")
          .map(x => x.trim())
          .filter(Boolean),
      };

      await api(`/api/trainer/mock-interviews/${reviewTarget._id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setSuccess("Interview feedback saved.");
      setModal("");
      await load();
    } catch (e) {
      setError(e.message || "Unable to save interview feedback.");
    } finally {
      setBusy("");
    }
  }

  async function deleteInterview(id) {
    if (!window.confirm("Delete this mock interview?")) return;

    setBusy(id);

    try {
      await api(`/api/trainer/mock-interviews/${id}`, {
        method: "DELETE",
      });

      setSuccess("Interview deleted.");
      await load();
    } catch (e) {
      setError(e.message || "Unable to delete interview.");
    } finally {
      setBusy("");
    }
  }

  async function saveProject(e) {
    e.preventDefault();

    setBusy("project");
    setError("");
    setSuccess("");

    try {
      const body = {
        ...projectForm,
        techStack: projectForm.techStack
          .split(",")
          .map(x => x.trim())
          .filter(Boolean),
        dueDate: projectForm.dueDate || null,
      };

      await api("/api/trainer/portfolio-projects", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccess("Portfolio project assigned.");
      setModal("");
      setProjectForm({ ...emptyProject });

      await load();
    } catch (e) {
      setError(e.message || "Unable to assign project.");
    } finally {
      setBusy("");
    }
  }

  function openProjectReview(project) {
    setReviewTarget(project);

    setReview({
      score: project.score ?? "",
      feedback: project.feedback || "",
      status:
        project.status === "rejected"
          ? "rejected"
          : "approved",
    });

    setModal("project-review");
  }

  async function saveProjectReview(e) {
    e.preventDefault();
    if (!reviewTarget) return;

    setBusy("project-review");
    setError("");
    setSuccess("");

    try {
      await api(
        `/api/trainer/portfolio-projects/${reviewTarget._id}/review`,
        {
          method: "PUT",
          body: JSON.stringify({
            score: Number(review.score),
            feedback: review.feedback,
            status: review.status,
          }),
        }
      );

      setSuccess("Project review saved.");
      setModal("");
      await load();
    } catch (e) {
      setError(e.message || "Unable to review project.");
    } finally {
      setBusy("");
    }
  }

  async function deleteProject(id) {
    if (!window.confirm("Delete this portfolio project?")) return;

    setBusy(id);

    try {
      await api(`/api/trainer/portfolio-projects/${id}`, {
        method: "DELETE",
      });

      setSuccess("Project deleted.");
      await load();
    } catch (e) {
      setError(e.message || "Unable to delete project.");
    } finally {
      setBusy("");
    }
  }

  function openResumeReview(resume) {
    setResumeTarget(resume);

    setResumeReview({
      reviewStatus: resume.reviewStatus || "reviewed",
      trainerFeedback: resume.trainerFeedback || "",
    });

    setModal("resume");
  }

  async function saveResumeReview(e) {
    e.preventDefault();
    if (!resumeTarget) return;

    setBusy("resume");
    setError("");
    setSuccess("");

    try {
      await api(`/api/trainer/resumes/${resumeTarget._id}/review`, {
        method: "PUT",
        body: JSON.stringify(resumeReview),
      });

      setSuccess("Resume feedback saved.");
      setModal("");
      await load();
    } catch (e) {
      setError(e.message || "Unable to review resume.");
    } finally {
      setBusy("");
    }
  }

  const nav = [
    ["overview", "Overview", GraduationCap],
    ["tasks", "Aptitude & Coding", Target],
    ["submissions", "Submissions", ClipboardCheck],
    ["interviews", "Mock Interviews", Video],
    ["projects", "Portfolio Projects", FolderKanban],
    ["resumes", "Student Resumes", FileText],
  ];

  const Card = ({ label, value, icon: Icon, sub }) => (
    <div className="rounded-xl border border-[#dce7f7] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
          <Icon size={20} />
        </div>

        <span className="text-2xl font-bold text-[#17345f]">{value}</span>
      </div>

      <p className="mt-4 text-sm font-semibold text-[#17345f]">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2864ed]">
              <GraduationCap size={18} />
              Trainer Workspace
            </p>

            <h1 className="text-2xl font-bold text-[#17345f] sm:text-3xl">
              Career & Placement Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage placement preparation, evaluate students and monitor
              career readiness.
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

        {error && (
          <div
            role="alert"
            className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-[#dce7f7] bg-white p-2">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${
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

        {loading ? (
          <div className="rounded-xl border border-[#dce7f7] bg-white p-12 text-center">
            <RefreshCw
              className="mx-auto mb-3 animate-spin text-[#2864ed]"
              size={28}
            />
            <p className="text-sm text-slate-500">
              Loading trainer career data...
            </p>
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <>
                <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card
                    label="Career Assignments"
                    value={tasks.length}
                    icon={Target}
                    sub="Aptitude and coding tasks"
                  />

                  <Card
                    label="Pending Reviews"
                    value={
                      submissions.filter(
                        s =>
                          !["approved", "rejected"].includes(
                            String(s.status).toLowerCase()
                          )
                      ).length
                    }
                    icon={ClipboardCheck}
                    sub="Student submissions"
                  />

                  <Card
                    label="Mock Interviews"
                    value={interviews.length}
                    icon={Video}
                    sub="Scheduled and completed"
                  />

                  <Card
                    label="Portfolio Projects"
                    value={projects.length}
                    icon={FolderKanban}
                    sub="Assigned projects"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                    <h2 className="mb-4 font-bold text-[#17345f]">
                      Recent Submissions
                    </h2>

                    {submissions.length ? (
                      <div className="space-y-3">
                        {submissions.slice(0, 6).map((s, i) => (
                          <div
                            key={s._id || i}
                            className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#17345f]">
                                {s.student?.name || s.studentName || "Student"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {s.task?.title || s.taskTitle || "Career task"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(
                                s.status
                              )}`}
                            >
                              {s.status || "submitted"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-slate-400">
                        No submissions received yet.
                      </p>
                    )}
                  </section>

                  <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                    <h2 className="mb-4 font-bold text-[#17345f]">
                      Quick Actions
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => openTask()}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 p-4 text-left hover:bg-blue-50"
                      >
                        <Target className="text-[#2864ed]" />
                        <span className="text-sm font-semibold text-[#17345f]">
                          Create Assignment
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setInterviewForm({ ...emptyInterview });
                          setModal("interview");
                        }}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 p-4 text-left hover:bg-blue-50"
                      >
                        <Video className="text-[#2864ed]" />
                        <span className="text-sm font-semibold text-[#17345f]">
                          Schedule Interview
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setProjectForm({ ...emptyProject });
                          setModal("project");
                        }}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 p-4 text-left hover:bg-blue-50"
                      >
                        <FolderKanban className="text-[#2864ed]" />
                        <span className="text-sm font-semibold text-[#17345f]">
                          Assign Project
                        </span>
                      </button>

                      <button
                        onClick={() => setTab("resumes")}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 p-4 text-left hover:bg-blue-50"
                      >
                        <FileText className="text-[#2864ed]" />
                        <span className="text-sm font-semibold text-[#17345f]">
                          Review Resumes
                        </span>
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}

            {tab === "tasks" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-[#17345f]">
                      Aptitude & Coding Assignments
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Create and manage batch-wise placement preparation tasks.
                    </p>
                  </div>

                  <button
                    onClick={() => openTask()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Create Assignment
                  </button>
                </div>

                {tasks.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="p-3">Assignment</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Batch</th>
                          <th className="p-3">Due date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {tasks.map(t => (
                          <tr key={t._id} className="border-t border-slate-100">
                            <td className="p-3">
                              <p className="font-semibold text-[#17345f]">
                                {t.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {t.topic || "General"} · {t.difficulty}
                              </p>
                            </td>

                            <td className="p-3 capitalize">{t.type}</td>

                            <td className="p-3">
                              {t.batch?.batch ||
                                t.batch?.name ||
                                t.batch ||
                                "—"}
                            </td>

                            <td className="p-3">{date(t.dueDate)}</td>

                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${statusClass(
                                  t.status
                                )}`}
                              >
                                {t.status}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openTask(t)}
                                  className="rounded p-2 text-blue-600 hover:bg-blue-50"
                                >
                                  <Pencil size={16} />
                                </button>

                                <button
                                  disabled={busy === t._id}
                                  onClick={() => deleteTask(t._id)}
                                  className="rounded p-2 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No assignments created yet.
                  </div>
                )}
              </section>
            )}

            {tab === "submissions" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h2 className="text-lg font-bold text-[#17345f]">
                      Student Submissions
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review aptitude answers and coding solutions.
                    </p>
                  </div>

                  <div className="relative">
                    <Search
                      className="absolute left-3 top-2.5 text-slate-400"
                      size={16}
                    />
                    <input
                      className={`${input} pl-9 sm:w-64`}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search student or task"
                    />
                  </div>
                </div>

                {filteredSubmissions.length ? (
                  <div className="space-y-3">
                    {filteredSubmissions.map((s, i) => (
                      <div
                        key={s._id || i}
                        className="rounded-lg border border-slate-100 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <h3 className="font-bold text-[#17345f]">
                              {s.student?.name ||
                                s.studentName ||
                                s.student?.userId ||
                                "Student"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {s.task?.title ||
                                s.taskTitle ||
                                "Career assignment"}{" "}
                              · {s.language || s.type || "Submission"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Submitted: {date(s.submittedAt)}
                            </p>
                          </div>

                          <span
                            className={`h-fit w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                              s.status
                            )}`}
                          >
                            {s.status || "submitted"}
                          </span>
                        </div>

                        {s.answer && (
                          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                            {JSON.stringify(s.answer, null, 2)}
                          </pre>
                        )}

                        {s.code && (
                          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                            {s.code}
                          </pre>
                        )}

                        {s.githubUrl && (
                          <a
                            href={s.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline"
                          >
                            GitHub submission <ExternalLink size={12} />
                          </a>
                        )}

                        <button
                          onClick={() => openReview(s)}
                          className="mt-3 rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Review Submission
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No matching submissions found.
                  </div>
                )}
              </section>
            )}

            {tab === "interviews" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                <div className="mb-5 flex justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#17345f]">
                      Mock Interviews
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Schedule interviews and record performance feedback.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setInterviewForm({ ...emptyInterview });
                      setModal("interview");
                    }}
                    className="inline-flex h-fit items-center gap-2 rounded-lg bg-[#2864ed] px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    <Plus size={15} />
                    Schedule
                  </button>
                </div>

                {interviews.length ? (
                  <div className="space-y-3">
                    {interviews.map((x, i) => (
                      <div
                        key={x._id || i}
                        className="rounded-lg border border-slate-100 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row">
                          <div>
                            <h3 className="font-bold text-[#17345f]">
                              {x.title}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {x.student?.name || x.studentName || "Student"} ·{" "}
                              {x.interviewType} · {x.duration} min
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {date(x.scheduledAt)}
                            </p>
                          </div>

                          <span
                            className={`h-fit rounded-full px-2 py-1 text-xs ${statusClass(
                              x.status
                            )}`}
                          >
                            {x.status}
                          </span>
                        </div>

                        {x.meetingUrl && (
                          <a
                            href={x.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 underline"
                          >
                            Meeting link <ExternalLink size={12} />
                          </a>
                        )}

                        {x.feedback && (
                          <p className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-800">
                            {x.feedback}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setReviewTarget(x);

                              setInterviewReview({
                                status: "completed",
                                score: x.score ?? "",
                                feedback: x.feedback || "",
                                strengths: (x.strengths || []).join(", "),
                                improvements: (x.improvements || []).join(", "),
                              });

                              setModal("interview-review");
                            }}
                            className="rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white"
                          >
                            Add / Update Feedback
                          </button>

                          <button
                            onClick={() => deleteInterview(x._id)}
                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No mock interviews scheduled.
                  </div>
                )}
              </section>
            )}

            {tab === "projects" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                <div className="mb-5 flex justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#17345f]">
                      Portfolio Projects
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Assign practical projects and evaluate submissions.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setProjectForm({ ...emptyProject });
                      setModal("project");
                    }}
                    className="inline-flex h-fit items-center gap-2 rounded-lg bg-[#2864ed] px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    <Plus size={15} />
                    Assign Project
                  </button>
                </div>

                {projects.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((p, i) => (
                      <article
                        key={p._id || i}
                        className="rounded-lg border border-slate-100 p-4"
                      >
                        <div className="flex justify-between gap-2">
                          <h3 className="font-bold text-[#17345f]">
                            {p.title}
                          </h3>

                          <span
                            className={`h-fit rounded-full px-2 py-1 text-[11px] ${statusClass(
                              p.status
                            )}`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {p.student?.name ||
                            p.studentName ||
                            p.batch?.batch ||
                            "Batch project"}
                        </p>

                        <p className="mt-2 text-sm text-slate-600">
                          {p.description}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          Due: {date(p.dueDate)}
                        </p>

                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block text-xs text-blue-700 underline"
                          >
                            Student GitHub submission
                          </a>
                        )}

                        {p.liveUrl && (
                          <a
                            href={p.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-xs text-blue-700 underline"
                          >
                            Live project
                          </a>
                        )}

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => openProjectReview(p)}
                            className="rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white"
                          >
                            Review Project
                          </button>

                          <button
                            onClick={() => deleteProject(p._id)}
                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No portfolio projects assigned.
                  </div>
                )}
              </section>
            )}

            {tab === "resumes" && (
              <section className="rounded-xl border border-[#dce7f7] bg-white p-5">
                <h2 className="text-lg font-bold text-[#17345f]">
                  Student Resumes
                </h2>

                <p className="mb-5 mt-1 text-sm text-slate-500">
                  Review uploaded resumes and provide placement feedback.
                </p>

                {resumes.length ? (
                  <div className="space-y-3">
                    {resumes.map((r, i) => (
                      <div
                        key={r._id || i}
                        className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <h3 className="font-semibold text-[#17345f]">
                            {r.student?.name || r.studentName || "Student"}
                          </h3>

                          <p className="mt-1 break-all text-xs text-slate-500">
                            {r.originalName || r.fileName}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Uploaded: {date(r.uploadedAt)} · Review:{" "}
                            {r.reviewStatus || "Pending"}
                          </p>

                          {r.trainerFeedback && (
                            <p className="mt-2 text-xs text-slate-600">
                              {r.trainerFeedback}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#17345f]"
                            >
                              View <ExternalLink size={12} />
                            </a>
                          )}

                          <button
                            onClick={() => openResumeReview(r)}
                            className="rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white"
                          >
                            Review Resume
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No student resumes uploaded yet.
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {modal === "task" && (
        <Modal
          title={editingId ? "Edit Career Assignment" : "Create Career Assignment"}
          subtitle="Publish an aptitude test or coding challenge to a batch."
          onClose={() => setModal("")}
        >
          <form onSubmit={saveTask} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assignment type">
                <select
                  className={input}
                  value={taskForm.type}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, type: e.target.value }))
                  }
                >
                  <option value="aptitude">Aptitude</option>
                  <option value="coding">Coding / DSA</option>
                </select>
              </Field>

              <Field label="Batch ID or batch name">
                <input
                  required
                  className={input}
                  value={taskForm.batch}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, batch: e.target.value }))
                  }
                  placeholder="Paste batch MongoDB ID"
                />
              </Field>
            </div>

            <Field label="Title">
              <input
                required
                className={input}
                value={taskForm.title}
                onChange={e =>
                  setTaskForm(v => ({ ...v, title: e.target.value }))
                }
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={2}
                className={input}
                value={taskForm.description}
                onChange={e =>
                  setTaskForm(v => ({ ...v, description: e.target.value }))
                }
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Topic">
                <input
                  className={input}
                  value={taskForm.topic}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, topic: e.target.value }))
                  }
                />
              </Field>

              <Field label="Difficulty">
                <select
                  className={input}
                  value={taskForm.difficulty}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, difficulty: e.target.value }))
                  }
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </Field>

              <Field label="Max score">
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={taskForm.maxScore}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, maxScore: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Instructions">
              <textarea
                rows={2}
                className={input}
                value={taskForm.instructions}
                onChange={e =>
                  setTaskForm(v => ({ ...v, instructions: e.target.value }))
                }
              />
            </Field>

            {taskForm.type === "aptitude" ? (
              <Field label="Questions JSON (correctAnswer is trainer-only)">
                <textarea
                  required
                  rows={9}
                  className={`${input} font-mono text-xs`}
                  value={taskForm.questionsText}
                  onChange={e =>
                    setTaskForm(v => ({
                      ...v,
                      questionsText: e.target.value,
                    }))
                  }
                />
              </Field>
            ) : (
              <>
                <Field label="Problem statement">
                  <textarea
                    required
                    rows={3}
                    className={input}
                    value={taskForm.problemStatement}
                    onChange={e =>
                      setTaskForm(v => ({
                        ...v,
                        problemStatement: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Starter code">
                  <textarea
                    rows={4}
                    className={`${input} font-mono text-xs`}
                    value={taskForm.starterCode}
                    onChange={e =>
                      setTaskForm(v => ({
                        ...v,
                        starterCode: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Allowed languages (comma separated)">
                  <input
                    className={input}
                    value={taskForm.allowedLanguages}
                    onChange={e =>
                      setTaskForm(v => ({
                        ...v,
                        allowedLanguages: e.target.value,
                      }))
                    }
                  />
                </Field>
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Due date">
                <input
                  type="datetime-local"
                  className={input}
                  value={taskForm.dueDate}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, dueDate: e.target.value }))
                  }
                />
              </Field>

              <Field label="Publish status">
                <select
                  className={input}
                  value={taskForm.status}
                  onChange={e =>
                    setTaskForm(v => ({ ...v, status: e.target.value }))
                  }
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>
            </div>

            <button
              disabled={busy === "task"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving..." : editingId ? "Save Changes" : "Create Assignment"}
            </button>
          </form>
        </Modal>
      )}

      {modal === "submission" && (
        <Modal
          title="Review Student Submission"
          subtitle={`${reviewTarget?.student?.name || reviewTarget?.studentName || "Student"} · ${reviewTarget?.task?.title || reviewTarget?.taskTitle || "Assignment"}`}
          onClose={() => setModal("")}
        >
          <form onSubmit={saveReview} className="space-y-3">
            {reviewTarget?.answer && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold text-slate-600">
                  Submitted answers
                </p>

                <pre className="whitespace-pre-wrap text-xs text-slate-700">
                  {JSON.stringify(reviewTarget.answer, null, 2)}
                </pre>
              </div>
            )}

            {reviewTarget?.code && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">
                  Submitted code
                </p>

                <pre className="max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                  {reviewTarget.code}
                </pre>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Score">
                <input
                  required
                  type="number"
                  min="0"
                  max={reviewTarget?.task?.maxScore || 100}
                  className={input}
                  value={review.score}
                  onChange={e =>
                    setReview(v => ({ ...v, score: e.target.value }))
                  }
                />
              </Field>

              <Field label="Decision">
                <select
                  className={input}
                  value={review.status}
                  onChange={e =>
                    setReview(v => ({ ...v, status: e.target.value }))
                  }
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Needs improvement</option>
                </select>
              </Field>
            </div>

            <Field label="Feedback">
              <textarea
                required
                rows={4}
                className={input}
                value={review.feedback}
                onChange={e =>
                  setReview(v => ({ ...v, feedback: e.target.value }))
                }
              />
            </Field>

            <button
              disabled={busy === "review"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white"
            >
              {busy ? "Saving..." : "Save Evaluation"}
            </button>
          </form>
        </Modal>
      )}

      {modal === "interview" && (
        <Modal
          title="Schedule Mock Interview"
          subtitle="Assign an interview to a student."
          onClose={() => setModal("")}
        >
          <form onSubmit={saveInterview} className="space-y-3">
            <Field label="Student MongoDB ID">
              <input
                required
                className={input}
                value={interviewForm.studentId}
                onChange={e =>
                  setInterviewForm(v => ({
                    ...v,
                    studentId: e.target.value,
                  }))
                }
                placeholder="Paste student ID"
              />
            </Field>

            <Field label="Interview title">
              <input
                required
                className={input}
                value={interviewForm.title}
                onChange={e =>
                  setInterviewForm(v => ({ ...v, title: e.target.value }))
                }
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Interview type">
                <select
                  className={input}
                  value={interviewForm.interviewType}
                  onChange={e =>
                    setInterviewForm(v => ({
                      ...v,
                      interviewType: e.target.value,
                    }))
                  }
                >
                  <option>Technical</option>
                  <option>HR</option>
                  <option>Managerial</option>
                  <option>Communication</option>
                </select>
              </Field>

              <Field label="Duration (minutes)">
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={interviewForm.duration}
                  onChange={e =>
                    setInterviewForm(v => ({
                      ...v,
                      duration: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows={2}
                className={input}
                value={interviewForm.description}
                onChange={e =>
                  setInterviewForm(v => ({
                    ...v,
                    description: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Schedule date & time">
              <input
                required
                type="datetime-local"
                className={input}
                value={interviewForm.scheduledAt}
                onChange={e =>
                  setInterviewForm(v => ({
                    ...v,
                    scheduledAt: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Meeting URL">
              <input
                type="url"
                className={input}
                value={interviewForm.meetingUrl}
                onChange={e =>
                  setInterviewForm(v => ({
                    ...v,
                    meetingUrl: e.target.value,
                  }))
                }
              />
            </Field>

            <button
              disabled={busy === "interview"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white"
            >
              {busy ? "Scheduling..." : "Schedule Interview"}
            </button>
          </form>
        </Modal>
      )}

      {modal === "interview-review" && (
        <Modal
          title="Interview Evaluation"
          onClose={() => setModal("")}
        >
          <form onSubmit={saveInterviewReview} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className={input}
                  value={interviewReview.status}
                  onChange={e =>
                    setInterviewReview(v => ({
                      ...v,
                      status: e.target.value,
                    }))
                  }
                >
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              <Field label="Score (out of 100)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={input}
                  value={interviewReview.score}
                  onChange={e =>
                    setInterviewReview(v => ({
                      ...v,
                      score: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <Field label="Feedback">
              <textarea
                rows={3}
                className={input}
                value={interviewReview.feedback}
                onChange={e =>
                  setInterviewReview(v => ({
                    ...v,
                    feedback: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Strengths (comma separated)">
              <input
                className={input}
                value={interviewReview.strengths}
                onChange={e =>
                  setInterviewReview(v => ({
                    ...v,
                    strengths: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Areas to improve (comma separated)">
              <input
                className={input}
                value={interviewReview.improvements}
                onChange={e =>
                  setInterviewReview(v => ({
                    ...v,
                    improvements: e.target.value,
                  }))
                }
              />
            </Field>

            <button
              disabled={busy === "interview-review"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white"
            >
              {busy ? "Saving..." : "Save Interview Feedback"}
            </button>
          </form>
        </Modal>
      )}

      {modal === "project" && (
        <Modal
          title="Assign Portfolio Project"
          subtitle="Assign the project to a student using their MongoDB ID."
          onClose={() => setModal("")}
        >
          <form onSubmit={saveProject} className="space-y-3">
            <Field label="Student MongoDB ID">
              <input
                required
                className={input}
                value={projectForm.studentId}
                onChange={e =>
                  setProjectForm(v => ({
                    ...v,
                    studentId: e.target.value,
                  }))
                }
                placeholder="Paste student ID"
              />
            </Field>

            <Field label="Project title">
              <input
                required
                className={input}
                value={projectForm.title}
                onChange={e =>
                  setProjectForm(v => ({ ...v, title: e.target.value }))
                }
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={2}
                className={input}
                value={projectForm.description}
                onChange={e =>
                  setProjectForm(v => ({
                    ...v,
                    description: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Instructions">
              <textarea
                rows={3}
                className={input}
                value={projectForm.instructions}
                onChange={e =>
                  setProjectForm(v => ({
                    ...v,
                    instructions: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Tech stack (comma separated)">
              <input
                className={input}
                value={projectForm.techStack}
                onChange={e =>
                  setProjectForm(v => ({
                    ...v,
                    techStack: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Due date">
              <input
                type="datetime-local"
                className={input}
                value={projectForm.dueDate}
                onChange={e =>
                  setProjectForm(v => ({
                    ...v,
                    dueDate: e.target.value,
                  }))
                }
              />
            </Field>

            <button
              disabled={busy === "project"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white"
            >
              {busy ? "Assigning..." : "Assign Project"}
            </button>
          </form>
        </Modal>
      )}

      {modal === "project-review" && (
        <Modal
          title="Review Portfolio Project"
          subtitle={reviewTarget?.title}
          onClose={() => setModal("")}
        >
          <form onSubmit={saveProjectReview} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Score">
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  className={input}
                  value={review.score}
                  onChange={e =>
                    setReview(v => ({ ...v, score: e.target.value }))
                  }
                />
              </Field>

              <Field label="Decision">
                <select
                  className={input}
                  value={review.status}
                  onChange={e =>
                    setReview(v => ({ ...v, status: e.target.value }))
                  }
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Needs improvement</option>
                </select>
              </Field>
            </div>

            <Field label="Feedback">
              <textarea
                required
                rows={4}
                className={input}
                value={review.feedback}
                onChange={e =>
                  setReview(v => ({ ...v, feedback: e.target.value }))
                }
              />
            </Field>

            <button
              disabled={busy === "project-review"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white"
            >
              {busy ? "Saving..." : "Save Project Review"}
            </button>
          </form>
        </Modal>
      )}

      {modal === "resume" && (
        <Modal
          title="Review Student Resume"
          subtitle={
            resumeTarget?.student?.name ||
            resumeTarget?.studentName ||
            "Student"
          }
          onClose={() => setModal("")}
        >
          <form onSubmit={saveResumeReview} className="space-y-3">
            <p className="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {resumeTarget?.originalName || resumeTarget?.fileName}
            </p>

            {resumeTarget?.url && (
              <a
                href={resumeTarget.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 underline"
              >
                Open resume <ExternalLink size={14} />
              </a>
            )}

            <Field label="Review status">
              <select
                className={input}
                value={resumeReview.reviewStatus}
                onChange={e =>
                  setResumeReview(v => ({
                    ...v,
                    reviewStatus: e.target.value,
                  }))
                }
              >
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs revision</option>
              </select>
            </Field>

            <Field label="Trainer feedback">
              <textarea
                required
                rows={4}
                className={input}
                value={resumeReview.trainerFeedback}
                onChange={e =>
                  setResumeReview(v => ({
                    ...v,
                    trainerFeedback: e.target.value,
                  }))
                }
              />
            </Field>

            <button
              disabled={busy === "resume"}
              className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white"
            >
              {busy ? "Saving..." : "Save Resume Review"}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}