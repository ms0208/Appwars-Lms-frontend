
"use client";

import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  UserPlus,
  Search,
  Plus,
  CalendarDays,
  GraduationCap,
  Clock,
  Video,
  Pencil,
  Trash2,
  X,
  Download,
  Menu,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Filter,
  BookOpen,
  Wallet,
  Monitor,
  CalendarCheck,
} from "lucide-react";

const initialAdmissions = [
  {
    id: 1,
    name: "Rahul Sharma",
    course: "MERN Stack Development",
    totalFee: 45000,
    registrationFee: 5000,
    installment: "2",
    bajajFinance: "No",
    paymentMode: "UPI",
    feeStatus: "Pending",
    trainer: "Amit Verma",
    mode: "Online",
    batchType: "Mon-Th",
    batchStartDate: "2026-10-05",
    time: "10:00 AM - 11:30 AM",
    batchEndDate: "2027-01-05",
    videoAccess: "Yes",
    admissionDate: "2026-10-02",
  },
  {
    id: 2,
    name: "Priya Singh",
    course: "Next.js Development",
    totalFee: 30000,
    registrationFee: 5000,
    installment: "1",
    bajajFinance: "Yes",
    paymentMode: "Bajaj Finance",
    feeStatus: "Clear",
    trainer: "Manav Sharma",
    mode: "Hybrid",
    batchType: "Weekend",
    batchStartDate: "2026-10-10",
    time: "02:00 PM - 04:00 PM",
    batchEndDate: "2027-01-10",
    videoAccess: "Yes",
    admissionDate: "2026-10-10",
  },
  {
    id: 3,
    name: "Aman Kumar",
    course: "AWS Cloud Computing",
    totalFee: 40000,
    registrationFee: 3000,
    installment: "3",
    bajajFinance: "No",
    paymentMode: "Bank Transfer",
    feeStatus: "Pending",
    trainer: "Rohit Kumar",
    mode: "Offline",
    batchType: "Custom",
    batchStartDate: "2026-10-15",
    time: "11:30 AM - 01:00 PM",
    batchEndDate: "2027-02-15",
    videoAccess: "No",
    admissionDate: "2026-10-15",
  },
];

const emptyForm = {
  name: "",
  course: "MERN Stack Development",
  totalFee: "",
  registrationFee: "",
  installment: "0",
  bajajFinance: "No",
  paymentMode: "UPI",
  feeStatus: "Pending",
  trainer: "",
  mode: "Online",
  batchType: "Mon-Th",
  batchStartDate: "",
  time: "",
  batchEndDate: "",
  videoAccess: "No",
  admissionDate: new Date().toLocaleDateString("en-CA"),
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ value }) {
  const styles = {
    Clear: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    Yes: "bg-emerald-50 text-emerald-700",
    No: "bg-slate-100 text-slate-600",
    Online: "bg-blue-50 text-blue-700",
    Offline: "bg-purple-50 text-purple-700",
    Hybrid: "bg-cyan-50 text-cyan-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {value || "—"}
    </span>
  );
}

