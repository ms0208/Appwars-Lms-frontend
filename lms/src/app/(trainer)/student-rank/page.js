
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Users,
  Search,
  RefreshCw,
  Save,
  Medal,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Pencil,
  Trophy,
  UserCheck,
  UserX,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
).replace(/\/$/, "");

const BATCHES_API = `${API_URL}/api/trainer/batches`;

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "Something went wrong."
    );
  }

  return data;
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return String(value._id || value.id || "");
}

function getArrayResponse(data) {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.batches,
    data?.students,
    data?.data,
    data?.records,
    data?.items,
    data?.users,
    data?.data?.batches,
    data?.data?.students,
    data?.data?.users,
    data?.batch?.students,
  ];

  return candidates.find(Array.isArray) || [];
}

function normalizeBatch(batch) {
  if (!batch) return null;

  return {
    id: getId(batch),
    name:
      batch.batch ||
      batch.batchName ||
      batch.name ||
      batch.code ||
      "Unnamed Batch",
    course:
      batch.course?.courseName ||
      batch.course?.name ||
      batch.courseName ||
      (typeof batch.course === "string" ? batch.course : ""),
  };
}

function normalizeStudent(item) {
  if (!item) return null;

  const student =
    item.student && typeof item.student === "object"
      ? item.student
      : item;

  const id = getId(student);

  if (!id) return null;

  return {
    id,
    name: student.name || student.fullName || "Unknown Student",
    userId: student.userId || "",
    email: student.email || "",
    batch: student.batch || "",
    rank: student.rank ?? null,
    rankAssignedAt: student.rankAssignedAt || null,
    rankAssignedBy: student.rankAssignedBy || null,
  };
}

