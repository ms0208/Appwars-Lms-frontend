
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Search,
  Plus,
  Download,
  X,
  Pencil,
  Receipt,
  Clock,
  CheckCircle2,
  Wallet,
  Filter,
  Eye,
  Trash2,
} from "lucide-react";

const initialFees = [
  {
    id: 1,
    studentName: "Rahul Sharma",
    course: "MERN Stack Development",
    trainer: "Manav Sharma",
    totalFee: 45000,
    registrationFee: 5000,
    installment0: 10000,
    installment1: 10000,
    installment2: 10000,
    installment3: 10000,
    payments: [
      { id: 101, amount: 5000, date: "2026-10-05", mode: "UPI", note: "Registration fee" },
      { id: 102, amount: 10000, date: "2026-10-10", mode: "Cash", note: "Installment 0" },
    ],
    bajajFinance: "No",
  },
  {
    id: 2,
    studentName: "Priya Verma",
    course: "AWS Cloud Computing",
    trainer: "Amit Kumar",
    totalFee: 35000,
    registrationFee: 5000,
    installment0: 15000,
    installment1: 15000,
    installment2: 0,
    installment3: 0,
    payments: [
      { id: 201, amount: 5000, date: "2026-10-12", mode: "UPI", note: "Registration fee" },
      { id: 202, amount: 15000, date: "2026-10-15", mode: "Bajaj Finance", note: "Installment 0" },
      { id: 203, amount: 15000, date: "2026-10-18", mode: "Bajaj Finance", note: "Installment 1" },
    ],
    bajajFinance: "Yes",
  },
  {
    id: 3,
    studentName: "Aman Gupta",
    course: "Full Stack Development",
    trainer: "Manav Sharma",
    totalFee: 50000,
    registrationFee: 5000,
    installment0: 10000,
    installment1: 10000,
    installment2: 10000,
    installment3: 15000,
    payments: [
      { id: 301, amount: 5000, date: "2026-10-15", mode: "Bank Transfer", note: "Registration fee" },
      { id: 302, amount: 10000, date: "2026-10-17", mode: "UPI", note: "Installment 0" },
    ],
    bajajFinance: "No",
  },
];

