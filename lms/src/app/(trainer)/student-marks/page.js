"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const RESULTS_API = `${API_URL}/api/trainer/results`;
const BATCHES_API = `${API_URL}/api/trainer/batches`;
const STUDENTS_API = `${API_URL}/api/trainer/batches`;

const getToday = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const initialForm = {
  studentId: "",
  batchId: "",
  exam: "",
  date: getToday(),
  obtained: "",
  total: "100",
  remarks: "",
  published: false,
};

// ==========================================
// TOKEN
// ==========================================

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

// ==========================================
// API REQUEST
// ==========================================

async function apiRequest(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ==========================================
// GET ARRAY FROM DIFFERENT API STRUCTURES
// ==========================================

function getArrayResponse(data) {
  if (Array.isArray(data)) return data;

  const possibleArrays = [
    data?.students,
    data?.batches,
    data?.results,
    data?.data,
    data?.result,
    data?.records,
    data?.items,
    data?.users,

    data?.data?.students,
    data?.data?.batches,
    data?.data?.results,
    data?.data?.users,
    data?.data?.records,
    data?.data?.items,

    data?.trainer?.students,
    data?.trainer?.batches,

    data?.batch?.students,
    data?.data?.batch?.students,
    data?.data?.trainer?.students,
  ];

  return possibleArrays.find(Array.isArray) || [];
}

// ==========================================
// GET ID
// ==========================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return String(value._id || value.id || value.value || "");
}

// ==========================================
// GET BATCH VALUE
// ==========================================

function getBatchValue(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return (
    value._id ||
    value.id ||
    value.batch ||
    value.batchName ||
    value.name ||
    value.code ||
    value.batchCode ||
    ""
  );
}

// ==========================================
// STUDENT NAME
// ==========================================

function getStudentName(student) {
  if (!student) return "Unknown Student";

  if (typeof student === "string") return student;

  return (
    student.name ||
    student.fullName ||
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    student.userId ||
    student.email ||
    "Unknown Student"
  );
}

// ==========================================
// BATCH NAME
// ==========================================

function getBatchName(batch) {
  if (!batch) return "Unknown Batch";

  if (typeof batch === "string") return batch;

  return (
    batch.batchName ||
    batch.name ||
    batch.batch ||
    batch.code ||
    batch.batchCode ||
    batch.courseName ||
    "Unknown Batch"
  );
}

// ==========================================
// BATCH CODE
// ==========================================

function getBatchCode(batch) {
  if (!batch || typeof batch === "string") return "";

  return (
    batch.batchCode ||
    batch.code ||
    batch.batch ||
    ""
  );
}

// ==========================================
// BATCH COURSE
// ==========================================

function getBatchCourse(batch) {
  if (!batch || typeof batch === "string") return "";

  if (typeof batch.course === "string") {
    return batch.course;
  }

  return (
    batch.course?.courseName ||
    batch.course?.name ||
    batch.courseName ||
    batch.course?.title ||
    ""
  );
}

// ==========================================
// BATCH IDENTIFIERS
// ==========================================

function getBatchIdentifiers(batch) {
  if (!batch) return [];

  if (typeof batch === "string") {
    return [batch.toLowerCase().trim()];
  }

  return [
    getId(batch),
    batch.batch,
    batch.batchName,
    batch.name,
    batch.code,
    batch.batchCode,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().trim());
}

// ==========================================
// STUDENT BATCH ID
// ==========================================

function getStudentBatchId(student) {
  if (!student || typeof student === "string") return "";

  return (
    getId(student.batchId) ||
    getId(student.batch) ||
    getId(student.batch?._id) ||
    getId(student.batch?._id)
  );
}

// ==========================================
// STUDENT BATCH VALUE
// ==========================================

function getStudentBatchValue(student) {
  if (!student || typeof student === "string") return "";

  return (
    student.batch?.batch ||
    student.batch?.batchName ||
    student.batch?.name ||
    student.batch?.code ||
    student.batchName ||
    student.batchCode ||
    (typeof student.batch === "string" ? student.batch : "") ||
    ""
  );
}

