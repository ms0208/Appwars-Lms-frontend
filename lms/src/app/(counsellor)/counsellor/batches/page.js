
"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  BookOpen,
  CalendarDays,
  Clock,
  Pencil,
  Trash2,
  X,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  Filter,
  Video,
  Download,
  Layers,
} from "lucide-react";

const initialTrainers = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul@appwars.com",
    phone: "9876543210",
    expertise: "MERN Stack, React.js, Node.js",
    courses: "MERN Stack Development",
    joiningDate: "2025-06-01",
    availability: "Available",
    status: "Active",
    experience: "3 years",
  },
  {
    id: 2,
    name: "Priya Verma",
    email: "priya@appwars.com",
    phone: "9876543211",
    expertise: "AWS, Cloud Computing",
    courses: "AWS Cloud Computing",
    joiningDate: "2025-08-15",
    availability: "Busy",
    status: "Active",
    experience: "4 years",
  },
  {
    id: 3,
    name: "Amit Kumar",
    email: "amit@appwars.com",
    phone: "9876543212",
    expertise: "Software Testing, Automation",
    courses: "Software Testing",
    joiningDate: "2026-01-10",
    availability: "Available",
    status: "Active",
    experience: "2 years",
  },
];

const initialBatches = [
  {
    id: 101,
    name: "MERN-2026-01",
    course: "MERN Stack Development",
    trainerId: 1,
    mode: "Online",
    batchType: "Mon-Th",
    startDate: "2026-10-05",
    endDate: "2027-02-05",
    time: "7:00 PM - 8:30 PM",
    days: "Monday - Thursday",
    capacity: 30,
    students: 24,
    status: "Active",
    meetingLink: "https://meet.google.com/",
  },
  {
    id: 102,
    name: "AWS-WEEKEND-01",
    course: "AWS Cloud Computing",
    trainerId: 2,
    mode: "Hybrid",
    batchType: "Weekend",
    startDate: "2026-11-01",
    endDate: "2027-01-31",
    time: "10:00 AM - 12:00 PM",
    days: "Saturday - Sunday",
    capacity: 25,
    students: 18,
    status: "Upcoming",
    meetingLink: "",
  },
  {
    id: 103,
    name: "TEST-2026-01",
    course: "Software Testing",
    trainerId: 3,
    mode: "Offline",
    batchType: "Mon-Th",
    startDate: "2026-08-01",
    endDate: "2026-10-01",
    time: "11:00 AM - 12:30 PM",
    days: "Monday - Thursday",
    capacity: 25,
    students: 22,
    status: "Completed",
    meetingLink: "",
  },
];

const emptyTrainer = {
  name: "",
  email: "",
  phone: "",
  expertise: "",
  courses: "",
  joiningDate: "",
  availability: "Available",
  status: "Active",
  experience: "",
};

