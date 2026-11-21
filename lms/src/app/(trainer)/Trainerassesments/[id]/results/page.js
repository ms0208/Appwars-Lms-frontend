
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

import { assessmentApi } from "@/src/lib/assessmentApi";

export default function TrainerAssessmentResultsPage() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [answerSheet, setAnswerSheet] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await assessmentApi(
        `/api/trainer/assessments/${id}/results`
      );

      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const viewAnswerSheet = async (studentId) => {
    try {
      setSelectedStudent(studentId);
      setSheetLoading(true);
      setAnswerSheet(null);

      const response = await assessmentApi(
        `/api/trainer/assessments/${id}/results/${studentId}`
      );

      setAnswerSheet(response);
    } catch (err) {
      alert(err.message);
      setSelectedStudent(null);
    } finally {
      setSheetLoading(false);
    }
  };

  const results = data?.results || [];

  const average = results.length
    ? (
        results.reduce(
          (sum, item) => sum + item.percentage,
          0
        ) / results.length
      ).toFixed(2)
    : 0;

  const highest = results.length
    ? Math.max(...results.map((item) => item.percentage))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">

      <div className="mx-auto max-w-7xl">

        <Link
          href="/Trainerassessments"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#102e60]"
        >
          <ArrowLeft size={17} />
          Back to Assessments
        </Link>

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>
            <h1 className="text-2xl font-bold text-[#102e60] md:text-3xl">
              Assessment Results
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {data?.assessment?.title || "Student performance"}
            </p>
          </div>

          <button
            onClick={loadResults}
            className="flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <RefreshCw size={16} />
            Refresh Results
          </button>

        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="animate-spin text-[#102e60]" size={30} />
          </div>
        ) : (
          <>

            {/* Stats */}

            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {[
                {
                  label: "Submissions",
                  value: results.length,
                  icon: Users,
                  color: "text-blue-700 bg-blue-100",
                },
                {
                  label: "Average Score",
                  value: `${average}%`,
                  icon: TrendingUp,
                  color: "text-purple-700 bg-purple-100",
                },
                {
                  label: "Highest Score",
                  value: `${highest}%`,
                  icon: Trophy,
                  color: "text-green-700 bg-green-100",
                },
                {
                  label: "Total Marks",
                  value: data?.assessment?.totalMarks || 0,
                  icon: ClipboardList,
                  color: "text-orange-700 bg-orange-100",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-800">
                          {item.value}
                        </p>
                      </div>

                      <div className={`rounded-xl p-3 ${item.color}`}>
                        <Icon size={23} />
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>

            {/* Results Table */}

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

              <div className="border-b p-5">
                <h2 className="font-bold text-slate-800">
                  Student Performance
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  View individual student answer sheets.
                </p>
              </div>

              {results.length === 0 ? (
                <div className="py-16 text-center">
                  <Users
                    size={40}
                    className="mx-auto mb-3 text-slate-300"
                  />
                  <p className="font-semibold text-slate-700">
                    No submissions yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Student results will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[800px] text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Student</th>
                        <th className="px-5 py-4">Correct</th>
                        <th className="px-5 py-4">Incorrect</th>
                        <th className="px-5 py-4">Marks</th>
                        <th className="px-5 py-4">Percentage</th>
                        <th className="px-5 py-4">Submitted</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">

                      {results.map((item) => (
                        <tr key={item.attemptId} className="hover:bg-slate-50">

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {item.student?.name ||
                                item.student?.fullName ||
                                "Student"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.student?.userId ||
                                item.student?.email ||
                                ""}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-semibold text-green-700">
                            {item.correctAnswers}
                          </td>

                          <td className="px-5 py-4 font-semibold text-red-600">
                            {item.incorrectAnswers}
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {item.obtainedMarks}/{item.totalMarks}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.percentage >= 75
                                ? "bg-green-100 text-green-700"
                                : item.percentage >= 40
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}>
                              {item.percentage}%
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleString("en-IN")
                              : "-"}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() =>
                                viewAnswerSheet(item.student?._id)
                              }
                              className="flex items-center gap-1.5 rounded-lg bg-[#102e60] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                            >
                              <Eye size={14} />
                              View Answers
                            </button>
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </>
        )}

        {/* Answer Sheet Modal */}

        {selectedStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 md:p-6"
            onClick={() => {
              setSelectedStudent(null);
              setAnswerSheet(null);
            }}
          >

            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
                <div>
                  <h2 className="font-bold text-slate-800">
                    Student Answer Sheet
                  </h2>
                  <p className="text-xs text-slate-500">
                    {answerSheet?.student?.name ||
                      answerSheet?.student?.fullName ||
                      "Student"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setAnswerSheet(null);
                  }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {sheetLoading ? (
                <div className="flex justify-center py-16">
                  <RefreshCw className="animate-spin text-[#102e60]" />
                </div>
              ) : answerSheet ? (
                <div className="p-5">

                  <div className="mb-5 grid grid-cols-3 gap-3">

                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-slate-500">Score</p>
                      <p className="font-bold text-blue-800">
                        {answerSheet.result.obtainedMarks}/
                        {answerSheet.result.totalMarks}
                      </p>
                    </div>

                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-xs text-slate-500">Correct</p>
                      <p className="font-bold text-green-700">
                        {answerSheet.result.correctAnswers}
                      </p>
                    </div>

                    <div className="rounded-lg bg-red-50 p-3">
                      <p className="text-xs text-slate-500">Incorrect</p>
                      <p className="font-bold text-red-700">
                        {answerSheet.result.incorrectAnswers}
                      </p>
                    </div>

                  </div>

                  <div className="space-y-4">

                    {answerSheet.answerSheet?.map((question, index) => (

                      <div
                        key={question.questionId}
                        className="rounded-xl border p-4"
                      >

                        <h3 className="mb-3 text-sm font-bold text-slate-800">
                          Q{index + 1}. {question.questionText}
                        </h3>

                        <div className="space-y-2">

                          {question.options.map((option, optionIndex) => {

                            const isCorrect =
                              String(option._id) ===
                              String(question.correctOption);

                            const isSelected =
                              String(option._id) ===
                              String(question.selectedOption);

                            return (
                              <div
                                key={option._id}
                                className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                                  isCorrect
                                    ? "border-green-400 bg-green-50 text-green-800"
                                    : isSelected
                                      ? "border-red-300 bg-red-50 text-red-700"
                                      : "border-slate-100 text-slate-600"
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle2 size={17} />
                                ) : isSelected ? (
                                  <XCircle size={17} />
                                ) : (
                                  <span className="w-[17px]" />
                                )}

                                <span>
                                  {String.fromCharCode(65 + optionIndex)}.{" "}
                                  {option.optionText}
                                </span>

                                {isSelected && (
                                  <span className="ml-auto text-xs font-semibold">
                                    Student selected
                                  </span>
                                )}

                                {isCorrect && (
                                  <span className="ml-auto text-xs font-semibold">
                                    Correct answer
                                  </span>
                                )}
                              </div>
                            );
                          })}

                        </div>

                        <div className="mt-3 text-xs font-semibold text-slate-500">
                          Marks: {question.marksObtained}/{question.marks}
                        </div>

                      </div>

                    ))}

                  </div>

                </div>
              ) : null}

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
