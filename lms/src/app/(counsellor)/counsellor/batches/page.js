"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
} from "lucide-react";

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API = {
  batches: `${API_ROOT}/api/counsellor/batches`,
  trainers: `${API_ROOT}/api/counsellor/trainers`,
  users: `${API_ROOT}/api/counsellor/students`,
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

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

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
        result.error ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

function extractArray(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.batches)) return result.batches;
  if (Array.isArray(result?.trainers)) return result.trainers;
  if (Array.isArray(result?.users)) return result.users;
  if (Array.isArray(result?.results)) return result.results;

  return [];
}

function getId(item) {
  return String(item?._id || item?.id || "");
}

function formatDate(value) {
  if (!value) return "—";

  const date = String(value).slice(0, 10);
  const parts = date.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 1;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  return Math.max(1, months || 1);
}

function mapBatchStatus(status) {
  if (status === "Active") return "Running";
  if (status === "Running") return "Active";
  return status || "Upcoming";
}

function mapTrainerStatus(trainer) {
  return trainer?.isActive === false ? "Inactive" : "Active";
}

function getTrainerDetails(trainer) {
  return trainer?.trainerDetails || {};
}

function normalizeTrainer(trainer) {
  const details = getTrainerDetails(trainer);

  return {
    id: getId(trainer),
    userId: trainer?.userId || "",
    name: trainer?.name || "",
    email: trainer?.email || "",
    phone: details.phone || trainer?.phone || "",
    expertise: Array.isArray(details.expertise)
      ? details.expertise.join(", ")
      : details.expertise || trainer?.expertise || "",
    courses: Array.isArray(details.courses)
      ? details.courses.join(", ")
      : details.courses || trainer?.courses || "",
    joiningDate: toDateInput(details.joiningDate || trainer?.joiningDate),
    availability: details.availability || trainer?.availability || "Available",
    status: mapTrainerStatus(trainer),
    experience: details.experience || trainer?.experience || "",
  };
}

function normalizeBatch(batch, students = []) {
  const trainerValue = batch?.trainer;

  const trainerId =
    typeof trainerValue === "object"
      ? getId(trainerValue)
      : String(trainerValue || "");

  const batchName = batch?.batch || batch?.name || "";

  const enrolledStudents = students.filter(
    (student) => String(student?.batch || "") === String(batchName)
  ).length;

  const startDate = toDateInput(batch?.startDate);

  let endDate = "";

  if (batch?.endDate) {
    endDate = toDateInput(batch.endDate);
  } else if (startDate && batch?.durationMonths) {
    const date = new Date(`${startDate}T00:00:00`);
    date.setMonth(date.getMonth() + Number(batch.durationMonths));
    endDate = date.toISOString().slice(0, 10);
  }

  return {
    id: getId(batch),
    name: batchName,
    course: batch?.course || "",
    trainerId,
    mode: batch?.mode || "—",
    batchType: batch?.batchType || "—",
    startDate,
    endDate,
    time: batch?.time || "",
    days: batch?.days || "",
    capacity: Number(batch?.capacity || 0),
    students: Number(
      batch?.studentsCount ??
        batch?.enrolledStudents ??
        enrolledStudents
    ),
    status: mapBatchStatus(batch?.status),
    meetingLink: batch?.meetingLink || "",
    description: batch?.description || "",
    durationMonths: Number(batch?.durationMonths || 1),
  };
}

