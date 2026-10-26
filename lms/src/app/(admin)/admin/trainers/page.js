"use client";

import { useState } from "react";
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
  Phone,
  GraduationCap,
  CheckCircle2,
  BriefcaseBusiness,
} from "lucide-react";

const initialTrainers = [
  {
    id: "TR001",
    name: "Amit Kumar",
    email: "amit@example.com",
    phone: "9876543210",
    specialization: "MERN Stack Development",
    experience: "5",
    qualification: "B.Tech Computer Science",
    assignedCourses: "MERN Stack Development, React.js",
    joiningDate: "2026-01-10",
    status: "Active",
  },
  {
    id: "TR002",
    name: "Neha Gupta",
    email: "neha@example.com",
    phone: "9876543211",
    specialization: "AWS Cloud Computing",
    experience: "4",
    qualification: "M.Tech Computer Science",
    assignedCourses: "AWS Cloud Computing",
    joiningDate: "2026-02-15",
    status: "Active",
  },
  {
    id: "TR003",
    name: "Rohit Jain",
    email: "rohit@example.com",
    phone: "9876543212",
    specialization: "Software Testing",
    experience: "3",
    qualification: "B.Tech IT",
    assignedCourses: "Manual Testing, Automation Testing",
    joiningDate: "2026-03-01",
    status: "Inactive",
  },
  {
    id: "TR004",
    name: "Priya Sharma",
    email: "priya.trainer@example.com",
    phone: "9876543213",
    specialization: "Python Programming",
    experience: "6",
    qualification: "MCA",
    assignedCourses: "Python, Data Structures",
    joiningDate: "2026-04-05",
    status: "Active",
  },
  {
    id: "TR005",
    name: "Rahul Verma",
    email: "rahul.trainer@example.com",
    phone: "9876543214",
    specialization: "Frontend Development",
    experience: "2",
    qualification: "B.Tech Computer Science",
    assignedCourses: "HTML, CSS, JavaScript",
    joiningDate: "2026-05-12",
    status: "Pending",
  },
];

const emptyTrainer = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
  experience: "",
  qualification: "",
  assignedCourses: "",
  joiningDate: "",
  status: "Active",
};

const statusStyles = {
  Active: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Inactive: "bg-slate-100 text-slate-600",
};

