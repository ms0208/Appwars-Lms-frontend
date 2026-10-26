"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Download,
  CalendarDays,
  Clock,
  Users,
  BookOpen,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
  GraduationCap,
  Filter,
  Award,
} from "lucide-react";

const INITIAL_ASSIGNMENTS = [
  {
    id: 1,
    title: "Build a Responsive React Dashboard",
    description:
      "Create a responsive admin dashboard using React components, props, state, hooks, and Tailwind CSS. The dashboard should include navigation, summary cards, tables, and responsive layouts.",
    course: "MERN Stack Development",
    batch: "MERN-01",
    trainer: "Manav Sharma",
    audience: "Batch",
    startDate: "2026-10-24",
    dueDate: "2026-10-30",
    totalMarks: 100,
    priority: "High",
    difficulty: "Intermediate",
    status: "Published",
    submissions: 18,
    totalStudents: 25,
    createdAt: "2026-10-24",
  },
  {
    id: 2,
    title: "Node.js REST API Development",
    description:
      "Develop a REST API using Node.js and Express.js. Implement CRUD operations, input validation, error handling, and MongoDB integration.",
    course: "MERN Stack Development",
    batch: "MERN-01",
    trainer: "Manav Sharma",
    audience: "Batch",
    startDate: "2026-10-24",
    dueDate: "2026-11-02",
    totalMarks: 100,
    priority: "Normal",
    difficulty: "Intermediate",
    status: "Published",
    submissions: 12,
    totalStudents: 25,
    createdAt: "2026-10-24",
  },
  {
    id: 3,
    title: "AWS Cloud Fundamentals",
    description:
      "Explain cloud computing models, AWS global infrastructure, IAM basics, EC2 instances, and S3 storage. Submit a short report with screenshots of practical exercises.",
    course: "AWS Cloud Computing",
    batch: "AWS-02",
    trainer: "Rohit Kumar",
    audience: "Batch",
    startDate: "2026-10-25",
    dueDate: "2026-11-05",
    totalMarks: 50,
    priority: "Normal",
    difficulty: "Beginner",
    status: "Draft",
    submissions: 0,
    totalStudents: 20,
    createdAt: "2026-10-24",
  },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  course: "MERN Stack Development",
  batch: "",
  trainer: "",
  audience: "Batch",
  startDate: "",
  dueDate: "",
  totalMarks: "100",
  priority: "Normal",
  difficulty: "Intermediate",
  status: "Draft",
  totalStudents: "25",
};

const COURSES = [
  "MERN Stack Development",
  "AWS Cloud Computing",
  "Software Testing",
  "Python Programming",
  "Frontend Development",
  "Backend Development",
];

const BATCHES = [
  "MERN-01",
  "MERN-02",
  "AWS-01",
  "AWS-02",
  "TEST-01",
  "PYTHON-01",
];

