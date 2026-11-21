
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ClipboardList,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  FileEdit,
  Eye,
  RefreshCw,
  AlertCircle,
  XCircle,
  BarChart3,
  CalendarDays,
  BookOpen,
  Send,
} from "lucide-react";

import { assessmentApi } from "@/src/lib/assessmentApi";

const statusStyles = {
  Draft: "bg-slate-100 text-slate-700",
  Published: "bg-green-100 text-green-700",
  Closed: "bg-red-100 text-red-700",
};

export default function TrainerAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await assessmentApi(
        "/api/trainer/assessments"
      );

      setAssessments(response.assessments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleStatusChange = async (id, action) => {
    const confirmed = window.confirm(
      action === "publish"
        ? "Publish this assessment to students?"
        : "Close this assessment?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(id);

      await assessmentApi(
        `/api/trainer/assessments/${id}/${action}`,
        { method: "PATCH" }
      );

      await fetchAssessments();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft assessment?")) {
      return;
    }

    try {
      setActionLoading(id);

      await assessmentApi(
        `/api/trainer/assessments/${id}`,
        { method: "DELETE" }
      );

      await fetchAssessments();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const stats = [
    {
      title: "Total Assessments",
      value: assessments.length,
      icon: ClipboardList,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Published",
      value: assessments.filter(
        (a) => a.status === "Published"
      ).length,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Total Submissions",
      value: assessments.reduce(
        (sum, a) => sum + (a.submissionCount || 0),
        0
      ),
      icon: Users,
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "Drafts",
      value: assessments.filter(
        (a) => a.status === "Draft"
      ).length,
      icon: FileEdit,
      color: "bg-orange-100 text-orange-700",
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
              Trainer Portal
              <span>/</span>
              Assessments
            </div>

            <h1 className="text-2xl font-bold text-[#102e60] md:text-3xl">
              Assessments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create MCQ tests and monitor student performance.
            </p>
          </div>

          <div className="flex gap-2">

            <button
              onClick={fetchAssessments}
              className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <Link
              href="/Trainerassesments/create"
              className="flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              <Plus size={18} />
              Create Assessment
            </Link>

          </div>
        </div>

        {/* Stats */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-sm text-slate-500">
                      {stat.title}
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-slate-800">
                      {stat.value}
                    </h2>
                  </div>

                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon size={23} />
                  </div>

                </div>
              </div>
            );
          })}

        </div>

        {/* Error */}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Assessment List */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-bold text-slate-800">
                All Assessments
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Manage your assessment activities
              </p>
            </div>

            <ClipboardList
              className="text-[#102e60]"
              size={22}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw
                className="animate-spin text-[#102e60]"
                size={30}
              />
            </div>
          ) : assessments.length === 0 ? (
            <div className="py-16 text-center">

              <ClipboardList
                size={45}
                className="mx-auto mb-3 text-slate-300"
              />

              <h3 className="font-semibold text-slate-700">
                No assessments created
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create your first MCQ assessment.
              </p>

              <Link
                href="/Trainerassesments/create"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#102e60] px-5 py-2.5 text-sm text-white"
              >
                <Plus size={17} />
                Create Assessment
              </Link>

            </div>
          ) : (

            <div className="divide-y divide-slate-100">

              {assessments.map((assessment) => (

                <div
                  key={assessment._id}
                  className="p-5 transition hover:bg-slate-50"
                >

                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                    {/* Information */}

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-base font-bold text-slate-800">
                          {assessment.title}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[assessment.status] || "bg-slate-100 text-slate-600"}`}
                        >
                          {assessment.status}
                        </span>

                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {assessment.description || "No description provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">

                        <span className="flex items-center gap-1.5">
                          <Users size={14} />
                          {assessment.batch?.batch || assessment.batch?.courseName || "Batch"}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <ClipboardList size={14} />
                          {assessment.questions?.length || 0} Questions
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Trophy size={14} />
                          {assessment.totalMarks || 0} Marks
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Send size={14} />
                          {assessment.submissionCount || 0} Submissions
                        </span>

                        <span className="flex items-center gap-1.5">
                          <BarChart3 size={14} />
                          Avg. {assessment.averagePercentage || 0}%
                        </span>

                        {assessment.dueDate && (
                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {new Date(assessment.dueDate).toLocaleDateString("en-IN")}
                          </span>
                        )}

                      </div>

                    </div>

                    {/* Actions */}

                    <div className="flex flex-wrap items-center gap-2">

                      {assessment.status === "Draft" && (
                        <>
                          <button
                            onClick={() => handleDelete(assessment._id)}
                            disabled={actionLoading === assessment._id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(assessment._id, "publish")
                            }
                            disabled={actionLoading === assessment._id}
                            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <Send size={14} />
                            Publish
                          </button>
                        </>
                      )}

                      {assessment.status === "Published" && (
                        <button
                          onClick={() =>
                            handleStatusChange(assessment._id, "close")
                          }
                          disabled={actionLoading === assessment._id}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle size={15} />
                          Close
                        </button>
                      )}

                      <Link
                        href={`/Trainerassesments/${assessment._id}/results`}
                        className="flex items-center gap-1.5 rounded-lg bg-[#102e60] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                      >
                        <Eye size={15} />
                        Results
                      </Link>

                    </div>

                  </div>

                </div>

              ))}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
