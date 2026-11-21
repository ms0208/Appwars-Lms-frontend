
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BookOpen,
  Video,
  FileText,
  PlayCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  X,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Loader2,
  PauseCircle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ------------------------------------------------------
// FIX UPLOADED FILE URL
// ------------------------------------------------------

const getFileUrl = (fileUrl) => {
  if (!fileUrl) return "";

  const backendUrl = API.replace(/\/+$/, "");

  // Handle absolute localhost URLs
  if (
    fileUrl.includes("localhost:3000/uploads/") ||
    fileUrl.includes("127.0.0.1:3000/uploads/")
  ) {
    return fileUrl.replace(
      /localhost:3000|127\.0\.0\.1:3000/,
      new URL(backendUrl).host
    ).replace(/^http:\/\//, `${new URL(backendUrl).protocol}//`);
  }

  // Handle relative upload paths
  if (fileUrl.startsWith("/uploads/")) {
    return `${backendUrl}${fileUrl}`;
  }

  // Handle other relative paths
  if (!/^https?:\/\//i.test(fileUrl)) {
    return `${backendUrl}/${fileUrl.replace(/^\/+/, "")}`;
  }

  return fileUrl;
};

// ------------------------------------------------------
// STUDENT LEARNING RESOURCES PAGE
// ------------------------------------------------------

export default function StudentLearningResourcesPage() {

  // ----------------------------------------------------
  // STATES
  // ----------------------------------------------------

  const [student, setStudent] = useState(null);

  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [courseName, setCourseName] = useState("");

  const [resources, setResources] = useState([]);

  const [summary, setSummary] = useState({
    batchProgress: 0,
    totalVideos: 0,
    completedVideos: 0,
    totalDuration: 0,
    completedDuration: 0,
  });

  const [activeVideo, setActiveVideo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // ----------------------------------------------------
  // REFS
  // ----------------------------------------------------

  const videoRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lastHeartbeatRef = useRef(0);
  const activeVideoRef = useRef(null);
  const progressSavingRef = useRef(false);

  // ----------------------------------------------------
  // TOKEN
  // ----------------------------------------------------

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return "";

    return (
      localStorage.getItem("appwars_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      ""
    );
  }, []);

  // ----------------------------------------------------
  // API HELPER
  // ----------------------------------------------------

  const api = useCallback(
    async (url, options = {}) => {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const response = await fetch(`${API}${url}`, {
        ...options,
        headers: {
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Invalid response received from server."
        );
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Something went wrong."
        );
      }

      return data;
    },
    [getToken]
  );

  // ----------------------------------------------------
  // LOAD BATCH RESOURCES
  // ----------------------------------------------------

  const loadResources = useCallback(
    async (id) => {
      if (!id) return;

      const data = await api(
        `/api/learning-resources/batch/${id}`
      );

      setResources(data.resources || []);
    },
    [api]
  );

  // ----------------------------------------------------
  // LOAD OVERALL BATCH PROGRESS
  // ----------------------------------------------------

  const loadProgress = useCallback(async () => {
    const data = await api(
      "/api/learning-resources/my-progress"
    );

    setSummary({
      batchProgress: data.batchProgress || 0,
      totalVideos: data.totalVideos || 0,
      completedVideos: data.completedVideos || 0,
      totalDuration: data.totalDuration || 0,
      completedDuration: data.completedDuration || 0,
    });
  }, [api]);

  // ----------------------------------------------------
  // LOAD STUDENT PROFILE AND BATCH
  // ----------------------------------------------------

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const profileData = await api(
        "/api/student/profile"
      );

      const profile =
        profileData.user ||
        profileData.profile ||
        profileData.student ||
        profileData;

      if (!profile) {
        throw new Error(
          "Student profile could not be loaded."
        );
      }

      setStudent(profile);

      const batchDetails = profile.batchDetails;

      const actualBatchId =
        batchDetails?._id ||
        batchDetails?.id ||
        (typeof profile.batch === "object"
          ? profile.batch?._id
          : null);

      if (!actualBatchId) {
        throw new Error(
          "No batch is assigned to your student account. Please contact the administrator."
        );
      }

      setBatchId(String(actualBatchId));

      setBatchName(
        batchDetails?.batch ||
        (typeof profile.batch === "string"
          ? profile.batch
          : "My Batch")
      );

      setCourseName(
        batchDetails?.course || ""
      );

      await Promise.all([
        loadResources(String(actualBatchId)),
        loadProgress(),
      ]);
    } catch (err) {
      console.error(
        "Student initialization error:",
        err
      );

      setError(
        err.message ||
        "Unable to load learning resources."
      );
    } finally {
      setLoading(false);
    }
  }, [api, loadResources, loadProgress]);

  // ----------------------------------------------------
  // INITIALIZE PAGE
  // ----------------------------------------------------

  useEffect(() => {
    initialize();
  }, [initialize]);

  // ----------------------------------------------------
  // RESOURCE FILTERING
  // ----------------------------------------------------

  const videos = useMemo(
    () =>
      resources.filter(
        (resource) => resource.type === "video"
      ),
    [resources]
  );

  const notes = useMemo(
    () =>
      resources.filter(
        (resource) => resource.type === "notes"
      ),
    [resources]
  );

  const filteredVideos = useMemo(() => {
    if (filter === "completed") {
      return videos.filter(
        (video) => video.progress?.completed
      );
    }

    if (filter === "pending") {
      return videos.filter(
        (video) => !video.progress?.completed
      );
    }

    return videos;
  }, [videos, filter]);

  // ----------------------------------------------------
  // GROUP VIDEOS BY MODULE
  // ----------------------------------------------------

  const modules = useMemo(() => {
    const result = {};

    filteredVideos.forEach((video) => {
      const moduleName =
        video.moduleName || "General";

      if (!result[moduleName]) {
        result[moduleName] = [];
      }

      result[moduleName].push(video);
    });

    return result;
  }, [filteredVideos]);

  // ----------------------------------------------------
  // FORMAT DURATION
  // ----------------------------------------------------

  const formatDuration = useCallback((seconds) => {
    const total = Math.floor(
      Number(seconds) || 0
    );

    const hours = Math.floor(total / 3600);

    const minutes = Math.floor(
      (total % 3600) / 60
    );

    const secs = total % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${secs}s`;
  }, []);

  // ----------------------------------------------------
  // FORMAT VIDEO PROGRESS
  // ----------------------------------------------------

  const formatPercent = useCallback((resource) => {
    if (resource.progress?.completed) {
      return 100;
    }

    if (!resource.duration) {
      return 0;
    }

    const watched =
      Number(resource.progress?.watchedSeconds) || 0;

    return Math.min(
      99,
      Math.floor(
        (watched / Number(resource.duration)) * 100
      )
    );
  }, []);

  // ----------------------------------------------------
  // STOP VIDEO HEARTBEAT
  // ----------------------------------------------------

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ----------------------------------------------------
  // UPDATE LOCAL VIDEO PROGRESS
  // ----------------------------------------------------

  const updateLocalProgress = useCallback(
    (videoId, progress) => {
      setResources((previous) =>
        previous.map((resource) =>
          String(resource._id) === String(videoId)
            ? {
                ...resource,
                progress: {
                  ...resource.progress,
                  ...progress,
                },
              }
            : resource
        )
      );

      setActiveVideo((previous) => {
        if (
          !previous ||
          String(previous._id) !== String(videoId)
        ) {
          return previous;
        }

        const updated = {
          ...previous,
          progress: {
            ...previous.progress,
            ...progress,
          },
        };

        activeVideoRef.current = updated;

        return updated;
      });
    },
    []
  );

  // ----------------------------------------------------
  // SAVE VIDEO WATCH PROGRESS
  // ----------------------------------------------------

  const sendProgress = useCallback(
    async (video, currentTime, delta = 0) => {
      if (!video?._id) return;

      if (progressSavingRef.current) return;

      progressSavingRef.current = true;

      try {
        const data = await api(
          `/api/learning-resources/${video._id}/progress`,
          {
            method: "POST",
            body: JSON.stringify({
              currentTime: Number(currentTime) || 0,
              playbackDelta: Number(delta) || 0,
            }),
          }
        );

        if (data.progress) {
          updateLocalProgress(
            video._id,
            data.progress
          );
        }

        await loadProgress();
      } catch (err) {
        console.error(
          "Video progress saving failed:",
          err.message
        );
      } finally {
        progressSavingRef.current = false;
      }
    },
    [api, updateLocalProgress, loadProgress]
  );

  // ----------------------------------------------------
  // OPEN VIDEO
  // ----------------------------------------------------

  const openVideo = useCallback(
    (video) => {
      stopHeartbeat();

      const selectedVideo = {
        ...video,
        videoUrl: getFileUrl(video.videoUrl),
      };

      activeVideoRef.current = selectedVideo;

      setActiveVideo(selectedVideo);
      setVideoLoading(true);

      lastHeartbeatRef.current = Date.now();
    },
    [stopHeartbeat]
  );

  // ----------------------------------------------------
  // CLOSE VIDEO
  // ----------------------------------------------------

  const closeVideo = useCallback(() => {
    const video = activeVideoRef.current;

    const currentTime =
      videoRef.current?.currentTime || 0;

    if (video) {
      sendProgress(video, currentTime, 0);
    }

    stopHeartbeat();

    activeVideoRef.current = null;

    setActiveVideo(null);
    setVideoLoading(false);
  }, [sendProgress, stopHeartbeat]);

  // ----------------------------------------------------
  // VIDEO PLAY EVENT
  // ----------------------------------------------------

  const handleVideoPlay = useCallback(() => {
    stopHeartbeat();

    lastHeartbeatRef.current = Date.now();

    heartbeatRef.current = setInterval(() => {
      const videoElement = videoRef.current;
      const currentVideo = activeVideoRef.current;

      if (
        !videoElement ||
        !currentVideo ||
        videoElement.paused ||
        videoElement.ended
      ) {
        return;
      }

      const now = Date.now();

      const delta = Math.min(
        Math.floor(
          (now - lastHeartbeatRef.current) / 1000
        ),
        20
      );

      lastHeartbeatRef.current = now;

      if (delta > 0) {
        sendProgress(
          currentVideo,
          videoElement.currentTime,
          delta
        );
      }
    }, 15000);
  }, [sendProgress, stopHeartbeat]);

  // ----------------------------------------------------
  // VIDEO PAUSE EVENT
  // ----------------------------------------------------

  const handleVideoPause = useCallback(() => {
    stopHeartbeat();

    const video = activeVideoRef.current;

    if (video && videoRef.current) {
      sendProgress(
        video,
        videoRef.current.currentTime,
        0
      );
    }
  }, [sendProgress, stopHeartbeat]);

  // ----------------------------------------------------
  // VIDEO ENDED EVENT
  // ----------------------------------------------------

  const handleVideoEnded = useCallback(() => {
    stopHeartbeat();

    const video = activeVideoRef.current;

    if (video && videoRef.current) {
      sendProgress(
        video,
        videoRef.current.currentTime,
        0
      );
    }
  }, [sendProgress, stopHeartbeat]);

  // ----------------------------------------------------
  // VIDEO METADATA LOADED
  // ----------------------------------------------------

  const handleVideoMetadata = useCallback(
    (event) => {
      const videoElement = event.currentTarget;
      const video = activeVideoRef.current;

      if (!video) return;

      const savedPosition =
        Number(video.progress?.lastPosition) || 0;

      if (
        savedPosition > 0 &&
        savedPosition < videoElement.duration
      ) {
        videoElement.currentTime = savedPosition;
      }

      setVideoLoading(false);
    },
    []
  );

  // ----------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------

  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  // ----------------------------------------------------
  // REFRESH PAGE
  // ----------------------------------------------------

  const handleRefresh = async () => {
    try {
      setError("");

      if (batchId) {
        await Promise.all([
          loadResources(batchId),
          loadProgress(),
        ]);
      } else {
        await initialize();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // ----------------------------------------------------
  // LOADING SCREEN
  // ----------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2
            className="mx-auto animate-spin text-[#102e60]"
            size={38}
          />

          <p className="mt-4 font-medium text-slate-500">
            Loading your learning resources...
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ERROR SCREEN
  // ----------------------------------------------------

  if (error && !batchId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-5">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <AlertCircle
            className="mx-auto text-red-500"
            size={45}
          />

          <h2 className="mt-4 text-xl font-bold text-slate-800">
            Unable to Load Learning Resources
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            onClick={initialize}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#102e60] px-5 py-3 text-sm font-semibold text-white"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN UI
  // ----------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold tracking-wider text-blue-600">
              STUDENT LEARNING CENTER
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#102e60]">
              Learning Resources
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Access your batch lectures, study notes and learning progress.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* STUDENT / BATCH INFORMATION */}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#102e60]">
                <GraduationCap size={26} />
              </div>

              <div>
                <p className="font-bold text-slate-800">
                  {student?.name || "Student"}
                </p>

                <p className="text-sm text-slate-500">
                  {student?.userId || ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">
                  MY BATCH
                </p>

                <p className="mt-1 font-bold text-[#102e60]">
                  {batchName}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  MY COURSE
                </p>

                <p className="mt-1 font-bold text-[#102e60]">
                  {courseName || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* OVERALL PROGRESS */}

        <section className="rounded-2xl bg-[#102e60] p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-100">
                <BookOpen size={18} />
                <p className="text-sm font-medium">
                  Overall Learning Progress
                </p>
              </div>

              <h2 className="mt-3 text-5xl font-bold">
                {summary.batchProgress}%
              </h2>

              <p className="mt-2 text-sm text-blue-100">
                {summary.completedVideos} of{" "}
                {summary.totalVideos} video lectures completed
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  size={18}
                  className="text-emerald-300"
                />

                <span>
                  Completed time:{" "}
                  <strong>
                    {formatDuration(summary.completedDuration)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Clock
                  size={18}
                  className="text-blue-200"
                />

                <span>
                  Total video time:{" "}
                  <strong>
                    {formatDuration(summary.totalDuration)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  summary.batchProgress
                )}%`,
              }}
            />
          </div>
        </section>

        {/* VIDEO STATISTICS */}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Video size={22} />}
            title="Total Lectures"
            value={videos.length}
            color="blue"
          />

          <StatCard
            icon={<CheckCircle2 size={22} />}
            title="Completed"
            value={summary.completedVideos}
            color="green"
          />

          <StatCard
            icon={<Clock size={22} />}
            title="Remaining"
            value={Math.max(
              0,
              summary.totalVideos - summary.completedVideos
            )}
            color="orange"
          />
        </section>

        {/* VIDEO LECTURES */}

        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#102e60]">
                Video Lectures
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Watch lectures and continue from where you stopped.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All Lectures"],
                ["pending", "Continue Learning"],
                ["completed", "Completed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    filter === value
                      ? "bg-[#102e60] text-white"
                      : "border bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {videos.length === 0 ? (
            <EmptyState
              icon={<Video size={32} />}
              title="No Video Lectures Available"
              description="Your trainer or administrator has not uploaded any video lectures for this batch yet."
            />
          ) : Object.keys(modules).length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={32} />}
              title="No Lectures in This Filter"
              description="Try selecting another lecture filter."
            />
          ) : (
            Object.entries(modules).map(
              ([moduleName, moduleVideos]) => (
                <div
                  key={moduleName}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-[#102e60]">
                      <BookOpen size={20} />
                    </div>

                    <h3 className="font-bold text-slate-800">
                      {moduleName}
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      {moduleVideos.length} Lectures
                    </span>
                  </div>

                  <div className="space-y-3">
                    {moduleVideos.map((video) => {
                      const percent = formatPercent(video);
                      const completed = video.progress?.completed;

                      return (
                        <div
                          key={video._id}
                          className="flex flex-col gap-4 rounded-xl border p-4 transition hover:border-blue-200 md:flex-row md:items-center"
                        >
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                              completed
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 size={25} />
                            ) : (
                              <PlayCircle size={25} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-800">
                              {video.title}
                            </h4>

                            {video.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {video.description}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={13} />
                                {formatDuration(video.duration)}
                              </span>

                              <span>
                                {completed
                                  ? "Completed"
                                  : `${percent}% watched`}
                              </span>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  completed
                                    ? "bg-emerald-500"
                                    : "bg-blue-600"
                                }`}
                                style={{
                                  width: `${percent}%`,
                                }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => openVideo(video)}
                            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#102e60] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                          >
                            <PlayCircle size={17} />

                            {completed
                              ? "Watch Again"
                              : video.progress?.lastPosition > 0
                              ? "Resume"
                              : "Start Lecture"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )
          )}
        </section>

        {/* NOTES AND PDFS */}

        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-[#102e60]">
              Notes & PDFs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Download and study notes shared by your trainer.
            </p>
          </div>

          {notes.length === 0 ? (
            <EmptyState
              icon={<FileText size={32} />}
              title="No Notes Available"
              description="Your trainer or administrator has not uploaded any notes for this batch yet."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {notes.map((note) => {
                // IMPORTANT: Use backend URL for uploaded PDFs
                const fileUrl = getFileUrl(note.fileUrl);

                return (
                  <div
                    key={note._id}
                    className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-red-50 p-3 text-red-600">
                        <FileText size={26} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800">
                          {note.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {note.moduleName || "General"}
                        </p>

                        {note.description && (
                          <p className="mt-2 text-sm text-slate-500">
                            {note.description}
                          </p>
                        )}

                        {note.fileName && (
                          <p className="mt-2 truncate text-xs text-slate-400">
                            {note.fileName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ExternalLink size={16} />
                        Open Notes
                      </a>

                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={note.fileName || undefined}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* VIDEO PLAYER MODAL */}

        {activeVideo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 md:p-6"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeVideo();
              }
            }}
          >
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="flex items-center justify-between gap-4 border-b p-4">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-800">
                    {activeVideo.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {activeVideo.moduleName || "General"}
                  </p>
                </div>

                <button
                  onClick={closeVideo}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-slate-600 transition hover:bg-slate-100"
                  title="Close video"
                >
                  <X size={20} />
                </button>
              </div>

              {/* VIDEO PLAYER */}

              <div className="relative bg-black">
                {videoLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                    <Loader2
                      size={35}
                      className="animate-spin text-white"
                    />
                  </div>
                )}

                <video
                  key={activeVideo._id}
                  ref={videoRef}
                  src={activeVideo.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[70vh] w-full bg-black"
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                  onLoadedMetadata={handleVideoMetadata}
                  onCanPlay={() => setVideoLoading(false)}
                  onWaiting={() => setVideoLoading(true)}
                  onError={() => {
                    setVideoLoading(false);
                    setError(
                      "Unable to play this video. Please check the video URL or contact your trainer."
                    );
                  }}
                />
              </div>

              {/* VIDEO DETAILS */}

              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {activeVideo.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Duration:{" "}
                      {formatDuration(activeVideo.duration)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      activeVideo.progress?.completed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {activeVideo.progress?.completed
                      ? "Completed"
                      : "In Progress"}
                  </span>
                </div>

                {activeVideo.description && (
                  <p className="text-sm leading-6 text-slate-500">
                    {activeVideo.description}
                  </p>
                )}

                <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                  <PauseCircle size={17} />
                  Your lecture progress is saved automatically while watching.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------
// STAT CARD
// ------------------------------------------------------

function StatCard({
  icon,
  title,
  value,
  color = "blue",
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#102e60]">
            {value}
          </h3>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------
// EMPTY STATE
// ------------------------------------------------------

function EmptyState({
  icon,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}