function Badge({ value }) {
  const styles = {
    Active: "bg-green-50 text-green-700",
    Running: "bg-green-50 text-green-700",
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

  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(emptyBatch);

  const isBatchTab = activeTab === "batches";

  // --------------------------------------------------
  // LOAD BACKEND DATA
  // --------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [batchResult, trainerResult, studentResult] =
        await Promise.all([
          apiRequest(API.batches),
          apiRequest(API.trainers),
          apiRequest(`${API.users}?role=Student&limit=1000`),
        ]);

      const trainerList = extractArray(trainerResult).map(normalizeTrainer);
      const studentList = extractArray(studentResult);

      const batchList = extractArray(batchResult).map((batch) =>
        normalizeBatch(batch, studentList)
      );

      setTrainers(trainerList);
      setStudents(studentList);
      setBatches(batchList);
    } catch (error) {
      console.error("Batches and trainers loading error:", error);
      setPageError(error.message || "Unable to load batches and trainers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------
  // TRAINER AND BATCH HELPERS
  // --------------------------------------------------

  const trainerMap = useMemo(
    () =>
      Object.fromEntries(
        trainers.map((trainer) => [trainer.id, trainer])
      ),
    [trainers]
  );

  const getTrainerName = (trainerId) =>
    trainerMap[String(trainerId)]?.name || "Not assigned";

  const activeBatches = batches.filter(
    (batch) => batch.status === "Active"
  ).length;

  const upcomingBatches = batches.filter(
    (batch) => batch.status === "Upcoming"
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
      trainer.status === "Active" &&
      trainer.availability === "Available"
  ).length;

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
        trainer.phone.toLowerCase().includes(query) ||
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

  function closeFormModal() {
    setModalOpen(false);
    setSelectedItem(null);
  }

  function openAddModal() {
    setSelectedItem(null);
    setForm(isBatchTab ? { ...emptyBatch } : { ...emptyTrainer });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setSelectedItem(item);

    if (isBatchTab) {
      setForm({
        ...emptyBatch,
        ...item,
        trainerId: String(item.trainerId || ""),
        capacity: String(item.capacity || 30),
        students: String(item.students || 0),
      });
    } else {
      setForm({
        ...emptyTrainer,
        ...item,
      });
    }

    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // --------------------------------------------------
  // SAVE BATCH
  // --------------------------------------------------

  async function saveBatch(event) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!form.name.trim() || !form.course.trim()) {
      alert("Batch name and course are required.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      alert("Please select start date and end date.");
      return;
    }

    if (form.endDate < form.startDate) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    const capacity = Number(form.capacity);

    if (!Number.isFinite(capacity) || capacity < 1) {
      alert("Enter a valid batch capacity.");
      return;
    }

    if (!form.trainerId || !trainerMap[form.trainerId]) {
      alert("Please select a valid trainer.");
      return;
    }

    const payload = {
      batch: form.name.trim(),
      course: form.course.trim(),
      trainer: form.trainerId,
      startDate: form.startDate,
      durationMonths: calculateDuration(
        form.startDate,
        form.endDate
      ),
      status:
        form.status === "Active"
          ? "Running"
          : form.status,
      description: "",
    };

    try {
      setSaving(true);

      if (selectedItem) {
        await apiRequest(`${API.batches}/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Batch updated successfully.");
      } else {
        await apiRequest(API.batches, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Batch created successfully.");
      }

      closeFormModal();
      await loadData();
    } catch (error) {
      console.error("Batch save error:", error);
      setPageError(error.message || "Unable to save batch.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // SAVE TRAINER
  // --------------------------------------------------

  async function saveTrainer(event) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (!name || !email || !form.expertise.trim() || !form.courses.trim()) {
      alert("Please fill all required trainer fields.");
      return;
    }

    const duplicate = trainers.some(
      (trainer) =>
        trainer.email.trim().toLowerCase() === email &&
        trainer.id !== selectedItem?.id
    );

    if (duplicate) {
      alert("A trainer with this email already exists.");
      return;
    }

    const payload = {
      name,
      email,
      phone: form.phone.trim(),
      role: "Trainer",
      isActive: form.status === "Active",
      trainerDetails: {
        phone: form.phone.trim(),
        expertise: form.expertise.trim(),
        courses: form.courses
          .split(",")
          .map((course) => course.trim())
          .filter(Boolean),
        joiningDate: form.joiningDate || null,
        availability: form.availability,
        experience: form.experience.trim(),
      },
    };

    try {
      setSaving(true);

      if (selectedItem) {
        await apiRequest(`${API.trainers}/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Trainer updated successfully.");
      } else {
        await apiRequest(API.trainers, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Trainer created successfully.");
      }

      closeFormModal();
      await loadData();
    } catch (error) {
      console.error("Trainer save error:", error);
      setPageError(error.message || "Unable to save trainer.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE BATCH
  // --------------------------------------------------

  async function deleteBatch(id) {
    if (!window.confirm("Are you sure you want to delete this batch?")) {
      return;
    }

    setPageError("");
    setSuccessMessage("");

    try {
      await apiRequest(`${API.batches}/${id}`, {
        method: "DELETE",
      });

      setSuccessMessage("Batch deleted successfully.");
      await loadData();
    } catch (error) {
      console.error("Batch delete error:", error);
      setPageError(error.message || "Unable to delete batch.");
    }
  }

  // --------------------------------------------------
  // DELETE TRAINER
  // --------------------------------------------------

  async function deleteTrainer(id) {
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

    if (!window.confirm("Are you sure you want to delete this trainer?")) {
      return;
    }

    setPageError("");
    setSuccessMessage("");

    try {
      await apiRequest(`${API.trainers}/${id}`, {
        method: "DELETE",
      });

      setSuccessMessage("Trainer deleted successfully.");
      await loadData();
    } catch (error) {
      console.error("Trainer delete error:", error);
      setPageError(error.message || "Unable to delete trainer.");
    }
  }

  // --------------------------------------------------
  // EXPORT CSV
  // --------------------------------------------------

  function exportCSV() {
    const headers = isBatchTab
      ? [
          "Batch",
          "Course",
          "Trainer",
          "Start Date",
          "End Date",
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
      ? filteredBatches.map((batch) => [
          batch.name,
          batch.course,
          getTrainerName(batch.trainerId),
          batch.startDate,
          batch.endDate,
          batch.students,
          batch.capacity,
          batch.status,
        ])
      : filteredTrainers.map((trainer) => [
          trainer.name,
          trainer.email,
          trainer.phone,
          trainer.expertise,
          trainer.courses,
          trainer.joiningDate,
          trainer.availability,
          trainer.status,
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

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

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

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

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
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
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

        {/* API messages */}

        {pageError && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{pageError}</p>
            <button onClick={() => setPageError("")}>
              <X size={18} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage("")}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Tabs */}

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

        {/* Statistics */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Filters */}

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-blue-700" />
            <h2 className="font-semibold text-gray-800">
              Search and Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
              <option value="All">All statuses</option>

              {(isBatchTab
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
                onChange={(event) =>
                  setAvailabilityFilter(event.target.value)
                }
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

        {/* Data table */}

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

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <RefreshCw size={28} className="animate-spin text-blue-700" />
              <p className="text-sm">Loading batches and trainers...</p>
            </div>
          ) : (
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
                            {batch.time || "Schedule not configured"}
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
                            {batch.students}/{batch.capacity || "—"}
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
                      const trainerBatches = batches.filter(
                        (batch) =>
                          batch.trainerId === trainer.id &&
                          batch.status !== "Completed" &&
                          batch.status !== "Cancelled"
                      );

                      const assignedStudents = trainerBatches.reduce(
                        (total, batch) =>
                          total + Number(batch.students || 0),
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
                                  {trainer.experience ||
                                    "Experience not set"}
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
                              {trainer.phone || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {trainerBatches.length} batches
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
                                  setViewItem({
                                    type: "trainer",
                                    data: trainer,
                                  })
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
          )}
        </section>

        {/* ADD / EDIT MODAL */}

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
            onClose={closeFormModal}
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
                      <label className={labelClass}>
                        Assigned Trainer *
                      </label>

                      <select
                        required
                        name="trainerId"
                        value={form.trainerId}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option value="">Select trainer</option>

                        {trainers
                          .filter(
                            (trainer) => trainer.status === "Active"
                          )
                          .map((trainer) => (
                            <option
                              key={trainer.id}
                              value={trainer.id}
                            >
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
                        <option value="Mon-Th">
                          Monday - Thursday
                        </option>
                        <option value="Weekend">Weekend</option>
                        <option value="Custom">Custom Schedule</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 font-semibold text-blue-800">
                    Schedule and Capacity
                  </h3>

                  <p className="mb-4 text-xs text-gray-500">
                    Start date, duration, trainer, course, and status are
                    saved to the current Batch model. Other schedule fields
                    are displayed in this form but require additional backend
                    schema support to persist.
                  </p>

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
                      <label className={labelClass}>Class Timing</label>
                      <input
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
                      <label className={labelClass}>
                        Enrolled Students
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="students"
                        value={form.students}
                        disabled
                        className={`${inputClass} bg-gray-100`}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Calculated from students assigned to this batch.
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Meeting Link (optional)
                      </label>
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
                    onClick={closeFormModal}
                    className="rounded-lg border px-5 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#173f7a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : selectedItem
                        ? "Save Changes"
                        : "Create Batch"}
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
                    onClick={closeFormModal}
                    className="rounded-lg border px-5 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#173f7a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : selectedItem
                        ? "Save Changes"
                        : "Add Trainer"}
                  </button>
                </div>
              </form>
            )}
          </Modal>
        )}

        {/* VIEW MODAL */}

        {viewItem && (
          <Modal
            title={viewItem.data.name}
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
                    [
                      "Trainer",
                      getTrainerName(viewItem.data.trainerId),
                    ],
                    ["Mode", viewItem.data.mode],
                    ["Batch Type", viewItem.data.batchType],
                    ["Days", viewItem.data.days],
                    ["Timing", viewItem.data.time],
                    [
                      "Start Date",
                      formatDate(viewItem.data.startDate),
                    ],
                    [
                      "End Date",
                      formatDate(viewItem.data.endDate),
                    ],
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
                    [
                      "Joining Date",
                      formatDate(viewItem.data.joiningDate),
                    ],
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
                  <span className="text-sm text-gray-500">
                    {label}
                  </span>

                  <span className="break-words text-sm font-semibold text-gray-800 sm:max-w-[65%] sm:text-right">
                    {value || "—"}
                  </span>
                </div>
              ))}

              {viewItem.type === "batch" &&
                viewItem.data.meetingLink && (
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