const emptyBatch = {
  name: "",
  course: "",
  trainerId: "",
  mode: "Online",
  batchType: "Mon-Th",
  startDate: "",
  endDate: "",
  time: "",
  days: "",
  capacity: "30",
  students: "0",
  status: "Upcoming",
  meetingLink: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function Badge({ value }) {
  const styles = {
    Active: "bg-green-50 text-green-700",
    Upcoming: "bg-blue-50 text-blue-700",
    Completed: "bg-gray-100 text-gray-600",
    Cancelled: "bg-red-50 text-red-700",
    Inactive: "bg-gray-100 text-gray-600",
    Available: "bg-green-50 text-green-700",
    Busy: "bg-orange-50 text-orange-700",
    Unavailable: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[value] || "bg-gray-100 text-gray-600"
      }`}
    >
      {value || "Not set"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`rounded-lg p-2.5 ${color}`}>
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-[#102f63]">{value}</p>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <div
        className={`my-auto max-h-[92vh] w-full ${
          wide ? "max-w-3xl" : "max-w-xl"
        } overflow-y-auto rounded-2xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
          <div>
            <h2 className="text-xl font-bold text-[#102f63]">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BatchesAndTrainersPage() {
  const [activeTab, setActiveTab] = useState("batches");
  const [batches, setBatches] = useState(initialBatches);
  const [trainers, setTrainers] = useState(initialTrainers);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(emptyBatch);

  const trainerMap = Object.fromEntries(
    trainers.map((trainer) => [trainer.id, trainer])
  );

  const getTrainerName = (trainerId) =>
    trainerMap[trainerId]?.name || "Not assigned";

  const activeBatches = batches.filter((b) => b.status === "Active").length;
  const upcomingBatches = batches.filter(
    (b) => b.status === "Upcoming"
  ).length;
  const totalStudents = batches.reduce(
    (total, batch) => total + Number(batch.students || 0),
    0
  );

  const activeTrainers = trainers.filter(
    (trainer) => trainer.status === "Active"
  ).length;
  const availableTrainers = trainers.filter(
    (trainer) =>
      trainer.status === "Active" && trainer.availability === "Available"
  ).length;

  const assignedTrainerIds = new Set(
    batches
      .filter((batch) => batch.status !== "Completed" && batch.status !== "Cancelled")
      .map((batch) => batch.trainerId)
  );

  const filteredBatches = batches.filter((batch) => {
    const query = search.toLowerCase();
    const trainerName = getTrainerName(batch.trainerId).toLowerCase();

    return (
      (batch.name.toLowerCase().includes(query) ||
        batch.course.toLowerCase().includes(query) ||
        trainerName.includes(query)) &&
      (statusFilter === "All" || batch.status === statusFilter) &&
      (modeFilter === "All" || batch.mode === modeFilter)
    );
  });

  const filteredTrainers = trainers.filter((trainer) => {
    const query = search.toLowerCase();

    return (
      (trainer.name.toLowerCase().includes(query) ||
        trainer.email.toLowerCase().includes(query) ||
        trainer.phone.includes(query) ||
        trainer.expertise.toLowerCase().includes(query) ||
        trainer.courses.toLowerCase().includes(query)) &&
      (statusFilter === "All" || trainer.status === statusFilter) &&
      (availabilityFilter === "All" ||
        trainer.availability === availabilityFilter)
    );
  });

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setModeFilter("All");
    setAvailabilityFilter("All");
  }

  function openAddModal() {
    setSelectedItem(null);
    setForm(activeTab === "batches" ? { ...emptyBatch } : { ...emptyTrainer });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setSelectedItem(item);

    if (activeTab === "batches") {
      setForm({
        ...item,
        trainerId: String(item.trainerId || ""),
        capacity: String(item.capacity),
        students: String(item.students),
      });
    } else {
      setForm({ ...item });
    }

    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function saveBatch(event) {
    event.preventDefault();

    if (form.endDate < form.startDate) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    const capacity = Number(form.capacity);
    const students = Number(form.students);

    if (
      !Number.isFinite(capacity) ||
      !Number.isFinite(students) ||
      capacity < 1 ||
      students < 0 ||
      students > capacity
    ) {
      alert("Enter a valid capacity and student count.");
      return;
    }

    if (!form.trainerId) {
      alert("Please assign a trainer to this batch.");
      return;
    }

    const trainerId = Number(form.trainerId);

    if (!trainerMap[trainerId]) {
      alert("Please select a valid trainer.");
      return;
    }

    const nextBatch = {
      ...form,
      trainerId,
      capacity,
      students,
    };

    if (selectedItem) {
      setBatches((previous) =>
        previous.map((batch) =>
          batch.id === selectedItem.id
            ? { ...batch, ...nextBatch }
            : batch
        )
      );
    } else {
      setBatches((previous) => [
        { ...nextBatch, id: Date.now() },
        ...previous,
      ]);
    }

    setModalOpen(false);
    setSelectedItem(null);
  }

  function saveTrainer(event) {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();

    const duplicate = trainers.some(
      (trainer) =>
        trainer.email.trim().toLowerCase() === email &&
        trainer.id !== selectedItem?.id
    );

    if (duplicate) {
      alert("A trainer with this email already exists.");
      return;
    }

    const nextTrainer = {
      ...form,
      name: form.name.trim(),
      email,
    };

    if (selectedItem) {
      setTrainers((previous) =>
        previous.map((trainer) =>
          trainer.id === selectedItem.id
            ? { ...trainer, ...nextTrainer }
            : trainer
        )
      );
    } else {
      setTrainers((previous) => [
        { ...nextTrainer, id: Date.now() },
        ...previous,
      ]);
    }

    setModalOpen(false);
    setSelectedItem(null);
  }

  function deleteBatch(id) {
    if (window.confirm("Delete this batch?")) {
      setBatches((previous) => previous.filter((batch) => batch.id !== id));
    }
  }

  function deleteTrainer(id) {
    const hasAssignedBatches = batches.some(
      (batch) =>
        batch.trainerId === id &&
        batch.status !== "Completed" &&
        batch.status !== "Cancelled"
    );

    if (hasAssignedBatches) {
      alert(
        "This trainer has active or upcoming batches. Reassign those batches before deleting the trainer."
      );
      return;
    }

    if (window.confirm("Delete this trainer?")) {
      setTrainers((previous) =>
        previous.filter((trainer) => trainer.id !== id)
      );
    }
  }

  function exportCSV() {
    const isBatchTab = activeTab === "batches";

    const headers = isBatchTab
      ? [
          "Batch",
          "Course",
          "Trainer",
          "Mode",
          "Batch Type",
          "Start Date",
          "End Date",
          "Time",
          "Students",
          "Capacity",
          "Status",
        ]
      : [
          "Name",
          "Email",
          "Phone",
          "Expertise",
          "Courses",
          "Joining Date",
          "Availability",
          "Status",
        ];

    const rows = isBatchTab
      ? filteredBatches.map((b) => [
          b.name,
          b.course,
          getTrainerName(b.trainerId),
          b.mode,
          b.batchType,
          b.startDate,
          b.endDate,
          b.time,
          b.students,
          b.capacity,
          b.status,
        ])
      : filteredTrainers.map((t) => [
          t.name,
          t.email,
          t.phone,
          t.expertise,
          t.courses,
          t.joiningDate,
          t.availability,
          t.status,
        ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appwars-${activeTab}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const isBatchTab = activeTab === "batches";

  const stats = isBatchTab
    ? [
        {
          label: "Total Batches",
          value: batches.length,
          icon: Layers,
          color: "bg-blue-50 text-blue-700",
        },
        {
          label: "Active Batches",
          value: activeBatches,
          icon: CalendarDays,
          color: "bg-green-50 text-green-700",
        },
        {
          label: "Upcoming Batches",
          value: upcomingBatches,
          icon: Clock,
          color: "bg-orange-50 text-orange-700",
        },
        {
          label: "Enrolled Students",
          value: totalStudents,
          icon: Users,
          color: "bg-purple-50 text-purple-700",
        },
      ]
    : [
        {
          label: "Total Trainers",
          value: trainers.length,
          icon: Users,
          color: "bg-blue-50 text-blue-700",
        },
        {
          label: "Active Trainers",
          value: activeTrainers,
          icon: UserCheck,
          color: "bg-green-50 text-green-700",
        },
        {
          label: "Available Trainers",
          value: availableTrainers,
          icon: CalendarDays,
          color: "bg-purple-50 text-purple-700",
        },
        {
          label: "Assigned Batches",
          value: batches.length,
          icon: BookOpen,
          color: "bg-orange-50 text-orange-700",
        },
      ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>
            <h1 className="text-2xl font-bold text-[#102f63] sm:text-3xl">
              Batches & Trainers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage training schedules, trainers, and course assignments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={17} />
              Export CSV
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-lg bg-[#173f7a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              <Plus size={18} />
              {isBatchTab ? "Add Batch" : "Add Trainer"}
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          <button
            onClick={() => {
              setActiveTab("batches");
              resetFilters();
              setViewItem(null);
              setModalOpen(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
              isBatchTab
                ? "bg-[#173f7a] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Layers size={18} />
            Batches Management
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {batches.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("trainers");
              resetFilters();
              setViewItem(null);
              setModalOpen(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
              !isBatchTab
                ? "bg-[#173f7a] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <GraduationCap size={18} />
            Trainers Management
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
              {trainers.length}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-blue-700" />
            <h2 className="font-semibold text-gray-800">Search and Filters</h2>
          </div>

          <div
            className={`grid grid-cols-1 gap-3 ${
              isBatchTab ? "md:grid-cols-3" : "md:grid-cols-3"
            }`}
          >
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isBatchTab
                    ? "Search batch, course, trainer..."
                    : "Search trainer, email, expertise..."
                }
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">Status Batches</option>
              {(
                isBatchTab
                  ? ["Active", "Upcoming", "Completed", "Cancelled"]
                  : ["Active", "Inactive"]
              ).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {isBatchTab ? (
              <select
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All modes</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            ) : (
              <select
                value={availabilityFilter}
                onChange={(event) => setAvailabilityFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All availability</option>
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <div>
              <h2 className="font-bold text-[#102f63]">
                {isBatchTab ? "All Batches" : "All Trainers"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {isBatchTab
                  ? `${filteredBatches.length} of ${batches.length} batches`
                  : `${filteredTrainers.length} of ${trainers.length} trainers`}
              </p>
            </div>
            {isBatchTab ? (
              <CalendarDays className="text-blue-700" size={23} />
            ) : (
              <GraduationCap className="text-blue-700" size={25} />
            )}
          </div>

          <div className="overflow-x-auto">
            {isBatchTab ? (
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Batch / Course</th>
                    <th className="px-5 py-4">Trainer</th>
                    <th className="px-5 py-4">Schedule</th>
                    <th className="px-5 py-4">Mode / Type</th>
                    <th className="px-5 py-4">Students</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-blue-50/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#17345f]">
                          {batch.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {batch.course}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {getTrainerName(batch.trainerId)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-700">
                          {formatDate(batch.startDate)} -{" "}
                          {formatDate(batch.endDate)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {batch.time}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{batch.mode}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {batch.batchType}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {batch.students}/{batch.capacity}
                        </p>
                        <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${
                                batch.capacity
                                  ? Math.min(
                                      100,
                                      (batch.students / batch.capacity) * 100
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={batch.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            title="View"
                            onClick={() =>
                              setViewItem({ type: "batch", data: batch })
                            }
                            className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => openEditModal(batch)}
                            className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => deleteBatch(batch.id)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBatches.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        No batches found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Trainer</th>
                    <th className="px-5 py-4">Expertise / Courses</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Workload</th>
                    <th className="px-5 py-4">Availability</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrainers.map((trainer) => {
                    const assignedBatches = batches.filter(
                      (batch) =>
                        batch.trainerId === trainer.id &&
                        batch.status !== "Completed" &&
                        batch.status !== "Cancelled"
                    ).length;

                    const assignedStudents = batches
                      .filter(
                        (batch) =>
                          batch.trainerId === trainer.id &&
                          batch.status !== "Completed" &&
                          batch.status !== "Cancelled"
                      )
                      .reduce(
                        (total, batch) => total + Number(batch.students || 0),
                        0
                      );

                    return (
                      <tr key={trainer.id} className="hover:bg-blue-50/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                              {trainer.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#17345f]">
                                {trainer.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {trainer.experience || "Experience not set"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[240px] px-5 py-4">
                          <p className="font-medium text-gray-700">
                            {trainer.expertise}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {trainer.courses}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="flex items-center gap-2 text-gray-700">
                            <Mail size={14} />
                            {trainer.email}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-gray-500">
                            <Phone size={14} />
                            {trainer.phone}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {assignedBatches} batches
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {assignedStudents} students
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={trainer.availability} />
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={trainer.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              title="View"
                              onClick={() =>
                                setViewItem({ type: "trainer", data: trainer })
                              }
                              className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              title="Edit"
                              onClick={() => openEditModal(trainer)}
                              className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => deleteTrainer(trainer.id)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTrainers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        No trainers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {modalOpen && (
          <Modal
            title={
              isBatchTab
                ? selectedItem
                  ? "Edit Batch"
                  : "Create New Batch"
                : selectedItem
                  ? "Edit Trainer"
                  : "Add New Trainer"
            }
            subtitle={
              isBatchTab
                ? "Manage course, trainer, and schedule."
                : "Manage trainer profile and expertise."
            }
            onClose={() => setModalOpen(false)}
            wide
          >
            {isBatchTab ? (
              <form onSubmit={saveBatch} className="space-y-6 p-5">
                <section>
                  <h3 className="mb-4 font-semibold text-blue-800">
                    Batch Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Batch Name *</label>
                      <input
                        required
                        name="name"
                        value={form.name}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="MERN-2026-02"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Course *</label>
                      <input
                        required
                        name="course"
                        value={form.course}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="Course name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Assigned Trainer *</label>
                      <select
                        required
                        name="trainerId"
                        value={form.trainerId}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option value="">Select trainer</option>
                        {trainers
                          .filter((trainer) => trainer.status === "Active")
                          .map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option>Upcoming</option>
                        <option>Active</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Mode</label>
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
                    </div>
                    <div>
                      <label className={labelClass}>Batch Type</label>
                      <select
                        name="batchType"
                        value={form.batchType}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option value="Mon-Th">Monday - Thursday</option>
                        <option value="Weekend">Weekend</option>
                        <option value="Custom">Custom Schedule</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 font-semibold text-blue-800">
                    Schedule and Capacity
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Start Date *</label>
                      <input
                        required
                        type="date"
                        name="startDate"
                        value={form.startDate}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>End Date *</label>
                      <input
                        required
                        type="date"
                        min={form.startDate || undefined}
                        name="endDate"
                        value={form.endDate}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Class Timing *</label>
                      <input
                        required
                        name="time"
                        value={form.time}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="7:00 PM - 8:30 PM"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Class Days</label>
                      <input
                        name="days"
                        value={form.days}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="Monday - Thursday"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Capacity *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        name="capacity"
                        value={form.capacity}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Enrolled Students</label>
                      <input
                        type="number"
                        min="0"
                        name="students"
                        value={form.students}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Meeting Link (optional)</label>
                      <input
                        type="url"
                        name="meetingLink"
                        value={form.meetingLink}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="https://meet.google.com/..."
                      />
                    </div>
                  </div>
                </section>
                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border px-5 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#173f7a] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {selectedItem ? "Save Changes" : "Create Batch"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveTrainer} className="space-y-6 p-5">
                <section>
                  <h3 className="mb-4 font-semibold text-blue-800">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <input
                        required
                        name="name"
                        value={form.name}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input
                        required
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone *</label>
                      <input
                        required
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Joining Date</label>
                      <input
                        type="date"
                        name="joiningDate"
                        value={form.joiningDate}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Experience</label>
                      <input
                        name="experience"
                        value={form.experience}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="e.g. 3 years"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Availability</label>
                      <select
                        name="availability"
                        value={form.availability}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option>Available</option>
                        <option>Busy</option>
                        <option>Unavailable</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 font-semibold text-blue-800">
                    Expertise and Courses
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Expertise *</label>
                      <textarea
                        required
                        rows={3}
                        name="expertise"
                        value={form.expertise}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="React, Node.js, MongoDB..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Courses *</label>
                      <textarea
                        required
                        rows={3}
                        name="courses"
                        value={form.courses}
                        onChange={updateField}
                        className={inputClass}
                        placeholder="MERN Stack Development..."
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border px-5 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#173f7a] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {selectedItem ? "Save Changes" : "Add Trainer"}
                  </button>
                </div>
              </form>
            )}
          </Modal>
        )}

        {viewItem && (
          <Modal
            title={
              viewItem.type === "batch"
                ? viewItem.data.name
                : viewItem.data.name
            }
            subtitle={
              viewItem.type === "batch"
                ? "Batch details"
                : "Trainer profile"
            }
            onClose={() => setViewItem(null)}
          >
            <div className="space-y-3 p-5">
              {(viewItem.type === "batch"
                ? [
                    ["Course", viewItem.data.course],
                    ["Trainer", getTrainerName(viewItem.data.trainerId)],
                    ["Mode", viewItem.data.mode],
                    ["Batch Type", viewItem.data.batchType],
                    ["Days", viewItem.data.days],
                    ["Timing", viewItem.data.time],
                    ["Start Date", formatDate(viewItem.data.startDate)],
                    ["End Date", formatDate(viewItem.data.endDate)],
                    [
                      "Students",
                      `${viewItem.data.students} / ${viewItem.data.capacity}`,
                    ],
                    ["Status", viewItem.data.status],
                  ]
                : [
                    ["Email", viewItem.data.email],
                    ["Phone", viewItem.data.phone],
                    ["Expertise", viewItem.data.expertise],
                    ["Courses", viewItem.data.courses],
                    ["Experience", viewItem.data.experience],
                    ["Joining Date", formatDate(viewItem.data.joiningDate)],
                    ["Availability", viewItem.data.availability],
                    ["Status", viewItem.data.status],
                    [
                      "Assigned active/upcoming batches",
                      batches.filter(
                        (batch) =>
                          batch.trainerId === viewItem.data.id &&
                          batch.status !== "Completed" &&
                          batch.status !== "Cancelled"
                      ).length,
                    ],
                  ]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 sm:flex-row sm:justify-between"
                >
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="break-words text-sm font-semibold text-gray-800 sm:max-w-[65%] sm:text-right">
                    {value || "—"}
                  </span>
                </div>
              ))}

              {viewItem.type === "batch" && viewItem.data.meetingLink && (
                <a
                  href={viewItem.data.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                >
                  <Video size={18} />
                  Open meeting link
                </a>
              )}

              <div className="border-t pt-4 text-right">
                <button
                  onClick={() => setViewItem(null)}
                  className="rounded-lg bg-[#173f7a] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
