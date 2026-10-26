
"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  IndianRupee,
  CircleCheck,
  Clock,
  CircleX,
  Search,
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  X,
  Wallet,
  CalendarDays,
  UserRound,
  Filter,
} from "lucide-react";

const initialPayments = [
  {
    id: "PAY-1001",
    student: "Rahul Sharma",
    email: "rahul@example.com",
    course: "MERN Stack Development",
    amount: 15000,
    method: "UPI",
    transactionId: "TXN782341",
    date: "2026-10-20",
    status: "Paid",
  },
  {
    id: "PAY-1002",
    student: "Priya Verma",
    email: "priya@example.com",
    course: "AWS Cloud Computing",
    amount: 12000,
    method: "Credit Card",
    transactionId: "TXN782342",
    date: "2026-10-21",
    status: "Pending",
  },
  {
    id: "PAY-1003",
    student: "Aman Singh",
    email: "aman@example.com",
    course: "Software Testing",
    amount: 10000,
    method: "Net Banking",
    transactionId: "TXN782343",
    date: "2026-10-22",
    status: "Paid",
  },
  {
    id: "PAY-1004",
    student: "Neha Gupta",
    email: "neha@example.com",
    course: "Full Stack Development",
    amount: 18000,
    method: "UPI",
    transactionId: "TXN782344",
    date: "2026-10-23",
    status: "Failed",
  },
  {
    id: "PAY-1005",
    student: "Karan Mehta",
    email: "karan@example.com",
    course: "Python Programming",
    amount: 8000,
    method: "Debit Card",
    transactionId: "TXN782345",
    date: "2026-10-24",
    status: "Paid",
  },
];