const blankForm = {
  studentName: "",
  course: "",
  trainer: "",
  totalFee: "",
  registrationFee: "",
  installment0: "",
  installment1: "",
  installment2: "",
  installment3: "",
  bajajFinance: "No",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

function dateLabel(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getCollected(student) {
  return student.payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
}

function getPending(student) {
  return Math.max(0, Number(student.totalFee || 0) - getCollected(student));
}

function getStatus(student) {
  return getPending(student) === 0 ? "Clear" : "Pending";
}

function downloadCSV(rows) {
  const columns = [
    "studentName",
    "course",
    "trainer",
    "totalFee",
    "registrationFee",
    "installment0",
    "installment1",
    "installment2",
    "installment3",
    "bajajFinance",
  ];

  const headers = [
    "Student",
    "Course",
    "Trainer",
    "Total Fee",
    "Registration Fee",
    "Installment 0",
    "Installment 1",
    "Installment 2",
    "Installment 3",
    "Bajaj Finance",
    "Collected",
    "Pending",
    "Status",
  ];

  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.map(cell).join(","),
    ...rows.map((student) =>
      [
        ...columns.map((key) => student[key]),
        getCollected(student),
        getPending(student),
        getStatus(student),
      ]
        .map(cell)
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "appwars-fee-management.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function FeeManagementPage() {
  const [fees, setFees] = useState(initialFees);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentModeFilter, setPaymentModeFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [currentMonth, setCurrentMonth] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    mode: "UPI",
    note: "",
  });

  useEffect(() => {
    const now = new Date();
    setCurrentMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
  }, []);

  const filteredFees = useMemo(() => {
    return fees.filter((student) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        student.studentName.toLowerCase().includes(term) ||
        student.course.toLowerCase().includes(term) ||
        student.trainer.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || getStatus(student) === statusFilter;

      const matchesMonth =
        monthFilter === "All" ||
        student.payments.some((payment) =>
          payment.date.startsWith(monthFilter)
        );

      const matchesMode =
        paymentModeFilter === "All" ||
        student.payments.some((payment) => payment.mode === paymentModeFilter);

      return matchesSearch && matchesStatus && matchesMonth && matchesMode;
    });
  }, [fees, search, statusFilter, monthFilter, paymentModeFilter]);

  const totalFees = filteredFees.reduce(
    (sum, student) => sum + Number(student.totalFee || 0),
    0
  );

  const totalCollected = filteredFees.reduce(
    (sum, student) => sum + getCollected(student),
    0
  );

  const totalPending = filteredFees.reduce(
    (sum, student) => sum + getPending(student),
    0
  );

  const months = useMemo(() => {
    return [
      ...new Set(
        fees.flatMap((student) =>
          student.payments.map((payment) => payment.date.slice(0, 7))
        )
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [fees]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function openAddFee() {
    setEditingId(null);
    setForm(blankForm);
    setModal("fee");
  }

  function openEditFee(student) {
    setEditingId(student.id);
    setForm({
      studentName: student.studentName,
      course: student.course,
      trainer: student.trainer,
      totalFee: student.totalFee,
      registrationFee: student.registrationFee,
      installment0: student.installment0,
      installment1: student.installment1,
      installment2: student.installment2,
      installment3: student.installment3,
      bajajFinance: student.bajajFinance,
    });
    setModal("fee");
  }

  function saveFee(event) {
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
      setFees((previous) =>
        previous.map((student) =>
          student.id === editingId
            ? { ...student, ...record }
            : student
        )
      );
    } else {
      setFees((previous) => [
        {
          ...record,
          id: Date.now(),
          payments: [],
        },
        ...previous,
      ]);
    }

    setModal(null);
  }

  function openPayment(student) {
    setSelectedStudent(student);
    setPaymentForm({
      amount: "",
      date: currentMonth
        ? `${currentMonth}-${String(new Date().getDate()).padStart(2, "0")}`
        : "",
      mode: "UPI",
      note: "",
    });
    setModal("payment");
  }

  function recordPayment(event) {
    event.preventDefault();

    if (!selectedStudent) return;

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Enter a valid payment amount.");
      return;
    }

    const currentStudent = fees.find(
      (student) => student.id === selectedStudent.id
    );

    if (!currentStudent) return;

    if (amount > getPending(currentStudent)) {
      window.alert(
        `Payment cannot exceed the outstanding balance of ${money(
          getPending(currentStudent)
        )}.`
      );
      return;
    }

    const payment = {
      id: Date.now(),
      amount,
      date: paymentForm.date,
      mode: paymentForm.mode,
      note: paymentForm.note.trim() || "Fee payment",
    };

    setFees((previous) =>
      previous.map((student) =>
        student.id === selectedStudent.id
          ? { ...student, payments: [...student.payments, payment] }
          : student
      )
    );

    setModal(null);
    setSelectedStudent(null);
  }

  function deleteStudent(student) {
    const confirmed = window.confirm(
      `Delete fee record for ${student.studentName}? This also removes its payment history from this demo page.`
    );

    if (!confirmed) return;

    setFees((previous) =>
      previous.filter((item) => item.id !== student.id)
    );
  }

  const stats = [
    {
      label: "Total Course Fees",
      value: money(totalFees),
      icon: IndianRupee,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Collected Amount",
      value: money(totalCollected),
      icon: Wallet,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Pending Amount",
      value: money(totalPending),
      icon: Clock,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Students with Pending Fees",
      value: filteredFees.filter((student) => getPending(student) > 0).length,
      icon: Receipt,
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
            Fee Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Track student fees, installments, payments, and outstanding dues.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadCSV(filteredFees)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            onClick={openAddFee}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Fee Record
          </button>
        </div>
      </div>

      {/* Summary cards */}
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

      {/* Collection progress */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Fee Collection Progress</h2>
            <p className="mt-1 text-sm text-slate-500">
              Collection summary for the currently filtered student records.
            </p>
          </div>
          <p className="text-lg font-bold text-blue-700">
            {totalFees > 0
              ? `${Math.round((totalCollected / totalFees) * 100)}% collected`
              : "0% collected"}
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{
              width: `${
                totalFees > 0
                  ? Math.min(100, (totalCollected / totalFees) * 100)
                  : 0
              }%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>Collected: {money(totalCollected)}</span>
          <span>Outstanding: {money(totalPending)}</span>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-semibold text-slate-800">
            Search and Filter
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
            <option value="All">All Payment Months</option>
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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Fee Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Clear">Clear</option>
          </select>

          <select
            value={paymentModeFilter}
            onChange={(event) => setPaymentModeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Debit/Credit Card">Debit/Credit Card</option>
            <option value="Bajaj Finance">Bajaj Finance</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </section>

      {/* Fee table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Student Fee Records
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredFees.length} student record(s)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Total Fee",
                  "Collected",
                  "Pending",
                  "Installments",
                  "Status",
                  "Bajaj Finance",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredFees.map((student) => (
                <tr
                  key={student.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800">
                      {student.studentName}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {student.trainer}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-slate-600">{student.course}</td>

                  <td className="px-4 py-4 font-semibold text-slate-800">
                    {money(student.totalFee)}
                  </td>

                  <td className="px-4 py-4 font-semibold text-green-700">
                    {money(getCollected(student))}
                  </td>

                  <td className="px-4 py-4 font-semibold text-amber-700">
                    {money(getPending(student))}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    <p>Registration: {money(student.registrationFee)}</p>
                    {[0, 1, 2, 3].map((number) => (
                      <p key={number} className="mt-1 text-xs text-slate-500">
                        Installment {number}:{" "}
                        {money(student[`installment${number}`])}
                      </p>
                    ))}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        getStatus(student) === "Clear"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {getStatus(student) === "Clear" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                      {getStatus(student)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {student.bajajFinance}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        title="View payment history"
                        onClick={() => {
                          setSelectedStudent(student);
                          setModal("history");
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title="Record payment"
                        disabled={getPending(student) <= 0}
                        onClick={() => openPayment(student)}
                        className="rounded-lg p-2 text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus size={17} />
                      </button>

                      <button
                        title="Edit fee record"
                        onClick={() => openEditFee(student)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title="Delete fee record"
                        onClick={() => deleteStudent(student)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredFees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <Receipt className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No fee records found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change the filters or add a fee record.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / edit fee modal */}
      {modal === "fee" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId !== null ? "Edit Fee Record" : "Add Fee Record"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the course fee and planned installments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveFee} className="space-y-6 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Student Name *">
                  <input
                    required
                    name="studentName"
                    value={form.studentName}
                    onChange={updateForm}
                    className={inputClass}
                  />
                </Field>

                <Field label="Course *">
                  <input
                    required
                    name="course"
                    value={form.course}
                    onChange={updateForm}
                    className={inputClass}
                  />
                </Field>

                <Field label="Trainer">
                  <input
                    name="trainer"
                    value={form.trainer}
                    onChange={updateForm}
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
                    onChange={updateForm}
                    className={inputClass}
                  />
                </Field>

                <Field label="Registration Fee (₹)">
                  <input
                    min="0"
                    type="number"
                    name="registrationFee"
                    value={form.registrationFee}
                    onChange={updateForm}
                    className={inputClass}
                  />
                </Field>

                <Field label="Bajaj Finance">
                  <select
                    name="bajajFinance"
                    value={form.bajajFinance}
                    onChange={updateForm}
                    className={inputClass}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </Field>

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
                      onChange={updateForm}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </div>

              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Planned installments are separate from actual recorded payments.
                The outstanding balance is calculated from payments recorded below.
              </p>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  {editingId !== null ? "Update Fee Record" : "Save Fee Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {modal === "payment" && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Record Payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudent.studentName}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={recordPayment} className="space-y-4 p-5">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-blue-800">Outstanding Balance</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {money(getPending(selectedStudent))}
                </p>
              </div>

              <Field label="Payment Amount (₹) *">
                <input
                  required
                  min="1"
                  max={getPending(selectedStudent)}
                  type="number"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      amount: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Enter amount received"
                />
              </Field>

              <Field label="Payment Date *">
                <input
                  required
                  type="date"
                  value={paymentForm.date}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      date: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Payment Mode *">
                <select
                  value={paymentForm.mode}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      mode: event.target.value,
                    }))
                  }
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

              <Field label="Payment Note">
                <input
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      note: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="e.g. Installment 1"
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment history modal */}
      {modal === "history" && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Payment History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudent.studentName} · {selectedStudent.course}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Course Fee</p>
                <p className="mt-1 font-bold text-slate-900">
                  {money(selectedStudent.totalFee)}
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs text-green-700">Collected</p>
                <p className="mt-1 font-bold text-green-800">
                  {money(getCollected(selectedStudent))}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Outstanding</p>
                <p className="mt-1 font-bold text-amber-800">
                  {money(getPending(selectedStudent))}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Note</th>
                    <th className="px-3 py-3">Mode</th>
                    <th className="px-3 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent.payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-slate-100">
                      <td className="px-3 py-3">{dateLabel(payment.date)}</td>
                      <td className="px-3 py-3">{payment.note}</td>
                      <td className="px-3 py-3">{payment.mode}</td>
                      <td className="px-3 py-3 font-semibold text-green-700">
                        {money(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {selectedStudent.payments.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
              {getPending(selectedStudent) > 0 && (
                <button
                  onClick={() => openPayment(selectedStudent)}
                  className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Record Payment
                </button>
              )}
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Demo data only. Connect this page to your backend before using it for
        real student payments.
      </p>
    </div>
  );
}
