
"use client";

import { useMemo, useState } from "react";
import {
  MessageCircleQuestion,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Send,
  Clock,
  CircleCheck,
  CircleAlert,
  MessagesSquare,
  Filter,
  CalendarDays,
  UserRound,
  BookOpen,
  ArrowUpDown,
  CheckCheck,
} from "lucide-react";

const initialDoubts = [
  {
    id: "DBT-1001",
    student: "Rahul Sharma",
    email: "rahul@example.com",
    course: "MERN Stack Development",
    batch: "MERN-2026-A",
    subject: "React useEffect Hook",
    question:
      "I am confused about the dependency array in useEffect. When should I use an empty array, and when should I pass variables?",
    category: "React.js",
    priority: "High",
    status: "Open",
    assignedTo: "Manav Sharma",
    createdAt: "2026-10-22",
    replies: [
      {
        author: "Rahul Sharma",
        role: "Student",
        message: "I am confused about the dependency array in useEffect. When should I use an empty array, and when should I pass variables?",
        date: "2026-10-22",
      },
    ],
  },
  {
    id: "DBT-1002",
    student: "Priya Verma",
    email: "priya@example.com",
    course: "AWS Cloud Computing",
    batch: "AWS-2026-B",
    subject: "EC2 and Security Groups",
    question:
      "Can you explain how inbound and outbound rules work in an EC2 security group?",
    category: "AWS",
    priority: "Medium",
    status: "In Progress",
    assignedTo: "Amit Kumar",
    createdAt: "2026-10-23",
    replies: [
      {
        author: "Priya Verma",
        role: "Student",
        message: "Can you explain how inbound and outbound rules work in an EC2 security group?",
        date: "2026-10-23",
      },
      {
        author: "Amit Kumar",
        role: "Trainer",
        message:
          "Inbound rules control traffic entering the instance, while outbound rules control traffic leaving it. We will review examples in the next session.",
        date: "2026-10-23",
      },
    ],
  },
  {
    id: "DBT-1003",
    student: "Aman Singh",
    email: "aman@example.com",
    course: "Software Testing",
    batch: "TEST-2026-A",
    subject: "Test Case vs Test Scenario",
    question:
      "What is the difference between a test scenario and a test case? Please provide a practical example.",
    category: "Testing",
    priority: "Low",
    status: "Resolved",
    assignedTo: "Neha Gupta",
    createdAt: "2026-10-20",
    replies: [
      {
        author: "Aman Singh",
        role: "Student",
        message: "What is the difference between a test scenario and a test case? Please provide a practical example.",
        date: "2026-10-20",
      },
      {
        author: "Neha Gupta",
        role: "Trainer",
        message:
          "A test scenario describes what to test, while a test case gives the detailed steps, data, and expected result. For example, the scenario is testing login; individual valid and invalid login attempts are test cases.",
        date: "2026-10-21",
      },
    ],
  },
  {
    id: "DBT-1004",
    student: "Neha Gupta",
    email: "neha@example.com",
    course: "MERN Stack Development",
    batch: "MERN-2026-A",
    subject: "MongoDB Connection Error",
    question:
      "My Node.js application shows ECONNREFUSED while connecting to MongoDB locally. How can I troubleshoot it?",
    category: "MongoDB",
    priority: "Urgent",
    status: "Open",
    assignedTo: "Manav Sharma",
    createdAt: "2026-10-24",
    replies: [
      {
        author: "Neha Gupta",
        role: "Student",
        message: "My Node.js application shows ECONNREFUSED while connecting to MongoDB locally. How can I troubleshoot it?",
        date: "2026-10-24",
      },
    ],
  },
  {
    id: "DBT-1005",
    student: "Karan Mehta",
    email: "karan@example.com",
    course: "Python Programming",
    batch: "PY-2026-A",
    subject: "Python List Comprehension",
    question:
      "How do I convert a normal for loop into a list comprehension?",
    category: "Python",
    priority: "Medium",
    status: "Resolved",
    assignedTo: "Amit Kumar",
    createdAt: "2026-10-19",
    replies: [
      {
        author: "Karan Mehta",
        role: "Student",
        message: "How do I convert a normal for loop into a list comprehension?",
        date: "2026-10-19",
      },
      {
        author: "Amit Kumar",
        role: "Trainer",
        message:
          "For example, squares = [x * x for x in range(5)] creates a list of squares without writing a separate append statement inside a loop.",
        date: "2026-10-19",
      },
    ],
  },
];

