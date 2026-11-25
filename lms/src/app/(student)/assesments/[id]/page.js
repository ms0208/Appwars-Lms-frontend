
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  ClipboardList,
  AlertCircle,
  Send,
  Save,
  RefreshCw,
  Trophy,
} from "lucide-react";

import Link from "next/link";
import { assessmentApi } from "@/src/lib/assessmentApi";

// ==========================================
// ASSESSMENT CONTENT
// ==========================================

function StudentAssessmentAttemptContent() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ==========================================
  // LOAD ASSESSMENT
  // ==========================================

  const loadAssessment = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await assessmentApi(
        `/api/student/assessments/${id}/start`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      if (!response?.success || !response?.assessment) {
        throw new Error("Unable to load assessment.");
      }

      const data = response.assessment;

      // Validate question and option IDs.
      const invalidQuestion = (data.questions || []).find(
        (question) =>
          !question._id ||
          !Array.isArray(question.options) ||
          question.options.some((option) => !option._id)
      );

      if (invalidQuestion) {
        throw new Error(
          "Assessment contains a question or option without a valid ID."
        );
      }

      setAssessment(data);

      // Restore saved MongoDB option IDs.
      const savedAnswers = {};

      (response.attempt?.answers || []).forEach((answer) => {
        if (
          answer.question &&
          answer.selectedOption !== null &&
          answer.selectedOption !== undefined
        ) {
          const questionId =
            typeof answer.question === "object"
              ? answer.question._id
              : answer.question;

          if (questionId) {
            savedAnswers[String(questionId)] = String(
              typeof answer.selectedOption === "object"
                ? answer.selectedOption._id
                : answer.selectedOption
            );
          }
        }
      });

      setAnswers(savedAnswers);
    } catch (err) {
      if (
        err.message?.toLowerCase().includes("already submitted")
      ) {
        router.replace(`/assesments/${id}/result`);
        return;
      }

      setError(err.message || "Failed to load assessment.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const questions = assessment?.questions || [];
  const question = questions[currentQuestion];

  // ==========================================
  // PROGRESS
  // ==========================================

  const answeredCount = questions.filter((item) =>
    Boolean(answers[String(item._id)])
  ).length;

  const unansweredCount = questions.length - answeredCount;

  const progress = questions.length
    ? (answeredCount / questions.length) * 100
    : 0;

  // ==========================================
  // SELECT ANSWER
  // ==========================================

  const selectAnswer = (optionId) => {
    if (saving || submitting || !question) return;

    const validOption = question.options.some(
      (option) => String(option._id) === String(optionId)
    );

    if (!validOption) {
      setError("Invalid option selected. Please try again.");
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [String(question._id)]: String(optionId),
    }));

    setError("");
    setNotice("");
  };

  // ==========================================
  // SAVE ONE ANSWER
  // ==========================================

  const saveAnswer = async (questionItem, selectedOptionId) => {
    if (!questionItem?._id || !selectedOptionId) {
      throw new Error("Please select a valid answer.");
    }

    const validOption = questionItem.options?.some(
      (option) =>
        String(option._id) === String(selectedOptionId)
    );

    if (!validOption) {
      throw new Error(
        "Selected option does not belong to this question."
      );
    }

    const payload = {
      questionId: String(questionItem._id),
      selectedOption: String(selectedOptionId),
    };

    console.log("Saving assessment answer:", {
      assessmentId: id,
      ...payload,
    });

    const response = await assessmentApi(
      `/api/student/assessments/${id}/save-answer`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    if (!response?.success) {
      throw new Error(
        response?.message || "Unable to save answer."
      );
    }

    return response;
  };

  // ==========================================
  // SAVE & NEXT
  // ==========================================

  const saveAndNext = async () => {
    if (!question) return;

    const selectedOptionId = answers[String(question._id)];

    if (!selectedOptionId) {
      setError("Please select an answer before continuing.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await saveAnswer(question, selectedOptionId);

      setNotice("Answer saved successfully.");

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      }
    } catch (err) {
      setError(err.message || "Failed to save answer.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // PREVIOUS QUESTION
  // ==========================================

  const goPrevious = () => {
    if (currentQuestion > 0 && !saving && !submitting) {
      setCurrentQuestion((prev) => prev - 1);
      setError("");
      setNotice("");
    }
  };

  // ==========================================
  // QUESTION NAVIGATION
  // ==========================================

  const goToQuestion = (index) => {
    if (saving || submitting) return;

    setCurrentQuestion(index);
    setError("");
    setNotice("");
  };

  // ==========================================
  // FINAL SUBMIT
  // ==========================================

  const handleSubmit = async () => {
    if (saving || submitting) return;

    const confirmed = window.confirm(
      `Are you sure you want to submit your assessment?\n\nAnswered: ${answeredCount}\nUnanswered: ${unansweredCount}\n\nYou cannot change your answers after submission.`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setError("");
      setNotice("");

      // Save all selected answers first.
      for (const questionItem of questions) {
        const selectedOptionId =
          answers[String(questionItem._id)];

        if (selectedOptionId) {
          await saveAnswer(questionItem, selectedOptionId);
        }
      }

      // Submit assessment.
      const response = await assessmentApi(
        `/api/student/assessments/${id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      if (response?.success) {
        router.replace(`/assesments/${id}/result`);
      } else {
        throw new Error(
          response?.message || "Assessment submission failed."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to submit assessment.");
      setSubmitting(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

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

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (error && !assessment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <AlertCircle
            size={42}
            className="mx-auto mb-4 text-red-500"
          />

          <h2 className="text-xl font-bold text-slate-800">
            Assessment Unavailable
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
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

  if (!assessment || !question) return null;

  const selectedOptionId = answers[String(question._id)];

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-7">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/assesments"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#102e60]"
            >
              <ArrowLeft size={16} />
              My Assessments
            </Link>

            <h1 className="text-xl font-bold text-[#102e60] md:text-2xl">
              {assessment.title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {assessment.instructions}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3">
            <ClipboardList
              size={20}
              className="text-[#102e60]"
            />

            <div>
              <p className="text-xs text-slate-500">
                Total Questions
              </p>

              <p className="font-bold text-slate-800">
                {questions.length}
              </p>
            </div>
          </div>
        </div>

        {/* PROGRESS */}

        <div className="mb-5 rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-semibold text-slate-700">
              Assessment Progress
            </span>

            <span className="font-bold text-[#102e60]">
              {answeredCount}/{questions.length} Answered
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#102e60] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 size={15} />
              Answered: {answeredCount}
            </span>

            <span className="flex items-center gap-1.5 text-orange-600">
              <Clock size={15} />
              Unanswered: {unansweredCount}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">

          {/* QUESTION PANEL */}

          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50 p-4 md:p-5">
              <span className="rounded-lg bg-[#102e60] px-4 py-2 text-sm font-bold text-white">
                Question {currentQuestion + 1}
              </span>

              <span className="text-sm font-semibold text-slate-500">
                {question.marks}{" "}
                {Number(question.marks) === 1 ? "Mark" : "Marks"}
              </span>
            </div>

            <div className="p-5 md:p-8">
              <h2 className="mb-7 text-lg font-bold leading-relaxed text-slate-800 md:text-xl">
                {question.questionText}
              </h2>

              {/* OPTIONS */}

              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const selected =
                    String(selectedOptionId || "") ===
                    String(option._id);

                  return (
                    <button
                      key={option._id}
                      type="button"
                      onClick={() => selectAnswer(option._id)}
                      disabled={saving || submitting}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-[#102e60] bg-blue-50 ring-1 ring-[#102e60]"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                      } disabled:cursor-not-allowed`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          selected
                            ? "bg-[#102e60] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>

                      <span
                        className={`flex-1 text-sm font-medium ${
                          selected
                            ? "text-[#102e60]"
                            : "text-slate-700"
                        }`}
                      >
                        {option.optionText}
                      </span>

                      {selected ? (
                        <CheckCircle2
                          size={21}
                          className="shrink-0 text-[#102e60]"
                        />
                      ) : (
                        <Circle
                          size={21}
                          className="shrink-0 text-slate-300"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  {error}
                </div>
              )}

              {/* SUCCESS NOTICE */}

              {notice && (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 size={17} />
                  {notice}
                </div>
              )}

              {/* NAVIGATION */}

              <div className="mt-8 flex flex-col justify-between gap-3 border-t pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={
                    currentQuestion === 0 ||
                    saving ||
                    submitting
                  }
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft size={17} />
                  Previous
                </button>

                {currentQuestion < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={saveAndNext}
                    disabled={saving || submitting}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={17} />
                    )}

                    {saving ? "Saving..." : "Save & Next"}

                    {!saving && <ArrowRight size={17} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving || submitting}
                    className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={17} />
                    )}

                    {submitting
                      ? "Submitting..."
                      : "Submit Assessment"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* QUESTION NAVIGATION */}

          <div className="h-fit rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800">
              Question Navigation
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((item, index) => {
                const isAnswered = Boolean(
                  answers[String(item._id)]
                );

                const isCurrent =
                  currentQuestion === index;

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => goToQuestion(index)}
                    disabled={saving || submitting}
                    className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition ${
                      isCurrent
                        ? "border-[#102e60] bg-[#102e60] text-white"
                        : isAnswered
                          ? "border-green-200 bg-green-100 text-green-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3 border-t pt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-[#102e60]" />
                Current Question
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-green-200" />
                Answered
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-slate-300" />
                Not Answered
              </div>
            </div>

            {/* SUMMARY */}

            <div className="mt-5 rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#102e60]">
                <Trophy size={17} />
                Assessment Summary
              </div>

              <div className="mt-3 flex justify-between text-xs text-slate-600">
                <span>Total Questions</span>
                <b>{questions.length}</b>
              </div>

              <div className="mt-2 flex justify-between text-xs text-green-700">
                <span>Answered</span>
                <b>{answeredCount}</b>
              </div>

              <div className="mt-2 flex justify-between text-xs text-orange-700">
                <span>Remaining</span>
                <b>{unansweredCount}</b>
              </div>
            </div>
          </div>
        </div>

        {/* FINAL SUBMIT */}

        <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800">
            Before you submit
          </p>

          <p className="mt-1 text-xs leading-relaxed text-orange-700">
            Review your answers carefully. Unanswered questions
            will receive zero marks. Once you submit, you cannot
            modify your responses.
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto sm:px-7"
          >
            {submitting ? (
              <RefreshCw size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}

            {submitting ? "Submitting..." : "Final Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PAGE EXPORT WITH SUSPENSE
// ==========================================

export default function StudentAssessmentAttemptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <RefreshCw
            size={32}
            className="animate-spin text-[#102e60]"
          />
        </div>
      }
    >
      <StudentAssessmentAttemptContent />
    </Suspense>
  );
}
