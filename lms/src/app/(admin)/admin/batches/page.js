
"use client";

import { useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
  Eye,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
} from "lucide-react";

const initialBatches = [
  {
    id: 1,
    name: "MERN Weekend Batch",
    code: "BATCH-MERN-01",
    course: "MERN Stack Development",
    trainer: "Rahul Sharma",
    startDate: "2026-11-01",
    endDate: "2027-02-28",
    schedule: "Sat - Sun",
    time: "10:00 AM - 12:00 PM",
    capacity: 30,
    enrolled: 24,
    mode: "Online",
    status: "Ongoing",
  },
  {
    id: 2,
    name: "AWS Evening Batch",
    code: "BATCH-AWS-01",
    course: "AWS Cloud Computing",
    trainer: "Amit Verma",
    startDate: "2026-11-10",
    endDate: "2027-02-10",
    schedule: "Mon - Thu",
    time: "7:00 PM - 8:30 PM",
    capacity: 25,
    enrolled: 18,
    mode: "Online",
    status: "Upcoming",
  },
  {
    id: 3,
    name: "Software Testing Weekday",
    code: "BATCH-TEST-01",
    course: "Software Testing",
    trainer: "Priya Singh",
    startDate: "2026-10-05",
    endDate: "2027-01-05",
    schedule: "Mon - Fri",
    time: "11:00 AM - 12:30 PM",
    capacity: 25,
    enrolled: 20,
    mode: "Offline",
    status: "Ongoing",
  },
  {
    id: 4,
    name: "Python Beginner Batch",
    code: "BATCH-PY-01",
    course: "Python Programming",
    trainer: "Neha Gupta",
    startDate: "2026-12-01",
    endDate: "2027-01-31",
    schedule: "Tue - Thu - Sat",
    time: "5:00 PM - 6:00 PM",
    capacity: 20,
    enrolled: 0,
    mode: "Online",
    status: "Upcoming",
  },
];

const emptyBatch = {
  name: "",
  code: "",
  course: "",
  trainer: "",
  startDate: "",
  endDate: "",
  schedule: "",
  time: "",
  capacity: 30,
  enrolled: 0,
  mode: "Online",
  status: "Upcoming",
};