const emptyDoubt = {
  student: "",
  email: "",
  course: "MERN Stack Development",
  batch: "",
  subject: "",
  question: "",
  category: "General",
  priority: "Medium",
  status: "Open",
  assignedTo: "Manav Sharma",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function StatusBadge({ status }) {
  const styles = {
    Open: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    "In Progress":
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Resolved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.Open
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    Urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    Medium:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[priority] || styles.Medium
      }`}
    >
      {priority}
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

export default function DoubtsPage() {
  const [doubts, setDoubts] = useState(initialDoubts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [modal, setModal] = useState(null);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [form, setForm] = useState(emptyDoubt);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");

  const stats = useMemo(() => {
    const open = doubts.filter((d) => d.status === "Open").length;
    const inProgress = doubts.filter((d) => d.status === "In Progress").length;
    const resolved = doubts.filter((d) => d.status === "Resolved").length;
    const urgent = doubts.filter(
      (d) => d.priority === "Urgent" && d.status !== "Resolved"
    ).length;

    return { total: doubts.length, open, inProgress, resolved, urgent };
  }, [doubts]);

  const courses = useMemo(
    () => [...new Set(doubts.map((d) => d.course))],
    [doubts]
  );

  const filteredDoubts = useMemo(() => {
    const term = search.toLowerCase().trim();

    return doubts
      .filter((doubt) => {
        const searchable = [
          doubt.id,
          doubt.student,
          doubt.email,
          doubt.subject,
          doubt.question,
          doubt.course,
          doubt.batch,
          doubt.assignedTo,
        ].some((value) => String(value || "").toLowerCase().includes(term));

        return (
          searchable &&
          (statusFilter === "All" || doubt.status === statusFilter) &&
          (priorityFilter === "All" || doubt.priority === priorityFilter) &&
          (courseFilter === "All" || doubt.course === courseFilter)
        );
      })
      .sort((a, b) =>
        sortOrder === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt)
      );
  }, [doubts, search, statusFilter, priorityFilter, courseFilter, sortOrder]);

  function openAdd() {
    setForm(emptyDoubt);
    setSelectedDoubt(null);
    setModal("add");
  }

  function openEdit(doubt) {
    setSelectedDoubt(doubt);
    setForm({
      student: doubt.student,
      email: doubt.email,
      course: doubt.course,
      batch: doubt.batch,
      subject: doubt.subject,
      question: doubt.question,
      category: doubt.category,
      priority: doubt.priority,
      status: doubt.status,
      assignedTo: doubt.assignedTo,
    });
    setModal("edit");
  }

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function saveDoubt(event) {
    event.preventDefault();

    if (
      !form.student.trim() ||
      !form.subject.trim() ||
      !form.question.trim()
    ) {
      setNotice("Please enter the student name, subject, and question.");
      return;
    }

    if (modal === "edit" && selectedDoubt) {
      setDoubts((previous) =>
        previous.map((d) =>
          d.id === selectedDoubt.id
            ? { ...d, ...form }
            : d
        )
      );
      setNotice("Doubt updated successfully.");
    } else {
      const newDoubt = {
        ...form,
        id: `DBT-${Date.now().toString().slice(-7)}`,
        createdAt: new Date().toLocaleDateString("en-CA"),
        replies: [
          {
            author: form.student,
            role: "Student",
            message: form.question,
            date: new Date().toLocaleDateString("en-CA"),
          },
        ],
      };

      setDoubts((previous) => [newDoubt, ...previous]);
      setNotice("New doubt added successfully.");
    }

    setModal(null);
  }

  function changeStatus(doubt, status) {
    setDoubts((previous) =>
      previous.map((d) => (d.id === doubt.id ? { ...d, status } : d))
    );

    if (selectedDoubt?.id === doubt.id) {
      setSelectedDoubt((previous) => ({ ...previous, status }));
    }

    setNotice(`Doubt marked as ${status}.`);
  }

  function deleteDoubt(doubt) {
    if (!window.confirm(`Delete doubt ${doubt.id}?`)) return;

    setDoubts((previous) => previous.filter((d) => d.id !== doubt.id));

    if (selectedDoubt?.id === doubt.id) {
      setSelectedDoubt(null);
      setModal(null);
    }

    setNotice("Doubt deleted successfully.");
  }

  function sendReply(event) {
    event.preventDefault();

    if (!reply.trim() || !selectedDoubt) return;

    const newReply = {
      author: "Manav Sharma",
      role: "Trainer",
      message: reply.trim(),
      date: new Date().toLocaleDateString("en-CA"),
    };

    const updatedDoubt = {
      ...selectedDoubt,
      status: "In Progress",
      replies: [...(selectedDoubt.replies || []), newReply],
    };

    setDoubts((previous) =>
      previous.map((d) => (d.id === selectedDoubt.id ? updatedDoubt : d))
    );
    setSelectedDoubt(updatedDoubt);
    setReply("");
    setNotice("Reply added successfully.");
  }

  function exportCSV() {
    const columns = [
      "id",
      "student",
      "email",
      "course",
      "batch",
      "subject",
      "category",
      "priority",
      "status",
      "assignedTo",
      "createdAt",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      columns.join(","),
      ...filteredDoubts.map((d) =>
        columns.map((column) => escapeCSV(d[column])).join(",")
      ),
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "appwars-doubts.csv";
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
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Doubts Management
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Review student questions, assign trainers, and track resolutions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCSV}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              Export CSV
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} /> Add Doubt
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
            title="Total Doubts"
            value={stats.total}
            subtitle="All submitted questions"
            icon={MessagesSquare}
            color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          />
          <StatCard
            title="Open Doubts"
            value={stats.open}
            subtitle="Awaiting a response"
            icon={MessageCircleQuestion}
            color="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            subtitle="Being addressed"
            icon={Clock}
            color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          />
          <StatCard
            title="Resolved"
            value={stats.resolved}
            subtitle={`${stats.urgent} urgent unresolved`}
            icon={CircleCheck}
            color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doubts or students..."
                className={`${inputClass} mt-0 pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass.replace("mt-1.5 ", "")}
            >
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={inputClass.replace("mt-1.5 ", "")}
            >
              <option value="All">All priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className={inputClass.replace("mt-1.5 ", "")}
            >
              <option value="All">All courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredDoubts.length} of {doubts.length} doubts
            </p>
            <button
              onClick={() =>
                setSortOrder((previous) =>
                  previous === "newest" ? "oldest" : "newest"
                )
              }
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ArrowUpDown size={16} />
              {sortOrder === "newest" ? "Newest first" : "Oldest first"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-4">Student / Doubt</th>
                  <th className="px-3 py-4">Course / Batch</th>
                  <th className="px-3 py-4">Priority</th>
                  <th className="px-3 py-4">Assigned Trainer</th>
                  <th className="px-3 py-4">Submitted</th>
                  <th className="px-3 py-4">Status</th>
                  <th className="px-3 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoubts.map((doubt) => (
                  <tr
                    key={doubt.id}
                    className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-4">
                      <p className="font-semibold">{doubt.subject}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {doubt.student} · {doubt.id}
                      </p>
                      <p className="mt-2 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                        {doubt.question}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <p>{doubt.course}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {doubt.batch || "No batch"}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <PriorityBadge priority={doubt.priority} />
                    </td>
                    <td className="px-3 py-4">{doubt.assignedTo || "Unassigned"}</td>
                    <td className="px-3 py-4">{doubt.createdAt}</td>
                    <td className="px-3 py-4">
                      <StatusBadge status={doubt.status} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedDoubt(doubt);
                            setModal("view");
                          }}
                          title="View and reply"
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          onClick={() => openEdit(doubt)}
                          title="Edit doubt"
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => deleteDoubt(doubt)}
                          title="Delete doubt"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDoubts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      No doubts found. Try changing your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
            <div className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {modal === "add"
                      ? "Add Student Doubt"
                      : modal === "edit"
                      ? "Edit Doubt"
                      : selectedDoubt?.subject}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {modal === "view"
                      ? `${selectedDoubt?.id} · ${selectedDoubt?.student}`
                      : "Manage the question details and assignment"}
                  </p>
                </div>
                <button
                  onClick={() => setModal(null)}
                  aria-label="Close modal"
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              {modal === "view" && selectedDoubt && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Student
                      </p>
                      <p className="mt-1 font-semibold">{selectedDoubt.student}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {selectedDoubt.email}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Course / Batch
                      </p>
                      <p className="mt-1 font-semibold">{selectedDoubt.course}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {selectedDoubt.batch || "No batch assigned"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Question</p>
                    <div className="rounded-xl border border-slate-200 p-4 text-sm leading-6 dark:border-slate-700">
                      {selectedDoubt.question}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={selectedDoubt.status}
                        onChange={(e) =>
                          changeStatus(selectedDoubt, e.target.value)
                        }
                        className={inputClass}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <select
                        value={selectedDoubt.priority}
                        onChange={(e) => {
                          const updated = {
                            ...selectedDoubt,
                            priority: e.target.value,
                          };
                          setSelectedDoubt(updated);
                          setDoubts((previous) =>
                            previous.map((d) =>
                              d.id === updated.id ? updated : d
                            )
                          );
                        }}
                        className={inputClass}
                      >
                        <option>Urgent</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assign Trainer</label>
                      <select
                        value={selectedDoubt.assignedTo || ""}
                        onChange={(e) => {
                          const updated = {
                            ...selectedDoubt,
                            assignedTo: e.target.value,
                          };
                          setSelectedDoubt(updated);
                          setDoubts((previous) =>
                            previous.map((d) =>
                              d.id === updated.id ? updated : d
                            )
                          );
                        }}
                        className={inputClass}
                      >
                        <option>Manav Sharma</option>
                        <option>Amit Kumar</option>
                        <option>Neha Gupta</option>
                        <option value="">Unassigned</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-bold">Discussion History</h3>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {(selectedDoubt.replies || []).map((item, index) => (
                        <div
                          key={`${item.author}-${item.date}-${index}`}
                          className={`rounded-xl p-4 ${
                            item.role === "Trainer"
                              ? "bg-blue-50 dark:bg-blue-950/50"
                              : "bg-slate-50 dark:bg-slate-800"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {item.author}
                              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                                {item.role}
                              </span>
                            </p>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {item.date}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                            {item.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedDoubt.status !== "Resolved" && (
                    <form
                      onSubmit={sendReply}
                      className="border-t border-slate-200 pt-4 dark:border-slate-700"
                    >
                      <label className="text-sm font-semibold">
                        Write a Reply
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          required
                          rows={3}
                          placeholder="Explain the solution or next steps..."
                          className={`${inputClass} resize-y`}
                        />
                      </label>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <Send size={16} /> Send Reply
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {selectedDoubt.status !== "Resolved" && (
                      <button
                        onClick={() => changeStatus(selectedDoubt, "Resolved")}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCheck size={17} /> Mark Resolved
                      </button>
                    )}
                    <button
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {(modal === "add" || modal === "edit") && (
                <form onSubmit={saveDoubt} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Student Name *
                      <input
                        required
                        value={form.student}
                        onChange={(e) => updateForm("student", e.target.value)}
                        className={inputClass}
                        placeholder="Student name"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Student Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className={inputClass}
                        placeholder="student@example.com"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Course
                      <select
                        value={form.course}
                        onChange={(e) => updateForm("course", e.target.value)}
                        className={inputClass}
                      >
                        <option>MERN Stack Development</option>
                        <option>AWS Cloud Computing</option>
                        <option>Software Testing</option>
                        <option>Full Stack Development</option>
                        <option>Python Programming</option>
                        <option>DevOps and Cloud Computing</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Batch
                      <input
                        value={form.batch}
                        onChange={(e) => updateForm("batch", e.target.value)}
                        className={inputClass}
                        placeholder="e.g. MERN-2026-A"
                      />
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">
                      Doubt Subject *
                      <input
                        required
                        value={form.subject}
                        onChange={(e) => updateForm("subject", e.target.value)}
                        className={inputClass}
                        placeholder="Short title of the question"
                      />
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">
                      Question Details *
                      <textarea
                        required
                        rows={4}
                        value={form.question}
                        onChange={(e) => updateForm("question", e.target.value)}
                        className={`${inputClass} resize-y`}
                        placeholder="Describe the student's question..."
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Category
                      <select
                        value={form.category}
                        onChange={(e) => updateForm("category", e.target.value)}
                        className={inputClass}
                      >
                        <option>General</option>
                        <option>JavaScript</option>
                        <option>React.js</option>
                        <option>Node.js</option>
                        <option>MongoDB</option>
                        <option>AWS</option>
                        <option>Testing</option>
                        <option>Python</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Priority
                      <select
                        value={form.priority}
                        onChange={(e) => updateForm("priority", e.target.value)}
                        className={inputClass}
                      >
                        <option>Urgent</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Status
                      <select
                        value={form.status}
                        onChange={(e) => updateForm("status", e.target.value)}
                        className={inputClass}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Assign Trainer
                      <select
                        value={form.assignedTo}
                        onChange={(e) => updateForm("assignedTo", e.target.value)}
                        className={inputClass}
                      >
                        <option>Manav Sharma</option>
                        <option>Amit Kumar</option>
                        <option>Neha Gupta</option>
                        <option value="">Unassigned</option>
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
                      {modal === "add" ? "Create Doubt" : "Save Changes"}
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
