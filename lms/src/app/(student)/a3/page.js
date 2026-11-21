
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ClipboardList,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  UserRound,
  XCircle,
  AlertCircle,
  FileText,
  Target,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getToken = () => {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token")
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const getPercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.min(100, Math.max(0, number));
};

const getScoreColor = (percentage) => {
  if (percentage >= 75) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-500",
      light: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }

  if (percentage >= 40) {
    return {
      text: "text-amber-600",
      bg: "bg-amber-500",
      light: "bg-amber-50",
      border: "border-amber-200",
    };
  }

  return {
    text: "text-red-600",
    bg: "bg-red-500",
    light: "bg-red-50",
    border: "border-red-200",
  };
};

const getStatusStyle = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized === "present" ||
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "submitted"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized === "pending" ||
    normalized === "absent"
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-gray-100 text-gray-600 border-gray-200";
};

function ProgressBar({ percentage, color = "bg-blue-600" }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{
          width: `${getPercentage(percentage)}%`,
        }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
        >
          <Icon size={23} />
        </div>
      </div>

      {subtitle && (
        <p className="mt-3 text-xs text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ScoreCard({
  title,
  description,
  percentage,
  icon: Icon,
  stats,
}) {
  const colors = getScoreColor(percentage);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={22} />
          </div>

          <div>
            <h3 className="font-bold text-gray-900">
              {title}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.light} ${colors.text}`}
        >
          {percentage >= 75
            ? "Good"
            : percentage >= 40
              ? "Average"
              : "Needs Improvement"}
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <span className={`text-4xl font-bold ${colors.text}`}>
            {Number(percentage || 0).toFixed(1)}%
          </span>

          <p className="mt-1 text-xs text-gray-500">
            Performance
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">
            Score out of
          </p>

          <p className="text-xl font-bold text-gray-800">
            100
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar
          percentage={percentage}
          color={colors.bg}
        />
      </div>

      {stats && (
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
          {stats.map((stat, index) => (
            <div key={index}>
              <p className="text-xs text-gray-500">
                {stat.label}
              </p>

              <p className="mt-1 text-lg font-bold text-gray-800">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description, icon: Icon }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon size={20} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {title}
        </h2>

        <p className="text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-8 text-center">
      <FileText className="mx-auto text-gray-300" size={32} />

      <p className="mt-2 text-sm text-gray-500">
        {message}
      </p>
    </div>
  );
}

export default function StudentThreeAScorePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchScorecard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token not found. Please log in again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/student/progress/3a-scorecard`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to fetch 3A scorecard."
        );
      }

      setData(result);
    } catch (err) {
      console.error("3A Scorecard Error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw
            className="mx-auto animate-spin text-blue-700"
            size={36}
          />

          <p className="mt-4 font-medium text-gray-600">
            Loading your A3 scorecard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            className="mx-auto text-red-500"
            size={42}
          />

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Unable to Load Scorecard
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {error}
          </p>

          <button
            onClick={fetchScorecard}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data?.threeAScore) return null;

  const student = data.student || {};
  const batch = data.batch || {};

  const score = data.threeAScore;

  const assignment = score.assignment || {};
  const attendance = score.attendance || {};
  const assessment = score.assessment || {};
  const overall = score.overall || {};

  const overallPercentage = getPercentage(overall.score);

  const assignmentPercentage = getPercentage(
    assignment.percentage
  );

  const attendancePercentage = getPercentage(
    attendance.percentage
  );

  const assessmentPercentage = getPercentage(
    assessment.percentage
  );

  const overallColors = getScoreColor(overallPercentage);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* PAGE HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-large text-blue-700">Student</span>
              <span className="font-large text-blue-700">
                A3 Scorecard
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              My A3 Performance Score
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Track your performance across Assignments,
              Attendance and Assessments.
            </p>
          </div>

          <button
            onClick={fetchScorecard}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 sm:self-auto"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* STUDENT INFORMATION */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <UserRound size={28} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {student.name || "Student"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {student.email}
                </p>

                <p className="mt-1 text-xs font-medium text-gray-400">
                  ID: {student.userId || student._id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Batch
                </p>

                <p className="mt-1 font-bold text-gray-900">
                  {batch.batch || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Batch Status
                </p>

                <p className="mt-1 font-bold text-emerald-600">
                  {batch.status || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* OVERALL SCORE */}
        <div className="overflow-hidden rounded-2xl bg-[#102e60] p-6 text-white shadow-lg sm:p-8">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-blue-200">
                <Award size={21} />
                <span className="text-sm font-semibold">
                  Overall A3 Score
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-6xl font-bold tracking-tight">
                  {Number(overall.score || 0).toFixed(1)}
                </span>

                <span className="text-2xl text-blue-200">
                  / {overall.maximumScore || 100}
                </span>
              </div>

              <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">
                Your overall performance is calculated using
                your Assignment, Attendance and Assessment scores.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-blue-100">
                <Target size={16} />
                Equal weightage: 33.33% each
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div
                className="relative flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#34d399 ${overallPercentage * 3.6}deg, rgba(255,255,255,0.15) 0deg)`,
                }}
              >
                <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-[#102e60]">
                  <span className="text-4xl font-bold">
                    {overallPercentage.toFixed(1)}%
                  </span>

                  <span className="mt-1 text-sm text-blue-200">
                    Overall Score
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-blue-100">
                {overallPercentage >= 75
                  ? "Excellent performance"
                  : overallPercentage >= 40
                    ? "Keep improving"
                    : "More effort is needed"}
              </p>
            </div>
          </div>

          {/* SCORE BREAKDOWN */}
          <div className="mt-8 grid gap-4 border-t border-white/15 pt-6 sm:grid-cols-3">
            {[
              {
                title: "Assignment",
                value: assignmentPercentage,
              },
              {
                title: "Attendance",
                value: attendancePercentage,
              },
              {
                title: "Assessment",
                value: assessmentPercentage,
              },
            ].map((item) => (
              <div key={item.title}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-blue-100">
                    {item.title}
                  </span>

                  <span className="font-bold">
                    {item.value.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Assignments"
            value={assignment.total || 0}
            subtitle={`${assignment.completed || 0} completed`}
            icon={ClipboardList}
            color="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="Attendance"
            value={`${attendance.present || 0}/${attendance.totalClasses || 0}`}
            subtitle={`${attendance.absent || 0} classes absent`}
            icon={CalendarCheck}
            color="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Total Assessments"
            value={assessment.totalAssessments || 0}
            subtitle={`${assessment.attemptedAssessments || 0} submitted`}
            icon={BookOpen}
            color="bg-purple-50 text-purple-700"
          />

          <StatCard
            title="Marks Obtained"
            value={`${assessment.obtainedMarks || 0}/${assessment.totalMarks || 0}`}
            subtitle={`${assessment.pendingAssessments || 0} assessments pending`}
            icon={GraduationCap}
            color="bg-amber-50 text-amber-700"
          />
        </div>

        {/* THREE SCORE CARDS */}
        <div>
          <SectionHeader
            title="A3 Performance Breakdown"
            description="Your individual performance in all three categories."
            icon={TrendingUp}
          />

          <div className="grid gap-5 lg:grid-cols-3">
            <ScoreCard
              title="Assignment Score"
              description="Assignment completion"
              percentage={assignmentPercentage}
              icon={ClipboardList}
              stats={[
                {
                  label: "Total Assignments",
                  value: assignment.total || 0,
                },
                {
                  label: "Completed",
                  value: assignment.completed || 0,
                },
                {
                  label: "Pending",
                  value: assignment.pending || 0,
                },
                {
                  label: "Not Accessed",
                  value: assignment.notAccessed || 0,
                },
              ]}
            />

            <ScoreCard
              title="Attendance Score"
              description="Class attendance percentage"
              percentage={attendancePercentage}
              icon={CalendarCheck}
              stats={[
                {
                  label: "Total Classes",
                  value: attendance.totalClasses || 0,
                },
                {
                  label: "Present",
                  value: attendance.present || 0,
                },
                {
                  label: "Absent",
                  value: attendance.absent || 0,
                },
                {
                  label: "Attendance",
                  value: `${attendancePercentage}%`,
                },
              ]}
            />

            <ScoreCard
              title="Assessment Score"
              description="Submitted assessment marks"
              percentage={assessmentPercentage}
              icon={BookOpen}
              stats={[
                {
                  label: "Total Assessments",
                  value: assessment.totalAssessments || 0,
                },
                {
                  label: "Attempted",
                  value: assessment.attemptedAssessments || 0,
                },
                {
                  label: "Pending",
                  value: assessment.pendingAssessments || 0,
                },
                {
                  label: "Marks Obtained",
                  value: `${assessment.obtainedMarks || 0}/${assessment.totalMarks || 0}`,
                },
              ]}
            />
          </div>
        </div>

        {/* ASSIGNMENT DETAILS */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            title="Assignment Details"
            description="View your assignment completion status."
            icon={ClipboardList}
          />

          {assignment.details?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-4 py-3 font-semibold">
                      Assignment
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Due Date
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assignment.details.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">
                          {item.title || "Untitled Assignment"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(item.dueDate)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(item.progressStatus)}`}
                        >
                          {item.progressStatus || "Not Available"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No assignments found." />
          )}
        </section>

        {/* ATTENDANCE DETAILS */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            title="Attendance Details"
            description="Your daily class attendance records."
            icon={CalendarCheck}
          />

          {attendance.details?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-4 py-3 font-semibold">
                      Class Date
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendance.details.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-800">
                        {formatDate(item.date)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(item.status)}`}
                        >
                          {item.status === "Present" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}

                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">
                        {item.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No attendance records found." />
          )}
        </section>

        {/* ASSESSMENT DETAILS */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            title="Assessment Details"
            description="Track your assessment attempts and marks."
            icon={GraduationCap}
          />

          {assessment.details?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-4 py-3 font-semibold">
                      Assessment
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Questions
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Marks
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Percentage
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Submitted On
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assessment.details.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">
                          {item.title || "Untitled Assessment"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.totalQuestions || 0}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                        {item.obtainedMarks || 0}/
                        {item.totalMarks || 0}
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-gray-800">
                          {Number(item.percentage || 0).toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(item.status)}`}
                        >
                          {item.status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(item.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No assessments found." />
          )}
        </section>

        {/* FORMULA INFORMATION */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Target size={21} />
            </div>

            <div>
              <h3 className="font-bold text-gray-900">
                How is your A3 score calculated?
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Your overall score is the average of your three
                performance categories. Each category contributes
                equally to the final score.
              </p>

              <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
                <p className="text-sm font-semibold text-gray-800">
                  3A Score = (Assignment + Attendance + Assessment) / 3
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  ({assignmentPercentage.toFixed(1)} +{" "}
                  {attendancePercentage.toFixed(1)} +{" "}
                  {assessmentPercentage.toFixed(1)}) / 3 ={" "}
                  <span className="font-bold text-blue-700">
                    {overallPercentage.toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
