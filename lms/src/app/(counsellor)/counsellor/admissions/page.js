
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  X,
  Users,
  IndianRupee,
  CalendarDays,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";

const emptyAdmission = {
  studentName: "",
  course: "",
  totalFee: "",
  registrationFee: "",
  installment0: "",
  installment1: "",
  installment2: "",
  installment3: "",
  bajajFinance: "No",
  paymentMode: "UPI",
  feeStatus: "Pending",
  trainer: "",
  mode: "Online",
  batchType: "Mon-Th",
  batchStartDate: "",
  time: "",
  batchEndDate: "",
  videoAccess: "Yes",
  admissionDate: "",
};

const demoAdmissions = [
  {
    id: 1,
    studentName: "Rahul Sharma",
    course: "MERN Stack Development",
    totalFee: 45000,
    registrationFee: 5000,
    installment0: 10000,
    installment1: 10000,
    installment2: 10000,
    installment3: 10000,
    bajajFinance: "No",
    paymentMode: "UPI",
    feeStatus: "Pending",
    trainer: "Manav Sharma",
    mode: "Online",
    batchType: "Mon-Th",
    batchStartDate: "2026-10-05",
    time: "10:00 AM",
    batchEndDate: "2027-02-05",
    videoAccess: "Yes",
    admissionDate: "2026-10-05",
  },
  {
    id: 2,
    studentName: "Priya Verma",
    course: "AWS Cloud Computing",
    totalFee: 35000,
    registrationFee: 5000,
    installment0: 15000,
    installment1: 15000,
    installment2: 0,
    installment3: 0,
    bajajFinance: "Yes",
    paymentMode: "Bajaj Finance",
    feeStatus: "Clear",
    trainer: "Amit Kumar",
    mode: "Hybrid",
    batchType: "Weekend",
    batchStartDate: "2026-10-12",
    time: "11:00 AM",
    batchEndDate: "2027-01-12",
    videoAccess: "Yes",
    admissionDate: "2026-10-12",
  },
  {
    id: 3,
    studentName: "Aman Gupta",
    course: "Full Stack Development",
    totalFee: 50000,
    registrationFee: 5000,
    installment0: 10000,
    installment1: 10000,
    installment2: 0,
    installment3: 0,
    bajajFinance: "No",
    paymentMode: "Bank Transfer",
    feeStatus: "Pending",
    trainer: "Manav Sharma",
    mode: "Offline",
    batchType: "Custom",
    batchStartDate: "2026-10-15",
    time: "02:00 PM",
    batchEndDate: "2027-03-15",
    videoAccess: "No",
    admissionDate: "2026-10-15",
  },
];

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