const TRAINERS = [
  "Manav Sharma",
  "Rohit Kumar",
  "Neha Verma",
  "Amit Singh",
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatusBadge({ status }) {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Draft: "bg-amber-50 text-amber-700",
    Closed: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    High: "bg-red-50 text-red-700",
    Normal: "bg-blue-50 text-blue-700",
    Low: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[priority] || styles.Normal
      }`}
    >
      {priority}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const styles = {
    Beginner: "bg-green-50 text-green-700",
    Intermediate: "bg-blue-50 text-blue-700",
    Advanced: "bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[difficulty] || styles.Intermediate
      }`}
    >
      {difficulty}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewAssignment, setViewAssignment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const publishedCount = assignments.filter(
    (item) => item.status === "Published"
  ).length;

  const draftCount = assignments.filter(
    (item) => item.status === "Draft"
  ).length;

  const totalSubmissions = assignments.reduce(
    (total, item) => total + Number(item.submissions || 0),
    0
  );

  const pendingSubmissions = assignments.reduce(
    (total, item) =>
      total +
      Math.max(
        0,
        Number(item.totalStudents || 0) -
          Number(item.submissions || 0)
      ),
    0
  );

  const filteredAssignments = assignments.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = [
      item.title,
      item.description,
      item.course,
      item.batch,
      item.trainer,
    ].some((value) => value.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;

    const matchesCourse =
      courseFilter === "All" || item.course === courseFilter;

    const matchesPriority =
      priorityFilter === "All" || item.priority === priorityFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCourse &&
      matchesPriority
    );
  });

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(assignment) {
    setEditingId(assignment.id);

    setForm({
      ...assignment,
      totalMarks: String(assignment.totalMarks),
      totalStudents: String(assignment.totalStudents),
    });

    setError("");
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function saveAssignment(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim() || !form.description.trim()) {
      setError("Please enter the assignment title and description.");
      return;
    }

    if (!form.startDate || !form.dueDate) {
      setError("Please select both the start date and due date.");
      return;
    }

    if (form.dueDate < form.startDate) {
      setError("The due date cannot be earlier than the start date.");
      return;
    }

    if (Number(form.totalMarks) <= 0) {
      setError("Total marks must be greater than zero.");
      return;
    }

    if (Number(form.totalStudents) < 0) {
      setError("The number of students cannot be negative.");
      return;
    }

    const existing = assignments.find(
      (item) =>
        item.id !== editingId &&
        item.title.trim().toLowerCase() ===
          form.title.trim().toLowerCase() &&
        item.course === form.course &&
        item.batch === form.batch
    );

    if (existing) {
      setError(
        "An assignment with this title already exists for this course and batch."
      );
      return;
    }

    const today = new Date().toLocaleDateString("en-CA");

    const data = {
      title: form.title.trim(),
      description: form.description.trim(),
      course: form.course,
      batch: form.audience === "Everyone" ? "All Batches" : form.batch,
      trainer: form.trainer.trim(),
      audience: form.audience,
      startDate: form.startDate,
      dueDate: form.dueDate,
      totalMarks: Number(form.totalMarks),
      totalStudents: Number(form.totalStudents),
      priority: form.priority,
      difficulty: form.difficulty,
      status: form.status,
      createdAt: today,
    };

    if (editingId !== null) {
      setAssignments((previous) =>
        previous.map((item) =>
          item.id === editingId ? { ...item, ...data } : item
        )
      );
    } else {
      setAssignments((previous) => [
        {
          id: Date.now(),
          ...data,
          submissions: 0,
        },
        ...previous,
      ]);
    }

    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function deleteAssignment(assignment) {
    const confirmed = window.confirm(
      `Delete assignment "${assignment.title}"?`
    );

    if (!confirmed) return;

    setAssignments((previous) =>
      previous.filter((item) => item.id !== assignment.id)
    );

    if (viewAssignment?.id === assignment.id) {
      setViewAssignment(null);
    }
  }

  function exportCSV() {
    const headers = [
      "Title",
      "Description",
      "Course",
      "Batch",
      "Trainer",
      "Audience",
      "Start Date",
      "Due Date",
      "Total Marks",
      "Priority",
      "Difficulty",
      "Status",
      "Submissions",
      "Total Students",
    ];

    const rows = filteredAssignments.map((item) => [
      item.title,
      item.description,
      item.course,
      item.batch,
      item.trainer,
      item.audience,
      item.startDate,
      item.dueDate,
      item.totalMarks,
      item.priority,
      item.difficulty,
      item.status,
      item.submissions,
      item.totalStudents,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-assignments.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setCourseFilter("All");
    setPriorityFilter("All");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <ClipboardList size={17} />
              APPWARS LMS / Academics
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Assignment Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create assignments, manage deadlines, and monitor submissions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Download size={17} />
              Export CSV
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#102b53]"
            >
              <Plus size={18} />
              Create Assignment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Assignments"
            value={assignments.length}
            subtitle="All created assignments"
            icon={ClipboardList}
            color="blue"
          />

          <StatCard
            title="Published"
            value={publishedCount}
            subtitle="Available to assigned learners"
            icon={CheckCircle2}
            color="green"
          />

          <StatCard
            title="Drafts"
            value={draftCount}
            subtitle="Not yet published"
            icon={FileText}
            color="amber"
          />

          <StatCard
            title="Pending Submissions"
            value={pendingSubmissions}
            subtitle={`${totalSubmissions} submissions recorded`}
            icon={Clock}
            color="purple"
          />
        </div>

        {/* Info banner */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                <GraduationCap size={23} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Manage learning activities
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
                  Publish coding tasks, practical exercises, projects, tests,
                  and homework. Assign work to a particular batch or make it
                  available to all batches.
                </p>
              </div>
            </div>

            <button
              onClick={openCreateModal}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50"
            >
              Add New Assignment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">
              Search and Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assignments, courses, trainers..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className={inputClass}
              aria-label="Filter by course"
            >
              <option value="All">All courses</option>
              {COURSES.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className={inputClass}
              aria-label="Filter by priority"
            >
              <option value="All">All priorities</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Assignments List */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-gray-900">All Assignments</h2>
              <p className="mt-1 text-xs text-gray-500">
                Showing {filteredAssignments.length} of {assignments.length} assignments
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredAssignments.map((assignment) => {
              const submissionPercent =
                assignment.totalStudents > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (assignment.submissions / assignment.totalStudents) *
                          100
                      )
                    )
                  : 0;

              return (
                <article
                  key={assignment.id}
                  className="p-5 transition hover:bg-gray-50/70 sm:p-6"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-bold text-gray-900">
                          {assignment.title}
                        </h3>

                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                          {assignment.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <BookOpen size={13} />
                            {assignment.course}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            <Users size={13} />
                            {assignment.batch}
                          </span>

                          <StatusBadge status={assignment.status} />
                          <PriorityBadge priority={assignment.priority} />
                          <DifficultyBadge difficulty={assignment.difficulty} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-gray-500">Start Date</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-800">
                              <CalendarDays size={14} className="text-gray-400" />
                              {assignment.startDate}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Due Date</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-800">
                              <Clock size={14} className="text-gray-400" />
                              {assignment.dueDate}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Total Marks</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                              <Award size={14} className="text-gray-400" />
                              {assignment.totalMarks}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Trainer</p>
                            <p className="mt-1 truncate text-sm font-medium text-gray-800">
                              {assignment.trainer || "Not assigned"}
                            </p>
                          </div>
                        </div>

                        {/* Submission progress */}
                        <div className="mt-5 max-w-xl">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-gray-600">
                              Submission Progress
                            </span>
                            <span className="text-xs font-semibold text-gray-800">
                              {assignment.submissions}/
                              {assignment.totalStudents} submitted
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${submissionPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        onClick={() => setViewAssignment(assignment)}
                        title="View assignment"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        onClick={() => openEditModal(assignment)}
                        title="Edit assignment"
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteAssignment(assignment)}
                        title="Delete assignment"
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {filteredAssignments.length === 0 && (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <ClipboardList size={25} />
                </div>

                <h3 className="mt-4 font-semibold text-gray-900">
                  No assignments found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Try changing the filters or create a new assignment.
                </p>

                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  <Plus size={17} />
                  Create Assignment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Assignment" : "Create Assignment"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Configure assignment instructions, audience, and deadlines.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAssignment} className="space-y-5 p-5 sm:p-6">
              <FormField label="Assignment Title" required>
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  placeholder="Enter assignment title"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Assignment Description" required>
                <textarea
                  required
                  rows={5}
                  maxLength={10000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe the task, requirements, instructions, and expected deliverables..."
                  className={`${inputClass} resize-y`}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Course" required>
                  <select
                    value={form.course}
                    onChange={(event) =>
                      updateForm("course", event.target.value)
                    }
                    className={inputClass}
                  >
                    {COURSES.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Target Audience" required>
                  <select
                    value={form.audience}
                    onChange={(event) => {
                      const audience = event.target.value;

                      setForm((previous) => ({
                        ...previous,
                        audience,
                        batch:
                          audience === "Everyone"
                            ? "All Batches"
                            : previous.batch === "All Batches"
                              ? ""
                              : previous.batch,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="Batch">Specific Batch</option>
                    <option value="Everyone">All Batches</option>
                  </select>
                </FormField>

                {form.audience === "Batch" && (
                  <FormField label="Batch" required>
                    <select
                      required
                      value={form.batch}
                      onChange={(event) =>
                        updateForm("batch", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Select batch</option>
                      {BATCHES.map((batch) => (
                        <option key={batch} value={batch}>
                          {batch}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}

                <FormField label="Assigned Trainer">
                  <select
                    value={form.trainer}
                    onChange={(event) =>
                      updateForm("trainer", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select trainer</option>
                    {TRAINERS.map((trainer) => (
                      <option key={trainer} value={trainer}>
                        {trainer}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Start Date" required>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(event) =>
                      updateForm("startDate", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Due Date" required>
                  <input
                    type="date"
                    required
                    min={form.startDate || undefined}
                    value={form.dueDate}
                    onChange={(event) =>
                      updateForm("dueDate", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Total Marks" required>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100000"
                    value={form.totalMarks}
                    onChange={(event) =>
                      updateForm("totalMarks", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Number of Students" required>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.totalStudents}
                    onChange={(event) =>
                      updateForm("totalStudents", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Priority" required>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateForm("priority", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </FormField>

                <FormField label="Difficulty Level" required>
                  <select
                    value={form.difficulty}
                    onChange={(event) =>
                      updateForm("difficulty", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </FormField>

                <FormField label="Assignment Status" required>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Draft">Save as Draft</option>
                    <option value="Published">Publish Assignment</option>
                    <option value="Closed">Closed</option>
                  </select>
                </FormField>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  {form.status === "Published" ? (
                    <Send size={16} />
                  ) : (
                    <Save size={16} />
                  )}

                  {editingId
                    ? "Save Changes"
                    : form.status === "Published"
                      ? "Publish Assignment"
                      : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Assignment Modal */}
      {viewAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewAssignment(null);
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusBadge status={viewAssignment.status} />
                  <PriorityBadge priority={viewAssignment.priority} />
                  <DifficultyBadge difficulty={viewAssignment.difficulty} />
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  {viewAssignment.title}
                </h2>
              </div>

              <button
                onClick={() => setViewAssignment(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Instructions
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                  {viewAssignment.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Course", viewAssignment.course],
                  ["Batch", viewAssignment.batch],
                  ["Trainer", viewAssignment.trainer || "Not assigned"],
                  ["Start Date", viewAssignment.startDate],
                  ["Due Date", viewAssignment.dueDate],
                  ["Total Marks", viewAssignment.totalMarks],
                  [
                    "Submissions",
                    `${viewAssignment.submissions}/${viewAssignment.totalStudents}`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-gray-50 p-3"
                  >
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setViewAssignment(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    const selected = viewAssignment;
                    setViewAssignment(null);
                    openEditModal(selected);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102b53]"
                >
                  <Pencil size={16} />
                  Edit Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
