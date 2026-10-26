
"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  X,
  Pencil,
  Trash2,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  CalendarDays,
  Video,
  Filter,
  UserRound,
  CheckCircle2,
  Clock,
} from "lucide-react";

const initialStudents = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "9876543210",
    course: "MERN Stack Development",
    trainer: "Manav Sharma",
    mode: "Online",
    batchType: "Mon-Th",
    batchStartDate: "2026-10-05",
    batchEndDate: "2027-02-05",
    batchTime: "10:00 AM",
    admissionDate: "2026-10-05",
    totalFee: 45000,
    feeStatus: "Pending",
    videoAccess: "Yes",
    status: "Active",
    notes: "",
  },
  {
    id: 2,
    name: "Priya Verma",
    email: "priya.verma@example.com",
    phone: "9876543211",
    course: "AWS Cloud Computing",
    trainer: "Amit Kumar",
    mode: "Hybrid",
    batchType: "Weekend",
    batchStartDate: "2026-10-12",
    batchEndDate: "2027-01-12",
    batchTime: "11:00 AM",
    admissionDate: "2026-10-12",
    totalFee: 35000,
    feeStatus: "Clear",
    videoAccess: "Yes",
    status: "Active",
    notes: "",
  },
  {
    id: 3,
    name: "Aman Gupta",
    email: "aman.gupta@example.com",
    phone: "9876543212",
    course: "Full Stack Development",
    trainer: "Manav Sharma",
    mode: "Offline",
    batchType: "Custom",
    batchStartDate: "2026-10-15",
    batchEndDate: "2027-03-15",
    batchTime: "02:00 PM",
    admissionDate: "2026-10-15",
    totalFee: 50000,
    feeStatus: "Pending",
    videoAccess: "No",
    status: "Active",
    notes: "",
  },
];