export default function CounsellorDashboard() {
  const [admissions, setAdmissions] = useState(initialAdmissions);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [search, setSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const monthlyAdmissions = useMemo(() => {
    return admissions.filter((admission) => {
      const matchesMonth =
        admission.admissionDate?.slice(0, 7) === selectedMonth;

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        admission.name.toLowerCase().includes(query) ||
        admission.course.toLowerCase().includes(query) ||
        admission.trainer.toLowerCase().includes(query);

      const matchesFee =
        feeFilter === "All" || admission.feeStatus === feeFilter;

      return matchesMonth && matchesSearch && matchesFee;
    });
  }, [admissions, selectedMonth, search, feeFilter]);

  const monthlyStats = useMemo(() => {
    const monthRecords = admissions.filter(
      (item) => item.admissionDate?.slice(0, 7) === selectedMonth
    );

    const totalFees = monthRecords.reduce(
      (sum, item) => sum + Number(item.totalFee || 0),
      0
    );

    const registrationFees = monthRecords.reduce(
      (sum, item) => sum + Number(item.registrationFee || 0),
      0
    );

    const pendingFees = monthRecords
      .filter((item) => item.feeStatus === "Pending")
      .reduce((sum, item) => sum + Number(item.totalFee || 0), 0);

    return {
      count: monthRecords.length,
      totalFees,
      registrationFees,
      pendingFees,
      clearCount: monthRecords.filter(
        (item) => item.feeStatus === "Clear"
      ).length,
    };
  }, [admissions, selectedMonth]);

  function openAddModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      admissionDate: new Date().toLocaleDateString("en-CA"),
    });
    setModalOpen(true);
  }

  function openEditModal(admission) {
    setEditingId(admission.id);
    setForm({ ...admission });
    setModalOpen(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const record = {
      ...form,
      name: form.name.trim(),
      trainer: form.trainer.trim(),
      totalFee: Number(form.totalFee),
      registrationFee: Number(form.registrationFee),
    };

    if (!record.name || !record.course || !record.admissionDate) {
      alert("Please enter the student name, course and admission date.");
      return;
    }

    if (record.totalFee <= 0 || record.registrationFee < 0) {
      alert("Please enter valid fee amounts.");
      return;
    }

    if (record.registrationFee > record.totalFee) {
      alert("Registration fee cannot exceed the total course fee.");
      return;
    }

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

    setSelectedMonth(record.admissionDate.slice(0, 7));
    setSearch("");
    setFeeFilter("All");
    setModalOpen(false);
  }

  function deleteAdmission(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this admission record?"
    );

    if (confirmed) {
      setAdmissions((previous) =>
        previous.filter((item) => item.id !== id)
      );
    }
  }

  function exportCSV() {
    const columns = [
      ["Student Name", "name"],
      ["Course", "course"],
      ["Total Fee", "totalFee"],
      ["Registration Fee", "registrationFee"],
      ["Installment", "installment"],
      ["Bajaj Finance", "bajajFinance"],
      ["Payment Mode", "paymentMode"],
      ["Fee Status", "feeStatus"],
      ["Trainer", "trainer"],
      ["Mode", "mode"],
      ["Batch Type", "batchType"],
      ["Batch Start Date", "batchStartDate"],
      ["Time", "time"],
      ["Batch End Date", "batchEndDate"],
      ["Video Access", "videoAccess"],
      ["Admission Date", "admissionDate"],
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      columns.map(([heading]) => escapeCSV(heading)).join(","),
      ...monthlyAdmissions.map((item) =>
        columns.map(([, key]) => escapeCSV(item[key])).join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appwars-admissions-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const monthLabel = selectedMonth
    ? new Date(selectedMonth + "-01T00:00:00").toLocaleDateString(
        "en-IN",
        { month: "long", year: "numeric" }
      )
    : "Selected month";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } w-64 shrink-0 flex-col bg-[#102b55] text-white md:relative md:flex`}
        >
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black text-blue-900">
                A
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wide">
                  APPWARS
                </h2>
                <p className="mt-1 text-[10px] tracking-wider text-blue-200">
                  COUNSELLOR PORTAL
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-300">
              Workspace
            </p>

            <div className="flex items-center gap-3 rounded-xl bg-blue-500 px-3 py-3 text-sm font-semibold">
              <LayoutDashboard size={18} />
              Dashboard
            </div>

            <button
              onClick={openAddModal}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-blue-100 transition hover:bg-white/10"
            >
              <UserPlus size={18} />
              Add Admission
            </button>

            <button
              onClick={() =>
                document
                  .getElementById("admissions-table")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-blue-100 transition hover:bg-white/10"
            >
              <Users size={18} />
              Admissions
            </button>

            <button
              onClick={() => {
                setFeeFilter("Pending");
                document
                  .getElementById("admissions-table")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-blue-100 transition hover:bg-white/10"
            >
              <Wallet size={18} />
              Pending Fees
            </button>
          </nav>

          <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">APPWARS LMS</p>
            <p className="mt-1 text-xs leading-5 text-blue-200">
              Manage admissions, fee details and batch allocations.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="rounded-lg border border-slate-200 p-2 md:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <h1 className="text-lg font-bold text-[#102b55] sm:text-xl">
                  Counsellor Dashboard
                </h1>
                <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                  Admissions, payments and batch management
                </p>
              </div>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:px-4"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Add Admission</span>
              <span className="sm:hidden">Add</span>
            </button>
          </header>

          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Month filter */}
            <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Admissions Overview
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#102b55]">
                  {monthLabel}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  All admissions recorded during the selected month
                </p>
              </div>

              <div className="flex items-center gap-3">
                <CalendarDays className="shrink-0 text-blue-700" size={20} />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  aria-label="Select admission month"
                />
              </div>
            </section>

            {/* Statistics */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Admissions"
                value={monthlyStats.count}
                description={`Admissions in ${monthLabel}`}
                icon={<Users size={21} />}
                color="blue"
              />
              <StatCard
                title="Total Course Value"
                value={formatCurrency(monthlyStats.totalFees)}
                description="Total fees for these admissions"
                icon={<IndianRupee size={21} />}
                color="purple"
              />
              <StatCard
                title="Registration Fees"
                value={formatCurrency(monthlyStats.registrationFees)}
                description="Registration fee amounts recorded"
                icon={<Wallet size={21} />}
                color="green"
              />
              <StatCard
                title="Pending Course Fees"
                value={formatCurrency(monthlyStats.pendingFees)}
                description="Full course value of Pending records"
                icon={<AlertCircle size={21} />}
                color="orange"
              />
            </section>

            {/* Monthly admission summary */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Fee Status</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-800">
                      Monthly Summary
                    </h3>
                  </div>
                  <Wallet className="text-blue-700" size={23} />
                </div>

                <div className="mt-5 flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="text-sm text-slate-600">
                    Clear admissions
                  </span>
                  <span className="font-bold text-emerald-700">
                    {monthlyStats.clearCount}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-600">
                    Pending admissions
                  </span>
                  <span className="font-bold text-amber-700">
                    {monthlyStats.count - monthlyStats.clearCount}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <CalendarCheck size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Admission Management
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Keep student fees, trainer assignments and batch dates
                      updated.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <InfoTile
                    icon={<BookOpen size={17} />}
                    title="Course & Fees"
                    description="Track fee and payment details"
                  />
                  <InfoTile
                    icon={<GraduationCap size={17} />}
                    title="Trainer & Batch"
                    description="Assign training information"
                  />
                  <InfoTile
                    icon={<Video size={17} />}
                    title="Video Access"
                    description="Record access availability"
                  />
                </div>
              </div>
            </section>

            {/* Admissions table */}
            <section
              id="admissions-table"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#102b55]">
                    Monthly Admissions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {monthlyAdmissions.length} record(s) for {monthLabel}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search student, course, trainer..."
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                    />
                  </div>

                  <div className="relative">
                    <Filter
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      value={feeFilter}
                      onChange={(event) => setFeeFilter(event.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-blue-500 sm:w-36"
                    >
                      <option value="All">All Fee Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Clear">Clear</option>
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  <button
                    onClick={exportCSV}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[2100px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Course</th>
                      <th className="px-4 py-4">Total Fee</th>
                      <th className="px-4 py-4">Registration</th>
                      <th className="px-4 py-4">Installments</th>
                      <th className="px-4 py-4">Bajaj Finance</th>
                      <th className="px-4 py-4">Payment Mode</th>
                      <th className="px-4 py-4">Fee Status</th>
                      <th className="px-4 py-4">Trainer</th>
                      <th className="px-4 py-4">Mode</th>
                      <th className="px-4 py-4">Batch Type</th>
                      <th className="px-4 py-4">Start Date</th>
                      <th className="px-4 py-4">Class Time</th>
                      <th className="px-4 py-4">End Date</th>
                      <th className="px-4 py-4">Video Access</th>
                      <th className="px-4 py-4">Admission Date</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {monthlyAdmissions.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-blue-50/40"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-700">
                          {item.course}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {formatCurrency(item.totalFee)}
                        </td>
                        <td className="px-4 py-4">
                          {formatCurrency(item.registrationFee)}
                        </td>
                        <td className="px-4 py-4">{item.installment}</td>
                        <td className="px-4 py-4">
                          <StatusBadge value={item.bajajFinance} />
                        </td>
                        <td className="px-4 py-4">{item.paymentMode}</td>
                        <td className="px-4 py-4">
                          <StatusBadge value={item.feeStatus} />
                        </td>
                        <td className="px-4 py-4">{item.trainer || "—"}</td>
                        <td className="px-4 py-4">
                          <StatusBadge value={item.mode} />
                        </td>
                        <td className="px-4 py-4">{item.batchType}</td>
                        <td className="px-4 py-4">
                          {formatDate(item.batchStartDate)}
                        </td>
                        <td className="px-4 py-4">{item.time || "—"}</td>
                        <td className="px-4 py-4">
                          {formatDate(item.batchEndDate)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge value={item.videoAccess} />
                        </td>
                        <td className="px-4 py-4">
                          {formatDate(item.admissionDate)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              title="Edit admission"
                              className="rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => deleteAdmission(item.id)}
                              title="Delete admission"
                              className="rounded-lg border border-slate-200 p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {monthlyAdmissions.length === 0 && (
                      <tr>
                        <td colSpan={17} className="px-6 py-16 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <Users size={22} />
                          </div>
                          <h3 className="mt-3 font-semibold text-slate-800">
                            No admissions found
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Try another month or change your search and filters.
                          </p>
                          <button
                            onClick={openAddModal}
                            className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                          >
                            Add Admission
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-2 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:flex-row">
                <span>
                  Showing {monthlyAdmissions.length} of{" "}
                  {
                    admissions.filter(
                      (item) =>
                        item.admissionDate?.slice(0, 7) === selectedMonth
                    ).length
                  }{" "}
                  monthly records
                </span>
                <span>Currency: INR (₹)</span>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Add/Edit Admission Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 backdrop-blur-sm sm:p-6">
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-lg font-bold text-[#102b55] sm:text-xl">
                  {editingId !== null ? "Edit Admission" : "Add New Admission"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter student, fee and batch details
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[68vh] space-y-6 overflow-y-auto p-5 sm:p-7">
                <FormSection
                  title="Student & Admission Details"
                  icon={<Users size={18} />}
                >
                  <FormField label="Student's Name" required>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      className={inputClass}
                      placeholder="Enter full name"
                      required
                    />
                  </FormField>

                  <FormField label="Course" required>
                    <select
                      name="course"
                      value={form.course}
                      onChange={handleFormChange}
                      className={inputClass}
                      required
                    >
                      <option>MERN Stack Development</option>
                      <option>Full Stack Development</option>
                      <option>Next.js Development</option>
                      <option>AWS Cloud Computing</option>
                      <option>DevOps & Cloud Computing</option>
                      <option>Software Testing</option>
                      <option>Python Programming</option>
                      <option>Data Analytics</option>
                      <option>Other</option>
                    </select>
                  </FormField>

                  <FormField label="Admission Date" required>
                    <input
                      type="date"
                      name="admissionDate"
                      value={form.admissionDate}
                      onChange={handleFormChange}
                      className={inputClass}
                      required
                    />
                  </FormField>
                </FormSection>

                <FormSection
                  title="Fee & Payment Details"
                  icon={<IndianRupee size={18} />}
                >
                  <FormField label="Total Fee (₹)" required>
                    <input
                      type="number"
                      name="totalFee"
                      value={form.totalFee}
                      onChange={handleFormChange}
                      className={inputClass}
                      min="1"
                      placeholder="e.g. 45000"
                      required
                    />
                  </FormField>

                  <FormField label="Registration Fee (₹)" required>
                    <input
                      type="number"
                      name="registrationFee"
                      value={form.registrationFee}
                      onChange={handleFormChange}
                      className={inputClass}
                      min="0"
                      placeholder="e.g. 5000"
                      required
                    />
                  </FormField>

                  <FormField label="Installment">
                    <select
                      name="installment"
                      value={form.installment}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="0">0 Installments</option>
                      <option value="1">1 Installment</option>
                      <option value="2">2 Installments</option>
                      <option value="3">3 Installments</option>
                    </select>
                  </FormField>

                  <FormField label="Bajaj Finance">
                    <select
                      name="bajajFinance"
                      value={form.bajajFinance}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </FormField>

                  <FormField label="Payment Mode">
                    <select
                      name="paymentMode"
                      value={form.paymentMode}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option>UPI</option>
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Credit Card</option>
                      <option>Debit Card</option>
                      <option>Net Banking</option>
                      <option>Bajaj Finance</option>
                      <option>Other</option>
                    </select>
                  </FormField>

                  <FormField label="Fee Status">
                    <select
                      name="feeStatus"
                      value={form.feeStatus}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Clear">Clear</option>
                    </select>
                  </FormField>
                </FormSection>

                <FormSection
                  title="Trainer & Batch Details"
                  icon={<GraduationCap size={18} />}
                >
                  <FormField label="Trainer">
                    <input
                      name="trainer"
                      value={form.trainer}
                      onChange={handleFormChange}
                      className={inputClass}
                      placeholder="Enter trainer's name"
                    />
                  </FormField>

                  <FormField label="Mode">
                    <select
                      name="mode"
                      value={form.mode}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </FormField>

                  <FormField label="Batch Type">
                    <select
                      name="batchType"
                      value={form.batchType}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="Mon-Th">Mon-Th</option>
                      <option value="Weekend">Weekend</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </FormField>

                  <FormField label="Batch Start Date">
                    <input
                      type="date"
                      name="batchStartDate"
                      value={form.batchStartDate}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Batch End Date">
                    <input
                      type="date"
                      name="batchEndDate"
                      value={form.batchEndDate}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Class Time">
                    <input
                      name="time"
                      value={form.time}
                      onChange={handleFormChange}
                      className={inputClass}
                      placeholder="e.g. 10:00 AM - 11:30 AM"
                    />
                  </FormField>

                  <FormField label="Video Access">
                    <select
                      name="videoAccess"
                      value={form.videoAccess}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                </FormSection>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  {editingId !== null ? "Save Changes" : "Save Admission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, description, icon, color }) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-[#102b55]">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            colorStyles[color]
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function InfoTile({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-blue-700">
        {icon}
        <span className="text-sm font-semibold text-slate-800">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function FormSection({ title, icon, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="text-blue-700">{icon}</span>
        <h3 className="font-bold text-[#102b55]">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
