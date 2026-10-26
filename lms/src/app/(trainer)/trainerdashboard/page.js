"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import {
  CalendarDays,
  Upload,
  Send,
  FileText,
  BookOpen,
  ClipboardList,
  ArrowLeft,
  Clock3,
  CalendarCheck,
} from "lucide-react";

import Panel from "@/src/components/trainer/Panel";

// Sample batch data
const initialBatches = [
  {
    batch: "MERN-07",
    course: "MERN Full Stack",
    students: 32,
    status: "Running",
    assignedDate: "2026-08-25",
    startDate: "2026-09-01",
    durationMonths: 6,
  },
  {
    batch: "MERN-08",
    course: "MERN Full Stack",
    students: 18,
    status: "Upcoming",
    assignedDate: "2026-10-15",
    startDate: "2026-11-01",
    durationMonths: 6,
  },
  {
    batch: "NEXT-02",
    course: "Next.js",
    students: 24,
    status: "Running",
    assignedDate: "2026-07-20",
    startDate: "2026-08-01",
    durationMonths: 8,
  },
];

const initialDoubts = [
  {
    title: "Why does useEffect run twice?",
    student: "Aarav",
    topic: "React",
  },
  {
    title: "CORS error in Express",
    student: "Riya",
    topic: "Node.js",
  },
  {
    title: "Mongoose populate usage",
    student: "Kabir",
    topic: "MongoDB",
  },
];

// Student performance data
const performanceData = [
  {
    batch: "MERN-07",
    students: [
      ["Riya Singh", 92],
      ["Aarav Mehta", 88],
      ["Kabir Khan", 61],
    ],
  },
  {
    batch: "NEXT-02",
    students: [
      ["Rohan Mehra", 92],
      ["Ritik Jain", 69],
      ["Lovely Mehta", 58],
    ],
  },
];

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateEndDate(startDate, durationMonths) {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(year, month - 1, 1, 12);

  date.setMonth(date.getMonth() + durationMonths);

  const lastDayOfMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    12
  ).getDate();

  date.setDate(Math.min(day, lastDayOfMonth));

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getRemainingTime(endDate, currentDate) {
  if (!currentDate) return "Calculating...";

  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    12
  );

  const [year, month, day] = endDate.split("-").map(Number);
  const end = new Date(year, month - 1, day, 12);

  const difference = end.getTime() - today.getTime();

  if (difference < 0) return "Completed";

  const totalDays = Math.round(
    difference / (1000 * 60 * 60 * 24)
  );

  if (totalDays === 0) return "Ends today";

  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;

  if (months === 0) {
    return `${days} day${days === 1 ? "" : "s"} left`;
  }

  if (days === 0) {
    return `${months} month${months === 1 ? "" : "s"} left`;
  }

  return `${months} month${months === 1 ? "" : "s"}, ${days} days left`;
}