const emptyStudent = {
  name: "",
  email: "",
  phone: "",
  course: "",
  trainer: "",
  mode: "Online",
  batchType: "Mon-Th",
  batchStartDate: "",
  batchEndDate: "",
  batchTime: "",
  admissionDate: "",
  totalFee: "",
  feeStatus: "Pending",
  videoAccess: "Yes",
  status: "Active",
  notes: "",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "block text-sm font-medium text-slate-700";

function Field({ label, children }) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function displayDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function exportStudents(students) {
  const columns = [
    ["name", "Student Name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["course", "Course"],
    ["trainer", "Trainer"],
    ["mode", "Mode"],
    ["batchType", "Batch Type"],
    ["batchStartDate", "Batch Start Date"],
    ["batchEndDate", "Batch End Date"],
    ["batchTime", "Batch Time"],
    ["admissionDate", "Admission Date"],
    ["totalFee", "Total Fee"],
    ["feeStatus", "Fee Status"],
    ["videoAccess", "Video Access"],
    ["status", "Student Status"],
  ];

  const escapeCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.map(([, heading]) => escapeCell(heading)).join(","),
    ...students.map((student) =>
      columns.map(([key]) => escapeCell(student[key])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "appwars-students.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function StudentsPage() {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [feeFilter, setFeeFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const courses = useMemo(
    () => [...new Set(students.map((student) => student.course).filter(Boolean))].sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.phone.includes(term) ||
        student.course.toLowerCase().includes(term) ||
        student.trainer.toLowerCase().includes(term);

      return (
        matchesSearch &&
        (courseFilter === "All" || student.course === courseFilter) &&
        (statusFilter === "All" || student.status === statusFilter) &&
        (modeFilter === "All" || student.mode === modeFilter) &&
        (feeFilter === "All" || student.feeStatus === feeFilter)
      );
    });
  }, [students, search, courseFilter, statusFilter, modeFilter, feeFilter]);

  const activeCount = students.filter(
    (student) => student.status === "Active"
  ).length;

  const totalFees = students.reduce(
    (sum, student) => sum + Number(student.totalFee || 0),
    0
  );

  const pendingCount = students.filter(
    (student) => student.feeStatus === "Pending"
  ).length;

  function openAddModal() {
    setEditingId(null);
    setForm(emptyStudent);
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingId(student.id);
    setForm({ ...emptyStudent, ...student });
    setSelectedStudent(null);
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function saveStudent(event) {
    event.preventDefault();

    const record = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      course: form.course.trim(),
      trainer: form.trainer.trim(),
      totalFee: Number(form.totalFee) || 0,
    };

    if (editingId !== null) {
      setStudents((previous) =>
        previous.map((student) =>
          student.id === editingId
            ? { ...student, ...record, id: editingId }
            : student
        )
      );
    } else {
      setStudents((previous) => [
        { ...record, id: Date.now() },
        ...previous,
      ]);
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyStudent);
  }

  function deleteStudent(student) {
    const confirmed = window.confirm(
      `Delete student record for ${student.name}?`
    );

    if (!confirmed) return;

    setStudents((previous) =>
      previous.filter((item) => item.id !== student.id)
    );

    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
    }
  }

  const stats = [
    {
      label: "Total Students",
      value: students.length,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Active Students",
      value: activeCount,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Pending Fee Accounts",
      value: pendingCount,
      icon: Clock,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Total Course Fees",
      value: money(totalFees),
      icon: GraduationCap,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Counsellor Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Students
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage student profiles, courses, batches, fees, and learning access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportStudents(filteredStudents)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Student
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-semibold text-slate-800">
            Search and Filter Students
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, phone..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
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
            <option value="All">All Student Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Dropped">Dropped</option>
          </select>

          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Batch Modes</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <select
            value={feeFilter}
            onChange={(event) => setFeeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Fee Statuses</option>
            <option value="Clear">Clear</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </section>

      {/* Student table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Student Directory
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Showing {filteredStudents.length} student(s)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Contact",
                  "Course",
                  "Trainer",
                  "Batch",
                  "Total Fee",
                  "Fee Status",
                  "Video Access",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {student.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {student.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Joined {displayDate(student.admissionDate)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail size={14} className="shrink-0 text-slate-400" />
                      {student.email}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="shrink-0 text-slate-400" />
                      {student.phone}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-slate-600">{student.course}</td>

                  <td className="px-4 py-4 text-slate-600">{student.trainer}</td>

                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-700">{student.mode}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {student.batchType} · {student.batchTime}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {displayDate(student.batchStartDate)}
                    </p>
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-800">
                    {money(student.totalFee)}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        student.feeStatus === "Clear"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {student.feeStatus}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        student.videoAccess === "Yes"
                          ? "text-green-700"
                          : "text-slate-400"
                      }`}
                    >
                      <Video size={15} />
                      {student.videoAccess}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        student.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : student.status === "Completed"
                            ? "bg-blue-100 text-blue-700"
                            : student.status === "On Hold"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        title="View student"
                        onClick={() => setSelectedStudent(student)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        title="Edit student"
                        onClick={() => openEditModal(student)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        title="Delete student"
                        onClick={() => deleteStudent(student)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No students found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change your filters or add a new student.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / edit student modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId !== null ? "Edit Student" : "Add New Student"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the students profile, course, and batch details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveStudent} className="space-y-6 p-5">
              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Full Name *">
                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Student full name"
                    />
                  </Field>

                  <Field label="Email Address *">
                    <input
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="student@example.com"
                    />
                  </Field>

                  <Field label="Phone Number *">
                    <input
                      required
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="10-digit phone number"
                      pattern="[0-9+() -]{7,20}"
                    />
                  </Field>

                  <Field label="Admission Date *">
                    <input
                      required
                      type="date"
                      name="admissionDate"
                      value={form.admissionDate}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Course and Fees
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Course Name *">
                    <input
                      required
                      name="course"
                      value={form.course}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Course name"
                    />
                  </Field>

                  <Field label="Trainer Name *">
                    <input
                      required
                      name="trainer"
                      value={form.trainer}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Assigned trainer"
                    />
                  </Field>

                  <Field label="Total Course Fee (₹)">
                    <input
                      min="0"
                      type="number"
                      name="totalFee"
                      value={form.totalFee}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Fee Status">
                    <select
                      name="feeStatus"
                      value={form.feeStatus}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Pending</option>
                      <option>Clear</option>
                    </select>
                  </Field>

                  <Field label="Student Status">
                    <select
                      name="status"
                      value={form.status}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Active</option>
                      <option>Completed</option>
                      <option>On Hold</option>
                      <option>Dropped</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Batch and Learning Access
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Batch Mode">
                    <select
                      name="mode"
                      value={form.mode}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Online</option>
                      <option>Offline</option>
                      <option>Hybrid</option>
                    </select>
                  </Field>

                  <Field label="Batch Type">
                    <select
                      name="batchType"
                      value={form.batchType}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Mon-Th</option>
                      <option>Weekend</option>
                      <option>Custom</option>
                    </select>
                  </Field>

                  <Field label="Batch Time">
                    <input
                      name="batchTime"
                      value={form.batchTime}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="e.g. 10:00 AM"
                    />
                  </Field>

                  <Field label="Batch Start Date">
                    <input
                      type="date"
                      name="batchStartDate"
                      value={form.batchStartDate}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Batch End Date">
                    <input
                      type="date"
                      name="batchEndDate"
                      value={form.batchEndDate}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Video Access">
                    <select
                      name="videoAccess"
                      value={form.videoAccess}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </Field>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <Field label="Internal Notes">
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={updateField}
                        rows={3}
                        className={inputClass}
                        placeholder="Optional student or counselling notes"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  {editingId !== null ? "Update Student" : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student profile modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {selectedStudent.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedStudent.name}
                  </h2>
                  <p className="text-sm text-slate-500">Student Profile</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {[
                ["Email", selectedStudent.email],
                ["Phone", selectedStudent.phone],
                ["Course", selectedStudent.course],
                ["Trainer", selectedStudent.trainer],
                ["Total Course Fee", money(selectedStudent.totalFee)],
                ["Fee Status", selectedStudent.feeStatus],
                ["Admission Date", displayDate(selectedStudent.admissionDate)],
                ["Batch Mode", selectedStudent.mode],
                ["Batch Type", selectedStudent.batchType],
                ["Batch Time", selectedStudent.batchTime],
                ["Batch Start Date", displayDate(selectedStudent.batchStartDate)],
                ["Batch End Date", displayDate(selectedStudent.batchEndDate)],
                ["Video Access", selectedStudent.videoAccess],
                ["Student Status", selectedStudent.status],
                ["Notes", selectedStudent.notes || "No notes"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5">
              <button
                onClick={() => openEditModal(selectedStudent)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Pencil size={16} />
                Edit Student
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Demo student records only. Connect your backend to save and retrieve
        actual student information.
      </p>
    </div>
  );
}
