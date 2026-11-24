"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Users,
  Upload,
  FileText,
  Download,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Save,
  CalendarDays,
  BookOpen,
  Filter,
  ExternalLink,
  ClipboardList,
} from "lucide-react";

// ======================================================

// CONFIGURATION

// ======================================================

const API_URL = (

  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

).replace(/\/$/, "");

const STATUS_OPTIONS = ["Pending", "Complete", "Not Access"];

const ASSIGNMENT_STATUS_OPTIONS = ["Draft", "Published", "Closed"];

const SUBMISSION_TYPES = ["text", "url"];

// ======================================================

// HELPERS

// ======================================================

const getToken = () => {

  if (typeof window === "undefined") return "";

  return (

    sessionStorage.getItem("appwars_token") ||

    sessionStorage.getItem("token") ||

    localStorage.getItem("appwars_token") ||

    localStorage.getItem("token") ||

    ""

  );

};

const getHeaders = (isFormData = false) => {

  const token = getToken();

  return {

    ...(token ? { Authorization: `Bearer ${token}` } : {}),

    ...(isFormData ? {} : { "Content-Type": "application/json" }),

  };

};

async function apiRequest(endpoint, options = {}) {

  const isFormData =

    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {

    ...options,

    headers: {

      ...getHeaders(isFormData),

      ...options.headers,

    },

  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {

    throw new Error(

      data.message || `Request failed with status ${response.status}`

    );

  }

  return data;

}

function getList(data, resourceName) {

  if (Array.isArray(data)) return data;

  const candidates = [

    data?.[resourceName],

    data?.items,

    data?.data,

    data?.data?.[resourceName],

    data?.data?.items,

  ];

  return candidates.find(Array.isArray) || [];

}

function getId(value) {

  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";

}

function getName(value) {

  if (!value) return "Unknown";

  if (typeof value === "string") return value;

  return (

    value.name ||

    value.fullName ||

    value.studentName ||

    value.userId ||

    "Unknown"

  );

}

function getBatchName(value) {

  if (!value) return "No batch assigned";

  if (typeof value === "string") return value;

  return value.batch || value.batchName || value.name || "No batch assigned";

}

function getDate(value) {

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {

    day: "2-digit",

    month: "short",

    year: "numeric",

  });

}

function getInitialStatus(student) {

  const status =

    student?.assignmentStatus ||

    student?.progress?.status ||

    student?.assignmentProgress?.status ||

    student?.status;

  return STATUS_OPTIONS.includes(status) ? status : "Pending";

}

function getAttachmentUrl(assignment) {

  return (

    assignment?.attachmentUrl ||

    assignment?.attachment?.url ||

    assignment?.fileUrl ||

    assignment?.document ||

    ""

  );

}

function getAssignmentBatchId(assignment) {

  return getId(assignment?.batch) || assignment?.batchId || "";

}

function normalizeAssignment(item) {

  return {

    ...item,

    id: getId(item),

    title: item.title || "",

    description: item.description || "",

    instructions: item.instructions || "",

    batchId: getAssignmentBatchId(item),

    batchName: getBatchName(item.batch),

    dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : "",

    totalMarks: item.totalMarks ?? 100,

    allowedSubmissionTypes: Array.isArray(item.allowedSubmissionTypes)

      ? item.allowedSubmissionTypes

      : ["text", "url"],

    status: item.status || "Draft",

    isPublished: Boolean(item.isPublished),

    attachmentUrl: getAttachmentUrl(item),

  };

}

// ======================================================

// STATUS BADGE

// ======================================================

function StatusBadge({ status }) {

  const styles = {

    Complete: "bg-green-100 text-green-700 border-green-200",

    Pending: "bg-amber-100 text-amber-700 border-amber-200",

    "Not Access": "bg-red-100 text-red-700 border-red-200",

  };

  const icons = {

    Complete: CheckCircle,

    Pending: Clock,

    "Not Access": AlertCircle,

  };

  const Icon = icons[status] || Clock;

  return (

    <span

      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || styles.Pending

        }`}

    >

      <Icon size={13} />

      {status || "Pending"}

    </span>

  );

}

function AssignmentStatusBadge({ status }) {

  const styles = {

    Draft: "bg-slate-100 text-slate-700",

    Published: "bg-green-100 text-green-700",

    Closed: "bg-red-100 text-red-700",

  };

  return (

    <span

      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${styles[status] || styles.Draft

        }`}

    >

      {status || "Draft"}

    </span>

  );

}

