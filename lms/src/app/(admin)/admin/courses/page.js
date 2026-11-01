
"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
  Eye,
  Users,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const emptyCourse = {
  title: "",
  code: "",
  category: "Web Development",
  duration: "",
  fee: "",
  trainer: "",
  batches: 0,
  students: 0,
  status: "Active",
  description: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function getToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("token") || "";
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Admin token not found. Please log in again.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function extractCourses(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.courses)) return data.courses;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.data?.courses)) return data.data.courses;
  if (Array.isArray(data.data?.data)) return data.data.data;
  return [];
}

function mapCourse(course) {
  return {
    id: course._id || course.id || course.courseId,
    title: course.title || course.name || "",
    code: course.code || course.courseCode || "",
    category: course.category || "Other",
    duration: course.duration || "",
    fee: Number(course.fee ?? course.price ?? 0),
    trainer:
      typeof course.trainer === "object"
        ? course.trainer?.name || ""
        : course.trainer || course.trainerName || "",
    batches: Number(course.batches ?? course.batchCount ?? 0),
    students: Number(course.students ?? course.studentCount ?? 0),
    status: course.status || "Active",
    description: course.description || "",
  };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modal, setModal] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [form, setForm] = useState({ ...emptyCourse });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // GET: Fetch courses from the backend
  async function loadCourses() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/admin/courses");
      setCourses(extractCourses(data).map(mapCourse));
    } catch (err) {
      setError(err.message || "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  const activeCourses = courses.filter(
    (course) => course.status === "Active"
  ).length;

  const totalStudents = courses.reduce(
    (sum, course) => sum + Number(course.students || 0),
    0
  );

  const totalBatches = courses.reduce(
    (sum, course) => sum + Number(course.batches || 0),
    0
  );

  const filteredCourses = courses.filter((course) => {
    const query = search.toLowerCase();

    const matchesSearch = [
      course.title,
      course.code,
      course.category,
      course.trainer,
    ].some((value) => String(value || "").toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "All" || course.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openAdd() {
    setForm({ ...emptyCourse });
    setSelectedCourse(null);
    setError("");
    setModal("form");
  }

  function openEdit(course) {
    setForm({
      ...course,
      fee: String(course.fee ?? ""),
      batches: String(course.batches ?? 0),
      students: String(course.students ?? 0),
    });

    setSelectedCourse(course);
    setError("");
    setModal("form");
  }

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  // POST for a new course; PATCH for an existing course
  async function saveCourse(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !form.title.trim() ||
      !form.code.trim() ||
      !form.duration.trim()
    ) {
      setError("Please fill in the course title, course code and duration.");
      return;
    }

    const duplicateCode = courses.some(
      (course) =>
        course.code.toLowerCase() === form.code.trim().toLowerCase() &&
        String(course.id) !== String(selectedCourse?.id)
    );

    if (duplicateCode) {
      setError("This course code already exists.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      code: form.code.trim(),
      category: form.category,
      duration: form.duration.trim(),
      fee: Number(form.fee) || 0,
      trainer: form.trainer.trim(),
      batches: Number(form.batches) || 0,
      students: Number(form.students) || 0,
      status: form.status,
      description: form.description.trim(),
    };

    setSaving(true);

    try {
      if (selectedCourse) {
        await apiRequest(
          `/admin/courses/${encodeURIComponent(selectedCourse.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setNotice("Course updated successfully.");
      } else {
        await apiRequest("/admin/courses", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("Course created successfully.");
      }

      setModal(null);
      setSelectedCourse(null);
      setForm({ ...emptyCourse });

      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to save course.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE: Delete the course using the backend API
  async function deleteCourse(id) {
    const course = courses.find(
      (item) => String(item.id) === String(id)
    );

    if (course && course.batches > 0) {
      window.alert(
        "This course has batches assigned. Remove or reassign those batches first."
      );
      return;
    }

    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/admin/courses/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      setNotice("Course deleted successfully.");
      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to delete course.");
    }
  }

  function exportCSV() {
    const headers = [
      "Course Code",
      "Course Name",
      "Category",
      "Duration",
      "Fee",
      "Trainer",
      "Batches",
      "Students",
      "Status",
    ];

    const rows = filteredCourses.map((course) => [
      course.code,
      course.title,
      course.category,
      course.duration,
      course.fee,
      course.trainer,
      course.batches,
      course.students,
      course.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
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
    link.download = "appwars-courses.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Courses Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create courses, assign trainers and manage course information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadCourses}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus size={18} />
              Add Course
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {notice && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <p className="flex items-center gap-2">
              <CheckCircle2 size={17} />
              {notice}
            </p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Courses"
            value={courses.length}
            icon={BookOpen}
          />
          <StatCard
            title="Active Courses"
            value={activeCourses}
            icon={CheckCircle2}
          />
          <StatCard
            title="Total Batches"
            value={totalBatches}
            icon={GraduationCap}
          />
          <StatCard
            title="Enrolled Students"
            value={totalStudents}
            icon={Users}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search course, code, category or trainer..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">All Courses</h2>
            <span className="text-sm text-slate-500">
              {filteredCourses.length} results
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Course</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Duration / Fee</th>
                  <th className="px-5 py-4">Trainer</th>
                  <th className="px-5 py-4">Batches / Students</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading courses...
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <BookOpen size={20} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {course.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {course.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {course.category}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">
                          {course.duration}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ₹{Number(course.fee).toLocaleString("en-IN")}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {course.trainer || "Not assigned"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">
                          {course.batches} batches
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {course.students} students
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={course.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <ActionButton
                            label="View"
                            onClick={() => {
                              setSelectedCourse(course);
                              setModal("view");
                            }}
                          >
                            <Eye size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Edit"
                            onClick={() => openEdit(course)}
                          >
                            <Pencil size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Delete"
                            danger
                            onClick={() => deleteCourse(course.id)}
                          >
                            <Trash2 size={16} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {!loading && filteredCourses.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No courses found. Try changing your search or add a course.
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
          title={selectedCourse ? "Edit Course" : "Add New Course"}
          onClose={() => {
            if (!saving) setModal(null);
          }}
        >
          <form onSubmit={saveCourse} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Course Name *">
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. MERN Stack Development"
                />
              </FormField>

              <FormField label="Course Code *">
                <input
                  required
                  value={form.code}
                  onChange={(event) =>
                    updateField("code", event.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. APP-MERN-01"
                />
              </FormField>

              <FormField label="Category">
                <select
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  className={inputClass}
                >
                  <option>Web Development</option>
                  <option>Cloud Computing</option>
                  <option>Software Testing</option>
                  <option>Programming</option>
                  <option>Data Science</option>
                  <option>Other</option>
                </select>
              </FormField>

              <FormField label="Duration *">
                <input
                  required
                  value={form.duration}
                  onChange={(event) =>
                    updateField("duration", event.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. 4 Months"
                />
              </FormField>

              <FormField label="Course Fee (₹)">
                <input
                  type="number"
                  min="0"
                  value={form.fee}
                  onChange={(event) =>
                    updateField("fee", event.target.value)
                  }
                  className={inputClass}
                  placeholder="25000"
                />
              </FormField>

              <FormField label="Assigned Trainer">
                <input
                  value={form.trainer}
                  onChange={(event) =>
                    updateField("trainer", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Trainer name"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className={inputClass}
                >
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Archived</option>
                </select>
              </FormField>

              <FormField label="Number of Batches">
                <input
                  type="number"
                  min="0"
                  value={form.batches}
                  onChange={(event) =>
                    updateField("batches", event.target.value)
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Enrolled Students">
                <input
                  type="number"
                  min="0"
                  value={form.students}
                  onChange={(event) =>
                    updateField("students", event.target.value)
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Course Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                className={inputClass}
                placeholder="Write a short course description..."
              />
            </FormField>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : selectedCourse
                    ? "Save Changes"
                    : "Create Course"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selectedCourse && (
        <Modal
          title="Course Details"
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <BookOpen size={28} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCourse.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCourse.code}
                </p>
                <div className="mt-2">
                  <StatusBadge status={selectedCourse.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Detail label="Category" value={selectedCourse.category} />
              <Detail label="Duration" value={selectedCourse.duration} />
              <Detail
                label="Course Fee"
                value={`₹${Number(selectedCourse.fee).toLocaleString("en-IN")}`}
              />
              <Detail
                label="Trainer"
                value={selectedCourse.trainer || "Not assigned"}
              />
              <Detail label="Batches" value={selectedCourse.batches} />
              <Detail label="Students" value={selectedCourse.students} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Description
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {selectedCourse.description || "No description added."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModal(null)}
              className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
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
    Active: "bg-green-50 text-green-700",
    Draft: "bg-amber-50 text-amber-700",
    Archived: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.Archived
      }`}
    >
      {status}
    </span>
  );
}

function ActionButton({ children, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-2 ${
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
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

function FormField({ label, children }) {
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
        {value}
      </p>
    </div>
  );
}