export default function TrainersPage() {
  const [trainers, setTrainers] = useState(initialTrainers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewTrainer, setViewTrainer] = useState(null);
  const [form, setForm] = useState(emptyTrainer);
  const [notice, setNotice] = useState("");

  const filteredTrainers = trainers.filter((trainer) => {
    const searchableValues = [
      trainer.id,
      trainer.name,
      trainer.email,
      trainer.phone,
      trainer.specialization,
      trainer.assignedCourses,
      trainer.qualification,
    ];

    const matchesSearch = searchableValues.some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    );

    const matchesStatus =
      statusFilter === "All" || trainer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = trainers.filter(
    (trainer) => trainer.status === "Active"
  ).length;

  const pendingCount = trainers.filter(
    (trainer) => trainer.status === "Pending"
  ).length;

  const totalExperience = trainers.reduce(
    (sum, trainer) => sum + (Number(trainer.experience) || 0),
    0
  );

  const averageExperience = trainers.length
    ? (totalExperience / trainers.length).toFixed(1)
    : "0.0";

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyTrainer });
    setShowModal(true);
  }

  function openEditModal(trainer) {
    setEditingId(trainer.id);
    setForm({
      name: trainer.name,
      email: trainer.email,
      phone: trainer.phone,
      specialization: trainer.specialization,
      experience: trainer.experience,
      qualification: trainer.qualification,
      assignedCourses: trainer.assignedCourses,
      joiningDate: trainer.joiningDate,
      status: trainer.status,
    });
    setShowModal(true);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (editingId) {
      setTrainers((previous) =>
        previous.map((trainer) =>
          trainer.id === editingId
            ? { ...trainer, ...form }
            : trainer
        )
      );
      setNotice("Trainer details updated successfully.");
    } else {
      const newTrainer = {
        ...form,
        id: `TR${String(Date.now()).slice(-6)}`,
      };

      setTrainers((previous) => [newTrainer, ...previous]);
      setNotice("New trainer added successfully.");
    }

    setShowModal(false);
    setEditingId(null);
  }

  function deleteTrainer(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this trainer?"
    );

    if (!confirmed) return;

    setTrainers((previous) =>
      previous.filter((trainer) => trainer.id !== id)
    );

    setNotice("Trainer deleted successfully.");
  }

  function exportCSV() {
    const headers = [
      "id",
      "name",
      "email",
      "phone",
      "specialization",
      "experience",
      "qualification",
      "assignedCourses",
      "joiningDate",
      "status",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredTrainers.map((trainer) =>
        headers
          .map(
            (header) =>
              `"${String(trainer[header] ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-trainers.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">
            Trainers Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage trainer profiles, expertise, assigned courses, and availability.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#174ea6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#102f63]"
          >
            <UserPlus size={18} />
            Add Trainer
          </button>
        </div>
      </div>

      {/* Success message */}
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

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Trainers"
          value={trainers.length}
          icon={Users}
          color="blue"
          description="Registered trainers"
        />

        <StatCard
          title="Active Trainers"
          value={activeCount}
          icon={CheckCircle2}
          color="green"
          description="Currently available"
        />

        <StatCard
          title="Pending Approval"
          value={pendingCount}
          icon={GraduationCap}
          color="amber"
          description="Awaiting confirmation"
        />

        <StatCard
          title="Average Experience"
          value={`${averageExperience} yrs`}
          icon={BriefcaseBusiness}
          color="purple"
          description="Across all trainers"
        />
      </div>

      {/* Trainers table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#102f63]">
              All Trainers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View and manage trainer accounts.
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
                placeholder="Search trainers..."
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
                <th className="px-5 py-4 font-semibold">Trainer</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Specialization</th>
                <th className="px-5 py-4 font-semibold">Experience</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTrainers.map((trainer) => (
                <tr
                  key={trainer.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {trainer.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {trainer.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {trainer.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="flex items-center gap-2 text-slate-700">
                      <Mail size={14} className="text-slate-400" />
                      {trainer.email}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={13} />
                      {trainer.phone}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700">
                      {trainer.specialization}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {trainer.qualification}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {trainer.experience} years
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusStyles[trainer.status] ||
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {trainer.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setViewTrainer(trainer)}
                        title="View trainer"
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        onClick={() => openEditModal(trainer)}
                        title="Edit trainer"
                        className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() => deleteTrainer(trainer.id)}
                        title="Delete trainer"
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTrainers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No trainers found. Try another search or add a trainer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center">
          <p>
            Showing {filteredTrainers.length} of {trainers.length} trainers
          </p>
          <p>APPWARS Trainer Management</p>
        </div>
      </section>

      {/* Add / Edit Trainer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-[#102f63]">
                  {editingId ? "Edit Trainer" : "Add New Trainer"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the trainers professional information.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="rounded-lg p-2 hover:bg-slate-100"
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
                  onChange={(value) =>
                    setForm({ ...form, name: value })
                  }
                  placeholder="Enter trainer name"
                />

                <FormField
                  label="Email Address"
                  type="email"
                  required
                  value={form.email}
                  onChange={(value) =>
                    setForm({ ...form, email: value })
                  }
                  placeholder="trainer@example.com"
                />

                <FormField
                  label="Phone Number"
                  required
                  value={form.phone}
                  onChange={(value) =>
                    setForm({ ...form, phone: value })
                  }
                  placeholder="Enter phone number"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Specialization
                  </label>

                  <select
                    required
                    value={form.specialization}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        specialization: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select specialization</option>
                    <option>MERN Stack Development</option>
                    <option>Frontend Development</option>
                    <option>Backend Development</option>
                    <option>AWS Cloud Computing</option>
                    <option>DevOps</option>
                    <option>Software Testing</option>
                    <option>Python Programming</option>
                    <option>Data Structures & Algorithms</option>
                    <option>Other</option>
                  </select>
                </div>

                <FormField
                  label="Experience (Years)"
                  type="number"
                  required
                  value={form.experience}
                  onChange={(value) =>
                    setForm({ ...form, experience: value })
                  }
                  placeholder="e.g. 4"
                />

                <FormField
                  label="Qualification"
                  required
                  value={form.qualification}
                  onChange={(value) =>
                    setForm({ ...form, qualification: value })
                  }
                  placeholder="e.g. B.Tech Computer Science"
                />

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Assigned Courses
                  </label>

                  <textarea
                    rows={2}
                    value={form.assignedCourses}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        assignedCourses: event.target.value,
                      })
                    }
                    placeholder="Enter assigned courses, separated by commas"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <FormField
                  label="Joining Date"
                  type="date"
                  required
                  value={form.joiningDate}
                  onChange={(value) =>
                    setForm({ ...form, joiningDate: value })
                  }
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Trainer Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#174ea6] px-5 py-2.5 font-semibold text-white hover:bg-[#102f63]"
                >
                  {editingId ? "Update Trainer" : "Add Trainer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trainer Details Modal */}
      {viewTrainer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#102f63]">
                Trainer Details
              </h2>

              <button
                onClick={() => setViewTrainer(null)}
                aria-label="Close details"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-xl bg-blue-50 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-200 text-xl font-bold text-blue-800">
                {viewTrainer.name.charAt(0)}
              </div>

              <div>
                <p className="font-bold text-[#102f63]">
                  {viewTrainer.name}
                </p>
                <p className="text-sm text-slate-500">
                  {viewTrainer.id}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[viewTrainer.status] ||
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {viewTrainer.status}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                ["Email", viewTrainer.email],
                ["Phone", viewTrainer.phone],
                ["Specialization", viewTrainer.specialization],
                ["Experience", `${viewTrainer.experience} years`],
                ["Qualification", viewTrainer.qualification],
                ["Assigned Courses", viewTrainer.assignedCourses],
                ["Joining Date", viewTrainer.joiningDate],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="break-words text-sm font-medium text-slate-800 sm:max-w-[60%] sm:text-right">
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViewTrainer(null)}
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
          <p className="mt-3 text-3xl font-bold text-[#102f63]">{value}</p>
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
        min={type === "number" ? "0" : undefined}
        required={required}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
