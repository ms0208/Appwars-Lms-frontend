"use client";

import { useState } from "react";
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
} from "lucide-react";

const initialResults = [
  {
    id: 1,
    student: "Aarav Sharma",
    rollNo: "STU001",
    course: "MERN Stack Development",
    exam: "JavaScript Assessment",
    date: "2026-10-20",
    obtained: 88,
    total: 100,
    remarks: "Excellent performance",
  },
  {
    id: 2,
    student: "Priya Verma",
    rollNo: "STU002",
    course: "MERN Stack Development",
    exam: "JavaScript Assessment",
    date: "2026-10-20",
    obtained: 76,
    total: 100,
    remarks: "Good understanding",
  },
  {
    id: 3,
    student: "Rahul Kumar",
    rollNo: "STU003",
    course: "AWS Cloud Computing",
    exam: "Cloud Fundamentals",
    date: "2026-10-21",
    obtained: 32,
    total: 100,
    remarks: "Needs improvement",
  },
  {
    id: 4,
    student: "Sneha Gupta",
    rollNo: "STU004",
    course: "Software Testing",
    exam: "Manual Testing Exam",
    date: "2026-10-22",
    obtained: 91,
    total: 100,
    remarks: "Outstanding",
  },
  {
    id: 5,
    student: "Arjun Singh",
    rollNo: "STU005",
    course: "MERN Stack Development",
    exam: "React Assessment",
    date: "2026-10-23",
    obtained: 43,
    total: 100,
    remarks: "",
  },
];

const emptyResult = {
  student: "",
  rollNo: "",
  course: "",
  exam: "",
  date: "2026-10-24",
  obtained: "",
  total: "100",
  remarks: "",
};

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

