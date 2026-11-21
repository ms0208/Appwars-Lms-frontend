
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  CheckCircle2,
  Clock,
  GraduationCap,
  RefreshCw,
  UserRound,
  BookOpen,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

// ==========================================
// EMPTY FORM
// ==========================================

const EMPTY_BATCH = {
  batch: "",
  trainer: "",
  startDate: "",
  durationMonths: 6,
  status: "Upcoming",
  description: "",
};

// ==========================================
// INPUT STYLING
// ==========================================

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

// ==========================================
// API REQUEST
// ==========================================

async function apiRequest(path, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

// ==========================================
// RESPONSE HELPERS
// ==========================================

function getItems(data, key = "data") {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.[key])) return data[key];

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.items)) return data.items;

  if (Array.isArray(data?.users)) return data.users;

  return [];
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return String(value._id || value.id || "");
}

function getName(value) {
  if (!value) return "Not assigned";

  if (typeof value === "string") return value;

  return (
    value.name ||
    value.title ||
    value.userId ||
    "Not assigned"
  );
}

// ==========================================
// DATE HELPERS
// ==========================================

function dateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// Calculate end date from start date and duration.
// The backend model supplied does not contain an endDate field.

function calculateEndDate(startDate, durationMonths) {
  if (!startDate || !durationMonths) return "";

  const date = new Date(`${startDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(
    date.getMonth() + Number(durationMonths)
  );

  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  date.setDate(Math.min(originalDay, lastDay));

  return dateInputValue(date);
}

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ==========================================
// MAP BACKEND BATCH TO FRONTEND
// ==========================================

function mapBatch(batch) {
  return {
    id: getId(batch),

    batch: batch.batch || "",

    trainerId: getId(batch.trainer),

    trainer: getName(batch.trainer),

    trainerEmail:
      typeof batch.trainer === "object"
        ? batch.trainer?.email || ""
        : "",

    startDate: dateInputValue(batch.startDate),

    durationMonths: Number(batch.durationMonths || 0),

    endDate: calculateEndDate(
      dateInputValue(batch.startDate),
      batch.durationMonths
    ),

    status: batch.status || "Upcoming",

    description: batch.description || "",

    studentCount: Number(batch.studentCount || 0),

    isActive: batch.isActive !== false,

    assignedDate: batch.assignedDate || null,

    createdAt: batch.createdAt || null,
  };
}

// ==========================================
// DISPLAY HELPERS
// ==========================================

function displayStatus(status) {
  return status === "Running" ? "Ongoing" : status;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);

  const [trainers, setTrainers] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [modal, setModal] = useState(null);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_BATCH });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  // ==========================================
  // LOAD BATCHES AND TRAINERS
  // ==========================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [batchData, trainerData] = await Promise.all([
        apiRequest("/admin/batches?limit=100"),

        apiRequest(
          "/admin/users?role=Trainer&active=true&limit=100"
        ),
      ]);

      const batchList = getItems(batchData).map(mapBatch);

      const trainerList = getItems(trainerData, "users");

      setBatches(batchList);

      setTrainers(trainerList);
    } catch (err) {
      setError(err.message || "Unable to load batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const totalBatches = batches.length;

  const ongoing = batches.filter(
    (batch) => batch.status === "Running"
  ).length;

  const upcoming = batches.filter(
    (batch) => batch.status === "Upcoming"
  ).length;

  const completed = batches.filter(
    (batch) => batch.status === "Completed"
  ).length;

  const totalStudents = batches.reduce(
    (sum, batch) => sum + batch.studentCount,
    0
  );

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch = [
        batch.batch,
        batch.trainer,
        batch.description,
        batch.status,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesStatus =
        statusFilter === "All" ||
        batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, search, statusFilter]);

  // ==========================================
  // OPEN CREATE MODAL
  // ==========================================

  function openAdd() {
    setSelectedBatch(null);

    setForm({ ...EMPTY_BATCH });

    setError("");

    setNotice("");

    setModal("form");
  }

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  function openEdit(batch) {
    setSelectedBatch(batch);

    setForm({
      batch: batch.batch,

      trainer: batch.trainerId,

      startDate: batch.startDate,

      durationMonths: batch.durationMonths || 1,

      status: batch.status,

      description: batch.description,
    });

    setError("");

    setNotice("");

    setModal("form");
  }

  // ==========================================
  // UPDATE FORM
  // ==========================================

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // ==========================================
  // CREATE / UPDATE BATCH
  // ==========================================

  async function saveBatch(event) {
    event.preventDefault();

    setError("");

    setNotice("");

    if (
      !form.batch.trim() ||
      !form.trainer ||
      !form.startDate ||
      !form.durationMonths
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    const duration = Number(form.durationMonths);

    if (!Number.isInteger(duration) || duration < 1) {
      setError(
        "Duration must be a positive whole number of months."
      );

      return;
    }

    // Check duplicate batch name
    const duplicateBatch = batches.some(
      (batch) =>
        batch.batch.trim().toLowerCase() ===
          form.batch.trim().toLowerCase() &&
        batch.id !== selectedBatch?.id
    );

    if (duplicateBatch) {
      setError("A batch with this name already exists.");

      return;
    }

    // Match backend request body
    const payload = {
      batch: form.batch.trim(),

      trainer: form.trainer,

      startDate: form.startDate,

      durationMonths: duration,

      status: form.status,

      description: form.description.trim(),

      isActive: true,
    };

    setSaving(true);

    try {
      if (selectedBatch) {
        // PUT /api/admin/batches/:id
        await apiRequest(
          `/admin/batches/${selectedBatch.id}`,
          {
            method: "PUT",

            body: JSON.stringify(payload),
          }
        );

        setNotice("Batch updated successfully.");
      } else {
        // POST /api/admin/batches
        await apiRequest("/admin/batches", {
          method: "POST",

          body: JSON.stringify(payload),
        });

        setNotice("Batch created successfully.");
      }

      setModal(null);

      setSelectedBatch(null);

      await loadData();
    } catch (err) {
      setError(
        err.message || "Unable to save batch."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DELETE / DEACTIVATE BATCH
  // ==========================================

  async function deleteBatch(batch) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${batch.batch}"?`
    );

    if (!confirmed) return;

    setError("");

    setNotice("");

    try {
      await apiRequest(
        `/admin/batches/${batch.id}`,
        {
          method: "DELETE",
        }
      );

      setBatches((previous) =>
        previous.filter(
          (item) => item.id !== batch.id
        )
      );

      setNotice("Batch deactivated successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to deactivate batch."
      );
    }
  }

  // ==========================================
  // EXPORT CSV
  // ==========================================

  function exportCSV() {
    const headers = [
      "Batch Name",
      "Trainer",
      "Start Date",
      "Duration (Months)",
      "End Date (Calculated)",
      "Enrolled Students",
      "Status",
      "Description",
    ];

    const rows = filteredBatches.map((batch) => [
      batch.batch,
      batch.trainer,
      batch.startDate,
      batch.durationMonths,
      batch.endDate,
      batch.studentCount,
      displayStatus(batch.status),
      batch.description,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "appwars-batches.csv";

    link.click();

    URL.revokeObjectURL(url);
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              APPWARS TECHNOLOGIES PVT. LTD.
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Batches Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create training batches, assign trainers and monitor student enrollment.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />

              Refresh
            </button>

            <button
              onClick={openAdd}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus size={18} />

              Create Batch
            </button>
          </div>
        </div>

        {/* ALERTS */}

        {error && !modal && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Total Batches"
            value={totalBatches}
            icon={CalendarDays}
          />

          <StatCard
            title="Ongoing Batches"
            value={ongoing}
            icon={CheckCircle2}
          />

          <StatCard
            title="Upcoming Batches"
            value={upcoming}
            icon={Clock}
          />

          <StatCard
            title="Enrolled Students"
            value={totalStudents}
            icon={Users}
          />

        </div>

        {/* SEARCH AND FILTER */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search batch name, trainer or description..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className={inputClass + " lg:w-48"}
            >
              <option value="All">All Statuses</option>
              <option value="Running">Ongoing</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} />

              Export CSV
            </button>

          </div>
        </div>

        {/* BATCH TABLE */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                All Batches
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {completed} completed batches
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {filteredBatches.length} results
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Batch Name</th>

                  <th className="px-5 py-4">Trainer</th>

                  <th className="px-5 py-4">Duration</th>

                  <th className="px-5 py-4">Students</th>

                  <th className="px-5 py-4">Status</th>

                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading batches...
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="hover:bg-slate-50"
                    >

                      {/* BATCH */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <GraduationCap size={20} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {batch.batch}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {batch.description || "No description"}
                            </p>
                          </div>

                        </div>
                      </td>

                      {/* TRAINER */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <UserRound
                            size={16}
                            className="text-slate-400"
                          />

                          <div>
                            <p className="font-medium text-slate-700">
                              {batch.trainer}
                            </p>

                            {batch.trainerEmail && (
                              <p className="mt-1 text-xs text-slate-500">
                                {batch.trainerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DURATION */}

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">
                          {batch.durationMonths} Months
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(batch.startDate)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          To {formatDate(batch.endDate)}
                        </p>
                      </td>

                      {/* STUDENTS */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users
                            size={16}
                            className="text-blue-600"
                          />

                          <span className="font-semibold text-slate-700">
                            {batch.studentCount}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={batch.status}
                        />
                      </td>

                      {/* ACTIONS */}

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

                          <ActionButton
                            label="Edit"
                            onClick={() => openEdit(batch)}
                          >
                            <Pencil size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Deactivate"
                            danger
                            onClick={() => deleteBatch(batch)}
                          >
                            <Trash2 size={16} />
                          </ActionButton>

                        </div>
                      </td>

                    </tr>
                  ))
                )}

                {!loading &&
                  filteredBatches.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No batches found. Try another search or create a new batch.
                      </td>
                    </tr>
                  )}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================
          CREATE / EDIT MODAL
      ====================================== */}

      {modal === "form" && (
        <Modal
          title={
            selectedBatch
              ? "Edit Batch"
              : "Create New Batch"
          }
          onClose={() => {
            if (!saving) setModal(null);
          }}
        >

          <form
            onSubmit={saveBatch}
            className="space-y-4"
          >

            <div className="grid gap-4 sm:grid-cols-2">

              {/* BATCH NAME */}

              <FormField label="Batch Name *">
                <input
                  required
                  value={form.batch}
                  onChange={(e) =>
                    updateField("batch", e.target.value)
                  }
                  className={inputClass}
                  placeholder="MERN-01"
                />
              </FormField>

              {/* TRAINER */}

              <FormField label="Assign Trainer *">
                <select
                  required
                  value={form.trainer}
                  onChange={(e) =>
                    updateField("trainer", e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select a trainer
                  </option>

                  {trainers.map((trainer) => (
                    <option
                      key={getId(trainer)}
                      value={getId(trainer)}
                    >
                      {trainer.name} ({trainer.userId})
                    </option>
                  ))}
                </select>

                {trainers.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No active trainers found. Create or activate a trainer first.
                  </p>
                )}
              </FormField>

              {/* START DATE */}

              <FormField label="Start Date *">
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    updateField("startDate", e.target.value)
                  }
                  className={inputClass}
                />
              </FormField>

              {/* DURATION */}

              <FormField label="Duration (Months) *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.durationMonths}
                  onChange={(e) =>
                    updateField(
                      "durationMonths",
                      e.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="6"
                />
              </FormField>

              {/* END DATE PREVIEW */}

              <FormField label="Calculated End Date">
                <div className="flex min-h-[42px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                  <CalendarDays
                    size={16}
                    className="mr-2 text-blue-600"
                  />

                  {formatDate(
                    calculateEndDate(
                      form.startDate,
                      form.durationMonths
                    )
                  )}
                </div>
              </FormField>

              {/* STATUS */}

              <FormField label="Batch Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="Upcoming">
                    Upcoming
                  </option>

                  <option value="Running">
                    Running
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </FormField>

              {/* DESCRIPTION */}

              <div className="sm:col-span-2">
                <FormField label="Batch Description">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Enter batch description..."
                  />
                </FormField>
              </div>

            </div>

            {/* ERROR */}

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* BUTTONS */}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">

              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || trainers.length === 0}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : selectedBatch
                    ? "Save Changes"
                    : "Create Batch"}
              </button>

            </div>
          </form>
        </Modal>
      )}

      {/* ======================================
          VIEW BATCH MODAL
      ====================================== */}

      {modal === "view" && selectedBatch && (
        <Modal
          title="Batch Details"
          onClose={() => setModal(null)}
        >

          <div className="space-y-5">

            <div className="flex items-start gap-4">

              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <CalendarDays size={28} />
              </div>

              <div className="min-w-0 flex-1">

                <h3 className="text-lg font-bold text-slate-900">
                  {selectedBatch.batch}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Batch ID: {selectedBatch.id}
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={selectedBatch.status}
                  />
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <Detail
                label="Batch Name"
                value={selectedBatch.batch}
              />

              <Detail
                label="Trainer"
                value={selectedBatch.trainer}
              />

              <Detail
                label="Trainer Email"
                value={selectedBatch.trainerEmail || "—"}
              />

              <Detail
                label="Start Date"
                value={formatDate(selectedBatch.startDate)}
              />

              <Detail
                label="Duration"
                value={`${selectedBatch.durationMonths} Months`}
              />

              <Detail
                label="Calculated End Date"
                value={formatDate(selectedBatch.endDate)}
              />

              <Detail
                label="Enrolled Students"
                value={selectedBatch.studentCount}
              />

              <Detail
                label="Active"
                value={
                  selectedBatch.isActive
                    ? "Active"
                    : "Inactive"
                }
              />

              <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                <p className="text-xs font-medium text-slate-500">
                  Description
                </p>

                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                  {selectedBatch.description || "No description available."}
                </p>
              </div>

            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <Icon size={20} />
        </span>

      </div>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {
  const styles = {
    Running: "bg-green-50 text-green-700",
    Upcoming: "bg-blue-50 text-blue-700",
    Completed: "bg-slate-100 text-slate-600",
    Cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.Upcoming
      }`}
    >
      {displayStatus(status)}
    </span>
  );
}

// ==========================================
// ACTION BUTTON
// ==========================================

function ActionButton({
  children,
  label,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-2 ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

// ==========================================
// MODAL
// ==========================================

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">

        <div className="mb-5 flex items-center justify-between">

          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>

        </div>

        {children}

      </div>
    </div>
  );
}

// ==========================================
// FORM FIELD
// ==========================================

function FormField({ label, children }) {
  return (
    <label className="block space-y-1.5">

      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}

    </label>
  );
}

// ==========================================
// DETAIL
// ==========================================

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value ?? "—"}
      </p>

    </div>
  );
}
