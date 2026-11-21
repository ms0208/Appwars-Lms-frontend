
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  ClipboardList,
  Clock,
  Trophy,
  CheckCircle2,
  Play,
  RefreshCw,
  CalendarDays,
  AlertCircle,
  BookOpen,
} from "lucide-react";

import { assessmentApi } from "@/src/lib/assessmentApi";

const statusStyles = {
  "Not Started": "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Submitted: "bg-green-100 text-green-700",
  Expired: "bg-red-100 text-red-700",
};

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await assessmentApi(
        "/api/student/assessments"
      );

      setAssessments(response.assessments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const submitted = assessments.filter(
    (a) => a.status === "Submitted"
  ).length;

  const pending = assessments.filter(
    (a) =>
      a.status === "Not Started" ||
      a.status === "In Progress"
  ).length;

  const stats = [
    {
      label: "Total Assessments",
      value: assessments.length,
      icon: ClipboardList,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      color: "bg-orange-100 text-orange-700",
    },
    {
      label: "Completed",
      value: submitted,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">

      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <BookOpen size={16} />
              Student Portal
              <span>/</span>
              Assessments
            </div>

            <h1 className="text-2xl font-bold text-[#102e60] md:text-3xl">
              My Assessments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Complete your assigned MCQ assessments and check your performance.
            </p>

          </div>

          <button
            onClick={loadAssessments}
            className="flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </div>

        {/* Stats */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-sm text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-800">
                      {stat.value}
                    </p>
                  </div>

                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon size={23} />
                  </div>

                </div>

              </div>
            );
          })}

        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Assessment Cards */}

        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            Assigned Assessments
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw
              size={30}
              className="animate-spin text-[#102e60]"
            />
          </div>
        ) : assessments.length === 0 ? (

          <div className="rounded-xl border bg-white py-20 text-center">

            <ClipboardList
              size={45}
              className="mx-auto mb-3 text-slate-300"
            />

            <h3 className="font-bold text-slate-700">
              No Assessments Available
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your trainer has not published any assessments yet.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

            {assessments.map((assessment) => {

              const isSubmitted =
                assessment.status === "Submitted";

              const isExpired =
                assessment.status === "Expired";

              const isInProgress =
                assessment.status === "In Progress";

              return (
                <div
                  key={assessment._id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >

                  <div className="mb-4 flex items-start justify-between">

                    <div className="rounded-xl bg-blue-50 p-3 text-[#102e60]">
                      <ClipboardList size={25} />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[assessment.status] || "bg-slate-100 text-slate-600"}`}
                    >
                      {assessment.status}
                    </span>

                  </div>

                  <h3 className="text-lg font-bold text-slate-800">
                    {assessment.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">
                    {assessment.description || "MCQ Assessment"}
                  </p>

                  <div className="my-5 space-y-3 border-y py-4">

                    <div className="flex items-center justify-between text-sm">

                      <span className="flex items-center gap-2 text-slate-500">
                        <ClipboardList size={16} />
                        Questions
                      </span>

                      <span className="font-semibold text-slate-800">
                        {assessment.totalQuestions}
                      </span>

                    </div>

                    <div className="flex items-center justify-between text-sm">

                      <span className="flex items-center gap-2 text-slate-500">
                        <Trophy size={16} />
                        Total Marks
                      </span>

                      <span className="font-semibold text-slate-800">
                        {assessment.totalMarks}
                      </span>

                    </div>

                    {assessment.dueDate && (
                      <div className="flex items-center justify-between text-sm">

                        <span className="flex items-center gap-2 text-slate-500">
                          <CalendarDays size={16} />
                          Due Date
                        </span>

                        <span className="font-semibold text-slate-800">
                          {new Date(
                            assessment.dueDate
                          ).toLocaleDateString("en-IN")}
                        </span>

                      </div>
                    )}

                    {isSubmitted && (
                      <div className="flex items-center justify-between text-sm">

                        <span className="text-slate-500">
                          Your Score
                        </span>

                        <span className="font-bold text-green-700">
                          {assessment.obtainedMarks}/{assessment.totalMarks}
                          {" "}({assessment.percentage}%)
                        </span>

                      </div>
                    )}

                  </div>

                  <div className="mt-auto">

                    {isSubmitted ? (

                      <Link
                        href={`/assesments/${assessment._id}/result`}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 py-3 text-sm font-bold text-green-700 hover:bg-green-50"
                      >
                        <Trophy size={17} />
                        View Result
                      </Link>

                    ) : isExpired ? (

                      <button
                        disabled
                        className="w-full cursor-not-allowed rounded-lg bg-slate-100 py-3 text-sm font-semibold text-slate-400"
                      >
                        Deadline Expired
                      </button>

                    ) : (

                      <Link
                        href={`/assesments/${assessment._id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#102e60] py-3 text-sm font-bold text-white hover:bg-blue-900"
                      >
                        <Play size={17} />
                        {isInProgress
                          ? "Continue Assessment"
                          : "Start Assessment"}
                      </Link>

                    )}

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}
