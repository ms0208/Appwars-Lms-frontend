
"use client";

import { useState } from "react";
import { X, CalendarDays, Users, Clock3 } from "lucide-react";
import StatCard from "@/src/components/student/StatCard";
import RankCard from "@/src/components/student/RankCard";
import CourseProgress from "@/src/components/student/CourseProgress";
import LiveClassSchedule from "@/src/components/student/LiveClassSchedule";
import Announcements from "@/src/components/student/Announcements";
import BatchDetailsModal from "@/src/components/student/BatchDetailsModal";

const stats = [
  {
    title: "Overall progress",
    value: "68%",
    subtitle: "",
    progress: 68,
  },
  {
    title: "Attendance",
    value: "92%",
    subtitle: "24 of 26 classes",
  },
  {
    title: "Pending assignments",
    value: "3",
    subtitle: "Next due in 2 days",
  },
  {
    title: "Next live class",
    value: "Today",
    subtitle: "6:00 PM · Node.js APIs",
  },
];

export default function DashboardPage() {
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [notice, setNotice] = useState("");

  function handleJoin(className) {
    setNotice(
      `${className}: add your meeting URL to enable joining the live session.`
    );
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102e60] sm:text-3xl">
            Welcome back, Aarav
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Batch MERN-07 · Mon–Fri, 6:00 PM · Trainer: [Trainer Name]
          </p>
        </div>

        <button
          onClick={() => handleJoin("Node.js APIs")}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:text-base"
        >
          Join live class
        </button>
      </header>

      {/* Notification */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:text-base"
        >
          <p>{notice}</p>

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
            className="shrink-0 rounded-md p-1 hover:bg-blue-100"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}

        <RankCard rank={1} total={32} />
      </section>

      {/* Course Progress and Right Sidebar */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <CourseProgress
          onDetails={() => setShowBatchDetails(true)}
        />

        <div className="flex min-w-0 flex-col gap-5">
          <LiveClassSchedule onJoin={handleJoin} />

          <Announcements />
        </div>
      </div>

      {/* Batch Information */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Batch Duration */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <CalendarDays className="text-blue-600" size={26} />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              Batch duration
            </p>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              12 Jan – 28 Jun
            </p>
          </div>
        </div>

        {/* Batch Size */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Users className="text-blue-600" size={26} />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              Batch size
            </p>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              32 students
            </p>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Clock3 className="text-blue-600" size={26} />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              Weekly schedule
            </p>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Monday to Friday · 6 PM
            </p>
          </div>
        </div>
      </section>

      {/* Batch Details Modal */}
      {showBatchDetails && (
        <BatchDetailsModal
          onClose={() => setShowBatchDetails(false)}
        />
      )}
    </main>
  );
}