const emptyPayment = {
  student: "",
  email: "",
  course: "",
  amount: "",
  method: "UPI",
  transactionId: "",
  date: new Date().toLocaleDateString("en-CA"),
  status: "Pending",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    Refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.Pending
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [form, setForm] = useState(emptyPayment);
  const [notice, setNotice] = useState("");

  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "Paid");
    const pending = payments.filter((p) => p.status === "Pending");
    const failed = payments.filter((p) => p.status === "Failed");

    return {
      collected: paid.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      pending: pending.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const term = search.toLowerCase().trim();

    return payments.filter((p) => {
      const matchesSearch = [
        p.id,
        p.student,
        p.email,
        p.course,
        p.transactionId,
      ].some((value) => String(value).toLowerCase().includes(term));

      return (
        matchesSearch &&
        (statusFilter === "All" || p.status === statusFilter) &&
        (methodFilter === "All" || p.method === methodFilter)
      );
    });
  }, [payments, search, statusFilter, methodFilter]);

  function openAdd() {
    setSelectedPayment(null);
    setForm({
      ...emptyPayment,
      date: new Date().toLocaleDateString("en-CA"),
    });
    setModal("add");
  }

  function openEdit(payment) {
    setSelectedPayment(payment);
    setForm({ ...payment, amount: String(payment.amount) });
    setModal("edit");
  }

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function savePayment(event) {
    event.preventDefault();

    if (!form.student.trim() || !form.course.trim() || Number(form.amount) <= 0) {
      setNotice("Enter a student, course, and valid amount.");
      return;
    }

    if (modal === "edit" && selectedPayment) {
      setPayments((previous) =>
        previous.map((p) =>
          p.id === selectedPayment.id
            ? { ...p, ...form, amount: Number(form.amount) }
            : p
        )
      );
      setNotice("Payment record updated.");
    } else {
      const payment = {
        ...form,
        id: `PAY-${Date.now().toString().slice(-7)}`,
        amount: Number(form.amount),
      };

      setPayments((previous) => [payment, ...previous]);
      setNotice("Payment record added.");
    }

    setModal(null);
  }

  function deletePayment(payment) {
    if (!window.confirm(`Delete payment ${payment.id}?`)) return;

    setPayments((previous) => previous.filter((p) => p.id !== payment.id));
    setNotice("Payment record deleted.");
  }

  function exportCSV() {
    const columns = [
      "id",
      "student",
      "email",
      "course",
      "amount",
      "method",
      "transactionId",
      "date",
      "status",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      columns.join(","),
      ...filteredPayments.map((p) =>
        columns.map((column) => escapeCSV(p[column])).join(",")
      ),
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "appwars-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Payments</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage student fees, transactions, and payment records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <Download size={17} /> Export CSV
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} /> Add Payment
            </button>
          </div>
        </header>

        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Collected"
            value={formatMoney(totals.collected)}
            subtitle={`${totals.paidCount} successful payments`}
            icon={IndianRupee}
            color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          />
          <StatCard
            title="Pending Amount"
            value={formatMoney(totals.pending)}
            subtitle={`${totals.pendingCount} pending payments`}
            icon={Clock}
            color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          />
          <StatCard
            title="Successful Payments"
            value={totals.paidCount}
            subtitle="Status: Paid"
            icon={CircleCheck}
            color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          />
          <StatCard
            title="Failed Payments"
            value={totals.failedCount}
            subtitle="Require review"
            icon={CircleX}
            color="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, transaction, course..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClass + " lg:w-40"}
              >
                <option>All</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Failed</option>
                <option>Refunded</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className={inputClass + " lg:w-44"}
              >
                <option>All</option>
                <option>UPI</option>
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Net Banking</option>
                <option>Cash</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-4">Payment / Student</th>
                  <th className="px-3 py-4">Course</th>
                  <th className="px-3 py-4">Amount</th>
                  <th className="px-3 py-4">Method</th>
                  <th className="px-3 py-4">Date</th>
                  <th className="px-3 py-4">Status</th>
                  <th className="px-3 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-4">
                      <p className="font-semibold">{payment.student}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {payment.id} · {payment.email}
                      </p>
                    </td>
                    <td className="px-3 py-4">{payment.course}</td>
                    <td className="px-3 py-4 font-semibold">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-3 py-4">{payment.method}</td>
                    <td className="px-3 py-4">{payment.date}</td>
                    <td className="px-3 py-4">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setModal("view");
                          }}
                          title="View payment"
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          onClick={() => openEdit(payment)}
                          title="Edit payment"
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => deletePayment(payment)}
                          title="Delete payment"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredPayments.length} of {payments.length} payment records.
          </p>
        </section>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {modal === "add"
                      ? "Add Payment"
                      : modal === "edit"
                      ? "Edit Payment"
                      : "Payment Details"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {modal === "view"
                      ? selectedPayment?.id
                      : "Enter payment record details"}
                  </p>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {modal === "view" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Student", selectedPayment?.student],
                    ["Email", selectedPayment?.email],
                    ["Course", selectedPayment?.course],
                    ["Amount", formatMoney(selectedPayment?.amount)],
                    ["Method", selectedPayment?.method],
                    ["Transaction ID", selectedPayment?.transactionId],
                    ["Payment Date", selectedPayment?.date],
                    ["Status", selectedPayment?.status],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                      <p className="mt-1 break-words font-semibold">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={savePayment} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Student Name *
                      <input
                        required
                        value={form.student}
                        onChange={(e) => updateForm("student", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Student name"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="student@example.com"
                      />
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">
                      Course *
                      <input
                        required
                        value={form.course}
                        onChange={(e) => updateForm("course", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Course name"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Amount (INR) *
                      <input
                        required
                        type="number"
                        min="1"
                        value={form.amount}
                        onChange={(e) => updateForm("amount", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="15000"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Payment Method
                      <select
                        value={form.method}
                        onChange={(e) => updateForm("method", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      >
                        <option>UPI</option>
                        <option>Credit Card</option>
                        <option>Debit Card</option>
                        <option>Net Banking</option>
                        <option>Cash</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Transaction ID
                      <input
                        value={form.transactionId}
                        onChange={(e) => updateForm("transactionId", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Transaction reference"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Payment Date
                      <input
                        required
                        type="date"
                        value={form.date}
                        onChange={(e) => updateForm("date", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Status
                      <select
                        value={form.status}
                        onChange={(e) => updateForm("status", e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      >
                        <option>Pending</option>
                        <option>Paid</option>
                        <option>Failed</option>
                        <option>Refunded</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Save Payment
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
