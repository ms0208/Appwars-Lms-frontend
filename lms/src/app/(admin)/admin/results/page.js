
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Search,
  Download,
  X,
  Eye,
  CheckCircle2,
  TrendingUp,
  ClipboardList,
  RefreshCw,
  Users,
} from "lucide-react";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

// ==========================================
// RESULT CALCULATIONS
// ==========================================

function getPercentage(obtained, total) {
  if (!Number(total)) return 0;
  return (Number(obtained) / Number(total)) * 100;
}

function getGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

function getStatus(percentage) {
  return percentage >= 40 ? "Pass" : "Fail";
}

// ==========================================
// MAP BACKEND RESULT
// Backend returns populated student/course
// ==========================================

function mapResult(item) {
  const student =
    item.student && typeof item.student === "object"
      ? item.student
      : null;

  const course =
    item.course && typeof item.course === "object"
      ? item.course
      : null;

  return {
    id: item._id || item.id,

    studentId: student?._id || "",
    student: student?.name || "",
    rollNo: student?.userId || "",
    email: student?.email || "",
    batch: student?.batch || "",

    courseId: course?._id || "",
    course: course?.courseName || "",
    courseCode: course?.code || "",

    exam: item.exam || "",
    date: String(item.date || "").slice(0, 10),

    obtained: Number(item.obtained ?? 0),
    total: Number(item.total ?? 100),

    remarks: item.remarks || "",
    published: Boolean(item.published),
  };
}

// ==========================================
// AUTH TOKEN
// ==========================================

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

// ==========================================
// API REQUEST
// ==========================================

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

// ==========================================
// EXTRACT RESULTS
// ==========================================

function extractResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;

  if (data.data && Array.isArray(data.data.results)) {
    return data.data.results;
  }

  return [];
}

// ==========================================
// MAIN RESULTS PAGE
// ==========================================

