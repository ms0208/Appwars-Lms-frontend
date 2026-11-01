"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Search,
  Download,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  Users,
  CheckCircle2,
  TrendingUp,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const emptyResult = {
  student: "",
  rollNo: "",
  course: "",
  exam: "",
  date: new Date().toISOString().slice(0, 10),
  obtained: "",
  total: "100",
  remarks: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

// Supports common API response formats and field names.
function mapResult(item) {
  const studentValue = item.student;
  const batchValue = item.batch;
  const courseValue = item.course;

  const studentObject =
    studentValue && typeof studentValue === "object"
      ? studentValue
      : null;

  const batchObject =
    batchValue && typeof batchValue === "object" ? batchValue : null;

  const courseObject =
    courseValue && typeof courseValue === "object" ? courseValue : null;

  const obtained = Number(
    item.obtained ?? item.marksObtained ?? item.score ?? 0
  );

  const total = Number(item.total ?? item.totalMarks ?? 100);

  return {
    id: item._id || item.id,
    studentId: studentObject?._id || studentObject?.id || "",
    batchId: batchObject?._id || batchObject?.id || "",
    student:
      studentObject?.name ||
      studentObject?.userId ||
      (typeof studentValue === "string" ? studentValue : "") ||
      item.studentName ||
      item.name ||
      "",
    rollNo:
      studentObject?.userId ||
      studentObject?.rollNo ||
      item.rollNo ||
      "",
    course:
      batchObject?.name ||
      batchObject?.title ||
      courseObject?.name ||
      courseObject?.title ||
      (typeof batchValue === "string" ? batchValue : "") ||
      (typeof courseValue === "string" ? courseValue : "") ||
      item.courseName ||
      "",
    exam: item.exam || item.title || item.examName || "",
    date: String(item.date || item.examDate || "").slice(0, 10),
    obtained,
    total,
    remarks: item.remarks || "",
    published: Boolean(item.published),
  };
}

function getToken() {
  if (typeof window === "undefined") return "";

  // Supports the common token key names used in this LMS.
  return (
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("appwars_token") ||
    ""
  );
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function extractResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.attendance)) return data.attendance;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.results)) {
    return data.data.results;
  }
  if (data.data && Array.isArray(data.data.items)) {
    return data.data.items;
  }

  return [];
}

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...emptyResult });
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // GET: Fetch results from the backend.
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

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const passed = results.filter(
    (result) =>
      getStatus(getPercentage(result.obtained, result.total)) === "Pass"
  ).length;

  const failed = results.length - passed;

  const average = results.length
    ? results.reduce(
        (sum, result) =>
          sum + getPercentage(result.obtained, result.total),
        0
      ) / results.length
    : 0;

  const courses = useMemo(
    () => [
      ...new Set(results.map((result) => result.course).filter(Boolean)),
    ],
    [results]
  );

  const filtered = results.filter((result) => {
    const query = search.toLowerCase();
    const percentage = getPercentage(result.obtained, result.total);
    const status = getStatus(percentage);

    return (
      (
        result.student.toLowerCase().includes(query) ||
        result.rollNo.toLowerCase().includes(query) ||
        result.course.toLowerCase().includes(query) ||
        result.exam.toLowerCase().includes(query)
      ) &&
      (statusFilter === "All" || status === statusFilter) &&
      (courseFilter === "All" || result.course === courseFilter)
    );
  });

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openAdd() {
    setSelected(null);
    setForm({ ...emptyResult });
    setError("");
    setModal("form");
  }

  function openEdit(result) {
    setSelected(result);

    setForm({
      ...result,
      obtained: String(result.obtained),
      total: String(result.total),
    });

    setError("");
    setModal("form");
  }

  // POST: Add a result. PATCH: Update an existing result.
  async function saveResult(event) {
    event.preventDefault();
    setError("");

    if (
      !form.student.trim() ||
      !form.rollNo.trim() ||
      !form.course.trim() ||
      !form.exam.trim() ||
      !form.date
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const obtained = Number(form.obtained);
    const total = Number(form.total);

    if (
      form.obtained === "" ||
      !Number.isFinite(obtained) ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      setError("Enter valid marks and a total greater than zero.");
      return;
    }

    if (obtained < 0 || obtained > total) {
      setError("Obtained marks must be between zero and total marks.");
      return;
    }

    const payload = {
      student: form.student.trim(),
      studentName: form.student.trim(),
      rollNo: form.rollNo.trim(),
      course: form.course.trim(),
      courseName: form.course.trim(),
      exam: form.exam.trim(),
      date: form.date,
      obtained,
      total,
      remarks: form.remarks.trim(),
    };

    setSaving(true);

    try {
      if (selected) {
        await apiRequest(`/admin/results/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/admin/results", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await fetchResults();

      setModal(null);
      setSelected(null);
      setForm({ ...emptyResult });
      setError("");
    } catch (err) {
      setError(err.message || "Failed to save result.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE: Remove a result from the backend.
  async function deleteResult(id) {
    if (!window.confirm("Are you sure you want to delete this result?")) {
      return;
    }

    setDeletingId(id);
    setPageError("");

    try {
      await apiRequest(`/admin/results/${id}`, {
        method: "DELETE",
      });

      setResults((previous) =>
        previous.filter((result) => result.id !== id)
      );

      if (selected?.id === id) {
        setSelected(null);
        setModal(null);
      }
    } catch (err) {
      setPageError(err.message || "Failed to delete result.");
    } finally {
      setDeletingId(null);
    }
  }

  // Export the currently filtered results to CSV.
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
      const percentage = getPercentage(result.obtained, result.total);

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
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-results.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Results Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage exam scores, grades and student performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={loading || filtered.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus size={17} />
              Add Result
            </button>
          </div>
        </header>

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

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Loading results from the server...
          </div>
        )}

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

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, roll no. or exam..."
                className={inputClass + " pl-10"}
              />
            </div>

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All Courses</option>

              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All Results</option>
              <option value="Pass">Passed</option>
              <option value="Fail">Failed</option>
            </select>
          </div>
        </div>

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
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Course / Exam</th>
                  <th className="px-5 py-4">Exam Date</th>
                  <th className="px-5 py-4">Marks</th>
                  <th className="px-5 py-4">Percentage</th>
                  <th className="px-5 py-4">Grade</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
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
                      <tr key={result.id} className="hover:bg-slate-50">
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
                          <div className="flex justify-end gap-1">
                            <ActionButton
                              label="View"
                              onClick={() => {
                                setSelected(result);
                                setModal("view");
                              }}
                            >
                              <Eye size={16} />
                            </ActionButton>

                            <ActionButton
                              label="Edit"
                              onClick={() => openEdit(result)}
                            >
                              <Pencil size={16} />
                            </ActionButton>

                            <ActionButton
                              label="Delete"
                              danger
                              disabled={deletingId === result.id}
                              onClick={() => deleteResult(result.id)}
                            >
                              {deletingId === result.id ? (
                                <RefreshCw size={16} />
                              ) : (
                                <Trash2 size={16} />
                              )}
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
                      No results match your filters.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading results...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === "form" && (
        <Modal
          title={selected ? "Edit Result" : "Add Student Result"}
          onClose={() => {
            if (!saving) {
              setModal(null);
              setError("");
            }
          }}
        >
          <form onSubmit={saveResult} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student Name *">
                <input
                  required
                  value={form.student}
                  onChange={(event) =>
                    updateField("student", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Roll Number *">
                <input
                  required
                  value={form.rollNo}
                  onChange={(event) =>
                    updateField("rollNo", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Course *">
                <input
                  required
                  value={form.course}
                  onChange={(event) =>
                    updateField("course", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Exam Name *">
                <input
                  required
                  value={form.exam}
                  onChange={(event) =>
                    updateField("exam", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Exam Date *">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) =>
                    updateField("date", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Total Marks *">
                <input
                  type="number"
                  required
                  min="1"
                  value={form.total}
                  onChange={(event) =>
                    updateField("total", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Obtained Marks *">
                <input
                  type="number"
                  required
                  min="0"
                  max={form.total || undefined}
                  value={form.obtained}
                  onChange={(event) =>
                    updateField("obtained", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Remarks">
                <input
                  value={form.remarks}
                  onChange={(event) =>
                    updateField("remarks", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Optional feedback"
                />
              </Field>
            </div>

            {form.obtained !== "" &&
              Number(form.total) > 0 &&
              Number(form.obtained) >= 0 &&
              Number(form.obtained) <= Number(form.total) && (
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-blue-50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Percentage</p>
                    <p className="mt-1 font-bold text-blue-800">
                      {getPercentage(
                        form.obtained,
                        form.total
                      ).toFixed(1)}
                      %
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Grade</p>
                    <p className="mt-1 font-bold text-blue-800">
                      {getGrade(
                        getPercentage(form.obtained, form.total)
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Result</p>
                    <p className="mt-1 font-bold text-blue-800">
                      {getStatus(
                        getPercentage(form.obtained, form.total)
                      )}
                    </p>
                  </div>
                </div>
              )}

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setModal(null);
                  setError("");
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : selected
                    ? "Save Changes"
                    : "Add Result"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selected && (
        <Modal
          title="Result Details"
          onClose={() => {
            setModal(null);
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
              <Detail label="Course" value={selected.course} />
              <Detail label="Exam" value={selected.exam} />
              <Detail label="Date" value={formatDate(selected.date)} />
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
                label="Remarks"
                value={selected.remarks || "No remarks"}
              />
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
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

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <Icon size={20} />
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

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

function ActionButton({
  children,
  label,
  onClick,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

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

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}