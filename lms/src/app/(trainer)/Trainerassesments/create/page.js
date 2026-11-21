
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ClipboardList,
  CheckCircle2,
  Circle,
  BookOpen,
  Clock,
  AlertCircle,
  X,
  Loader2,
  FileText,
} from "lucide-react";

import { assessmentApi } from "@/src/lib/assessmentApi";

// =====================================================
// GENERATE MONGODB-STYLE OBJECT ID
// =====================================================

const createMongoId = () => {
  if (
    typeof crypto !== "undefined" &&
    crypto.getRandomValues
  ) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
};

// =====================================================
// CREATE OPTION
// =====================================================

const createOption = () => ({
  _id: createMongoId(),
  optionText: "",
});

// =====================================================
// CREATE QUESTION
// =====================================================

const createQuestion = () => ({
  _id: createMongoId(),
  questionText: "",
  options: [
    createOption(),
    createOption(),
    createOption(),
    createOption(),
  ],
  correctOption: "0",
  marks: 1,
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function CreateAssessmentPage() {
  const router = useRouter();

  const [loadingBatches, setLoadingBatches] = useState(true);
  const [saving, setSaving] = useState(false);

  const [batches, setBatches] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    batch: "",
    dueDate: "",
    instructions: "",
    questions: [createQuestion()],
  });

  // =====================================================
  // FETCH TRAINER BATCHES
  // =====================================================

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      setError("");

      const response = await assessmentApi(
        "/api/trainer/batches"
      );

      const list = Array.isArray(response)
        ? response
        : Array.isArray(response.batches)
        ? response.batches
        : Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.batches)
        ? response.data.batches
        : [];

      setBatches(list);
    } catch (err) {
      console.error("Fetch batches error:", err);

      setError(
        err.message || "Unable to load your batches."
      );
    } finally {
      setLoadingBatches(false);
    }
  };

  // =====================================================
  // BASIC FORM HANDLERS
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // QUESTION HANDLERS
  // =====================================================

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        createQuestion(),
      ],
    }));
  };

  const removeQuestion = (questionIndex) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter(
        (_, index) => index !== questionIndex
      ),
    }));
  };

  const updateQuestion = (
    questionIndex,
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map(
        (question, index) =>
          index === questionIndex
            ? {
                ...question,
                [field]: value,
              }
            : question
      ),
    }));
  };

  // =====================================================
  // OPTION HANDLERS
  // =====================================================

  const addOption = (questionIndex) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map(
        (question, index) =>
          index === questionIndex
            ? {
                ...question,
                options: [
                  ...question.options,
                  createOption(),
                ],
              }
            : question
      ),
    }));
  };

  const removeOption = (
    questionIndex,
    optionIndex
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map(
        (question, index) => {
          if (index !== questionIndex) {
            return question;
          }

          if (question.options.length <= 2) {
            return question;
          }

          const updatedOptions =
            question.options.filter(
              (_, index) => index !== optionIndex
            );

          let updatedCorrectOption = Number(
            question.correctOption
          );

          if (updatedCorrectOption === optionIndex) {
            updatedCorrectOption = 0;
          } else if (
            updatedCorrectOption > optionIndex
          ) {
            updatedCorrectOption -= 1;
          }

          return {
            ...question,
            options: updatedOptions,
            correctOption: String(
              updatedCorrectOption
            ),
          };
        }
      ),
    }));
  };

  const updateOption = (
    questionIndex,
    optionIndex,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map(
        (question, index) =>
          index === questionIndex
            ? {
                ...question,
                options: question.options.map(
                  (option, index) =>
                    index === optionIndex
                      ? {
                          ...option,
                          optionText: value,
                        }
                      : option
                ),
              }
            : question
      ),
    }));
  };

  const setCorrectOption = (
    questionIndex,
    optionIndex
  ) => {
    updateQuestion(
      questionIndex,
      "correctOption",
      String(optionIndex)
    );
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Please enter an assessment title.";
    }

    if (!form.batch) {
      return "Please select a batch.";
    }

    if (form.questions.length === 0) {
      return "Please add at least one question.";
    }

    for (
      let questionIndex = 0;
      questionIndex < form.questions.length;
      questionIndex++
    ) {
      const question = form.questions[questionIndex];

      if (!question.questionText.trim()) {
        return `Please enter Question ${
          questionIndex + 1
        }.`;
      }

      if (question.options.length < 2) {
        return `Question ${
          questionIndex + 1
        } must have at least two options.`;
      }

      for (
        let optionIndex = 0;
        optionIndex < question.options.length;
        optionIndex++
      ) {
        if (
          !question.options[optionIndex].optionText.trim()
        ) {
          return `Please fill Option ${
            optionIndex + 1
          } in Question ${questionIndex + 1}.`;
        }
      }

      const correctIndex = Number(
        question.correctOption
      );

      if (
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= question.options.length
      ) {
        return `Please select the correct answer for Question ${
          questionIndex + 1
        }.`;
      }

      if (
        !Number(question.marks) ||
        Number(question.marks) <= 0
      ) {
        return `Please enter valid marks for Question ${
          questionIndex + 1
        }.`;
      }
    }

    if (
      form.dueDate &&
      new Date(form.dueDate) <= new Date()
    ) {
      return "The assessment deadline must be in the future.";
    }

    return "";
  };

  // =====================================================
  // CREATE ASSESSMENT
  // =====================================================

  const saveAssessment = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        batch: form.batch,

        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,

        instructions: form.instructions.trim(),

        questions: form.questions.map(
          (question) => ({
            questionText: question.questionText.trim(),

            options: question.options.map(
              (option) => ({
                _id: option._id,
                optionText: option.optionText.trim(),
              })
            ),

            // Backend expects the correct option ID,
            // not the numeric option index.
            correctOption:
              question.options[
                Number(question.correctOption)
              ]?._id,

            marks: Number(question.marks),
          })
        ),
      };

      const response = await assessmentApi(
        "/api/trainer/assessments",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Assessment creation failed."
        );
      }

      setSuccess(
        response.message ||
          "Assessment created successfully!"
      );

      // Redirect to the actual listing URL.
      setTimeout(() => {
        router.push("/Trainerassesments");
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error(
        "Create assessment error:",
        err
      );

      setError(
        err.message ||
          "Unable to create assessment."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CALCULATED VALUES
  // =====================================================

  const totalMarks = form.questions.reduce(
    (total, question) =>
      total + Number(question.marks || 0),
    0
  );

  const selectedBatch = batches.find(
    (batch) =>
      String(batch._id) === String(form.batch)
  );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div className="mb-6">
          <Link
            href="/Trainerassesments"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#102e60]"
          >
            <ArrowLeft size={17} />
            Back to Assessments
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-xl bg-blue-100 p-2.5 text-[#102e60]">
                  <ClipboardList size={23} />
                </div>

                <span className="text-sm font-semibold text-[#102e60]">
                  Assessment Management
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Create Assessment
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Create an MCQ assessment and assign it
                to your batch.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="rounded-lg bg-blue-50 p-2 text-[#102e60]">
                <BookOpen size={20} />
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Total Questions
                </p>

                <p className="text-lg font-bold text-slate-900">
                  {form.questions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <p className="flex-1">{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} />
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={saveAssessment}>

          {/* BASIC INFORMATION */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-[#102e60]">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Basic Information
                </h2>

                <p className="text-xs text-slate-500">
                  Enter the assessment details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* TITLE */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Assessment Title
                  <span className="text-red-500"> *</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. MERN Stack Fundamentals Assessment"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* DESCRIPTION */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter assessment description..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* BATCH */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Select Batch
                  <span className="text-red-500"> *</span>
                </label>

                <select
                  name="batch"
                  value={form.batch}
                  onChange={handleChange}
                  disabled={loadingBatches}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#102e60] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  required
                >
                  <option value="">
                    {loadingBatches
                      ? "Loading batches..."
                      : "Select a batch"}
                  </option>

                  {batches.map((batch) => (
                    <option
                      key={batch._id}
                      value={batch._id}
                    >
                      {batch.batch ||
                        batch.batchName ||
                        batch.name ||
                        "Unnamed Batch"}

                      {batch.course?.courseName
                        ? ` - ${batch.course.courseName}`
                        : ""}
                    </option>
                  ))}
                </select>

                {!loadingBatches &&
                  batches.length === 0 && (
                    <p className="mt-2 text-xs text-red-500">
                      No batches found. Please check
                      your trainer batch API.
                    </p>
                  )}
              </div>

              {/* DEADLINE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Assessment Deadline
                </label>

                <div className="relative">
                  <Clock
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                    min={new Date(
                      Date.now() -
                        new Date().getTimezoneOffset() *
                          60000
                    )
                      .toISOString()
                      .slice(0, 16)}
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* INSTRUCTIONS */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Instructions
                </label>

                <textarea
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter instructions for students..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* QUESTION SECTION */}

          <section className="mb-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Assessment Questions
                </h2>

                <p className="text-sm text-slate-500">
                  Add MCQ questions and select the
                  correct answer.
                </p>
              </div>

              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173d7a]"
              >
                <Plus size={17} />
                Add Question
              </button>
            </div>

            {/* QUESTION STATISTICS */}

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Total Questions
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {form.questions.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Total Marks
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {totalMarks}
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1">
                <p className="text-xs text-slate-500">
                  Question Type
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  MCQ
                </p>
              </div>
            </div>

            {/* QUESTIONS */}

            <div className="space-y-5">
              {form.questions.map(
                (question, questionIndex) => (
                  <div
                    key={question._id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* QUESTION HEADER */}

                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#102e60] text-sm font-bold text-white">
                          {questionIndex + 1}
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Question {questionIndex + 1}
                          </h3>

                          <p className="text-xs text-slate-500">
                            Multiple Choice Question
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeQuestion(questionIndex)
                        }
                        disabled={
                          form.questions.length === 1
                        }
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Remove Question"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-5 p-5">

                      {/* QUESTION TEXT */}

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Question
                          <span className="text-red-500">
                            {" "}*
                          </span>
                        </label>

                        <textarea
                          value={question.questionText}
                          onChange={(e) =>
                            updateQuestion(
                              questionIndex,
                              "questionText",
                              e.target.value
                            )
                          }
                          rows={3}
                          placeholder="Enter your question..."
                          className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      {/* OPTIONS */}

                      <div>
                        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div>
                            <label className="text-sm font-semibold text-slate-700">
                              Answer Options
                            </label>

                            <p className="text-xs text-slate-500">
                              Select the radio button next
                              to the correct answer.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              addOption(questionIndex)
                            }
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#102e60] hover:text-blue-800"
                          >
                            <Plus size={16} />
                            Add Option
                          </button>
                        </div>

                        <div className="space-y-3">
                          {question.options.map(
                            (option, optionIndex) => {
                              const isCorrect =
                                Number(
                                  question.correctOption
                                ) === optionIndex;

                              return (
                                <div
                                  key={option._id}
                                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                                    isCorrect
                                      ? "border-green-300 bg-green-50"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCorrectOption(
                                        questionIndex,
                                        optionIndex
                                      )
                                    }
                                    className={`shrink-0 transition ${
                                      isCorrect
                                        ? "text-green-600"
                                        : "text-slate-300 hover:text-[#102e60]"
                                    }`}
                                    title="Set as correct answer"
                                  >
                                    {isCorrect ? (
                                      <CheckCircle2 size={22} />
                                    ) : (
                                      <Circle size={22} />
                                    )}
                                  </button>

                                  <span className="w-7 shrink-0 text-sm font-bold text-slate-500">
                                    {String.fromCharCode(
                                      65 + optionIndex
                                    )}
                                  </span>

                                  <input
                                    type="text"
                                    value={option.optionText}
                                    onChange={(e) =>
                                      updateOption(
                                        questionIndex,
                                        optionIndex,
                                        e.target.value
                                      )
                                    }
                                    placeholder={`Enter option ${
                                      optionIndex + 1
                                    }`}
                                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                                  />

                                  {isCorrect && (
                                    <span className="hidden shrink-0 text-xs font-semibold text-green-700 sm:inline">
                                      Correct Answer
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOption(
                                        questionIndex,
                                        optionIndex
                                      )
                                    }
                                    disabled={
                                      question.options.length <= 2
                                    }
                                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-20"
                                    title="Remove Option"
                                  >
                                    <X size={17} />
                                  </button>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* MARKS */}

                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Marks for this question
                          </label>

                          <p className="text-xs text-slate-500">
                            Set the marks awarded for
                            the correct answer.
                          </p>
                        </div>

                        <input
                          type="number"
                          min="1"
                          value={question.marks}
                          onChange={(e) =>
                            updateQuestion(
                              questionIndex,
                              "marks",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100 sm:w-28"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* ADD QUESTION BOTTOM */}

            <button
              type="button"
              onClick={addQuestion}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-600 transition hover:border-[#102e60] hover:bg-blue-50 hover:text-[#102e60]"
            >
              <Plus size={18} />
              Add Another Question
            </button>
          </section>

          {/* SUMMARY */}

          <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList
                size={19}
                className="text-[#102e60]"
              />

              <h3 className="font-bold text-[#102e60]">
                Assessment Summary
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">
                  Questions
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {form.questions.length}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Total Marks
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {totalMarks}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500">
                  Selected Batch
                </p>

                <p className="mt-1 truncate text-lg font-bold text-slate-900">
                  {selectedBatch?.batch ||
                    selectedBatch?.batchName ||
                    "Not selected"}
                </p>
              </div>
            </div>
          </section>

          {/* ACTION BUTTONS */}

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-5 sm:flex-row">

            {/* CANCEL */}

            <Link
              href="/Trainerassesments"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                saving ||
                loadingBatches ||
                batches.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173d7a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Creating Assessment...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create Assessment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