export default function ResultsPage() {
  const [results, setResults] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");

  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // ==========================================
  // GET ALL STUDENT RESULTS
  // GET /api/admin/results
  // ==========================================

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const data = await apiRequest("/admin/results");

      const items = extractResults(data);

      setResults(items.map(mapResult));
    } catch (err) {
      setPageError(err.message || "Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // ==========================================
  // COURSE OPTIONS FROM FETCHED RESULTS
  // ==========================================

  const courseOptions = useMemo(() => {
    const uniqueCourses = new Map();

    results.forEach((result) => {
      if (result.courseId) {
        uniqueCourses.set(result.courseId, {
          id: result.courseId,
          name: result.course,
          code: result.courseCode,
        });
      }
    });

    return Array.from(uniqueCourses.values());
  }, [results]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const passed = results.filter(
    (result) =>
      getStatus(
        getPercentage(result.obtained, result.total)
      ) === "Pass"
  ).length;

  const failed = results.length - passed;

  const average = results.length
    ? results.reduce(
        (sum, result) =>
          sum +
          getPercentage(result.obtained, result.total),
        0
      ) / results.length
    : 0;

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filtered = useMemo(() => {
    return results.filter((result) => {
      const query = search.toLowerCase();

      const percentage = getPercentage(
        result.obtained,
        result.total
      );

      const status = getStatus(percentage);

      const matchesSearch =
        result.student.toLowerCase().includes(query) ||
        result.rollNo.toLowerCase().includes(query) ||
        result.course.toLowerCase().includes(query) ||
        result.exam.toLowerCase().includes(query);

      const matchesCourse =
        courseFilter === "All" ||
        result.courseId === courseFilter;

      const matchesStatus =
        statusFilter === "All" ||
        status === statusFilter;

      return (
        matchesSearch &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [results, search, courseFilter, statusFilter]);

  // ==========================================
  // VIEW RESULT DETAILS
  // ==========================================

  function openDetails(result) {
    setSelected(result);
    setShowDetails(true);
  }

  // ==========================================
  // EXPORT CSV
  // ==========================================

  function exportCSV() {
    const headers = [
      "Student",
      "Roll Number",
      "Course",
      "Exam",
      "Date",
      "Obtained Marks",
      "Total Marks",
      "Percentage",
      "Grade",
      "Status",
      "Remarks",
    ];

    const rows = filtered.map((result) => {
      const percentage = getPercentage(
        result.obtained,
        result.total
      );

      return [
        result.student,
        result.rollNo,
        result.course,
        result.exam,
        result.date,
        result.obtained,
        result.total,
        percentage.toFixed(2),
        getGrade(percentage),
        getStatus(percentage),
        result.remarks,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-student-results.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // ==========================================
  // FRONTEND UI
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Student Results
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View student exam scores, grades and academic performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchResults}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={loading || filtered.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </header>

        {/* API ERROR */}

        {pageError && (
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
            <p>{pageError}</p>

            <button
              type="button"
              onClick={fetchResults}
              disabled={loading}
              className="inline-flex items-center gap-2 font-semibold underline disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Results"
            value={results.length}
            icon={ClipboardList}
          />

          <StatCard
            title="Passed"
            value={passed}
            icon={CheckCircle2}
          />

          <StatCard
            title="Failed"
            value={failed}
            icon={Users}
          />

          <StatCard
            title="Average Score"
            value={`${average.toFixed(1)}%`}
            icon={TrendingUp}
          />
        </div>

        {/* SEARCH AND FILTER */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student, roll no. or exam..."
                className={inputClass + " pl-10"}
              />
            </div>

            <select
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(event.target.value)
              }
              className={inputClass}
            >
              <option value="All">All Courses</option>

              {courseOptions.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.name} ({course.code})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className={inputClass}
            >
              <option value="All">All Results</option>
              <option value="Pass">Passed</option>
              <option value="Fail">Failed</option>
            </select>

          </div>
        </div>

        {/* RESULTS TABLE */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">
              Student Results
            </h2>

            <span className="text-sm text-slate-500">
              {filtered.length} results
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Course / Exam</th>
                  <th className="px-5 py-4">Exam Date</th>
                  <th className="px-5 py-4">Marks</th>
                  <th className="px-5 py-4">Percentage</th>
                  <th className="px-5 py-4">Grade</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {!loading &&
                  filtered.map((result) => {
                    const percentage = getPercentage(
                      result.obtained,
                      result.total
                    );

                    const status = getStatus(percentage);

                    return (
                      <tr
                        key={result.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {result.student || "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {result.rollNo || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">
                            {result.course || "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {result.exam || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(result.date)}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {result.obtained} / {result.total}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-700">
                            {percentage.toFixed(1)}%
                          </p>

                          <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${Math.min(
                                  Math.max(percentage, 0),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-50 px-2 font-bold text-blue-700">
                            {getGrade(percentage)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <ActionButton
                              label="View Result"
                              onClick={() => openDetails(result)}
                            >
                              <Eye size={16} />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No student results found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading student results...
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================
          VIEW RESULT MODAL
      ====================================== */}

      {showDetails && selected && (
        <Modal
          title="Student Result Details"
          onClose={() => {
            setShowDetails(false);
            setSelected(null);
          }}
        >
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Award size={28} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selected.student}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {selected.rollNo}
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={getStatus(
                      getPercentage(
                        selected.obtained,
                        selected.total
                      )
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <Detail
                label="Course"
                value={selected.course}
              />

              <Detail
                label="Course Code"
                value={selected.courseCode}
              />

              <Detail
                label="Exam"
                value={selected.exam}
              />

              <Detail
                label="Date"
                value={formatDate(selected.date)}
              />

              <Detail
                label="Marks"
                value={`${selected.obtained} / ${selected.total}`}
              />

              <Detail
                label="Percentage"
                value={`${getPercentage(
                  selected.obtained,
                  selected.total
                ).toFixed(2)}%`}
              />

              <Detail
                label="Grade"
                value={getGrade(
                  getPercentage(
                    selected.obtained,
                    selected.total
                  )
                )}
              />

              <Detail
                label="Batch"
                value={selected.batch || "—"}
              />

              <Detail
                label="Email"
                value={selected.email || "—"}
              />

              <Detail
                label="Remarks"
                value={selected.remarks || "No remarks"}
              />

            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDetails(false);
                  setSelected(null);
                }}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Close
              </button>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}

// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <Icon size={20} />
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {
  const styles = {
    Pass: "bg-green-50 text-green-700",
    Fail: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

// ==========================================
// ACTION BUTTON
// ==========================================

function ActionButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
    >
      {children}
    </button>
  );
}

// ==========================================
// MODAL
// ==========================================

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

// ==========================================
// DETAIL FIELD
// ==========================================

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}
