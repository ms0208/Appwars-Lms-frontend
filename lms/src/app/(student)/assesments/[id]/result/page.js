
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Award,
  CircleHelp,
} from "lucide-react";

import { assessmentApi } from "@/src/lib/assessmentApi";

export default function StudentAssessmentResultPage() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResult = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await assessmentApi(
        `/api/student/assessments/${id}/result`
      );

      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw
          size={32}
          className="animate-spin text-[#102e60]"
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">

        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">

          <AlertCircle
            size={40}
            className="mx-auto mb-4 text-red-500"
          />

          <h2 className="text-xl font-bold text-slate-800">
            Result Unavailable
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "Unable to load your result."}
          </p>

          <Link
            href="/assesments"
            className="mt-5 inline-block rounded-lg bg-[#102e60] px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Assessments
          </Link>

        </div>

      </div>
    );
  }

  const result = data.result;
  const percentage = result.percentage || 0;

  const getPerformance = () => {
    if (percentage >= 90) return "Outstanding Performance!";
    if (percentage >= 75) return "Excellent Performance!";
    if (percentage >= 60) return "Good Performance!";
    if (percentage >= 40) return "Keep Practicing!";
    return "Keep Learning and Improving!";
  };

  const stats = [
    {
      title: "Correct Answers",
      value: result.correctAnswers,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Incorrect Answers",
      value: result.incorrectAnswers,
      icon: XCircle,
      color: "bg-red-100 text-red-700",
    },
    {
      title: "Unanswered",
      value: result.unansweredQuestions,
      icon: Clock,
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "Total Questions",
      value: result.totalQuestions,
      icon: ClipboardList,
      color: "bg-blue-100 text-blue-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">

      <div className="mx-auto max-w-5xl">

        <Link
          href="/assesments"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#102e60]"
        >
          <ArrowLeft size={17} />
          Back to Assessments
        </Link>

        {/* Result Header */}

        <div className="mb-6 overflow-hidden rounded-2xl bg-[#102e60] p-7 text-center text-white md:p-10">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <Trophy size={34} />
          </div>

          <p className="text-sm font-medium text-blue-100">
            Assessment Submitted Successfully
          </p>

          <h1 className="mt-3 text-2xl font-bold md:text-3xl">
            {getPerformance()}
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            {data.assessment?.title}
          </p>

          <div className="mx-auto mt-7 max-w-xs">

            <p className="text-5xl font-extrabold">
              {percentage.toFixed(2)}%
            </p>

            <p className="mt-2 text-sm text-blue-100">
              Your Overall Score
            </p>

          </div>

          <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-green-400 transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, percentage))}%`,
              }}
            />
          </div>

          <p className="mt-4 text-sm font-semibold">
            {result.obtainedMarks} / {result.totalMarks} Marks
          </p>

        </div>

        {/* Performance Stats */}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">

          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >

                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon size={21} />
                </div>

                <p className="text-2xl font-bold text-slate-800">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stat.title}
                </p>

              </div>
            );
          })}

        </div>

        {/* Result Details */}

        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">

          <h2 className="mb-5 font-bold text-slate-800">
            Performance Summary
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-700">
                Marks Obtained
              </p>
              <p className="mt-1 text-2xl font-bold text-green-800">
                {result.obtainedMarks}
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Maximum Marks
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-800">
                {result.totalMarks}
              </p>
            </div>

          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">

            <div className="flex justify-between border-b py-2">
              <span className="text-slate-500">
                Attempted Questions
              </span>
              <b className="text-slate-800">
                {result.attemptedQuestions}
              </b>
            </div>

            <div className="flex justify-between border-b py-2">
              <span className="text-slate-500">
                Submission Date
              </span>
              <b className="text-slate-800">
                {result.submittedAt
                  ? new Date(result.submittedAt).toLocaleString("en-IN")
                  : "-"}
              </b>
            </div>

          </div>

        </div>

        {/* Answer Review */}

        <div className="rounded-xl border bg-white shadow-sm">

          <div className="border-b p-5">

            <div className="flex items-center gap-2">

              <Award
                size={22}
                className="text-[#102e60]"
              />

              <h2 className="font-bold text-slate-800">
                Review Your Answers
              </h2>

            </div>

            <p className="mt-1 text-xs text-slate-500">
              Compare your selected answers with the correct answers.
            </p>

          </div>

          <div className="space-y-4 p-4 md:p-5">

            {data.answerSheet?.map((question, index) => {

              const correct =
                question.isCorrect === true;

              const unanswered =
                question.selectedOption === null ||
                question.selectedOption === undefined;

              return (
                <div
                  key={question.questionId}
                  className={`rounded-xl border p-4 ${
                    correct
                      ? "border-green-200"
                      : "border-red-200"
                  }`}
                >

                  <div className="mb-4 flex items-start justify-between gap-3">

                    <h3 className="text-sm font-bold leading-relaxed text-slate-800">
                      Q{index + 1}. {question.questionText}
                    </h3>

                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      correct
                        ? "bg-green-100 text-green-700"
                        : unanswered
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                    }`}>
                      {correct
                        ? "Correct"
                        : unanswered
                          ? "Unanswered"
                          : "Incorrect"}
                    </span>

                  </div>

                  <div className="space-y-2">

                    {question.options.map((option, optionIndex) => {

                      const isCorrect =
                        Number(optionIndex) ===
                        Number(question.correctOption);

                      const isSelected =
                        Number(optionIndex) ===
                        Number(question.selectedOption) &&
                        !unanswered;

                      return (
                        <div
                          key={option._id}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                            isCorrect
                              ? "border-green-300 bg-green-50 text-green-800"
                              : isSelected
                                ? "border-red-300 bg-red-50 text-red-800"
                                : "border-slate-100 text-slate-600"
                          }`}
                        >

                          {isCorrect ? (
                            <CheckCircle2
                              size={18}
                              className="shrink-0 text-green-600"
                            />
                          ) : isSelected ? (
                            <XCircle
                              size={18}
                              className="shrink-0 text-red-600"
                            />
                          ) : (
                            <CircleHelp
                              size={18}
                              className="shrink-0 text-slate-300"
                            />
                          )}

                          <span className="flex-1">
                            {String.fromCharCode(65 + optionIndex)}.{" "}
                            {option.optionText}
                          </span>

                          {isCorrect && (
                            <span className="text-xs font-bold">
                              Correct Answer
                            </span>
                          )}

                          {isSelected && !isCorrect && (
                            <span className="text-xs font-bold">
                              Your Answer
                            </span>
                          )}

                        </div>
                      );
                    })}

                  </div>

                  <div className="mt-3 flex justify-between border-t pt-3 text-xs text-slate-500">

                    <span>
                      Marks: {question.marksObtained}/{question.marks}
                    </span>

                    <span className={
                      correct
                        ? "font-bold text-green-700"
                        : "font-bold text-red-600"
                    }>
                      {correct ? "Well done!" : "Review this question"}
                    </span>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        <div className="mt-6 text-center">

          <Link
            href="/assesments"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-7 py-3 font-semibold text-white hover:bg-blue-900"
          >
            <ArrowLeft size={17} />
            Back to My Assessments
          </Link>

        </div>

      </div>

    </div>
  );
}
