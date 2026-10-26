
"use client";

import { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
  Eye,
  Clock,
  Users,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

const initialCourses = [
  {
    id: 1,
    title: "MERN Stack Development",
    code: "APP-MERN-01",
    category: "Web Development",
    duration: "4 Months",
    fee: 25000,
    trainer: "Rahul Sharma",
    batches: 2,
    students: 45,
    status: "Active",
    description: "Full-stack development using MongoDB, Express.js, React.js and Node.js.",
  },
  {
    id: 2,
    title: "AWS Cloud Computing",
    code: "APP-AWS-01",
    category: "Cloud Computing",
    duration: "3 Months",
    fee: 20000,
    trainer: "Amit Verma",
    batches: 1,
    students: 25,
    status: "Active",
    description: "Cloud fundamentals, core AWS services, deployment and cloud security.",
  },
  {
    id: 3,
    title: "Software Testing",
    code: "APP-TEST-01",
    category: "Software Testing",
    duration: "3 Months",
    fee: 18000,
    trainer: "Priya Singh",
    batches: 1,
    students: 18,
    status: "Active",
    description: "Manual testing, API testing, SQL testing and automation fundamentals.",
  },
  {
    id: 4,
    title: "Python Programming",
    code: "APP-PY-01",
    category: "Programming",
    duration: "2 Months",
    fee: 12000,
    trainer: "Neha Gupta",
    batches: 0,
    students: 0,
    status: "Draft",
    description: "Python syntax, functions, OOP, modules and practical programming.",
  },
];

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

export default function CoursesPage() {
  const [courses, setCourses] = useState(initialCourses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [form, setForm] = useState(emptyCourse);
  const [error, setError] = useState("");

  const activeCourses = courses.filter((c) => c.status === "Active").length;
  const totalStudents = courses.reduce((sum, c) => sum + Number(c.students || 0), 0);
  const totalBatches = courses.reduce((sum, c) => sum + Number(c.batches || 0), 0);

  const filteredCourses = courses.filter((course) => {
    const query = search.toLowerCase();

    const matchesSearch =
      course.title.toLowerCase().includes(query) ||
      course.code.toLowerCase().includes(query) ||
      course.category.toLowerCase().includes(query) ||
      course.trainer.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || course.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openAdd() {
    setForm({ ...emptyCourse });
    setError("");
    setModal("form");
    setSelectedCourse(null);
  }

  function openEdit(course) {
    setForm({ ...course, fee: String(course.fee) });
    setSelectedCourse(course);
    setError("");
    setModal("form");
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function saveCourse(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.code.trim() || !form.duration.trim()) {
      setError("Please fill in the course title, course code and duration.");
      return;
    }

    const duplicateCode = courses.some(
      (course) =>
        course.code.toLowerCase() === form.code.trim().toLowerCase() &&
        course.id !== selectedCourse?.id
    );

    if (duplicateCode) {
      setError("This course code already exists.");
      return;
    }

    const savedCourse = {
      ...form,
      title: form.title.trim(),
      code: form.code.trim(),
      fee: Number(form.fee) || 0,
      batches: Number(form.batches) || 0,
      students: Number(form.students) || 0,
    };

    if (selectedCourse) {
      setCourses((prev) =>
        prev.map((course) =>
          course.id === selectedCourse.id
            ? { ...course, ...savedCourse }
            : course
        )
      );
    } else {
      setCourses((prev) => [
        ...prev,
        { ...savedCourse, id: Date.now() },
      ]);
    }

    setModal(null);
    setSelectedCourse(null);
    setError("");
  }

  function deleteCourse(id) {
    const course = courses.find((item) => item.id === id);

    if (course && course.batches > 0) {
      alert("This course has batches assigned. Remove or reassign those batches first.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this course?")) {
      setCourses((prev) => prev.filter((item) => item.id !== id));
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

    const rows = filteredCourses.map((c) => [
      c.code,
      c.title,
      c.category,
      c.duration,
      c.fee,
      c.trainer,
      c.batches,
      c.students,
      c.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
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

          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} /> Add Course
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Courses" value={courses.length} icon={BookOpen} />
          <StatCard title="Active Courses" value={activeCourses} icon={CheckCircle2} />
          <StatCard title="Total Batches" value={totalBatches} icon={GraduationCap} />
          <StatCard title="Enrolled Students" value={totalStudents} icon={Users} />
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search course, code, category or trainer..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>

            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} /> Export CSV
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
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{course.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{course.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{course.category}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{course.duration}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        ₹{Number(course.fee).toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {course.trainer || "Not assigned"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{course.batches} batches</p>
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
                        <ActionButton label="Edit" onClick={() => openEdit(course)}>
                          <Pencil size={16} />
                        </ActionButton>
                        <ActionButton
                          label="Delete"
                          onClick={() => deleteCourse(course.id)}
                          danger
                        >
                          <Trash2 size={16} />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
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
        <Modal title={selectedCourse ? "Edit Course" : "Add New Course"} onClose={() => setModal(null)}>
          <form onSubmit={saveCourse} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Course Name *">
                <input required value={form.title} onChange={(e) => updateField("title", e.target.value)} className={inputClass} placeholder="e.g. MERN Stack Development" />
              </FormField>
              <FormField label="Course Code *">
                <input required value={form.code} onChange={(e) => updateField("code", e.target.value)} className={inputClass} placeholder="e.g. APP-MERN-01" />
              </FormField>
              <FormField label="Category">
                <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className={inputClass}>
                  <option>Web Development</option>
                  <option>Cloud Computing</option>
                  <option>Software Testing</option>
                  <option>Programming</option>
                  <option>Data Science</option>
                  <option>Other</option>
                </select>
              </FormField>
              <FormField label="Duration *">
                <input required value={form.duration} onChange={(e) => updateField("duration", e.target.value)} className={inputClass} placeholder="e.g. 4 Months" />
              </FormField>
              <FormField label="Course Fee (₹)">
                <input type="number" min="0" value={form.fee} onChange={(e) => updateField("fee", e.target.value)} className={inputClass} placeholder="25000" />
              </FormField>
              <FormField label="Assigned Trainer">
                <input value={form.trainer} onChange={(e) => updateField("trainer", e.target.value)} className={inputClass} placeholder="Trainer name" />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className={inputClass}>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Archived</option>
                </select>
              </FormField>
              <FormField label="Number of Batches">
                <input type="number" min="0" value={form.batches} onChange={(e) => updateField("batches", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Enrolled Students">
                <input type="number" min="0" value={form.students} onChange={(e) => updateField("students", e.target.value)} className={inputClass} />
              </FormField>
            </div>

            <FormField label="Course Description">
              <textarea rows={3} value={form.description} onChange={(e) => updateField("description", e.target.value)} className={inputClass} placeholder="Write a short course description..." />
            </FormField>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                {selectedCourse ? "Save Changes" : "Create Course"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selectedCourse && (
        <Modal title="Course Details" onClose={() => setModal(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <BookOpen size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">{selectedCourse.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedCourse.code}</p>
                <div className="mt-2"><StatusBadge status={selectedCourse.status} /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Detail label="Category" value={selectedCourse.category} />
              <Detail label="Duration" value={selectedCourse.duration} />
              <Detail label="Course Fee" value={`₹${Number(selectedCourse.fee).toLocaleString("en-IN")}`} />
              <Detail label="Trainer" value={selectedCourse.trainer || "Not assigned"} />
              <Detail label="Batches" value={selectedCourse.batches} />
              <Detail label="Students" value={selectedCourse.students} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {selectedCourse.description || "No description added."}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><Icon size={20} /></span>
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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.Archived}`}>
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
      className={`rounded-lg p-2 ${danger ? "text-red-500 hover:bg-red-50" : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"}`}
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
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
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
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
