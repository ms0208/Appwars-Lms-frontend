"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  FileText,
  Upload,
  RefreshCw,
  CalendarDays,
  ExternalLink,
  CheckCircle2,
  Clock,
  Video,
  GraduationCap,
  Target,
  Code2,
  FolderKanban,
  AlertCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const INITIAL_CAREER = {
  aptitudeProgress: 0,
  dsaProgress: 0,
  mockInterviewsCompleted: 0,
  mockInterviewsTotal: 0,
  portfolioProjectsCompleted: 0,
  portfolioProjectsTotal: 0,
};

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
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

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

function getArray(data, keys = []) {
  if (Array.isArray(data)) return data;

  if (!data || typeof data !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
}

function getPercentage(value) {
  const number = Number(value) || 0;
  return Math.max(0, Math.min(100, number));
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("completed") ||
    normalized.includes("submitted") ||
    normalized.includes("selected")
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("scheduled") ||
    normalized.includes("upcoming")
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}

export default function CareerPlacementPage() {
  const [career, setCareer] = useState(INITIAL_CAREER);
  const [resume, setResume] = useState(null);
  const [mockInterviews, setMockInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actingOnInterview, setActingOnInterview] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCareerData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Confirm that the user is authenticated.
      await apiRequest("/api/auth/me");

      const results = await Promise.allSettled([
        apiRequest("/api/student/career"),
        apiRequest("/api/student/resume"),
        apiRequest("/api/student/mock-interviews"),
        apiRequest("/api/student/jobs"),
      ]);

      const [careerResult, resumeResult, interviewsResult, jobsResult] =
        results;

      // Career progress
      if (careerResult.status === "fulfilled") {
        const response = careerResult.value;
        const data = response?.career || response?.data || response || {};

        setCareer({
          aptitudeProgress: getPercentage(
            data.aptitudeProgress ?? data.aptitudePercentage
          ),
          dsaProgress: getPercentage(
            data.dsaProgress ?? data.dsaPercentage
          ),
          mockInterviewsCompleted: Number(
            data.mockInterviewsCompleted ?? data.completedMockInterviews ?? 0
          ),
          mockInterviewsTotal: Number(
            data.mockInterviewsTotal ?? data.totalMockInterviews ?? 0
          ),
          portfolioProjectsCompleted: Number(
            data.portfolioProjectsCompleted ??
              data.completedProjects ??
              0
          ),
          portfolioProjectsTotal: Number(
            data.portfolioProjectsTotal ?? data.totalProjects ?? 0
          ),
        });
      }

      // Resume details
      if (resumeResult.status === "fulfilled") {
        const response = resumeResult.value;
        setResume(response?.resume || response?.data || response || null);
      } else {
        setResume(null);
      }

      // Mock interviews
      if (interviewsResult.status === "fulfilled") {
        setMockInterviews(
          getArray(interviewsResult.value, [
            "interviews",
            "mockInterviews",
            "data",
          ])
        );
      } else {
        setMockInterviews([]);
      }

      // Job opportunities
      if (jobsResult.status === "fulfilled") {
        setJobs(
          getArray(jobsResult.value, ["jobs", "opportunities", "data"])
        );
      } else {
        setJobs([]);
      }

      const careerRequestFailed = results.every(
        (result) => result.status === "rejected"
      );

      if (careerRequestFailed) {
        setError(
          "Unable to load career information. Please check your backend API routes and try again."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to load career information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCareerData();
  }, [loadCareerData]);

  // Upload resume
  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const extensionIsValid = /\.(pdf|docx)$/i.test(file.name);

    if (
      !extensionIsValid ||
      (file.type && !allowedTypes.includes(file.type))
    ) {
      setError("Please upload your resume as a PDF or DOCX file.");
      setSuccess("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume size must not exceed 5 MB.");
      setSuccess("");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest("/api/student/resume", {
        method: "POST",
        body: formData,
      });

      setResume(response?.resume || response?.data || response);

      setSuccess("Your resume has been uploaded successfully.");

      // Refresh resume details from the server.
      try {
        const refreshed = await apiRequest("/api/student/resume");
        setResume(
          refreshed?.resume || refreshed?.data || refreshed || null
        );
      } catch {
        // Keep the successful upload response if refresh is unavailable.
      }
    } catch (err) {
      setError(err.message || "Failed to upload resume.");
    } finally {
      setUploading(false);
    }
  }

  // Book or join a mock interview
  async function handleInterviewAction(interview, action) {
    const interviewId = interview._id || interview.id;

    if (!interviewId) {
      setError("This interview does not have a valid ID.");
      return;
    }

    setActingOnInterview(interviewId);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest(
        `/api/student/mock-interviews/${encodeURIComponent(
          interviewId
        )}/action`,
        {
          method: "POST",
          body: JSON.stringify({ action }),
        }
      );

      setSuccess(
        action === "book"
          ? "Mock interview booked successfully."
          : "Interview request processed successfully."
      );

      await loadCareerData();

      if (action === "join") {
        const meetingUrl =
          response?.meetingUrl ||
          response?.interview?.meetingUrl ||
          interview.meetingUrl ||
          interview.meetingLink ||
          interview.joinUrl;

        if (meetingUrl) {
          window.open(meetingUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      setError(err.message || "Unable to process this interview.");
    } finally {
      setActingOnInterview(null);
    }
  }

  const completedInterviews = career.mockInterviewsCompleted;
  const totalInterviews = career.mockInterviewsTotal;

  const completedProjects = career.portfolioProjectsCompleted;
  const totalProjects = career.portfolioProjectsTotal;

  const progressItems = [
    {
      label: "Aptitude Practice",
      value: career.aptitudeProgress,
      description: "Improve your quantitative and logical reasoning.",
      icon: Target,
    },
    {
      label: "DSA Practice",
      value: career.dsaProgress,
      description: "Strengthen your data structures and algorithms.",
      icon: Code2,
    },
    {
      label: "Mock Interviews",
      value:
        totalInterviews > 0
          ? (completedInterviews / totalInterviews) * 100
          : 0,
      text: `${completedInterviews} of ${totalInterviews}`,
      description: "Prepare for technical and HR interviews.",
      icon: Video,
    },
    {
      label: "Portfolio Projects",
      value:
        totalProjects > 0
          ? (completedProjects / totalProjects) * 100
          : 0,
      text: `${completedProjects} of ${totalProjects}`,
      description: "Build projects to showcase your skills.",
      icon: FolderKanban,
    },
  ];

  const resumeName =
    resume?.originalName ||
    resume?.fileName ||
    resume?.filename ||
    resume?.name ||
    resume?.resumeName ||
    "";

  const resumeUrl =
    resume?.url ||
    resume?.fileUrl ||
    resume?.resumeUrl ||
    resume?.downloadUrl ||
    "";

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2864ed]">
              <GraduationCap size={18} />
              Career Development
            </div>

            <h1 className="text-2xl font-bold text-[#17345f] sm:text-3xl">
              Career & Placement
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Track your preparation, manage your resume, and explore job
              opportunities.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCareerData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-[#d9e6ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#17345f] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-[#d9e6ff] bg-white p-10 text-center">
            <RefreshCw
              size={28}
              className="mx-auto mb-3 animate-spin text-[#2864ed]"
            />
            <p className="text-sm text-slate-500">
              Loading your career information...
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
                  <Target size={22} />
                </div>

                <p className="text-sm text-slate-500">
                  Aptitude Progress
                </p>

                <p className="mt-1 text-2xl font-bold text-[#17345f]">
                  {Math.round(getPercentage(career.aptitudeProgress))}%
                </p>
              </div>

              <div className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Code2 size={22} />
                </div>

                <p className="text-sm text-slate-500">DSA Progress</p>

                <p className="mt-1 text-2xl font-bold text-[#17345f]">
                  {Math.round(getPercentage(career.dsaProgress))}%
                </p>
              </div>

              <div className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <Video size={22} />
                </div>

                <p className="text-sm text-slate-500">
                  Mock Interviews
                </p>

                <p className="mt-1 text-2xl font-bold text-[#17345f]">
                  {completedInterviews}/{totalInterviews}
                </p>
              </div>

              <div className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <FolderKanban size={22} />
                </div>

                <p className="text-sm text-slate-500">
                  Portfolio Projects
                </p>

                <p className="mt-1 text-2xl font-bold text-[#17345f]">
                  {completedProjects}/{totalProjects}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              {/* Main content */}
              <div className="space-y-6 lg:col-span-2">
                {/* Placement preparation with inline progress bars */}
                <section className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
                      <Target size={21} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[#17345f]">
                        Placement Preparation
                      </h2>

                      <p className="text-xs text-slate-500">
                        Your current preparation progress
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {progressItems.map((item) => {
                      const percentage = getPercentage(item.value);
                      const Icon = item.icon;

                      return (
                        <div key={item.label}>
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
                                <Icon size={18} />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-[#17345f]">
                                  {item.label}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 text-sm font-bold text-[#2864ed]">
                              {item.text ||
                                `${Math.round(percentage)}%`}
                            </span>
                          </div>

                          <div
                            className="ml-12 h-2 overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-label={item.label}
                            aria-valuenow={Math.round(percentage)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-[#2864ed] transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Mock interviews */}
                <section className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <Video size={21} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[#17345f]">
                        Mock Interviews
                      </h2>

                      <p className="text-xs text-slate-500">
                        Practice and prepare for your interviews
                      </p>
                    </div>
                  </div>

                  {mockInterviews.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
                      <CalendarDays
                        size={26}
                        className="mx-auto mb-2 text-slate-400"
                      />

                      <p className="text-sm font-medium text-slate-600">
                        No mock interviews available
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Interview schedules will appear here when available.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mockInterviews.map((interview, index) => {
                        const id = interview._id || interview.id || index;

                        const title =
                          interview.title ||
                          interview.name ||
                          interview.interviewType ||
                          "Mock Interview";

                        const status =
                          interview.status ||
                          interview.interviewStatus ||
                          "Upcoming";

                        const interviewDate =
                          interview.scheduledAt ||
                          interview.date ||
                          interview.startTime;

                        const isCompleted = String(status)
                          .toLowerCase()
                          .includes("completed");

                        const isBooked = [
                          "booked",
                          "scheduled",
                          "confirmed",
                          "upcoming",
                        ].some((value) =>
                          String(status).toLowerCase().includes(value)
                        );

                        const isBusy = actingOnInterview === id;

                        return (
                          <div
                            key={id}
                            className="rounded-lg border border-slate-100 p-4"
                          >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div>
                                <h3 className="text-sm font-bold text-[#17345f]">
                                  {title}
                                </h3>

                                {interview.trainerName && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Trainer: {interview.trainerName}
                                  </p>
                                )}

                                {interviewDate && (
                                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                    <CalendarDays size={14} />

                                    {new Date(
                                      interviewDate
                                    ).toLocaleString()}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {!isCompleted && !isBooked && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleInterviewAction(
                                      interview,
                                      "book"
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  <CalendarDays size={14} />

                                  {isBusy ? "Processing..." : "Book Interview"}
                                </button>
                              )}

                              {!isCompleted && isBooked && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleInterviewAction(
                                      interview,
                                      "join"
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  <Video size={14} />

                                  {isBusy ? "Processing..." : "Join Interview"}
                                </button>
                              )}

                              {isCompleted && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                  <CheckCircle2 size={14} />
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Job opportunities */}
                <section className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                      <BriefcaseBusiness size={21} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[#17345f]">
                        Job Opportunities
                      </h2>

                      <p className="text-xs text-slate-500">
                        Explore available career opportunities
                      </p>
                    </div>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
                      <BriefcaseBusiness
                        size={26}
                        className="mx-auto mb-2 text-slate-400"
                      />

                      <p className="text-sm font-medium text-slate-600">
                        No job opportunities available
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        New opportunities will appear here when published.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job, index) => {
                        const id = job._id || job.id || index;

                        const title =
                          job.title ||
                          job.jobTitle ||
                          job.role ||
                          "Job Opportunity";

                        const company =
                          job.company ||
                          job.companyName ||
                          "Company not specified";

                        const location =
                          job.location || job.jobLocation || "Location not specified";

                        const jobUrl =
                          job.applicationUrl ||
                          job.applyUrl ||
                          job.url ||
                          job.link ||
                          "";

                        return (
                          <div
                            key={id}
                            className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <h3 className="text-sm font-bold text-[#17345f]">
                                {title}
                              </h3>

                              <p className="mt-1 text-sm text-slate-600">
                                {company}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {location}
                              </p>

                              {job.employmentType && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {job.employmentType}
                                </p>
                              )}
                            </div>

                            {jobUrl ? (
                              <a
                                href={jobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Apply Now
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Application link unavailable
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Right sidebar */}
              <aside className="space-y-6">
                {/* Resume */}
                <section className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2864ed]">
                      <FileText size={21} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[#17345f]">
                        My Resume
                      </h2>

                      <p className="text-xs text-slate-500">
                        Manage your latest resume
                      </p>
                    </div>
                  </div>

                  {resumeName ? (
                    <div className="mb-4 rounded-lg border border-green-100 bg-green-50 p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          size={17}
                          className="mt-0.5 shrink-0 text-green-600"
                        />

                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-green-800">
                            {resumeName}
                          </p>

                          <p className="mt-1 text-xs text-green-700">
                            Resume available
                          </p>

                          {resume?.uploadedAt && (
                            <p className="mt-1 text-xs text-green-700">
                              Uploaded:{" "}
                              {new Date(
                                resume.uploadedAt
                              ).toLocaleDateString()}
                            </p>
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
                    </div>
                  ) : (
                    <div className="mb-4 rounded-lg border border-dashed border-slate-200 p-4 text-center">
                      <FileText
                        size={25}
                        className="mx-auto mb-2 text-slate-400"
                      />

                      <p className="text-sm font-medium text-slate-600">
                        No resume uploaded
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Upload a PDF or DOCX file up to 5 MB.
                      </p>
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                    {uploading ? (
                      <RefreshCw size={17} className="animate-spin" />
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
                      onChange={handleResumeUpload}
                    />
                  </label>

                  <p className="mt-2 text-center text-xs text-slate-400">
                    PDF or DOCX · Maximum 5 MB
                  </p>
                </section>

                {/* Preparation tips */}
                <section className="rounded-xl border border-[#d9e6ff] bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <GraduationCap size={21} />
                    </div>

                    <h2 className="text-base font-bold text-[#17345f]">
                      Placement Tips
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Target
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-sm font-semibold text-[#17345f]">
                          Practice Aptitude
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Solve quantitative, logical reasoning, and verbal
                          questions regularly.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Code2
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-sm font-semibold text-[#17345f]">
                          Improve DSA
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Practice arrays, strings, linked lists, trees, and
                          common coding interview problems.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FileText
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-sm font-semibold text-[#17345f]">
                          Update Your Resume
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Highlight your technical skills, projects, and
                          measurable achievements.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <BriefcaseBusiness
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-sm font-semibold text-[#17345f]">
                          Build Projects
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Maintain a portfolio of practical projects with
                          clear documentation.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Career support */}
                <section className="rounded-xl bg-[#17345f] p-5 text-white">
                  <div className="mb-3 flex items-center gap-2">
                    <BriefcaseBusiness size={20} />
                    <h2 className="text-base font-bold">
                      Need Career Support?
                    </h2>
                  </div>

                  <p className="mb-4 text-sm leading-6 text-blue-100">
                    Prepare for interviews, improve your resume, and work
                    toward your career goals.
                  </p>

                  <div className="flex items-center gap-2 text-xs text-blue-100">
                    <Clock size={15} />
                    Keep your preparation consistent.
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}