export default function ResultsPage() {
  const [results, setResults] = useState(initialResults);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyResult);
  const [error, setError] = useState("");

  const passed = results.filter(
    (r) => getStatus(getPercentage(r.obtained, r.total)) === "Pass"
  ).length;

  const failed = results.length - passed;

  const average = results.length
    ? results.reduce(
        (sum, r) => sum + getPercentage(r.obtained, r.total),
        0
      ) / results.length
    : 0;

  const courses = [...new Set(results.map((r) => r.course).filter(Boolean))];

  const filtered = results.filter((r) => {
    const q = search.toLowerCase();
    const percentage = getPercentage(r.obtained, r.total);
    const status = getStatus(percentage);

    return (
      (r.student.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q) ||
        r.exam.toLowerCase().includes(q)) &&
      (statusFilter === "All" || status === statusFilter) &&
      (courseFilter === "All" || r.course === courseFilter)
    );
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setSelected(null);
    setForm({ ...emptyResult });
    setError("");
    setModal("form");
  }

  function openEdit(result) {
    setSelected(result);
    setForm({ ...result, obtained: String(result.obtained), total: String(result.total) });
    setError("");
    setModal("form");
  }

  function saveResult(event) {
    event.preventDefault();

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

    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) {
      setError("Enter valid marks and a total greater than zero.");
      return;
    }

    if (obtained < 0 || obtained > total) {
      setError("Obtained marks must be between zero and the total marks.");
      return;
    }

    const saved = {
      ...form,
      student: form.student.trim(),
      rollNo: form.rollNo.trim(),
      course: form.course.trim(),
      exam: form.exam.trim(),
      obtained,
      total,
    };

    if (selected) {
      setResults((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, ...saved } : r))
      );
    } else {
      setResults((prev) => [...prev, { ...saved, id: Date.now() }]);
    }

    setModal(null);
    setSelected(null);
    setError("");
  }

  function deleteResult(id) {
    if (window.confirm("Are you sure you want to delete this result?")) {
      setResults((prev) => prev.filter((r) => r.id !== id));
    }
  }

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

    const rows = filtered.map((r) => {
      const percentage = getPercentage(r.obtained, r.total);

      return [
        r.student,
        r.rollNo,
        r.course,
        r.exam,
        r.date,
        r.obtained,
        r.total,
        percentage.toFixed(2),
        getGrade(percentage),
        getStatus(percentage),
        r.remarks,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "appwars-results.csv";
    link.click();
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
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} /> Export CSV
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus size={17} /> Add Result
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Results" value={results.length} icon={ClipboardList} />
          <StatCard title="Passed" value={passed} icon={CheckCircle2} />
          <StatCard title="Failed" value={failed} icon={Users} />
          <StatCard title="Average Score" value={`${average.toFixed(1)}%`} icon={TrendingUp} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, roll no. or exam..."
                className={inputClass + " pl-10"}
              />
            </div>

            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={inputClass}>
              <option value="All">All Courses</option>
              {courses.map((course) => <option key={course} value={course}>{course}</option>)}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
              <option value="All">All Results</option>
              <option value="Pass">Passed</option>
              <option value="Fail">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Student Results</h2>
            <span className="text-sm text-slate-500">{filtered.length} results</span>
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
                {filtered.map((r) => {
                  const percentage = getPercentage(r.obtained, r.total);
                  const status = getStatus(percentage);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{r.student}</p>
                        <p className="mt-1 text-xs text-slate-500">{r.rollNo}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">{r.course}</p>
                        <p className="mt-1 text-xs text-slate-500">{r.exam}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(r.date)}</td>
                      <td className="px-5 py-4 font-medium text-slate-700">{r.obtained} / {r.total}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">{percentage.toFixed(1)}%</p>
                        <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(percentage, 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-50 px-2 font-bold text-blue-700">
                          {getGrade(percentage)}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <ActionButton label="View" onClick={() => { setSelected(r); setModal("view"); }}><Eye size={16} /></ActionButton>
                          <ActionButton label="Edit" onClick={() => openEdit(r)}><Pencil size={16} /></ActionButton>
                          <ActionButton label="Delete" danger onClick={() => deleteResult(r.id)}><Trash2 size={16} /></ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">No results match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === "form" && (
        <Modal title={selected ? "Edit Result" : "Add Student Result"} onClose={() => setModal(null)}>
          <form onSubmit={saveResult} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student Name *">
                <input required value={form.student} onChange={(e) => updateField("student", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Roll Number *">
                <input required value={form.rollNo} onChange={(e) => updateField("rollNo", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Course *">
                <input required value={form.course} onChange={(e) => updateField("course", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Exam Name *">
                <input required value={form.exam} onChange={(e) => updateField("exam", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Exam Date *">
                <input type="date" required value={form.date} onChange={(e) => updateField("date", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Total Marks *">
                <input type="number" required min="1" value={form.total} onChange={(e) => updateField("total", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Obtained Marks *">
                <input type="number" required min="0" max={form.total || undefined} value={form.obtained} onChange={(e) => updateField("obtained", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Remarks">
                <input value={form.remarks} onChange={(e) => updateField("remarks", e.target.value)} className={inputClass} placeholder="Optional feedback" />
              </Field>
            </div>

            {form.obtained !== "" && Number(form.total) > 0 && Number(form.obtained) >= 0 && Number(form.obtained) <= Number(form.total) && (
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-blue-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">Percentage</p>
                  <p className="mt-1 font-bold text-blue-800">{getPercentage(form.obtained, form.total).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Grade</p>
                  <p className="mt-1 font-bold text-blue-800">{getGrade(getPercentage(form.obtained, form.total))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Result</p>
                  <p className="mt-1 font-bold text-blue-800">{getStatus(getPercentage(form.obtained, form.total))}</p>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">{selected ? "Save Changes" : "Add Result"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selected && (
        <Modal title="Result Details" onClose={() => setModal(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Award size={28} /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selected.student}</h3>
                <p className="mt-1 text-sm text-slate-500">{selected.rollNo}</p>
                <div className="mt-2"><StatusBadge status={getStatus(getPercentage(selected.obtained, selected.total))} /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Detail label="Course" value={selected.course} />
              <Detail label="Exam" value={selected.exam} />
              <Detail label="Date" value={formatDate(selected.date)} />
              <Detail label="Marks" value={`${selected.obtained} / ${selected.total}`} />
              <Detail label="Percentage" value={`${getPercentage(selected.obtained, selected.total).toFixed(2)}%`} />
              <Detail label="Grade" value={getGrade(getPercentage(selected.obtained, selected.total))} />
              <Detail label="Remarks" value={selected.remarks || "No remarks"} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function formatDate(date) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
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
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><Icon size={20} /></span>
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

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function ActionButton({ children, label, onClick, danger = false }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={`rounded-lg p-2 ${danger ? "text-red-500 hover:bg-red-50" : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"}`}>
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
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