function getOrdinal(rank) {
  const number = Number(rank);

  if (!Number.isInteger(number) || number < 1) return "—";

  const lastTwo = number % 100;

  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${number}th`;
  }

  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TrainerRankPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [students, setStudents] = useState([]);
  const [rankInputs, setRankInputs] = useState({});
  const [search, setSearch] = useState("");

  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState("");
  const [deletingStudentId, setDeletingStudentId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // FETCH TRAINER BATCHES
  // GET /api/trainer/batches
  // ==========================================

  const fetchBatches = useCallback(async () => {
    try {
      setLoadingBatches(true);
      setError("");

      const response = await apiRequest(BATCHES_API);
      const records = getArrayResponse(response);

      const normalized = records
        .map(normalizeBatch)
        .filter((batch) => batch && batch.id);

      setBatches(normalized);

      setSelectedBatchId((previous) => {
        if (previous && normalized.some((b) => b.id === previous)) {
          return previous;
        }

        return normalized[0]?.id || "";
      });
    } catch (err) {
      console.error("Fetch trainer batches error:", err);
      setError(err.message || "Unable to load trainer batches.");
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  // ==========================================
  // FETCH STUDENTS WITH THEIR RANKS
  // GET /api/trainer/batches/:batchId/ranks
  // ==========================================

  const fetchStudents = useCallback(async (batchId) => {
    if (!batchId) {
      setStudents([]);
      setRankInputs({});
      return;
    }

    try {
      setLoadingStudents(true);
      setError("");

      const response = await apiRequest(
        `${BATCHES_API}/${encodeURIComponent(batchId)}/ranks`
      );

      const records = getArrayResponse(response);

      const normalized = records
        .map(normalizeStudent)
        .filter(Boolean);

      setStudents(normalized);

      const inputs = {};

      normalized.forEach((student) => {
        inputs[student.id] =
          student.rank === null || student.rank === undefined
            ? ""
            : String(student.rank);
      });

      setRankInputs(inputs);
    } catch (err) {
      console.error("Fetch batch student ranks error:", err);

      setStudents([]);
      setRankInputs({});
      setError(err.message || "Unable to load student ranks.");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // ==========================================
  // LOAD STUDENTS WHEN BATCH CHANGES
  // ==========================================

  useEffect(() => {
    if (selectedBatchId) {
      fetchStudents(selectedBatchId);
    } else {
      setStudents([]);
      setRankInputs({});
    }
  }, [selectedBatchId, fetchStudents]);

  // ==========================================
  // SELECTED BATCH
  // ==========================================

  const selectedBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  // ==========================================
  // SEARCH STUDENTS
  // ==========================================

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.userId.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    });
  }, [students, search]);

  // ==========================================
  // RANK STATISTICS
  // ==========================================

  const rankedStudents = students.filter(
    (student) =>
      student.rank !== null &&
      student.rank !== undefined &&
      student.rank !== ""
  );

  const unrankedStudents = students.length - rankedStudents.length;

  // ==========================================
  // UPDATE RANK INPUT
  // ==========================================

  const handleRankChange = (studentId, value) => {
    setRankInputs((previous) => ({
      ...previous,
      [studentId]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ==========================================
  // ASSIGN OR UPDATE STUDENT RANK
  //
  // POST = New rank
  // PUT  = Update existing rank
  // ==========================================

  const handleAssignRank = async (student) => {
    const rawRank = rankInputs[student.id];

    if (
      rawRank === "" ||
      rawRank === null ||
      rawRank === undefined
    ) {
      setError(`Please enter a rank for ${student.name}.`);
      return;
    }

    const rank = Number(rawRank);

    if (!Number.isInteger(rank) || rank < 1) {
      setError("Rank must be a positive whole number.");
      return;
    }

    if (rank > students.length) {
      setError(
        `Rank cannot exceed the total students in this batch (${students.length}).`
      );
      return;
    }

    // Frontend duplicate rank validation
    const duplicateStudent = students.find(
      (item) =>
        item.id !== student.id &&
        Number(item.rank) === rank &&
        item.rank !== null &&
        item.rank !== undefined &&
        item.rank !== ""
    );

    if (duplicateStudent) {
      setError(
        `Rank ${rank} is already assigned to ${duplicateStudent.name}.`
      );
      return;
    }

    const hasExistingRank =
      student.rank !== null &&
      student.rank !== undefined &&
      student.rank !== "";

    const method = hasExistingRank ? "PUT" : "POST";

    try {
      setSavingStudentId(student.id);
      setError("");
      setSuccess("");

      const response = await apiRequest(
        `${BATCHES_API}/${encodeURIComponent(
          selectedBatchId
        )}/students/${encodeURIComponent(student.id)}/rank`,
        {
          method,
          body: JSON.stringify({ rank }),
        }
      );

      setSuccess(
        response.message ||
          `${student.name}'s rank ${
            hasExistingRank ? "updated" : "assigned"
          } successfully.`
      );

      // Refresh ranks from the backend
      await fetchStudents(selectedBatchId);
    } catch (err) {
      console.error("Assign/update rank error:", err);
      setError(err.message || "Unable to save student rank.");
    } finally {
      setSavingStudentId("");
    }
  };

  // ==========================================
  // DELETE STUDENT RANK
  // DELETE /api/trainer/batches/:batchId/students/:studentId/rank
  // ==========================================

  const handleDeleteRank = async (student) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${student.name}'s rank?`
      )
    ) {
      return;
    }

    try {
      setDeletingStudentId(student.id);
      setError("");
      setSuccess("");

      const response = await apiRequest(
        `${BATCHES_API}/${encodeURIComponent(
          selectedBatchId
        )}/students/${encodeURIComponent(student.id)}/rank`,
        {
          method: "DELETE",
        }
      );

      setSuccess(
        response.message || `${student.name}'s rank removed successfully.`
      );

      await fetchStudents(selectedBatchId);
    } catch (err) {
      console.error("Delete student rank error:", err);
      setError(err.message || "Unable to remove student rank.");
    } finally {
      setDeletingStudentId("");
    }
  };

  // ==========================================
  // REFRESH PAGE DATA
  // ==========================================

  const handleRefresh = async () => {
    setError("");
    setSuccess("");

    await fetchBatches();

    if (selectedBatchId) {
      await fetchStudents(selectedBatchId);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      {/* HEADER */}

      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-[#102e60]">
            <Award size={27} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#102e60] sm:text-3xl">
              Student Rank Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Assign, update, view and remove student ranks in your batches.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loadingBatches || loadingStudents}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loadingBatches || loadingStudents ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <p>{success}</p>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* BATCH SELECTOR */}

      <section className="mb-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="rankBatch"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Select Your Batch
            </label>

            <select
              id="rankBatch"
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              disabled={loadingBatches || batches.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {loadingBatches ? "Loading batches..." : "Select batch"}
              </option>

              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                  {batch.course ? ` - ${batch.course}` : ""}
                </option>
              ))}
            </select>

            {batches.length === 0 && !loadingBatches && (
              <p className="mt-2 text-xs text-amber-600">
                No batches found for this trainer.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Selected Batch
            </p>

            <p className="mt-1 text-lg font-bold text-[#102e60]">
              {selectedBatch?.name || "No batch selected"}
            </p>

            {selectedBatch?.course && (
              <p className="mt-1 text-sm text-slate-500">
                {selectedBatch.course}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* STATISTICS */}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Students
              </p>

              <p className="mt-2 text-3xl font-bold text-[#102e60]">
                {loadingStudents ? "..." : students.length}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Users size={25} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Ranked Students
              </p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {loadingStudents ? "..." : rankedStudents.length}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-3 text-green-700">
              <UserCheck size={25} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Rank Not Assigned
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {loadingStudents ? "..." : unrankedStudents}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <UserX size={25} />
            </div>
          </div>
        </div>
      </section>

      {/* STUDENT TABLE */}

      <section className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-xl font-bold text-[#102e60]">
              Batch Students
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View and manage the rank of every student in this batch.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#102e60]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Student</th>
                <th className="px-5 py-4 font-semibold">Student ID</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Current Rank</th>
                <th className="px-5 py-4 font-semibold">Assigned By</th>
                <th className="px-5 py-4 font-semibold">Assigned Date</th>
                <th className="px-5 py-4 font-semibold">Set Rank</th>
                <th className="px-5 py-4 text-center font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loadingStudents && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <RefreshCw size={19} className="animate-spin" />
                      <span className="text-sm font-medium">
                        Loading batch students...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loadingStudents &&
                selectedBatchId &&
                filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Users
                        size={36}
                        className="mx-auto mb-3 text-slate-300"
                      />

                      <p className="font-semibold text-slate-700">
                        No students found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Students enrolled in this batch will appear here.
                      </p>
                    </td>
                  </tr>
                )}

              {!loadingStudents &&
                !selectedBatchId &&
                !loadingBatches && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Select a batch to view its students.
                    </td>
                  </tr>
                )}

              {!loadingStudents &&
                filteredStudents.map((student) => {
                  const hasRank =
                    student.rank !== null &&
                    student.rank !== undefined &&
                    student.rank !== "";

                  const isSaving = savingStudentId === student.id;
                  const isDeleting = deletingStudentId === student.id;

                  const assignedBy =
                    student.rankAssignedBy?.name || "—";

                  return (
                    <tr
                      key={student.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* STUDENT */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#102e60]">
                            {student.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {student.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              Student
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* STUDENT ID */}

                      <td className="px-5 py-4 text-sm font-medium text-slate-600">
                        {student.userId || "—"}
                      </td>

                      {/* EMAIL */}

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {student.email || "—"}
                      </td>

                      {/* CURRENT RANK */}

                      <td className="px-5 py-4">
                        {hasRank ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
                            <Medal size={15} />
                            {getOrdinal(student.rank)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            Not assigned
                          </span>
                        )}
                      </td>

                      {/* ASSIGNED BY */}

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {assignedBy}
                      </td>

                      {/* ASSIGNED DATE */}

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(student.rankAssignedAt)}
                      </td>

                      {/* RANK INPUT */}

                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="1"
                          max={students.length || undefined}
                          step="1"
                          value={rankInputs[student.id] ?? ""}
                          onChange={(event) =>
                            handleRankChange(
                              student.id,
                              event.target.value
                            )
                          }
                          placeholder="Enter rank"
                          disabled={isSaving || isDeleting}
                          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />

                        <p className="mt-1 text-xs text-slate-400">
                          1 to {students.length}
                        </p>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAssignRank(student)}
                            disabled={
                              isSaving ||
                              isDeleting ||
                              !selectedBatchId
                            }
                            title={hasRank ? "Update rank" : "Assign rank"}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? (
                              <RefreshCw
                                size={15}
                                className="animate-spin"
                              />
                            ) : hasRank ? (
                              <Pencil size={15} />
                            ) : (
                              <Save size={15} />
                            )}

                            {isSaving
                              ? "Saving..."
                              : hasRank
                                ? "Update"
                                : "Assign"}
                          </button>

                          {hasRank && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRank(student)}
                              disabled={isSaving || isDeleting}
                              title="Delete rank"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <RefreshCw
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={15} />
                              )}

                              {isDeleting ? "Removing..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER */}

        {!loadingStudents && students.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">
              Showing {filteredStudents.length} of {students.length} students
            </p>

            <p className="text-xs text-slate-500">
              Ranks must be unique within the selected batch.
            </p>
          </div>
        )}
      </section>

      {/* INFORMATION */}

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div>
            <p className="font-semibold text-[#102e60]">
              Rank management information
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Assign a rank to a student who does not have one. Use Update
              to change an existing rank and Delete to remove it. Each rank
              must be unique within the selected batch. Newly enrolled
              students will appear when the backend batch-ranks API
              includes them.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
