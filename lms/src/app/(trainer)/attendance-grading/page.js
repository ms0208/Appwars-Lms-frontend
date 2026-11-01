"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle, BookOpen, CalendarDays, Check, CheckCircle2,
  ClipboardCheck, Download, FileText, GraduationCap, LoaderCircle,
  RefreshCw, Save, Search, Users,
} from "lucide-react";

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API_URL = API_ROOT.endsWith("/api") ? API_ROOT : `${API_ROOT}/api`;

function getToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("token") || localStorage.getItem("token") || "";
}

async function trainerRequest(endpoint, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Login session not found. Please sign in again.");

  const response = await fetch(`${API_URL}/trainer${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

function unwrap(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  return [];
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const styles = {
    Present: "bg-green-100 text-green-700",
    Absent: "bg-red-100 text-red-700",
    Pending: "bg-amber-100 text-amber-700",
    Graded: "bg-green-100 text-green-700",
    "Needs revision": "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {status || "Pending"}
    </span>
  );
}

function Notice({ type = "error", children }) {
  const isError = type === "error";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${isError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
      {isError ? (
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}

function AttendanceGradingContent() {
  const searchParams = useSearchParams();
  const requestedBatchId = searchParams.get("batchId") || "";

  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(requestedBatchId);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [searchSubmission, setSearchSubmission] = useState("");
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingGrade, setSavingGrade] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [gradeMessage, setGradeMessage] = useState("");
  const [error, setError] = useState("");
  const [grades, setGrades] = useState({});

  // Load batches assigned to the authenticated trainer.
  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    setError("");
    try {
      const result = await trainerRequest("/batches");
      const list = unwrap(result, "batches");
      setBatches(list);
      const requestedExists = list.some((batch) => getId(batch) === requestedBatchId);
      setSelectedBatch((previous) => {
        if (previous && list.some((batch) => getId(batch) === previous)) return previous;
        if (requestedExists) return requestedBatchId;
        return getId(list[0]);
      });
    } catch (err) {
      setError(err.message || "Unable to load assigned batches.");
    } finally {
      setLoadingBatches(false);
    }
  }, [requestedBatchId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Load students and attendance for the selected batch and date.
  const loadAttendanceData = useCallback(async () => {
    if (!selectedBatch || !selectedDate) {
      setStudents([]);
      setAttendance({});
      return;
    }
    setLoadingStudents(true);
    setError("");
    setAttendanceMessage("");
    try {
      const query = new URLSearchParams({ batchId: selectedBatch, date: selectedDate });
      const [studentResult, attendanceResult] = await Promise.all([
        trainerRequest(`/batches/${encodeURIComponent(selectedBatch)}/students`),
        trainerRequest(`/attendance?${query.toString()}`),
      ]);
      const studentList = unwrap(studentResult, "students");
      const attendanceList = unwrap(attendanceResult, "attendance");
      setStudents(studentList);

      const nextAttendance = {};
      // Default students to Present only if there is no saved record.
      for (const student of studentList) {
        nextAttendance[getId(student)] = "Present";
      }
      for (const record of attendanceList) {
        const studentId = getId(record.student);
        if (studentId) nextAttendance[studentId] = record.status || "Present";
      }
      setAttendance(nextAttendance);
    } catch (err) {
      setError(err.message || "Unable to load attendance.");
      setStudents([]);
      setAttendance({});
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedBatch, selectedDate]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // Load submissions for the selected batch.
  const loadSubmissions = useCallback(async () => {
    if (!selectedBatch) {
      setSubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    setGradeMessage("");
    try {
      const query = new URLSearchParams({ batchId: selectedBatch });
      const result = await trainerRequest(`/submissions?${query.toString()}`);
      const list = unwrap(result, "submissions");
      setSubmissions(list);
      const nextGrades = {};
      for (const submission of list) {
        const submissionId = getId(submission);
        nextGrades[submissionId] = {
          marks: submission.marks === null || submission.marks === undefined ? "" : String(submission.marks),
          result: submission.result || "Pending",
          feedback: submission.feedback || "",
        };
      }
      setGrades(nextGrades);
    } catch (err) {
      setError(err.message || "Unable to load assignment submissions.");
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  function updateAttendance(studentId, status) {
    setAttendance((previous) => ({ ...previous, [studentId]: status }));
    setAttendanceMessage("");
  }

  // Save attendance to MongoDB through the trainer API.
  async function handleSaveAttendance() {
    setError("");
    setAttendanceMessage("");
    if (!selectedBatch) {
      setError("Please select a batch.");
      return;
    }
    if (!students.length) {
      setError("No students are available in this batch.");
      return;
    }
    const records = students.map((student) => {
      const studentId = getId(student);
      return { studentId, status: attendance[studentId] || "Present" };
    }).filter((record) => record.studentId);

    if (!records.length) {
      setError("Student IDs were not found. Please check the backend response.");
      return;
    }

    setSavingAttendance(true);
    try {
      await trainerRequest("/attendance", {
        method: "PUT",
        body: JSON.stringify({ batchId: selectedBatch, date: selectedDate, records }),
      });
      setAttendanceMessage(
        `Attendance saved successfully for ${records.length} students on ${formatDate(selectedDate)}.`
      );
      await loadAttendanceData();
    } catch (err) {
      setError(err.message || "Unable to save attendance.");
    } finally {
      setSavingAttendance(false);
    }
  }

  // Update one submission's editable grading fields.
  function updateGrade(submissionId, field, value) {
    setGrades((previous) => ({
      ...previous,
      [submissionId]: {
        ...(previous[submissionId] || { marks: "", result: "Pending", feedback: "" }),
        [field]: value,
      },
    }));
    setGradeMessage("");
  }

  // Save marks, result and feedback to the backend.
  async function handleSaveGrade(submission) {
    const submissionId = getId(submission);
    const grade = grades[submissionId] || {};
    setError("");
    setGradeMessage("");

    if (!submissionId) {
      setError("Submission ID is missing. Cannot save this grade.");
      return;
    }
    const maxMarks = Number(submission.maxMarks ?? 50);
    const marks = Number(grade.marks);

    if (grade.marks === "" || !Number.isFinite(marks)) {
      setError("Enter valid marks before saving.");
      return;
    }
    if (marks < 0 || marks > maxMarks) {
      setError(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }
    if (!["Pending", "Graded", "Needs revision"].includes(grade.result)) {
      setError("Please select a valid grading status.");
      return;
    }

    setSavingGrade(submissionId);
    try {
      await trainerRequest(`/submissions/${submissionId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({
          marks,
          result: grade.result,
          feedback: (grade.feedback || "").trim(),
        }),
      });
      setGradeMessage("Assignment grade saved successfully.");
      await loadSubmissions();
    } catch (err) {
      setError(err.message || "Unable to save the assignment grade.");
    } finally {
      setSavingGrade("");
    }
  }

  // Export the currently displayed attendance as CSV.
  function exportAttendance() {
    if (!students.length) {
      setError("There are no attendance records to export.");
      return;
    }
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Student ID", "Student Name", "Email", "Batch", "Date", "Status"],
      ...students.map((student) => [
        student.userId || getId(student),
        student.name || "",
        student.email || "",
        selectedBatchName,
        selectedDate,
        attendance[getId(student)] || "Present",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `attendance-${selectedBatchName.replace(/[^a-z0-9-_]/gi, "-")}-${selectedDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const selectedBatchObject = batches.find((batch) => getId(batch) === selectedBatch);
  const selectedBatchName = selectedBatchObject?.batch || selectedBatchObject?.name || "Selected batch";

  const filteredStudents = students.filter((student) => {
    const search = searchStudent.toLowerCase();
    return (
      (student.name || "").toLowerCase().includes(search) ||
      (student.email || "").toLowerCase().includes(search) ||
      (student.userId || "").toLowerCase().includes(search)
    );
  });

  const filteredSubmissions = submissions.filter((submission) => {
    const search = searchSubmission.toLowerCase();
    const studentName = submission.student?.name || submission.studentName || "";
    const title = submission.title || submission.assignmentTitle || "";
    return studentName.toLowerCase().includes(search) || title.toLowerCase().includes(search);
  });

  const presentCount = students.filter((student) => attendance[getId(student)] === "Present").length;
  const absentCount = students.filter((student) => attendance[getId(student)] === "Absent").length;
  const pendingCount = submissions.filter((submission) => !submission.result || submission.result === "Pending").length;

  return (
        <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-[#102e60]">APPWARS LMS / Trainer</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Attendance & Grading
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Record student attendance and evaluate assignment submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadAttendanceData();
              loadSubmissions();
            }}
            disabled={loadingStudents || loadingSubmissions}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loadingStudents || loadingSubmissions ? "animate-spin" : ""}
            />
            Refresh Data
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-7 md:px-8">
        {error && (
          <Notice type="error">
            <p className="font-semibold">Request failed</p>
            <p className="mt-1">{error}</p>
          </Notice>
        )}
        {attendanceMessage && (
          <Notice type="success">{attendanceMessage}</Notice>
        )}
        {gradeMessage && <Notice type="success">{gradeMessage}</Notice>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-[#102e60]">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Batch & Date</h2>
              <p className="text-sm text-slate-500">
                Select the batch and attendance date you want to manage.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="batch" className="mb-2 block text-sm font-medium text-slate-700">
                Batch
              </label>
              <select
                id="batch"
                value={selectedBatch}
                onChange={(event) => setSelectedBatch(event.target.value)}
                disabled={loadingBatches}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              >
                <option value="">
                  {loadingBatches ? "Loading batches..." : "Select a batch"}
                </option>
                {batches.map((batch) => (
                  <option key={getId(batch)} value={getId(batch)}>
                    {batch.batch || batch.name || "Unnamed batch"}
                    {batch.course ? ` — ${batch.course}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="attendanceDate" className="mb-2 block text-sm font-medium text-slate-700">
                Attendance date
              </label>
              <div className="relative">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="attendanceDate"
                  type="date"
                  value={selectedDate}
                  max={getToday()}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {!loadingBatches && batches.length === 0 && (
            <p className="mt-4 text-sm text-amber-700">
              No batches are assigned to this trainer account. Assign a batch
              to the trainer in the admin portal before recording attendance.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Users size={21} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Students</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{students.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-50 p-3 text-green-700">
                <CheckCircle2 size={21} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Present</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{presentCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-3 text-red-700">
                <AlertCircle size={21} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Absent</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{absentCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Student Attendance</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedBatchName} · {formatDate(selectedDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportAttendance}
                disabled={!students.length}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance || loadingStudents || !students.length || !selectedBatch}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d79] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAttendance ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {savingAttendance ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-sm">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchStudent}
                onChange={(event) => setSearchStudent(event.target.value)}
                placeholder="Search by name, email or ID..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Student</th>
                  <th className="px-5 py-4 font-semibold">Student ID</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingStudents ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle size={18} className="animate-spin" />
                        Loading students and attendance...
                      </span>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      {students.length ? "No students match your search." : "No students found in this batch."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const studentId = getId(student);
                    const status = attendance[studentId] || "Present";
                    return (
                      <tr key={studentId} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-[#102e60]">
                              {(student.name || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{student.name || "Unnamed student"}</p>
                              <p className="text-xs text-slate-500">{student.batch || selectedBatchName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{student.userId || studentId || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{student.email || "—"}</td>
                        <td className="px-5 py-4"><StatusBadge status={status} /></td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => updateAttendance(studentId, "Present")}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === "Present" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => updateAttendance(studentId, "Absent")}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === "Absent" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:p-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-3 text-purple-700">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assignment Grading</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review submissions, assign marks and provide feedback.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                {pendingCount} Pending
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {submissions.length} Submissions
              </span>
            </div>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-sm">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchSubmission}
                onChange={(event) => setSearchSubmission(event.target.value)}
                placeholder="Search student or assignment..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {loadingSubmissions ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={18} className="animate-spin" />
                Loading assignment submissions...
              </span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileText size={23} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No submissions found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Student assignment submissions will appear here when available.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSubmissions.map((submission) => {
                const submissionId = getId(submission);
                const grade = grades[submissionId] || {
                  marks: "",
                  result: "Pending",
                  feedback: "",
                };
                const studentName =
                  submission.student?.name ||
                  submission.studentName ||
                  "Student";
                const studentId =
                  submission.student?.userId ||
                  submission.student?.email ||
                  "";
                const title =
                  submission.title ||
                  submission.assignmentTitle ||
                  "Assignment submission";
                const maxMarks = Number(submission.maxMarks ?? 50);
                const submissionUrl =
                  submission.submissionUrl ||
                  submission.fileUrl ||
                  submission.url ||
                  "";

                return (
                  <div key={submissionId} className="p-5 md:p-6">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {title}
                          </h3>
                          <StatusBadge status={submission.result || "Pending"} />
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          Student:{" "}
                          <span className="font-semibold text-slate-800">
                            {studentName}
                          </span>
                        </p>

                        {studentId && (
                          <p className="mt-1 text-xs text-slate-500">
                            {studentId}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-slate-500">
                          Submitted: {formatDate(submission.submittedAt)}
                        </p>

                        {submission.description && (
                          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {submission.description}
                          </p>
                        )}

                        {submissionUrl && (
                          <a
                            href={submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                          >
                            <FileText size={16} />
                            Open Submission
                          </a>
                        )}
                      </div>

                      <div className="flex h-fit shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                        <BookOpen size={17} className="text-slate-500" />
                        <span className="text-sm text-slate-600">
                          Maximum marks:
                        </span>
                        <span className="font-bold text-slate-900">
                          {maxMarks}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div>
                        <label
                          htmlFor={`marks-${submissionId}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Marks
                        </label>
                        <input
                          id={`marks-${submissionId}`}
                          type="number"
                          min="0"
                          max={maxMarks}
                          step="0.5"
                          value={grade.marks}
                          onChange={(event) =>
                            updateGrade(
                              submissionId,
                              "marks",
                              event.target.value
                            )
                          }
                          placeholder={`Out of ${maxMarks}`}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`result-${submissionId}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Result
                        </label>
                        <select
                          id={`result-${submissionId}`}
                          value={grade.result}
                          onChange={(event) =>
                            updateGrade(
                              submissionId,
                              "result",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Graded">Graded</option>
                          <option value="Needs revision">Needs revision</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`feedback-${submissionId}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Feedback
                        </label>
                        <textarea
                          id={`feedback-${submissionId}`}
                          rows={2}
                          maxLength={3000}
                          value={grade.feedback}
                          onChange={(event) =>
                            updateGrade(
                              submissionId,
                              "feedback",
                              event.target.value
                            )
                          }
                          placeholder="Enter feedback for the student..."
                          className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        {submission.gradedAt
                          ? `Last graded: ${formatDate(submission.gradedAt)}`
                          : "Not graded yet"}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveGrade(submission)}
                        disabled={savingGrade === submissionId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d79] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingGrade === submissionId ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        {savingGrade === submissionId
                          ? "Saving Grade..."
                          : "Save Grade"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <div className="flex items-start gap-3">
            <Check size={18} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">Database integration:</span>{" "}
              attendance and grading changes are sent to your Express backend.
              They are persisted only when you click the corresponding save
              button and the backend confirms the request succeeded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceGradingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#102e60]" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading Attendance &amp; Grading...
            </p>
          </div>
        </div>
      }
    >
      <AttendanceGradingContent />
    </Suspense>
  );
}