export default function BatchesPage() {
  const [batches, setBatches] = useState(initialBatches);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [form, setForm] = useState(emptyBatch);
  const [error, setError] = useState("");

  const ongoing = batches.filter((b) => b.status === "Ongoing").length;
  const upcoming = batches.filter((b) => b.status === "Upcoming").length;
  const totalStudents = batches.reduce((sum, b) => sum + Number(b.enrolled || 0), 0);

  const filteredBatches = batches.filter((batch) => {
    const query = search.toLowerCase();

    const matchesSearch =
      batch.name.toLowerCase().includes(query) ||
      batch.code.toLowerCase().includes(query) ||
      batch.course.toLowerCase().includes(query) ||
      batch.trainer.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || batch.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openAdd() {
    setForm({ ...emptyBatch });
    setSelectedBatch(null);
    setError("");
    setModal("form");
  }

  function openEdit(batch) {
    setForm({ ...batch });
    setSelectedBatch(batch);
    setError("");
    setModal("form");
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function saveBatch(event) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.code.trim() ||
      !form.course.trim() ||
      !form.trainer.trim() ||
      !form.startDate ||
      !form.endDate
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    if (Number(form.enrolled) > Number(form.capacity)) {
      setError("Enrolled students cannot exceed batch capacity.");
      return;
    }

    const duplicateCode = batches.some(
      (batch) =>
        batch.code.toLowerCase() === form.code.trim().toLowerCase() &&
        batch.id !== selectedBatch?.id
    );

    if (duplicateCode) {
      setError("This batch code already exists.");
      return;
    }

    const savedBatch = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      capacity: Number(form.capacity) || 0,
      enrolled: Number(form.enrolled) || 0,
    };

    if (selectedBatch) {
      setBatches((prev) =>
        prev.map((batch) =>
          batch.id === selectedBatch.id
            ? { ...batch, ...savedBatch }
            : batch
        )
      );
    } else {
      setBatches((prev) => [
        ...prev,
        { ...savedBatch, id: Date.now() },
      ]);
    }

    setModal(null);
    setSelectedBatch(null);
    setError("");
  }

  function deleteBatch(id) {
    if (window.confirm("Are you sure you want to delete this batch?")) {
      setBatches((prev) => prev.filter((batch) => batch.id !== id));
    }
  }

  function exportCSV() {
    const headers = [
      "Batch Code",
      "Batch Name",
      "Course",
      "Trainer",
      "Start Date",
      "End Date",
      "Schedule",
      "Time",
      "Capacity",
      "Enrolled Students",
      "Mode",
      "Status",
    ];

    const rows = filteredBatches.map((b) => [
      b.code,
      b.name,
      b.course,
      b.trainer,
      b.startDate,
      b.endDate,
      b.schedule,
      b.time,
      b.capacity,
      b.enrolled,
      b.mode,
      b.status,
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
    link.download = "appwars-batches.csv";
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
              Batches Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Schedule training batches, assign trainers and monitor enrollment.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} /> Create Batch
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Batches" value={batches.length} icon={CalendarDays} />
          <StatCard title="Ongoing Batches" value={ongoing} icon={CheckCircle2} />
          <StatCard title="Upcoming Batches" value={upcoming} icon={Clock} />
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
                placeholder="Search batch, code, course or trainer..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
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
            <h2 className="font-semibold text-slate-800">All Batches</h2>
            <span className="text-sm text-slate-500">{filteredBatches.length} results</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Batch</th>
                  <th className="px-5 py-4">Course / Trainer</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Schedule</th>
                  <th className="px-5 py-4">Enrollment</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{batch.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{batch.code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{batch.course}</p>
                      <p className="mt-1 text-xs text-slate-500">{batch.trainer}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-700">{formatDate(batch.startDate)}</p>
                      <p className="mt-1 text-xs text-slate-500">to {formatDate(batch.endDate)}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{batch.schedule}</p>
                      <p className="mt-1 text-xs text-slate-500">{batch.time}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {batch.enrolled} / {batch.capacity}
                      </p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${batch.capacity ? Math.min((batch.enrolled / batch.capacity) * 100, 100) : 0}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">{batch.mode}</td>

                    <td className="px-5 py-4">
                      <StatusBadge status={batch.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <ActionButton
                          label="View"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setModal("view");
                          }}
                        >
                          <Eye size={16} />
                        </ActionButton>
                        <ActionButton label="Edit" onClick={() => openEdit(batch)}>
                          <Pencil size={16} />
                        </ActionButton>
                        <ActionButton
                          label="Delete"
                          onClick={() => deleteBatch(batch.id)}
                          danger
                        >
                          <Trash2 size={16} />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredBatches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      No batches found. Try another search or create a new batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === "form" && (
        <Modal title={selectedBatch ? "Edit Batch" : "Create New Batch"} onClose={() => setModal(null)}>
          <form onSubmit={saveBatch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Batch Name *">
                <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} placeholder="e.g. MERN Weekend Batch" />
              </FormField>

              <FormField label="Batch Code *">
                <input required value={form.code} onChange={(e) => updateField("code", e.target.value)} className={inputClass} placeholder="e.g. BATCH-MERN-01" />
              </FormField>

              <FormField label="Course *">
                <input required value={form.course} onChange={(e) => updateField("course", e.target.value)} className={inputClass} placeholder="Course name" />
              </FormField>

              <FormField label="Trainer *">
                <input required value={form.trainer} onChange={(e) => updateField("trainer", e.target.value)} className={inputClass} placeholder="Trainer name" />
              </FormField>

              <FormField label="Start Date *">
                <input type="date" required value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} className={inputClass} />
              </FormField>

              <FormField label="End Date *">
                <input type="date" required value={form.endDate} min={form.startDate || undefined} onChange={(e) => updateField("endDate", e.target.value)} className={inputClass} />
              </FormField>

              <FormField label="Class Days">
                <input value={form.schedule} onChange={(e) => updateField("schedule", e.target.value)} className={inputClass} placeholder="e.g. Mon - Fri" />
              </FormField>

              <FormField label="Class Time">
                <input value={form.time} onChange={(e) => updateField("time", e.target.value)} className={inputClass} placeholder="e.g. 7:00 PM - 8:30 PM" />
              </FormField>

              <FormField label="Batch Capacity">
                <input type="number" min="1" value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} className={inputClass} />
              </FormField>

              <FormField label="Currently Enrolled">
                <input type="number" min="0" value={form.enrolled} onChange={(e) => updateField("enrolled", e.target.value)} className={inputClass} />
              </FormField>

              <FormField label="Class Mode">
                <select value={form.mode} onChange={(e) => updateField("mode", e.target.value)} className={inputClass}>
                  <option>Online</option>
                  <option>Offline</option>
                  <option>Hybrid</option>
                </select>
              </FormField>

              <FormField label="Status">
                <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className={inputClass}>
                  <option>Upcoming</option>
                  <option>Ongoing</option>
                  <option>Completed</option>
                </select>
              </FormField>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                {selectedBatch ? "Save Changes" : "Create Batch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selectedBatch && (
        <Modal title="Batch Details" onClose={() => setModal(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <CalendarDays size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">{selectedBatch.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedBatch.code}</p>
                <div className="mt-2"><StatusBadge status={selectedBatch.status} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Course" value={selectedBatch.course} />
              <Detail label="Trainer" value={selectedBatch.trainer} />
              <Detail label="Start Date" value={formatDate(selectedBatch.startDate)} />
              <Detail label="End Date" value={formatDate(selectedBatch.endDate)} />
              <Detail label="Class Days" value={selectedBatch.schedule || "Not specified"} />
              <Detail label="Class Time" value={selectedBatch.time || "Not specified"} />
              <Detail label="Mode" value={selectedBatch.mode} />
              <Detail label="Enrollment" value={`${selectedBatch.enrolled} / ${selectedBatch.capacity}`} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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
    Ongoing: "bg-green-50 text-green-700",
    Upcoming: "bg-blue-50 text-blue-700",
    Completed: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.Completed}`}>
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