// ==========================================
// CHECK STUDENT BELONGS TO BATCH
// ==========================================

function studentBelongsToBatch(student, selectedBatch) {
  if (!selectedBatch) return true;

  const studentBatchId = getStudentBatchId(student);
  const studentBatchValue = getStudentBatchValue(student);

  // Student has no batch information in API response.
  // Keep the student because the endpoint may already filter by trainer.
  if (!studentBatchId && !studentBatchValue) {
    return true;
  }

  const batchIdentifiers = getBatchIdentifiers(selectedBatch);

  if (
    studentBatchId &&
    batchIdentifiers.includes(studentBatchId.toLowerCase())
  ) {
    return true;
  }

  if (
    studentBatchValue &&
    batchIdentifiers.includes(
      String(studentBatchValue).toLowerCase().trim()
    )
  ) {
    return true;
  }

  return false;
}

// ==========================================
// NORMALIZE BATCH
// ==========================================

function normalizeBatch(batch) {
  if (!batch) return null;

  return {
    id: getId(batch),
    name: getBatchName(batch),
    code: getBatchCode(batch),
    status: batch.status || "",
    courseName: getBatchCourse(batch),
    duration:
      batch.duration ||
      batch.durationMonths ||
      "",
    studentCount:
      batch.studentCount ??
      batch.totalStudents ??
      batch.students?.length ??
      0,
    raw: batch,
  };
}

// ==========================================
// NORMALIZE STUDENT
// ==========================================

function normalizeStudent(student) {
  if (!student) return null;

  const rawStudent =
    student.student && typeof student.student === "object"
      ? student.student
      : student;

  const studentId =
    rawStudent._id ||
    rawStudent.id ||
    rawStudent.studentId ||
    "";

  return {
    id: String(studentId),

    name: getStudentName(rawStudent),

    userId:
      rawStudent.userId ||
      rawStudent.studentId ||
      "",

    email: rawStudent.email || "",

    batchId: getStudentBatchId(rawStudent),

    batchValue: getStudentBatchValue(rawStudent),

    raw: rawStudent,
  };
}


// ==========================================
// NORMALIZE RESULT
// ==========================================

function normalizeResult(item) {
  const student =
    item.student && typeof item.student === "object"
      ? item.student
      : null;

  const batch =
    item.batch && typeof item.batch === "object"
      ? item.batch
      : null;

  const batchName = getBatchName(batch || item.batch);

  return {
    id: item._id || item.id,

    studentId: getId(item.student),
    student,
    studentName: getStudentName(student || item.student),

    batchId: getId(item.batch),
    batch,
    batchName,
    batchCode: getBatchCode(batch),
    batchStatus: batch?.status || "",
    batchCourseName: getBatchCourse(batch),

    exam: item.exam || "",
    date: item.date ? String(item.date).split("T")[0] : "",

    obtained: item.obtained ?? 0,
    total: item.total ?? 100,

    remarks: item.remarks || "",
    published: Boolean(item.published),

    createdAt: item.createdAt || "",
  };
}

// ==========================================
// FORMAT DATE
// ==========================================

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

// ==========================================
// PERCENTAGE
// ==========================================

function getPercentage(obtained, total) {
  if (!total || Number(total) <= 0) return 0;

  return Math.round(
    (Number(obtained) / Number(total)) * 100
  );
}

// ==========================================
// GRADE
// ==========================================

function getGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 40) return "D";

  return "F";
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function TrainerResultsPage() {
  const [results, setResults] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  const [form, setForm] = useState(initialForm);

  // ==========================================
  // FETCH RESULTS
  // ==========================================

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(RESULTS_API);
      const records = getArrayResponse(response);

      setResults(records.map(normalizeResult).filter(Boolean));
    } catch (err) {
      setError(err.message || "Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // FETCH TRAINER BATCHES
  // GET /api/trainer/batches
  // ==========================================

  const fetchBatches = useCallback(async () => {
    try {
      setLoadingBatches(true);

      const response = await apiRequest(BATCHES_API);
      const records = getArrayResponse(response);

      const normalized = records
        .map(normalizeBatch)
        .filter((batch) => batch?.id);

      setBatches(normalized);
    } catch (err) {
      console.error("Fetch batches error:", err);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  // ==========================================
  // INITIAL FETCH
  // ==========================================

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchResults(),
      fetchBatches(),
    ]);
  }, [fetchResults, fetchBatches]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ==========================================
  // FALLBACK BATCHES FROM RESULTS
  // ==========================================

  const availableBatches = useMemo(() => {
    const batchMap = new Map();

    batches.forEach((batch) => {
      if (batch.id) {
        batchMap.set(batch.id, batch);
      }
    });

    results.forEach((result) => {
      if (!result.batchId) return;

      if (!batchMap.has(result.batchId)) {
        batchMap.set(result.batchId, {
          id: result.batchId,
          name: result.batchName,
          code: result.batchCode,
          status: result.batchStatus,
          courseName: result.batchCourseName,
          studentCount: 0,
        });
      }
    });

    return Array.from(batchMap.values());
  }, [batches, results]);

  // ==========================================
  // SELECTED BATCH OBJECT
  // ==========================================

  const selectedBatch = useMemo(() => {
    return (
      availableBatches.find(
        (batch) => batch.id === form.batchId
      ) || null
    );
  }, [availableBatches, form.batchId]);

  // ==========================================
  // FALLBACK STUDENTS FROM RESULTS
  // ==========================================

  const resultStudents = useMemo(() => {
    const studentMap = new Map();

    results.forEach((result) => {
      if (!result.studentId) return;

      if (
        form.batchId &&
        result.batchId !== form.batchId
      ) {
        return;
      }

      if (!studentMap.has(result.studentId)) {
        studentMap.set(result.studentId, {
          id: result.studentId,
          name: result.studentName,
          userId: result.student?.userId || "",
          email: result.student?.email || "",
          batchId: result.batchId,
          raw: result.student,
        });
      }
    });

    return Array.from(studentMap.values());
  }, [results, form.batchId]);

  // ==========================================
  // FETCH STUDENTS FOR SELECTED BATCH
  //
  // Tries:
  // ?batchId=MongoDB_ID
  // ?batch=MongoDB_ID
  // ?batchName=MERN-01
  // ==========================================


  // ==========================================
  // FETCH ALL STUDENTS FOR SELECTED BATCH
  // GET /api/trainer/batches/:batchId/students
  // ==========================================

  const fetchStudents = useCallback(
    async (batchId, batchObject = null) => {
      if (!batchId) {
        setStudents([]);
        return;
      }

      try {
        setLoadingStudents(true);
        setError("");

        // Clear old batch students before loading new ones
        setStudents([]);

        // Direct backend endpoint
        const url = `${STUDENTS_API}/${encodeURIComponent(batchId)}/students`;

        console.log("Fetching batch students from:", url);

        const response = await apiRequest(url);

        console.log("Batch students API response:", response);

        // Extract students from the API response
        const records = getArrayResponse(response);

        // Normalize all returned student records
        const normalizedStudents = records
          .map(normalizeStudent)
          .filter((student) => student && student.id);

        // The backend endpoint is already batch-specific.
        // Therefore, do not apply additional batch filtering.
        setStudents(normalizedStudents);

        console.log(
          `Successfully fetched ${normalizedStudents.length} students`
        );
      } catch (err) {
        console.error("Fetch batch students error:", err);

        setStudents([]);

        setError(
          err.message || "Failed to fetch students for the selected batch."
        );
      } finally {
        setLoadingStudents(false);
      }
    },
    []
  );


  // ==========================================
  // STUDENTS FOR SELECTED BATCH
  // ==========================================


  // ==========================================
  // STUDENTS FOR SELECTED BATCH
  // ==========================================

  const batchStudents = useMemo(() => {
    const studentMap = new Map();

    // Students fetched directly from selected batch API
    students.forEach((student) => {
      if (student.id) {
        studentMap.set(student.id, student);
      }
    });

    // Keep current student available while editing
    if (editingId && form.studentId && selectedResult) {
      const selectedStudentId = form.studentId;

      if (!studentMap.has(selectedStudentId)) {
        studentMap.set(selectedStudentId, {
          id: selectedStudentId,
          name: selectedResult.studentName,
          userId: selectedResult.student?.userId || "",
          email: selectedResult.student?.email || "",
          batchId: selectedResult.batchId,
          raw: selectedResult.student,
        });
      }
    }

    return Array.from(studentMap.values());
  }, [
    students,
    editingId,
    form.studentId,
    selectedResult,
  ]);


  // ==========================================
  // FILTER RESULTS
  // ==========================================

  const filteredResults = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return results.filter((result) => {
      const matchesSearch =
        result.studentName.toLowerCase().includes(searchText) ||
        result.batchName.toLowerCase().includes(searchText) ||
        result.batchCode.toLowerCase().includes(searchText) ||
        result.exam.toLowerCase().includes(searchText);

      const matchesBatch =
        batchFilter === "all" ||
        result.batchId === batchFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && result.published) ||
        (statusFilter === "draft" && !result.published);

      return matchesSearch && matchesBatch && matchesStatus;
    });
  }, [results, search, batchFilter, statusFilter]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = useMemo(() => {
    const published = results.filter(
      (result) => result.published
    );

    const average =
      results.length > 0
        ? results.reduce(
          (sum, result) =>
            sum + getPercentage(result.obtained, result.total),
          0
        ) / results.length
        : 0;

    const uniqueStudents = new Set(
      results.map((result) => result.studentId).filter(Boolean)
    );

    return {
      total: results.length,
      published: published.length,
      drafts: results.length - published.length,
      average: Math.round(average),
      students: uniqueStudents.size,
      batches: availableBatches.length,
    };
  }, [results, availableBatches]);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================
  // SELECT BATCH
  // ==========================================


  // ==========================================
  // SELECT BATCH
  // ==========================================

  const handleBatchChange = (e) => {
    const batchId = e.target.value;

    const batchObject =
      availableBatches.find((batch) => batch.id === batchId) ||
      null;

    setForm((previous) => ({
      ...previous,
      batchId,
      studentId: "",
    }));

    // Clear previously fetched students
    setStudents([]);

    // Fetch all students for newly selected batch
    if (batchId) {
      fetchStudents(batchId, batchObject);
    }
  };


  // ==========================================
  // OPEN CREATE FORM
  // ==========================================

  const openCreateForm = () => {
    setEditingId(null);
    setSelectedResult(null);

    setForm({
      ...initialForm,
      date: getToday(),
    });

    setStudents([]);
    setError("");
    setSuccess("");
    setShowDetails(false);
    setShowForm(true);
  };

  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  const openEditForm = (result) => {
    setEditingId(result.id);
    setSelectedResult(result);

    setForm({
      studentId: result.studentId,
      batchId: result.batchId,
      exam: result.exam,
      date: result.date || getToday(),
      obtained: String(result.obtained),
      total: String(result.total),
      remarks: result.remarks,
      published: result.published,
    });

    setStudents([]);

    const batchObject =
      availableBatches.find(
        (batch) => batch.id === result.batchId
      ) || null;

    if (result.batchId) {
      fetchStudents(result.batchId, batchObject);
    }

    setError("");
    setSuccess("");
    setShowDetails(false);
    setShowForm(true);
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setSelectedResult(null);

    setForm({
      ...initialForm,
      date: getToday(),
    });

    setStudents([]);
  };

  // ==========================================
  // CREATE / UPDATE RESULT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.batchId) {
        throw new Error("Please select a batch.");
      }

      if (!form.studentId) {
        throw new Error("Please select a student.");
      }

      if (!form.exam.trim()) {
        throw new Error("Please enter exam name.");
      }

      if (!form.date) {
        throw new Error("Please select exam date.");
      }

      if (
        form.obtained === "" ||
        form.total === ""
      ) {
        throw new Error("Please enter marks.");
      }

      const obtained = Number(form.obtained);
      const total = Number(form.total);

      if (
        !Number.isFinite(obtained) ||
        !Number.isFinite(total) ||
        total <= 0 ||
        obtained < 0 ||
        obtained > total
      ) {
        throw new Error(
          "Obtained marks must be between 0 and total marks."
        );
      }

      const payload = {
        studentId: form.studentId,
        batchId: form.batchId,
        exam: form.exam.trim(),
        date: form.date,
        obtained,
        total,
        remarks: form.remarks.trim(),
        published: form.published,
      };

      if (editingId) {
        await apiRequest(`${RESULTS_API}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setSuccess("Result updated successfully.");
      } else {
        await apiRequest(RESULTS_API, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Result created successfully.");
      }

      closeForm();

      await fetchResults();
    } catch (err) {
      setError(err.message || "Unable to save result.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE RESULT
  // ==========================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this result?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`${RESULTS_API}/${id}`, {
        method: "DELETE",
      });

      setSuccess("Result deleted successfully.");

      setResults((previous) =>
        previous.filter((result) => result.id !== id)
      );

      if (selectedResult?.id === id) {
        setShowDetails(false);
        setSelectedResult(null);
      }
    } catch (err) {
      setError(err.message || "Unable to delete result.");
    }
  };

  // ==========================================
  // VIEW RESULT
  // ==========================================

  const openDetails = (result) => {
    setSelectedResult(result);
    setShowDetails(true);
  };

  // ==========================================
  // CSV EXPORT
  // ==========================================

  const exportCSV = () => {
    if (filteredResults.length === 0) {
      alert("No results available to export.");
      return;
    }

    const headers = [
      "Student",
      "Student ID",
      "Batch Name",
      "Batch Code",
      "Exam",
      "Date",
      "Obtained Marks",
      "Total Marks",
      "Percentage",
      "Grade",
      "Status",
      "Remarks",
    ];

    const rows = filteredResults.map((result) => {
      const percentage = getPercentage(
        result.obtained,
        result.total
      );

      return [
        result.studentName,
        result.student?.userId || "",
        result.batchName,
        result.batchCode,
        result.exam,
        result.date,
        result.obtained,
        result.total,
        percentage,
        getGrade(percentage),
        result.published ? "Published" : "Draft",
        result.remarks,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "trainer-batch-results.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  // ==========================================
  // JSX
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-[#102e60]">
              <Award size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Results Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage batch-wise student exam results and performance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchAll}
              disabled={loading || loadingBatches}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download size={16} />
              Export CSV
            </button>

            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#183d79]"
            >
              <Plus size={17} />
              Add Result
            </button>
          </div>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>

            <button onClick={() => setError("")} className="ml-auto">
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} />
            <p>{success}</p>

            <button onClick={() => setSuccess("")} className="ml-auto">
              <X size={17} />
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={<ClipboardList size={21} />}
            label="Total Results"
            value={stats.total}
            color="blue"
          />

          <StatCard
            icon={<CheckCircle2 size={21} />}
            label="Published"
            value={stats.published}
            color="green"
          />

          <StatCard
            icon={<FileText size={21} />}
            label="Draft Results"
            value={stats.drafts}
            color="orange"
          />

          <StatCard
            icon={<Award size={21} />}
            label="Average Score"
            value={`${stats.average}%`}
            color="purple"
          />

          <StatCard
            icon={<Users size={21} />}
            label="Students"
            value={stats.students}
            color="cyan"
          />

          <StatCard
            icon={<BookOpen size={21} />}
            label="Batches"
            value={stats.batches}
            color="pink"
          />
        </div>

        {/* SEARCH AND FILTERS */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, batch or exam..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative">
              <BookOpen
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#102e60]"
              >
                <option value="all">All Batches</option>

                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.code || batch.name}
                    {batch.courseName ? ` - ${batch.courseName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#102e60]"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>

        {/* RESULTS TABLE */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">
                Batch-wise Student Results
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing {filteredResults.length} of {results.length} results
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <Loader2
                size={30}
                className="animate-spin text-[#102e60]"
              />

              <p className="text-sm text-slate-500">
                Loading results...
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4 text-slate-400">
                <ClipboardList size={30} />
              </div>

              <h3 className="font-semibold text-slate-800">
                No results found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Results will appear here when they are available.
              </p>

              <button
                onClick={openCreateForm}
                className="mt-4 rounded-lg bg-[#102e60] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183d79]"
              >
                Add First Result
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Batch</th>
                    <th className="px-5 py-4">Exam</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Marks</th>
                    <th className="px-5 py-4">Percentage</th>
                    <th className="px-5 py-4">Grade</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((result) => {
                    const percentage = getPercentage(
                      result.obtained,
                      result.total
                    );

                    return (
                      <tr
                        key={result.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#102e60]">
                              {result.studentName.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {result.studentName}
                              </p>

                              <p className="text-xs text-slate-400">
                                {result.student?.userId || ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-700">
                            {result.batchCode || result.batchName}
                          </p>

                          <p className="text-xs text-slate-400">
                            {result.batchName !== result.batchCode
                              ? result.batchName
                              : result.batchStatus}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {result.exam || "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(result.date)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-800">
                            {result.obtained}
                          </span>

                          <span className="text-slate-400">
                            {" "}/ {result.total}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#102e60]"
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              />
                            </div>

                            <span className="font-semibold text-slate-700">
                              {percentage}%
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-md bg-blue-50 px-2.5 py-1 font-bold text-[#102e60]">
                            {getGrade(percentage)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge published={result.published} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <ActionButton
                              title="View"
                              onClick={() => openDetails(result)}
                            >
                              <Eye size={16} />
                            </ActionButton>

                            <ActionButton
                              title="Edit"
                              onClick={() => openEditForm(result)}
                            >
                              <Pencil size={16} />
                            </ActionButton>

                            <ActionButton
                              title="Delete"
                              danger
                              onClick={() => handleDelete(result.id)}
                            >
                              <Trash2 size={16} />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          CREATE / EDIT MODAL
      ========================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit Result" : "Add New Result"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter batch-wise student examination details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

                {/* SELECT BATCH */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Select Batch <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="batchId"
                    value={form.batchId}
                    onChange={handleBatchChange}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      {loadingBatches ? "Loading batches..." : "Select Batch"}
                    </option>

                    {availableBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code || batch.name}
                        {batch.code && batch.name !== batch.code
                          ? ` - ${batch.name}`
                          : ""}
                        {batch.courseName
                          ? ` (${batch.courseName})`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {availableBatches.length === 0 && !loadingBatches && (
                    <p className="mt-2 text-xs text-amber-600">
                      No batches found. Check the trainer batches API.
                    </p>
                  )}
                </div>

                {/* SELECT STUDENT */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Select Student <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="studentId"
                    value={form.studentId}
                    onChange={handleChange}
                    required
                    disabled={!form.batchId || loadingStudents}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {!form.batchId
                        ? "First select a batch"
                        : loadingStudents
                          ? "Loading students..."
                          : "Select Student"}
                    </option>

                    {batchStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                        {student.userId ? ` (${student.userId})` : ""}
                      </option>
                    ))}
                  </select>

                  {form.batchId &&
                    !loadingStudents &&
                    batchStudents.length === 0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        No students found in this batch. The API must return
                        student records, not only the student count.
                      </p>
                    )}

                  {selectedBatch && (
                    <p className="mt-2 text-xs text-slate-500">
                      Batch: {selectedBatch.code || selectedBatch.name}
                      {selectedBatch.courseName
                        ? ` | Course: ${selectedBatch.courseName}`
                        : ""}
                      {selectedBatch.studentCount
                        ? ` | Students: ${selectedBatch.studentCount}`
                        : ""}
                    </p>
                  )}
                </div>

                {/* EXAM NAME */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Exam Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="exam"
                    value={form.exam}
                    onChange={handleChange}
                    placeholder="e.g. Final Assessment"
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* DATE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Exam Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* OBTAINED MARKS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Obtained Marks <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="number"
                    name="obtained"
                    value={form.obtained}
                    onChange={handleChange}
                    min="0"
                    max={form.total || undefined}
                    placeholder="Enter obtained marks"
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* TOTAL MARKS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Total Marks <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="number"
                    name="total"
                    value={form.total}
                    onChange={handleChange}
                    min="1"
                    placeholder="Enter total marks"
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* REMARKS */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Remarks
                  </label>

                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter performance remarks..."
                    className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* PUBLISH */}

                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      name="published"
                      checked={form.published}
                      onChange={handleChange}
                      className="h-4 w-4 accent-[#102e60]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Publish Result
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Make this result available to the student.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || loadingStudents}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#183d79] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingId ? "Update Result" : "Create Result"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          RESULT DETAILS MODAL
      ========================================== */}

      {showDetails && selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Result Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Student examination performance
                </p>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-blue-50 p-5 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Overall Percentage
                </p>

                <h3 className="mt-2 text-4xl font-extrabold text-[#102e60]">
                  {getPercentage(
                    selectedResult.obtained,
                    selectedResult.total
                  )}
                  %
                </h3>

                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Grade:{" "}
                  {getGrade(
                    getPercentage(
                      selectedResult.obtained,
                      selectedResult.total
                    )
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail
                  label="Student"
                  value={selectedResult.studentName}
                />

                <Detail
                  label="Student ID"
                  value={selectedResult.student?.userId || "—"}
                />

                <Detail
                  label="Batch Name"
                  value={selectedResult.batchName}
                />

                <Detail
                  label="Batch Code"
                  value={selectedResult.batchCode || "—"}
                />

                <Detail
                  label="Batch Status"
                  value={selectedResult.batchStatus || "—"}
                />

                <Detail
                  label="Exam"
                  value={selectedResult.exam}
                />

                <Detail
                  label="Exam Date"
                  value={formatDate(selectedResult.date)}
                />

                <Detail
                  label="Obtained Marks"
                  value={selectedResult.obtained}
                />

                <Detail
                  label="Total Marks"
                  value={selectedResult.total}
                />

                <div className="sm:col-span-2">
                  <Detail
                    label="Remarks"
                    value={selectedResult.remarks || "No remarks added"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Publication Status
                  </p>

                  <StatusBadge published={selectedResult.published} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => openEditForm(selectedResult)}
                className="flex items-center gap-2 rounded-lg bg-[#102e60] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#183d79]"
              >
                <Pencil size={16} />
                Edit Result
              </button>

              <button
                onClick={() => setShowDetails(false)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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

// ==========================================
// STAT CARD
// ==========================================

function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
    cyan: "bg-cyan-50 text-cyan-700",
    pink: "bg-pink-50 text-pink-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </h3>
        </div>

        <div
          className={`rounded-xl p-3 ${colorClasses[color] || colorClasses.blue
            }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ published }) {
  return published ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
      <CheckCircle2 size={13} />
      Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
      <FileText size={13} />
      Draft
    </span>
  );
}

// ==========================================
// ACTION BUTTON
// ==========================================

function ActionButton({
  children,
  title,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger
        ? "text-red-500 hover:bg-red-50"
        : "text-slate-500 hover:bg-blue-50 hover:text-[#102e60]"
        }`}
    >
      {children}
    </button>
  );
}

// ==========================================
// DETAIL FIELD
// ==========================================

function Detail({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}