// ======================================================

// MAIN PAGE

// ======================================================

export default function AssignmentsPage() {

  const [assignments, setAssignments] = useState([]);

  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [filterBatch, setFilterBatch] = useState("All");

  const [showForm, setShowForm] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState(null);

  const [viewAssignment, setViewAssignment] = useState(null);

  const [showStudents, setShowStudents] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [students, setStudents] = useState([]);

  const [studentsLoading, setStudentsLoading] = useState(false);

  const [studentStatuses, setStudentStatuses] = useState({});

  const [savingStudent, setSavingStudent] = useState("");

  // Student submission viewer
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionAssignment, setSubmissionAssignment] = useState(null);

  const initialForm = {

    title: "",

    description: "",

    instructions: "",

    batchId: "",

    dueDate: "",

    totalMarks: "100",

    allowedSubmissionTypes: ["text", "url"],

    status: "Published",

    isPublished: true,

    attachment: null,

  };

  const [form, setForm] = useState(initialForm);

  // ======================================================

  // FETCH ASSIGNMENTS

  // ======================================================

  const fetchAssignments = useCallback(async () => {

    try {

      const result = await apiRequest("/trainer/assignments");

      setAssignments(

        getList(result, "assignments").map(normalizeAssignment)

      );

    } catch (err) {

      console.error("Fetch assignments:", err);

      setError(err.message || "Unable to fetch assignments");

    }

  }, []);

  // ======================================================

  // FETCH BATCHES

  // ======================================================

  const fetchBatches = useCallback(async () => {

    try {

      const result = await apiRequest("/trainer/batches");

      setBatches(getList(result, "batches"));

    } catch (err) {

      console.error("Fetch batches:", err);

      setError(err.message || "Unable to fetch batches");

    }

  }, []);

  // ======================================================

  // INITIAL LOAD

  // ======================================================

  const loadPage = useCallback(async () => {

    setLoading(true);

    setError("");

    await Promise.all([fetchAssignments(), fetchBatches()]);

    setLoading(false);

  }, [fetchAssignments, fetchBatches]);

  useEffect(() => {

    loadPage();

  }, [loadPage]);

  // ======================================================

  // FORM HANDLERS

  // ======================================================

  const resetForm = () => {

    setForm({

      ...initialForm,

      allowedSubmissionTypes: ["text", "url"],

    });

    setEditingAssignment(null);

  };

  const openCreateForm = () => {

    resetForm();

    setError("");

    setShowForm(true);

  };

  const openEditForm = (assignment) => {

    setEditingAssignment(assignment);

    setForm({

      title: assignment.title || "",

      description: assignment.description || "",

      instructions: assignment.instructions || "",

      batchId: assignment.batchId || "",

      dueDate: assignment.dueDate || "",

      totalMarks: String(assignment.totalMarks ?? 100),

      allowedSubmissionTypes:

        assignment.allowedSubmissionTypes?.length > 0

          ? assignment.allowedSubmissionTypes

          : ["text", "url"],

      status: assignment.status || "Draft",

      isPublished: Boolean(assignment.isPublished),

      attachment: null,

    });

    setError("");

    setShowForm(true);

  };

  const handleFormChange = (event) => {

    const { name, value, files } = event.target;

    if (name === "attachment") {

      setForm((prev) => ({

        ...prev,

        attachment: files?.[0] || null,

      }));

      return;

    }

    setForm((prev) => ({

      ...prev,

      [name]: value,

      ...(name === "status"

        ? { isPublished: value === "Published" }

        : {}),

    }));

  };

  const handleSubmissionTypeChange = (type) => {

    setForm((prev) => {

      const exists = prev.allowedSubmissionTypes.includes(type);

      return {

        ...prev,

        allowedSubmissionTypes: exists

          ? prev.allowedSubmissionTypes.filter((item) => item !== type)

          : [...prev.allowedSubmissionTypes, type],

      };

    });

  };

  // ======================================================

  // CREATE / UPDATE ASSIGNMENT

  // No course field is sent from the frontend.

  // ======================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    if (!form.title.trim()) {

      setError("Please enter assignment title.");

      return;

    }

    if (!form.description.trim()) {

      setError("Please enter assignment description.");

      return;

    }

    if (!form.batchId) {

      setError("Please select a batch.");

      return;

    }

    if (!form.dueDate) {

      setError("Please select assignment due date.");

      return;

    }

    if (Number(form.totalMarks) < 1) {

      setError("Total marks must be at least 1.");

      return;

    }

    if (form.allowedSubmissionTypes.length === 0) {

      setError("Select at least one submission type.");

      return;

    }

    if (

      form.attachment &&

      form.attachment.type !== "application/pdf"

    ) {

      setError("Only PDF files are allowed.");

      return;

    }

    try {

      setSaving(true);

      setError("");

      setSuccess("");

      const formData = new FormData();

      formData.append("title", form.title.trim());

      formData.append("description", form.description.trim());

      formData.append("instructions", form.instructions.trim());

      formData.append("batchId", form.batchId);

      formData.append("dueDate", form.dueDate);

      formData.append("totalMarks", String(Number(form.totalMarks)));

      formData.append(

        "allowedSubmissionTypes",

        JSON.stringify(form.allowedSubmissionTypes)

      );

      formData.append("status", form.status);

      formData.append("isPublished", String(form.isPublished));

      if (form.attachment) {

        formData.append("attachment", form.attachment);

      }

      if (editingAssignment) {

        await apiRequest(

          `/trainer/assignments/${editingAssignment.id}`,

          {

            method: "PATCH",

            body: formData,

          }

        );

        setSuccess("Assignment updated successfully.");

      } else {

        await apiRequest("/trainer/assignments", {

          method: "POST",

          body: formData,

        });

        setSuccess("Assignment created successfully.");

      }

      setShowForm(false);

      resetForm();

      await fetchAssignments();

    } catch (err) {

      console.error("Save assignment:", err);

      setError(err.message || "Unable to save assignment.");

    } finally {

      setSaving(false);

    }

  };

  // ======================================================

  // DELETE ASSIGNMENT

  // ======================================================

  const handleDelete = async (assignment) => {

    const confirmed = window.confirm(

      `Are you sure you want to delete "${assignment.title}"?`

    );

    if (!confirmed) return;

    try {

      setError("");

      setSuccess("");

      await apiRequest(`/trainer/assignments/${assignment.id}`, {

        method: "DELETE",

      });

      setSuccess("Assignment deleted successfully.");

      setAssignments((prev) =>

        prev.filter((item) => item.id !== assignment.id)

      );

    } catch (err) {

      console.error("Delete assignment:", err);

      setError(err.message || "Unable to delete assignment.");

    }

  };

  // ======================================================

  // FETCH STUDENTS OF SELECTED ASSIGNMENT BATCH

  // ======================================================

  const openStudentStatus = async (assignment) => {

    const batchId = assignment.batchId;

    if (!batchId) {

      setError("Batch ID is missing for this assignment.");

      return;

    }

    setSelectedAssignment(assignment);

    setShowStudents(true);

    setStudents([]);

    setStudentStatuses({});

    setStudentsLoading(true);

    setError("");

    try {

      const result = await apiRequest(

        `/trainer/batches/${batchId}/students`

      );

      const studentList = getList(result, "students");

      setStudents(studentList);

      const initialStatuses = {};

      studentList.forEach((student) => {

        const studentId = getId(student);

        if (studentId) {

          initialStatuses[studentId] = getInitialStatus(student);

        }

      });

      setStudentStatuses(initialStatuses);

    } catch (err) {

      console.error("Fetch batch students:", err);

      setError(err.message || "Unable to fetch batch students.");

    } finally {

      setStudentsLoading(false);

    }

  };

  // ======================================================
  // FETCH STUDENT SUBMISSIONS FOR SELECTED ASSIGNMENT
  // ======================================================

  const openStudentSubmissions = async (assignment) => {
    if (!assignment?.id) {
      setError("Assignment ID is missing.");
      return;
    }

    setSubmissionAssignment(assignment);
    setShowSubmissions(true);
    setSubmissions([]);
    setSubmissionsLoading(true);
    setError("");

    try {
      const result = await apiRequest(
        `/trainer/submissions?assignmentId=${encodeURIComponent(assignment.id)}`
      );
      setSubmissions(getList(result, "submissions"));
    } catch (err) {
      console.error("Fetch student submissions:", err);
      setError(err.message || "Unable to fetch student submissions.");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // ======================================================

  // CHANGE STUDENT STATUS

  // ======================================================

  const handleStatusChange = (studentId, status) => {

    setStudentStatuses((prev) => ({

      ...prev,

      [studentId]: status,

    }));

  };

  // ======================================================

  // UPDATE INDIVIDUAL STUDENT ASSIGNMENT STATUS

  // ======================================================

  const handleSaveStudentStatus = async (student) => {

    if (!selectedAssignment) return;

    const assignmentId = selectedAssignment.id;

    const studentId = getId(student);

    const status = studentStatuses[studentId];

    if (!studentId) {

      setError("Student ID is missing.");

      return;

    }

    if (!STATUS_OPTIONS.includes(status)) {

      setError("Please select a valid student status.");

      return;

    }

    try {

      setSavingStudent(studentId);

      setError("");

      setSuccess("");

      const result = await apiRequest(

        `/trainer/assignments/${assignmentId}/students/${studentId}/status`,

        {

          method: "PUT",

          body: JSON.stringify({ status }),

        }

      );

      setStudentStatuses((prev) => ({

        ...prev,

        [studentId]: result?.progress?.status || status,

      }));

      setSuccess(

        `${getName(student)}'s assignment status updated successfully.`

      );

    } catch (err) {

      console.error("Update student assignment status:", err);

      setError(err.message || "Unable to update student status.");

    } finally {

      setSavingStudent("");

    }

  };

  // ======================================================

  // FILTER ASSIGNMENTS

  // ======================================================

  const filteredAssignments = useMemo(() => {

    return assignments.filter((assignment) => {

      const searchText = search.toLowerCase();

      const matchesSearch =

        assignment.title.toLowerCase().includes(searchText) ||

        assignment.description.toLowerCase().includes(searchText) ||

        assignment.batchName.toLowerCase().includes(searchText);

      const matchesBatch =

        filterBatch === "All" ||

        assignment.batchId === filterBatch;

      return matchesSearch && matchesBatch;

    });

  }, [assignments, search, filterBatch]);

  // ======================================================

  // CSV EXPORT

  // ======================================================

  const exportCSV = () => {

    const rows = [

      [

        "Assignment",

        "Batch",

        "Due Date",

        "Total Marks",

        "Status",

        "Description",

      ],

      ...filteredAssignments.map((item) => [

        item.title,

        item.batchName,

        item.dueDate,

        item.totalMarks,

        item.status,

        item.description,

      ]),

    ];

    const csv = rows

      .map((row) =>

        row

          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)

          .join(",")

      )

      .join("\n");

    const blob = new Blob([csv], {

      type: "text/csv;charset=utf-8;",

    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "trainer-assignments.csv";

    link.click();

    URL.revokeObjectURL(url);

  };

  // ======================================================

  // DASHBOARD COUNTS

  // ======================================================

  const totalAssignments = assignments.length;

  const totalBatches = new Set(

    assignments.map((item) => item.batchId).filter(Boolean)

  ).size;

  const upcomingAssignments = assignments.filter((item) => {

    if (!item.dueDate) return false;

    const dueDate = new Date(`${item.dueDate}T23:59:59`);

    return dueDate >= new Date();

  }).length;

  // ======================================================

  // RENDER

  // ======================================================

  return (

    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <h1 className="text-2xl font-bold text-slate-900">

              Assignments

            </h1>

            <p className="mt-1 text-sm text-slate-500">

              Create assignments and manage student completion status.

            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <button

              onClick={exportCSV}

              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"

            >

              <Download size={16} />

              Export CSV

            </button>

            <button

              onClick={loadPage}

              disabled={loading}

              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"

            >

              <RefreshCw

                size={16}

                className={loading ? "animate-spin" : ""}

              />

              Refresh

            </button>

            <button

              onClick={openCreateForm}

              className="inline-flex items-center gap-2 rounded-lg bg-[#102e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173b70]"

            >

              <Plus size={17} />

              Create Assignment

            </button>

          </div>

        </div>

        {/* ALERTS */}

        {error && (

          <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <span>{error}</span>

            <button onClick={() => setError("")}>

              <X size={17} />

            </button>

          </div>

        )}

        {success && (

          <div className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

            <span>{success}</span>

            <button onClick={() => setSuccess("")}>

              <X size={17} />

            </button>

          </div>

        )}

        {/* STATS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-slate-500">

              Total Assignments

            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">

              {totalAssignments}

            </h2>

            <FileText className="mt-3 text-blue-700" size={23} />

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-slate-500">

              Assigned Batches

            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">

              {totalBatches}

            </h2>

            <Users className="mt-3 text-purple-700" size={23} />

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-slate-500">

              Upcoming Deadlines

            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">

              {upcomingAssignments}

            </h2>

            <CalendarDays className="mt-3 text-amber-700" size={23} />

          </div>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">

          <div className="relative flex-1">

            <Search

              size={18}

              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

            />

            <input

              type="text"

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder="Search assignment, description or batch..."

              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100"

            />

          </div>

          <div className="relative md:w-64">

            <Filter

              size={17}

              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

            />

            <select

              value={filterBatch}

              onChange={(e) => setFilterBatch(e.target.value)}

              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#102e60]"

            >

              <option value="All">All Batches</option>

              {batches.map((batch) => (

                <option key={getId(batch)} value={getId(batch)}>

                  {getBatchName(batch)}

                </option>

              ))}

            </select>

          </div>

        </div>

        {/* ASSIGNMENT LIST */}

        {loading ? (

          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">

            <RefreshCw

              size={28}

              className="mx-auto animate-spin text-[#102e60]"

            />

            <p className="mt-3 text-sm text-slate-500">

              Loading assignments...

            </p>

          </div>

        ) : filteredAssignments.length === 0 ? (

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center">

            <FileText size={40} className="mx-auto text-slate-300" />

            <h3 className="mt-3 font-semibold text-slate-800">

              No assignments found

            </h3>

            <p className="mt-1 text-sm text-slate-500">

              Create an assignment or change your search filters.

            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {filteredAssignments.map((assignment) => (

              <div

                key={assignment.id}

                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"

              >

                <div className="border-b border-slate-100 p-5">

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <h3 className="break-words text-lg font-bold text-slate-900">

                        {assignment.title}

                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                        <span className="inline-flex items-center gap-1">

                          <BookOpen size={14} />

                          {assignment.batchName}

                        </span>

                        {assignment.dueDate && (

                          <span className="inline-flex items-center gap-1">

                            <CalendarDays size={14} />

                            Due: {getDate(assignment.dueDate)}

                          </span>

                        )}

                      </div>

                    </div>

                    <AssignmentStatusBadge status={assignment.status} />

                  </div>

                  <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">

                    {assignment.description || "No description provided."}

                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">

                    <span>Total Marks: {assignment.totalMarks}</span>

                    <span>

                      Submission:{" "}

                      {assignment.allowedSubmissionTypes.join(", ") || "—"}

                    </span>

                  </div>

                  {assignment.attachmentUrl && (

                    <a

                      href={assignment.attachmentUrl}

                      target="_blank"

                      rel="noreferrer"

                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"

                    >

                      <FileText size={15} />

                      View Attachment

                      <ExternalLink size={13} />

                    </a>

                  )}

                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-4">

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openStudentStatus(assignment)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#102e60] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#173b70]"
                    >
                      <Users size={16} />
                      Students / Status
                    </button>
                    <button
                      onClick={() => openStudentSubmissions(assignment)}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      <ClipboardList size={16} />
                      Student Submissions
                    </button>
                  </div>

                  <div className="flex items-center gap-1">

                    <button

                      onClick={() => setViewAssignment(assignment)}

                      title="View assignment"

                      className="rounded-lg p-2.5 text-slate-600 hover:bg-slate-100"

                    >

                      <Eye size={17} />

                    </button>

                    <button

                      onClick={() => openEditForm(assignment)}

                      title="Edit assignment"

                      className="rounded-lg p-2.5 text-blue-700 hover:bg-blue-50"

                    >

                      <Edit size={17} />

                    </button>

                    <button

                      onClick={() => handleDelete(assignment)}

                      title="Delete assignment"

                      className="rounded-lg p-2.5 text-red-600 hover:bg-red-50"

                    >

                      <Trash2 size={17} />

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* CREATE / EDIT ASSIGNMENT MODAL */}

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">

          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-900">

                  {editingAssignment ? "Edit Assignment" : "Create Assignment"}

                </h2>

                <p className="mt-1 text-xs text-slate-500">

                  Enter the assignment details below.

                </p>

              </div>

              <button

                onClick={() => {

                  setShowForm(false);

                  resetForm();

                }}

                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"

              >

                <X size={20} />

              </button>

            </div>

            <form

              onSubmit={handleSubmit}

              className="max-h-[75vh] space-y-4 overflow-y-auto p-6"

            >

              {/* TITLE */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                  Assignment Title *

                </label>

                <input

                  name="title"

                  value={form.title}

                  onChange={handleFormChange}

                  required

                  placeholder="Enter assignment title"

                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#102e60]"

                />

              </div>

              {/* BATCH */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                  Select Batch *

                </label>

                <select

                  name="batchId"

                  value={form.batchId}

                  onChange={handleFormChange}

                  required

                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#102e60]"

                >

                  <option value="">Select batch</option>

                  {batches.map((batch) => (

                    <option key={getId(batch)} value={getId(batch)}>

                      {getBatchName(batch)}

                    </option>

                  ))}

                </select>

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                  Description *

                </label>

                <textarea

                  name="description"

                  value={form.description}

                  onChange={handleFormChange}

                  rows={3}

                  required

                  placeholder="Enter assignment description..."

                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60]"

                />

              </div>

              {/* INSTRUCTIONS */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                  Instructions

                </label>

                <textarea

                  name="instructions"

                  value={form.instructions}

                  onChange={handleFormChange}

                  rows={3}

                  placeholder="Enter instructions for students..."

                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#102e60]"

                />

              </div>

              {/* DUE DATE AND MARKS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                    Due Date *

                  </label>

                  <input

                    type="date"

                    name="dueDate"

                    value={form.dueDate}

                    onChange={handleFormChange}

                    required

                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#102e60]"

                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                    Total Marks *

                  </label>

                  <input

                    type="number"

                    name="totalMarks"

                    value={form.totalMarks}

                    onChange={handleFormChange}

                    min="1"

                    required

                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#102e60]"

                  />

                </div>

              </div>

              {/* SUBMISSION TYPES */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">

                  Allowed Submission Types *

                </label>

                <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 p-3">

                  {SUBMISSION_TYPES.map((type) => (

                    <label

                      key={type}

                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"

                    >

                      <input

                        type="checkbox"

                        checked={form.allowedSubmissionTypes.includes(type)}

                        onChange={() => handleSubmissionTypeChange(type)}

                        className="h-4 w-4 accent-[#102e60]"

                      />

                      {type === "text" ? "Text Submission" : "URL Submission"}

                    </label>

                  ))}

                </div>

              </div>

              {/* ASSIGNMENT STATUS */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                  Assignment Status

                </label>

                <select

                  name="status"

                  value={form.status}

                  onChange={handleFormChange}

                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#102e60]"

                >

                  {ASSIGNMENT_STATUS_OPTIONS.map((status) => (

                    <option key={status} value={status}>

                      {status}

                    </option>

                  ))}

                </select>

                <p className="mt-1 text-xs text-slate-500">

                  Published assignments can be made available to students.

                </p>

              </div>

              {/* PDF ATTACHMENT */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">

                  Upload PDF Attachment

                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 hover:bg-slate-100">

                  <Upload size={20} className="text-slate-500" />

                  <div className="min-w-0">

                    <p className="text-sm font-semibold text-slate-700">

                      {form.attachment

                        ? form.attachment.name

                        : "Choose a PDF file"}

                    </p>

                    <p className="text-xs text-slate-500">

                      Only PDF documents are accepted.

                    </p>

                  </div>

                  <input

                    type="file"

                    name="attachment"

                    accept=".pdf,application/pdf"

                    onChange={handleFormChange}

                    className="hidden"

                  />

                </label>

                {editingAssignment?.attachmentUrl && !form.attachment && (

                  <a

                    href={editingAssignment.attachmentUrl}

                    target="_blank"

                    rel="noreferrer"

                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"

                  >

                    <FileText size={14} />

                    Existing attachment

                  </a>

                )}

              </div>

              {/* FORM BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">

                <button

                  type="button"

                  onClick={() => {

                    setShowForm(false);

                    resetForm();

                  }}

                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="inline-flex items-center gap-2 rounded-lg bg-[#102e60] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173b70] disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {saving ? (

                    <RefreshCw size={16} className="animate-spin" />

                  ) : (

                    <Save size={16} />

                  )}

                  {saving

                    ? "Saving..."

                    : editingAssignment

                      ? "Update Assignment"

                      : "Create Assignment"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ASSIGNMENT DETAILS MODAL */}

      {viewAssignment && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">

          <div className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <h2 className="text-lg font-bold text-slate-900">

                Assignment Details

              </h2>

              <button

                onClick={() => setViewAssignment(null)}

                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"

              >

                <X size={20} />

              </button>

            </div>

            <div className="space-y-4 p-6">

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Title

                </p>

                <p className="mt-1 text-base font-bold text-slate-900">

                  {viewAssignment.title}

                </p>

              </div>

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Batch

                </p>

                <p className="mt-1 text-sm text-slate-800">

                  {viewAssignment.batchName}

                </p>

              </div>

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Due Date

                </p>

                <p className="mt-1 text-sm text-slate-800">

                  {getDate(viewAssignment.dueDate) || "Not specified"}

                </p>

              </div>

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Total Marks

                </p>

                <p className="mt-1 text-sm text-slate-800">

                  {viewAssignment.totalMarks}

                </p>

              </div>

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Status

                </p>

                <div className="mt-2">

                  <AssignmentStatusBadge status={viewAssignment.status} />

                </div>

              </div>

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Description

                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">

                  {viewAssignment.description || "No description provided."}

                </p>

              </div>

              {viewAssignment.instructions && (

                <div>

                  <p className="text-xs font-semibold uppercase text-slate-400">

                    Instructions

                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">

                    {viewAssignment.instructions}

                  </p>

                </div>

              )}

              <div>

                <p className="text-xs font-semibold uppercase text-slate-400">

                  Allowed Submission Types

                </p>

                <p className="mt-1 text-sm text-slate-700">

                  {viewAssignment.allowedSubmissionTypes.join(", ")}

                </p>

              </div>

              {viewAssignment.attachmentUrl && (

                <a

                  href={viewAssignment.attachmentUrl}

                  target="_blank"

                  rel="noreferrer"

                  className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700"

                >

                  <FileText size={17} />

                  Open Attachment

                  <ExternalLink size={14} />

                </a>

              )}

            </div>

            <div className="flex justify-end border-t border-slate-100 p-4">

              <button

                onClick={() => setViewAssignment(null)}

                className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"

              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}

      {/* STUDENT-WISE ASSIGNMENT STATUS MODAL */}

      {showStudents && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">

          <div className="my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">

              <div className="min-w-0">

                <h2 className="text-lg font-bold text-slate-900">

                  Student Assignment Status

                </h2>

                <p className="mt-1 truncate text-sm text-slate-500">

                  {selectedAssignment?.title}

                </p>

                <p className="mt-1 text-xs text-slate-500">

                  Batch: {selectedAssignment?.batchName}

                </p>

              </div>

              <button

                onClick={() => {

                  setShowStudents(false);

                  setSelectedAssignment(null);

                  setStudents([]);

                  setStudentStatuses({});

                }}

                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"

              >

                <X size={21} />

              </button>

            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

              {studentsLoading ? (

                <div className="py-14 text-center">

                  <RefreshCw

                    size={28}

                    className="mx-auto animate-spin text-[#102e60]"

                  />

                  <p className="mt-3 text-sm text-slate-500">

                    Loading students...

                  </p>

                </div>

              ) : students.length === 0 ? (

                <div className="py-14 text-center">

                  <Users size={38} className="mx-auto text-slate-300" />

                  <h3 className="mt-3 font-semibold text-slate-800">

                    No students found

                  </h3>

                  <p className="mt-1 text-sm text-slate-500">

                    No students are available in this assignment batch.

                  </p>

                </div>

              ) : (

                <div className="space-y-3">

                  {students.map((student, index) => {

                    const studentId = getId(student);

                    const currentStatus =

                      studentStatuses[studentId] || "Pending";

                    const isSaving = savingStudent === studentId;

                    return (

                      <div

                        key={studentId || index}

                        className="rounded-xl border border-slate-200 bg-white p-4"

                      >

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-[#102e60]">

                              {getName(student).charAt(0).toUpperCase()}

                            </div>

                            <div className="min-w-0">

                              <h3 className="truncate text-sm font-bold text-slate-900">

                                {getName(student)}

                              </h3>

                              <p className="mt-1 text-xs text-slate-500">

                                ID: {student.userId || studentId}

                              </p>

                              {student.email && (

                                <p className="mt-1 truncate text-xs text-slate-500">

                                  {student.email}

                                </p>

                              )}

                            </div>

                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

                            <div className="min-w-0 sm:w-40">

                              <select

                                value={currentStatus}

                                onChange={(e) =>

                                  handleStatusChange(

                                    studentId,

                                    e.target.value

                                  )

                                }

                                disabled={isSaving}

                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-[#102e60] focus:ring-2 focus:ring-blue-100 disabled:opacity-60"

                              >

                                {STATUS_OPTIONS.map((status) => (

                                  <option key={status} value={status}>

                                    {status}

                                  </option>

                                ))}

                              </select>

                            </div>

                            <div className="flex items-center gap-2">

                              <StatusBadge status={currentStatus} />

                              <button

                                onClick={() =>

                                  handleSaveStudentStatus(student)

                                }

                                disabled={isSaving || !studentId}

                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#102e60] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#173b70] disabled:cursor-not-allowed disabled:opacity-50"

                              >

                                {isSaving ? (

                                  <RefreshCw

                                    size={15}

                                    className="animate-spin"

                                  />

                                ) : (

                                  <Save size={15} />

                                )}

                                {isSaving ? "Saving" : "Save"}

                              </button>

                            </div>

                          </div>

                        </div>

                      </div>

                    );

                  })}

                </div>

              )}

            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:px-6">

              <p className="text-xs text-slate-500">

                Total Students: {students.length}

              </p>

              <button

                onClick={() => {

                  setShowStudents(false);

                  setSelectedAssignment(null);

                  setStudents([]);

                  setStudentStatuses({});

                }}

                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"

              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}

      {/* STUDENT SUBMISSIONS MODAL */}
      {showSubmissions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">
          <div className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">Student Submissions</h2>
                <p className="mt-1 text-sm text-slate-500">{submissionAssignment?.title}</p>
                <p className="mt-1 text-xs text-slate-500">Batch: {submissionAssignment?.batchName}</p>
              </div>
              <button onClick={() => { setShowSubmissions(false); setSubmissionAssignment(null); setSubmissions([]); }} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close submissions">
                <X size={21} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {submissionsLoading ? (
                <div className="py-14 text-center">
                  <RefreshCw size={30} className="mx-auto animate-spin text-[#102e60]" />
                  <p className="mt-3 text-sm text-slate-500">Loading student submissions...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-14 text-center">
                  <ClipboardList size={42} className="mx-auto text-slate-300" />
                  <h3 className="mt-3 font-semibold text-slate-800">No submissions yet</h3>
                  <p className="mt-1 text-sm text-slate-500">Students have not submitted this assignment yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission, index) => {
                    const student = submission.student || {};
                    const studentName = student.name || student.fullName || student.userId || "Unknown Student";
                    const submittedText = submission.description || submission.answer || submission.text || "";
                    const submissionUrl = submission.submissionUrl || submission.fileUrl || submission.attachmentUrl || submission.url || "";

                    return (
                      <div key={submission._id || index} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-[#102e60]">{studentName.charAt(0).toUpperCase()}</div>
                            <div className="min-w-0">
                              <h3 className="break-words text-sm font-bold text-slate-900">{studentName}</h3>
                              <p className="mt-1 text-xs text-slate-500">ID: {student.userId || getId(student) || "—"}</p>
                              {student.email && <p className="mt-1 break-all text-xs text-slate-500">{student.email}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">Submitted: {getDate(submission.submittedAt) || "—"}</span>
                          </div>
                        </div>
                        {submittedText && <div className="mt-4 rounded-lg bg-slate-50 p-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Student Answer</p>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{submittedText}</p>
                        </div>}

                        {submissionUrl && <div className="mt-4">
                          <a href={submissionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                            <ExternalLink size={16} /> View Student Submission
                          </a>
                        </div>}

                        {status === "Graded" && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Marks Obtained</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{submission.marks ?? "—"} / {submission.maxMarks ?? submission.totalMarks ?? "—"}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Trainer Feedback</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{submission.feedback || "No feedback provided."}</p>
                          </div>
                        </div>}

                        {!submittedText && !submissionUrl && <p className="mt-4 text-sm text-amber-700">No answer text or submission link was found in this record.</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <p className="text-xs text-slate-500">Total Submissions: {submissions.length}</p>
              <button onClick={() => { setShowSubmissions(false); setSubmissionAssignment(null); setSubmissions([]); }} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