export default function TrainerDashboard() {
  const [announcement, setAnnouncement] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("MERN-07");

  const [announcements, setAnnouncements] = useState({
    "MERN-07": "Mock test on Friday",
    "MERN-08": "Welcome to the upcoming MERN Full Stack batch.",
    "NEXT-02": "Next.js project submission on Monday",
  });
  const [postedAt, setPostedAt] = useState({});
  const [toast, setToast] = useState("");
  const [doubts, setDoubts] = useState(initialDoubts);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState("");
  const [today, setToday] = useState(null);

  useEffect(() => {
    function updateDate() {
      setToday(new Date());
    }

    updateDate();

    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: "Assigned Batches",
      value: "3",
      note: "2 running now",
    },
    {
      label: "Total Students",
      value: "86",
      note: "Across all batches",
    },
    {
      label: "Pending Reviews",
      value: "14",
      note: "Submissions to grade",
    },
    {
      label: "Open Doubts",
      value: String(doubts.length + 4),
      note: "Awaiting reply",
    },
  ];

  function showToast(message) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 2500);
  }

  function postAnnouncement(event) {
    event.preventDefault();

    const message = announcement.trim();

    if (!message) {
      showToast("Please enter an announcement.");
      return;
    }

    setAnnouncements((current) => ({
      ...current,
      [selectedBatch]: message,
    }));

    setPostedAt((current) => ({
      ...current,
      [selectedBatch]: new Date().toLocaleString("en-IN"),
    }));

    setAnnouncement("");
    showToast(`Announcement posted successfully to ${selectedBatch}.`);
  }

  function sendReply(event) {
    event.preventDefault();

    if (!reply.trim()) return;

    setDoubts((current) =>
      current.filter((_, index) => index !== replying)
    );

    setReplying(null);
    setReply("");
    showToast("Reply submitted in demo mode.");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-5 lg:p-6">
      {/* Header */}
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">
            Trainer Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Welcome, Ravi Kumar
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Manage your batches, students, and course activities.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              showToast("Class scheduling will connect to the backend.")
            }
            className="flex items-center gap-2 rounded-md border border-[#8bb0ff] bg-white px-3 py-2 text-xs font-semibold text-[#2864ed] transition hover:bg-blue-50 sm:text-sm"
          >
            <CalendarDays size={15} />
            Schedule Class
          </button>

          <button
            type="button"
            onClick={() =>
              showToast("Content upload will connect to the backend.")
            }
            className="flex items-center gap-2 rounded-md bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 sm:text-sm"
          >
            <Upload size={15} />
            Upload Content
          </button>

          <Link
            href="/signin"
            className="flex items-center gap-2 rounded-md border border-[#8bb0ff] bg-white px-3 py-2 text-xs font-semibold text-[#102f63] transition hover:bg-blue-50 sm:text-sm"
          >
            <ArrowLeft size={15} />
            Back to Sign In
          </Link>
        </div>
      </header>

      {/* Notifications */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800"
        >
          {toast}
        </div>
      )}

      {/* Statistics */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[#d9e6ff] bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500 sm:text-sm">
              {stat.label}
            </p>

            <p className="mt-2 text-2xl font-bold text-[#102f63]">
              {stat.value}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {stat.note}
            </p>
          </div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid items-start gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        {/* Assigned Batches */}
        <Panel title="Assigned Courses & Batches">
          <div className="space-y-4">
            {initialBatches.map((item) => {
              const endDate = calculateEndDate(
                item.startDate,
                item.durationMonths
              );

              const remainingTime = getRemainingTime(endDate, today);
              const isCompleted = remainingTime === "Completed";

              return (
                <article
                  key={item.batch}
                  className="rounded-lg border border-[#d9e6ff] bg-white p-4 transition hover:border-[#8bb0ff] hover:shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-base font-bold text-[#17345f]">
                        {item.batch}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.course}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-[#17345f]">
                          {item.students}
                        </span>{" "}
                        Students
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Running"
                          ? "bg-blue-600 text-white"
                          : "bg-sky-100 text-sky-800"
                        }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Dates and Duration */}
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <CalendarDays
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-xs text-slate-500">
                          Trainer Assigned On
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17345f]">
                          {formatDate(item.assignedDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <CalendarCheck
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-xs text-slate-500">
                          Course Start Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17345f]">
                          {formatDate(item.startDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock3
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-xs text-slate-500">
                          Course Duration
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17345f]">
                          {item.durationMonths} Months
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <CalendarDays
                        size={17}
                        className="mt-0.5 shrink-0 text-[#2864ed]"
                      />

                      <div>
                        <p className="text-xs text-slate-500">
                          Expected End Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17345f]">
                          {formatDate(endDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Remaining Time */}
                  <div
                    className={`mt-4 flex flex-col justify-between gap-2 rounded-lg p-3 sm:flex-row sm:items-center ${isCompleted ? "bg-slate-100" : "bg-blue-50"
                      }`}
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        Course Timeline
                      </p>

                      <p
                        className={`mt-1 text-sm font-bold ${isCompleted
                            ? "text-slate-600"
                            : "text-[#2864ed]"
                          }`}
                      >
                        {remainingTime}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                      {item.durationMonths}-Month Program
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Batch Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Upload Lecture", Icon: Upload },
              { label: "Upload Notes", Icon: FileText },
              { label: "Assignment", Icon: ClipboardList },
              { label: "Resource", Icon: BookOpen },
            ].map(({ label, Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  showToast(`${label} action will connect to the backend.`)
                }
                className="flex items-center gap-1.5 rounded-md border border-[#8bb0ff] bg-white px-3 py-2 text-xs font-semibold text-[#2864ed] transition hover:bg-blue-50"
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </Panel>


        {/* Share Announcement */}
        <Panel title="Share Announcement">
          <form onSubmit={postAnnouncement}>
            <label
              htmlFor="batch"
              className="mb-2 block text-sm font-semibold text-[#17345f]"
            >
              Select Batch
            </label>

            <select
              id="batch"
              value={selectedBatch}
              onChange={(event) => setSelectedBatch(event.target.value)}
              className="mb-4 w-full rounded-md border border-[#cfe0ff] bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="MERN-07">MERN-07 · MERN Full Stack</option>
              <option value="MERN-08">MERN-08 · MERN Full Stack</option>
              <option value="NEXT-02">NEXT-02 · Next.js</option>
            </select>

            <label
              htmlFor="announcement"
              className="mb-2 block text-sm font-semibold text-[#17345f]"
            >
              Announcement Message
            </label>

            <textarea
              id="announcement"
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              className="min-h-20 w-full rounded-md border border-[#cfe0ff] px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder={`Write an announcement for ${selectedBatch}...`}
              required
            />

            <button
              type="submit"
              className="mt-3 w-full rounded-md bg-[#2864ed] px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Post to {selectedBatch}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-bold text-[#17345f]">
              Latest Announcement
            </h3>

            <div className="rounded-lg border border-[#d9e6ff] bg-blue-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  {selectedBatch}
                </span>

                {postedAt[selectedBatch] && (
                  <span className="text-xs text-slate-500">
                    {postedAt[selectedBatch]}
                  </span>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {announcements[selectedBatch] ||
                  "No announcement posted yet for this batch."}
              </p>

              <p className="mt-3 border-t border-blue-100 pt-2 text-xs text-slate-500">
                Latest announcement for {selectedBatch}
              </p>
            </div>
          </div>
        </Panel>


        {/* Student Performance - Full Width */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:col-span-2">
          {performanceData.map(({ batch, students }) => {
            const belowTarget = students.filter(
              ([, score]) => score < 70
            );

            return (
              <Panel
                key={batch}
                title={`Student Performance · ${batch}`}
              >
                <div className="flex h-full flex-col">
                  <div className="space-y-5">
                    {students.map(([name, score]) => (
                      <div key={name}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-700">
                            {name}
                          </span>

                          <span
                            className={`text-sm font-bold ${score < 70
                                ? "text-amber-700"
                                : "text-[#17345f]"
                              }`}
                          >
                            {score}%
                          </span>
                        </div>

                        <div
                          className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-label={`${name} performance`}
                          aria-valuenow={score}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${score < 70
                                ? "bg-amber-500"
                                : "bg-[#2864ed]"
                              }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Warning aligned at bottom */}
                  <div className="mt-auto pt-5">
                    {belowTarget.length > 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-800 sm:text-sm">
                          Attention Required
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-700 sm:text-sm">
                          {belowTarget.map(([name]) => name).join(" and ")}{" "}
                          {belowTarget.length === 1 ? "is" : "are"} below
                          the 70% target.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm font-medium text-blue-800">
                          All students meet the 70% target.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
        {/* Open Doubts */}
        <Panel title="Open Doubts">
          <div className="divide-y divide-slate-100">
            {doubts.map((doubt, index) => (
              <div
                key={`${doubt.student}-${doubt.title}`}
                className="py-3 first:pt-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17345f]">
                      {doubt.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {doubt.student} · {doubt.topic}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setReplying(index);
                      setReply("");
                    }}
                    className="shrink-0 rounded-md border border-[#8bb0ff] px-3 py-1.5 text-xs font-semibold text-[#2864ed] transition hover:bg-blue-50"
                  >
                    Reply
                  </button>
                </div>

                {replying === index && (
                  <form
                    onSubmit={sendReply}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Type a reply..."
                      required
                      className="min-w-0 flex-1 rounded-md border border-blue-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="submit"
                      aria-label="Send reply"
                      className="rounded-md bg-[#2864ed] px-3 text-white transition hover:bg-blue-700"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                )}
              </div>
            ))}

            {doubts.length === 0 && (
              <p className="py-3 text-sm text-slate-500">
                No open doubts in this demo.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
