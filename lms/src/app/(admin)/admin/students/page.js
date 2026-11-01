
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Download,
  Filter,
  Pencil,
  Trash2,
  X,
  Eye,
  Mail,
  GraduationCap,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  course: "",
  batch: "",
  enrollmentDate: "",
  status: "Active",
};

const STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Inactive: "bg-slate-100 text-slate-600",
};

function getUserId(user) {
  return user?.userId || user?._id || user?.id || "";
}

function getStudentStatus(user) {
  if (user?.status === "Pending") return "Pending";

  return user?.isActive === false ||
    user?.status === "Inactive"
    ? "Inactive"
    : "Active";
}

function mapStudent(user) {
  return {
    id: getUserId(user),
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    course: user?.course || "",
    batch: user?.batch || "",
    enrollmentDate: user?.enrollmentDate
      ? String(user.enrollmentDate).slice(0, 10)
      : user?.createdAt
        ? String(user.createdAt).slice(0, 10)
        : "",
    status: getStudentStatus(user),
    isActive: user?.isActive !== false,
  };
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

function extractUsers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.data?.users)) return data.data.users;
  if (Array.isArray(data.results)) return data.results;

  return [];
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const apiRequest = useCallback(async (path, options = {}) => {
    const currentToken = sessionStorage.getItem("token");

    if (!currentToken) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
        ...options.headers,
      },
    });

    return readResponse(response);
  }, []);

  // Load students from the backend.
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/admin/users?role=Student");
      const users = extractUsers(data);

      // Only show Student accounts, even if the backend
      // returns all users instead of filtering by role.
      const studentUsers = users.filter(
        (user) =>
          String(user.role || "").toLowerCase() === "student"
      );

      setStudents(studentUsers.map(mapStudent));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load students."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchText = search.toLowerCase();

      const matchesSearch = [
        student.id,
        student.name,
        student.email,
        student.phone,
        student.course,
        student.batch,
      ].some((value) =>
        String(value || "").toLowerCase().includes(searchText)
      );

      const matchesStatus =
        statusFilter === "All" ||
        student.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const activeCount = students.filter(
    (student) => student.status === "Active"
  ).length;

  const pendingCount = students.filter(
    (student) => student.status === "Pending"
  ).length;

  function openAddModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowModal(true);
  }

  function openEditModal(student) {
    setEditingId(student.id);

    setForm({
      name: student.name,
      email: student.email,
      password: "",
      phone: student.phone,
      course: student.course,
      batch: student.batch,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
    });

    setError("");
    setShowModal(true);
  }

  // Create or update a student through Express.
  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!editingId && !form.password) {
      setError("Please enter an initial password for the student.");
      return;
    }

    if (!editingId && form.password.length < 8) {
      setError("The initial password must contain at least 8 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        batch: form.batch.trim(),
        role: "Student",
        isActive: form.status !== "Inactive",
      };

      // Only send the password when creating an account or
      // when your backend supports password changes.
      if (!editingId) {
        payload.password = form.password;
      }

      // These extra fields are persisted only if your
      // User schema and controller explicitly support them.
      payload.phone = form.phone.trim();
      payload.course = form.course;
      payload.enrollmentDate = form.enrollmentDate;

      if (editingId) {
        await apiRequest(
          `/admin/users/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setNotice("Student updated successfully.");
      } else {
        await apiRequest("/admin/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("Student account created successfully.");
      }

      setShowModal(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });

      await loadStudents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save student."
      );
    } finally {
      setSaving(false);
    }
  }

  // The backend DELETE endpoint should deactivate the account.
  async function deleteStudent(student) {
    const confirmed = window.confirm(
      `Deactivate student account for ${student.name} (${student.id})?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/admin/users/${encodeURIComponent(student.id)}`,
        { method: "DELETE" }
      );

      setNotice("Student account deactivated successfully.");
      await loadStudents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to deactivate student."
      );
    }
  }

  async function reactivateStudent(student) {
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/admin/users/${encodeURIComponent(student.id)}/reactivate`,
        { method: "PATCH" }
      );

      setNotice("Student account reactivated successfully.");
      await loadStudents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reactivate student."
      );
    }
  }

  function exportCSV() {
    const headers = [
      "id",
      "name",
      "email",
      "phone",
      "course",
      "batch",
      "enrollmentDate",
      "status",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredStudents.map((student) =>
        headers
          .map((header) => {
            const value = String(student[header] ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob(
      ["\uFEFF" + csvRows.join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-students.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">
            Students Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage student profiles, enrollments, batches, and account status.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredStudents.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#174ea6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102f63]"
          >
            <UserPlus size={18} />
            Add Student
          </button>

          <button
            onClick={loadStudents}
            disabled={loading}
            title="Refresh students"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Success notification */}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            {notice}
          </span>

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </span>

          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Students"
          value={students.length}
          icon={Users}
          color="blue"
          description="Student accounts in the database"
        />

        <StatCard
          title="Active Students"
          value={activeCount}
          icon={CheckCircle2}
          color="green"
          description="Currently active accounts"
        />

        <StatCard
          title="Pending Students"
          value={pendingCount}
          icon={GraduationCap}
          color="amber"
          description="Awaiting confirmation"
        />

        <StatCard
          title="Filtered Results"
          value={filteredStudents.length}
          icon={Search}
          color="purple"
          description="Matching your search"
        />
      </div>

      {/* Students table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#102f63]">
              All Students
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Student records loaded from the backend.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-blue-500 sm:w-40"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Student</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Course / Batch</th>
                <th className="px-5 py-4 font-semibold">Enrollment Date</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw size={17} className="animate-spin" />
                      Loading students from the backend...
                    </span>
                  </td>
                </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {student.name.charAt(0).toUpperCase() || "S"}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {student.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="flex items-center gap-2 text-slate-700">
                      <Mail size={14} className="text-slate-400" />
                      {student.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {student.phone || "Phone not available"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700">
                      {student.course || "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {student.batch || "No batch assigned"}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {student.enrollmentDate || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLES[student.status] ||
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setViewStudent(student)}
                        title="View student"
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        onClick={() => openEditModal(student)}
                        title="Edit student"
                        className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil size={17} />
                      </button>

                      {student.status === "Inactive" ? (
                        <button
                          onClick={() => reactivateStudent(student)}
                          title="Reactivate student"
                          className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 size={17} />
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteStudent(student)}
                          title="Deactivate student"
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    {error
                      ? "Students could not be loaded. Check the error above."
                      : "No students found. Try another search or add a student."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center">
          <p>
            Showing {filteredStudents.length} of {students.length} students
          </p>
          <p>APPWARS Student Management</p>
        </div>
      </section>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-[#102f63]">
                  {editingId ? "Edit Student" : "Add New Student"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update the student account details."
                    : "Create a Student account in the database."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Full Name"
                  required
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  placeholder="Enter student name"
                />

                <FormField
                  label="Email Address"
                  type="email"
                  required
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                  placeholder="student@example.com"
                />

                {!editingId && (
                  <FormField
                    label="Initial Password"
                    type="password"
                    required
                    value={form.password}
                    onChange={(value) => setForm({ ...form, password: value })}
                    placeholder="At least 8 characters"
                  />
                )}

                <FormField
                  label="Phone Number"
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                  placeholder="Enter phone number"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Course
                  </label>
                  <select
                    value={form.course}
                    onChange={(event) =>
                      setForm({ ...form, course: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select course</option>
                    <option>MERN Stack Development</option>
                    <option>AWS Cloud Computing</option>
                    <option>Python Programming</option>
                    <option>Software Testing</option>
                    <option>Full Stack Development</option>
                  </select>
                </div>

                <FormField
                  label="Batch"
                  value={form.batch}
                  onChange={(value) => setForm({ ...form, batch: value })}
                  placeholder="e.g. MERN-2026-A"
                />

                <FormField
                  label="Enrollment Date"
                  type="date"
                  value={form.enrollmentDate}
                  onChange={(value) =>
                    setForm({ ...form, enrollmentDate: value })
                  }
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Student Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#174ea6] px-5 py-2.5 font-semibold text-white hover:bg-[#102f63] disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Student"
                      : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student details modal */}
      {viewStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#102f63]">
                Student Details
              </h2>
              <button
                onClick={() => setViewStudent(null)}
                aria-label="Close details"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-xl bg-blue-50 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-200 text-xl font-bold text-blue-800">
                {viewStudent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-[#102f63]">
                  {viewStudent.name}
                </p>
                <p className="text-sm text-slate-500">
                  {viewStudent.id}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                ["Email", viewStudent.email],
                ["Phone", viewStudent.phone],
                ["Course", viewStudent.course],
                ["Batch", viewStudent.batch],
                ["Enrollment Date", viewStudent.enrollmentDate],
                ["Status", viewStudent.status],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="break-all text-sm font-medium text-slate-800">
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViewStudent(null)}
              className="mt-6 w-full rounded-xl bg-[#174ea6] py-3 font-semibold text-white hover:bg-[#102f63]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, description }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-[#102f63]">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        required={required}
        minLength={type === "password" ? 8 : undefined}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