function downloadCSV(rows) {
  const columns = [
    "studentName",
    "course",
    "totalFee",
    "registrationFee",
    "installment0",
    "installment1",
    "installment2",
    "installment3",
    "bajajFinance",
    "paymentMode",
    "feeStatus",
    "trainer",
    "mode",
    "batchType",
    "batchStartDate",
    "time",
    "batchEndDate",
    "videoAccess",
    "admissionDate",
  ];

  const csvCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "appwars-admissions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState(demoAdmissions);
  const [search, setSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [form, setForm] = useState(emptyAdmission);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    const now = new Date();
    setCurrentMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
  }, []);

  const months = useMemo(() => {
    return [
      ...new Set(
        admissions
          .map((item) => item.admissionDate?.slice(0, 7))
          .filter(Boolean)
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [admissions]);

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((item) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        item.studentName.toLowerCase().includes(term) ||
        item.course.toLowerCase().includes(term) ||
        item.trainer.toLowerCase().includes(term);

      const matchesFee =
        feeFilter === "All" || item.feeStatus === feeFilter;

      const matchesMode =
        modeFilter === "All" || item.mode === modeFilter;

      const matchesMonth =
        monthFilter === "All" ||
        item.admissionDate?.startsWith(monthFilter);

      return (
        matchesSearch && matchesFee && matchesMode && matchesMonth
      );
    });
  }, [admissions, search, feeFilter, modeFilter, monthFilter]);

  const totalFees = filteredAdmissions.reduce(
    (sum, item) => sum + Number(item.totalFee || 0),
    0
  );

  const pendingCount = filteredAdmissions.filter(
    (item) => item.feeStatus === "Pending"
  ).length;

  function openAddModal() {
    setEditingId(null);
    setForm({
      ...emptyAdmission,
      admissionDate: currentMonth
        ? `${currentMonth}-${new Date().getDate().toString().padStart(2, "0")}`
        : "",
    });
    setModalOpen(true);
  }

  function openEditModal(admission) {
    setEditingId(admission.id);
    setForm({ ...emptyAdmission, ...admission });
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function saveAdmission(event) {
    event.preventDefault();

    const record = {
      ...form,
      studentName: form.studentName.trim(),
      course: form.course.trim(),
      trainer: form.trainer.trim(),
      totalFee: Number(form.totalFee) || 0,
      registrationFee: Number(form.registrationFee) || 0,
      installment0: Number(form.installment0) || 0,
      installment1: Number(form.installment1) || 0,
      installment2: Number(form.installment2) || 0,
      installment3: Number(form.installment3) || 0,
    };

    if (editingId !== null) {
      setAdmissions((previous) =>
        previous.map((item) =>
          item.id === editingId ? { ...record, id: editingId } : item
        )
      );
    } else {
      setAdmissions((previous) => [
        { ...record, id: Date.now() },
        ...previous,
      ]);
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyAdmission);
  }

  function deleteAdmission(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this admission?"
    );

    if (!confirmed) return;

    setAdmissions((previous) => previous.filter((item) => item.id !== id));

    if (selectedAdmission?.id === id) {
      setSelectedAdmission(null);
    }
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Counsellor Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Admissions
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage student registrations, course fees, and batch details.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadCSV(filteredAdmissions)}
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
            Add Admission
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Admissions",
            value: filteredAdmissions.length,
            icon: Users,
            color: "bg-blue-100 text-blue-700",
          },
          {
            label: "Total Course Fees",
            value: money(totalFees),
            icon: IndianRupee,
            color: "bg-indigo-100 text-indigo-700",
          },
          {
            label: "Pending Fee Accounts",
            value: pendingCount,
            icon: Clock,
            color: "bg-amber-100 text-amber-700",
          },
          {
            label: "Fee Clear Accounts",
            value: filteredAdmissions.length - pendingCount,
            icon: CheckCircle2,
            color: "bg-green-100 text-green-700",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">
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

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-semibold text-slate-800">
            Search and Filter Admissions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, course, trainer..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Admission Months</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>

          <select
            value={feeFilter}
            onChange={(event) => setFeeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Fee Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Clear">Clear</option>
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
        </div>
      </div>

      {/* Admissions table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Student Admission Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredAdmissions.length} admission(s)
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Use the horizontal scroll to view all columns.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Total Fee",
                  "Registration",
                  "Installments",
                  "Payment",
                  "Fee Status",
                  "Trainer",
                  "Batch",
                  "Start Date",
                  "Time",
                  "Video",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredAdmissions.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800">
                      {item.studentName}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {displayDate(item.admissionDate)}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-slate-600">{item.course}</td>

                  <td className="px-4 py-4 font-semibold text-slate-800">
                    {money(item.totalFee)}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {money(item.registrationFee)}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    <p>0: {money(item.installment0)}</p>
                    <p>1: {money(item.installment1)}</p>
                    <p>2: {money(item.installment2)}</p>
                    <p>3: {money(item.installment3)}</p>
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-slate-700">{item.paymentMode}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Bajaj: {item.bajajFinance}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.feeStatus === "Clear"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.feeStatus}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-slate-600">{item.trainer}</td>

                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-700">{item.mode}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.batchType}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {displayDate(item.batchStartDate)}
                  </td>

                  <td className="px-4 py-4 text-slate-600">{item.time}</td>

                  <td className="px-4 py-4">
                    <span
                      className={
                        item.videoAccess === "Yes"
                          ? "font-medium text-green-700"
                          : "font-medium text-slate-400"
                      }
                    >
                      {item.videoAccess}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        title="View details"
                        onClick={() => setSelectedAdmission(item)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title="Edit admission"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title="Delete admission"
                        onClick={() => deleteAdmission(item.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAdmissions.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No admissions found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change the filters or add a new student admission.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit admission modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId !== null ? "Edit Admission" : "Add New Admission"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter student, fee, and batch details.
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

            <form onSubmit={saveAdmission} className="space-y-6 p-5">
              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Student and Course Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Student Name *">
                    <input
                      required
                      name="studentName"
                      value={form.studentName}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Enter full name"
                    />
                  </Field>

                  <Field label="Course *">
                    <input
                      required
                      name="course"
                      value={form.course}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="e.g. MERN Stack"
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

                  <Field label="Total Course Fee (₹) *">
                    <input
                      required
                      min="0"
                      type="number"
                      name="totalFee"
                      value={form.totalFee}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Registration Fee (₹)">
                    <input
                      min="0"
                      type="number"
                      name="registrationFee"
                      value={form.registrationFee}
                      onChange={updateField}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Trainer *">
                    <input
                      required
                      name="trainer"
                      value={form.trainer}
                      onChange={updateField}
                      className={inputClass}
                      placeholder="Trainer name"
                    />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Installment Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["installment0", "Installment 0 (₹)"],
                    ["installment1", "Installment 1 (₹)"],
                    ["installment2", "Installment 2 (₹)"],
                    ["installment3", "Installment 3 (₹)"],
                  ].map(([name, label]) => (
                    <Field key={name} label={label}>
                      <input
                        min="0"
                        type="number"
                        name={name}
                        value={form[name]}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Bajaj Finance">
                    <select
                      name="bajajFinance"
                      value={form.bajajFinance}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </Field>

                  <Field label="Payment Mode">
                    <select
                      name="paymentMode"
                      value={form.paymentMode}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Debit/Credit Card</option>
                      <option>Bajaj Finance</option>
                      <option>Other</option>
                    </select>
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
                </div>
              </section>

              <section>
                <h3 className="mb-4 font-semibold text-blue-800">
                  Batch Details
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

                  <Field label="Batch Time *">
                    <input
                      required
                      name="time"
                      value={form.time}
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
                  {editingId !== null
                    ? "Update Admission"
                    : "Save Admission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View admission details */}
      {selectedAdmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Admission Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAdmission.studentName}
                </p>
              </div>

              <button
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {[
                ["Course", selectedAdmission.course],
                ["Admission Date", displayDate(selectedAdmission.admissionDate)],
                ["Total Fee", money(selectedAdmission.totalFee)],
                ["Registration Fee", money(selectedAdmission.registrationFee)],
                ["Installment 0", money(selectedAdmission.installment0)],
                ["Installment 1", money(selectedAdmission.installment1)],
                ["Installment 2", money(selectedAdmission.installment2)],
                ["Installment 3", money(selectedAdmission.installment3)],
                ["Payment Mode", selectedAdmission.paymentMode],
                ["Bajaj Finance", selectedAdmission.bajajFinance],
                ["Fee Status", selectedAdmission.feeStatus],
                ["Trainer", selectedAdmission.trainer],
                ["Batch Mode", selectedAdmission.mode],
                ["Batch Type", selectedAdmission.batchType],
                ["Batch Start", displayDate(selectedAdmission.batchStartDate)],
                ["Batch End", displayDate(selectedAdmission.batchEndDate)],
                ["Batch Time", selectedAdmission.time],
                ["Video Access", selectedAdmission.videoAccess],
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

            <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
              <button
                onClick={() => {
                  openEditModal(selectedAdmission);
                  setSelectedAdmission(null);
                }}
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Edit Admission
              </button>

              <button
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
