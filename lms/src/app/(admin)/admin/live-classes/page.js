"use client";

import { useState, useEffect } from "react";
import {
    Video,
    Plus,
    Search,
    CalendarDays,
    Clock,
    Users,
    ExternalLink,
    Pencil,
    Trash2,
    X,
    Download,
    PlayCircle,
    CircleCheck,
    CircleX,
    Radio,
    Link as LinkIcon,
    BookOpen,
    UserRound,
    Filter,
    Eye,
} from "lucide-react";

const initialClasses = [
    {
        id: 1,
        title: "React.js Fundamentals",
        course: "MERN Stack Development",
        trainer: "Manav Sharma",
        batch: "MERN-2026-A",
        date: "2026-10-25",
        startTime: "10:00",
        endTime: "11:30",
        meetingLink: "https://meet.google.com/",
        platform: "Google Meet",
        status: "Scheduled",
        description: "Components, props, state, and React hooks.",
    },
    {
        id: 2,
        title: "Node.js and Express.js",
        course: "MERN Stack Development",
        trainer: "Rahul Verma",
        batch: "MERN-2026-B",
        date: "2026-10-25",
        startTime: "12:00",
        endTime: "13:30",
        meetingLink: "https://meet.google.com/",
        platform: "Google Meet",
        status: "Scheduled",
        description: "Building REST APIs using Node.js and Express.",
    },
    {
        id: 3,
        title: "Introduction to AWS",
        course: "AWS Cloud Computing",
        trainer: "Amit Kumar",
        batch: "AWS-2026-A",
        date: "2026-10-24",
        startTime: "15:00",
        endTime: "16:30",
        meetingLink: "https://zoom.us/",
        platform: "Zoom",
        status: "Completed",
        description: "AWS services, regions, availability zones, and EC2.",
    },
    {
        id: 4,
        title: "JavaScript Programming",
        course: "MERN Stack Development",
        trainer: "Manav Sharma",
        batch: "MERN-2026-A",
        date: "2026-10-26",
        startTime: "10:00",
        endTime: "11:30",
        meetingLink: "https://meet.google.com/",
        platform: "Google Meet",
        status: "Scheduled",
        description: "Functions, arrays, objects, and asynchronous JavaScript.",
    },
];

const emptyForm = {
    title: "",
    course: "MERN Stack Development",
    trainer: "",
    batch: "",
    date: "",
    startTime: "10:00",
    endTime: "11:30",
    meetingLink: "",
    platform: "Google Meet",
    status: "Scheduled",
    description: "",
};

const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "block text-sm font-medium text-slate-700";

export default function LiveClassesPage() {
    const [classes, setClasses] = useState(initialClasses);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [courseFilter, setCourseFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [today, setToday] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");

    useEffect(() => {
        setToday(new Date().toLocaleDateString("en-CA"));
    }, []);

    const filteredClasses = classes.filter((item) => {
        const searchText = [
            item.title,
            item.course,
            item.trainer,
            item.batch,
            item.platform,
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchText.includes(search.toLowerCase());
        const matchesStatus =
            statusFilter === "All" || item.status === statusFilter;
        const matchesCourse =
            courseFilter === "All" || item.course === courseFilter;

        return matchesSearch && matchesStatus && matchesCourse;
    });

    const scheduledCount = classes.filter(
        (item) => item.status === "Scheduled"
    ).length;

    const liveCount = classes.filter((item) => {
        if (item.status !== "Live" || item.date !== today) return false;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const start = item.startTime.split(":").map(Number);
        const end = item.endTime.split(":").map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }).length;

    const completedCount = classes.filter(
        (item) => item.status === "Completed"
    ).length;

    const totalBatches = new Set(
        classes.map((item) => item.batch).filter(Boolean)
    ).size;

    function updateField(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
        setError("");
    }

    function openCreateForm() {
        setEditingId(null);
        setForm({
            ...emptyForm,
            date: today,
        });
        setError("");
        setShowForm(true);
    }

    function openEditForm(item) {
        setEditingId(item.id);
        setForm({
            title: item.title,
            course: item.course,
            trainer: item.trainer,
            batch: item.batch,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            meetingLink: item.meetingLink,
            platform: item.platform,
            status: item.status,
            description: item.description || "",
        });
        setError("");
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    }

    function saveClass(event) {
        event.preventDefault();

        if (
            !form.title.trim() ||
            !form.trainer.trim() ||
            !form.batch.trim() ||
            !form.date ||
            !form.meetingLink.trim()
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        if (form.endTime <= form.startTime) {
            setError("End time must be later than start time.");
            return;
        }

        try {
            const url = new URL(form.meetingLink);
            if (!["http:", "https:"].includes(url.protocol)) {
                setError("Please enter a valid meeting URL starting with http:// or https://.");
                return;
            }
        } catch {
            setError("Please enter a valid meeting URL.");
            return;
        }

        if (editingId !== null) {
            setClasses((previous) =>
                previous.map((item) =>
                    item.id === editingId ? { ...item, ...form } : item
                )
            );
        } else {
            setClasses((previous) => [
                {
                    ...form,
                    id: Date.now(),
                },
                ...previous,
            ]);
        }

        closeForm();
    }

    function deleteClass(id) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this live class?"
        );

        if (!confirmed) return;

        setClasses((previous) => previous.filter((item) => item.id !== id));

        if (selectedClass?.id === id) {
            setSelectedClass(null);
        }
    }

    function changeStatus(id, status) {
        setClasses((previous) =>
            previous.map((item) =>
                item.id === id ? { ...item, status } : item
            )
        );

        setSelectedClass((previous) =>
            previous?.id === id ? { ...previous, status } : previous
        );
    }

    function exportCSV() {
        const headers = [
            "Class Title",
            "Course",
            "Trainer",
            "Batch",
            "Date",
            "Start Time",
            "End Time",
            "Platform",
            "Meeting Link",
            "Status",
            "Description",
        ];

        const escapeCSV = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = filteredClasses.map((item) =>
            [
                item.title,
                item.course,
                item.trainer,
                item.batch,
                item.date,
                item.startTime,
                item.endTime,
                item.platform,
                item.meetingLink,
                item.status,
                item.description,
            ]
                .map(escapeCSV)
                .join(",")
        );

        const csv = [headers.map(escapeCSV).join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "appwars-live-classes.csv";
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function formatDate(dateString) {
        if (!dateString) return "—";

        return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    function formatTime(timeString) {
        if (!timeString) return "—";

        const [hours, minutes] = timeString.split(":").map(Number);
        const period = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;

        return `${String(formattedHours).padStart(2, "0")}:${String(
            minutes
        ).padStart(2, "0")} ${period}`;
    }

    function statusStyle(status) {
        const styles = {
            Live: "bg-red-50 text-red-700 ring-red-200",
            Scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
            Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
            Cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
        };

        return styles[status] || "bg-slate-100 text-slate-600 ring-slate-200";
    }

    const courses = [...new Set(classes.map((item) => item.course))];

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
                        <Video size={17} />
                        LMS Management
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500">Live Classes</span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Live Classes
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Schedule online classes, manage meeting links, and track class status.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={exportCSV}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                    >
                        <Download size={17} />
                        Export CSV
                    </button>

                    <button
                        onClick={openCreateForm}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                    >
                        <Plus size={18} />
                        Schedule Class
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Classes"
                    value={classes.length}
                    description="All recorded classes"
                    icon={<Video size={21} />}
                    iconColor="bg-blue-50 text-blue-700"
                />

                <StatCard
                    title="Scheduled Classes"
                    value={scheduledCount}
                    description="Upcoming or planned"
                    icon={<CalendarDays size={21} />}
                    iconColor="bg-violet-50 text-violet-700"
                />

                <StatCard
                    title="Live Now"
                    value={liveCount}
                    description="Currently within class time"
                    icon={<Radio size={21} />}
                    iconColor="bg-red-50 text-red-600"
                />

                <StatCard
                    title="Completed Classes"
                    value={completedCount}
                    description={`${totalBatches} batches represented`}
                    icon={<CircleCheck size={21} />}
                    iconColor="bg-emerald-50 text-emerald-700"
                />
            </div>

            {/* Quick Information */}
            <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                    <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                        <CalendarDays size={23} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Today Date</p>
                        <p className="mt-1 font-bold text-slate-800">
                            {formatDate(today)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
                    <div className="rounded-xl bg-white p-3 text-violet-700 shadow-sm">
                        <Users size={23} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Active Batches</p>
                        <p className="mt-1 font-bold text-slate-800">
                            {totalBatches} batches
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                    <div className="rounded-xl bg-white p-3 text-emerald-700 shadow-sm">
                        <BookOpen size={23} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Courses</p>
                        <p className="mt-1 font-bold text-slate-800">
                            {courses.length} courses
                        </p>
                    </div>
                </div>
            </div>

            {/* Class Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Class Schedule
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                View and manage your online training sessions.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                            {filteredClasses.length} classes found
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="relative md:col-span-1">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search class, trainer, batch..."
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Live">Live</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        <select
                            value={courseFilter}
                            onChange={(event) => setCourseFilter(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="All">All Courses</option>
                            {courses.map((course) => (
                                <option key={course} value={course}>
                                    {course}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Class Details</th>
                                <th className="px-5 py-4 font-semibold">Trainer / Batch</th>
                                <th className="px-5 py-4 font-semibold">Date & Time</th>
                                <th className="px-5 py-4 font-semibold">Meeting Platform</th>
                                <th className="px-5 py-4 font-semibold">Status</th>
                                <th className="px-5 py-4 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filteredClasses.map((item) => (
                                <tr key={item.id} className="transition hover:bg-slate-50/80">
                                    <td className="px-5 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                                                <Video size={19} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {item.title}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.course}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-800">
                                            {item.trainer}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {item.batch}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="flex items-center gap-2 font-medium text-slate-800">
                                            <CalendarDays size={15} className="text-slate-400" />
                                            {formatDate(item.date)}
                                        </p>
                                        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                            <Clock size={14} />
                                            {formatTime(item.startTime)} – {formatTime(item.endTime)}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-800">
                                            {item.platform}
                                        </p>
                                        <a
                                            href={item.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                                        >
                                            Open meeting <ExternalLink size={12} />
                                        </a>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyle(
                                                item.status
                                            )}`}
                                        >
                                            {item.status === "Live" && (
                                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                                            )}
                                            {item.status}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => setSelectedClass(item)}
                                                title="View class"
                                                className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                <Eye size={17} />
                                            </button>

                                            <button
                                                onClick={() => openEditForm(item)}
                                                title="Edit class"
                                                className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                                            >
                                                <Pencil size={17} />
                                            </button>

                                            <button
                                                onClick={() => deleteClass(item.id)}
                                                title="Delete class"
                                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredClasses.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-5 py-16 text-center">
                                        <div className="mx-auto mb-3 w-fit rounded-full bg-slate-100 p-4 text-slate-400">
                                            <Video size={25} />
                                        </div>
                                        <p className="font-semibold text-slate-700">
                                            No live classes found
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Change your filters or schedule a new class.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Class Modal */}
            {showForm && (
                <Modal
                    title={editingId !== null ? "Edit Live Class" : "Schedule Live Class"}
                    onClose={closeForm}
                >
                    <form onSubmit={saveClass} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    Class Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={updateField}
                                    placeholder="e.g. React.js Fundamentals"
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Course</label>
                                <select
                                    name="course"
                                    value={form.course}
                                    onChange={updateField}
                                    className={inputClass}
                                >
                                    <option>MERN Stack Development</option>
                                    <option>AWS Cloud Computing</option>
                                    <option>DevOps and Cloud Computing</option>
                                    <option>Software Testing</option>
                                    <option>Python Programming</option>
                                    <option>Data Structures and Algorithms</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Trainer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="trainer"
                                    value={form.trainer}
                                    onChange={updateField}
                                    placeholder="Enter trainer name"
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Batch Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="batch"
                                    value={form.batch}
                                    onChange={updateField}
                                    placeholder="e.g. MERN-2026-A"
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Meeting Platform</label>
                                <select
                                    name="platform"
                                    value={form.platform}
                                    onChange={updateField}
                                    className={inputClass}
                                >
                                    <option>Google Meet</option>
                                    <option>Zoom</option>
                                    <option>Microsoft Teams</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Class Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    onChange={updateField}
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Start Time</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={form.startTime}
                                    onChange={updateField}
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelClass}>End Time</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={form.endTime}
                                    onChange={updateField}
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    Meeting URL <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <LinkIcon
                                        size={17}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="url"
                                        name="meetingLink"
                                        value={form.meetingLink}
                                        onChange={updateField}
                                        placeholder="https://meet.google.com/..."
                                        className={`${inputClass} pl-10`}
                                        required
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Paste the meeting link created in your selected platform.
                                </p>
                            </div>

                            <div>
                                <label className={labelClass}>Class Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={updateField}
                                    className={inputClass}
                                >
                                    <option>Scheduled</option>
                                    <option>Live</option>
                                    <option>Completed</option>
                                    <option>Cancelled</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass}>Class Description</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={updateField}
                                    rows="3"
                                    placeholder="Enter class topics or instructions..."
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                <CircleCheck size={17} />
                                {editingId !== null ? "Save Changes" : "Schedule Class"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Class Details Modal */}
            {selectedClass && (
                <Modal title="Live Class Details" onClose={() => setSelectedClass(null)}>
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-blue-50 p-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                                    <Video size={23} />
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyle(
                                        selectedClass.status
                                    )}`}
                                >
                                    {selectedClass.status}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900">
                                {selectedClass.title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                                {selectedClass.course}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DetailItem
                                icon={<UserRound size={17} />}
                                label="Trainer"
                                value={selectedClass.trainer}
                            />
                            <DetailItem
                                icon={<Users size={17} />}
                                label="Batch"
                                value={selectedClass.batch}
                            />
                            <DetailItem
                                icon={<CalendarDays size={17} />}
                                label="Date"
                                value={formatDate(selectedClass.date)}
                            />
                            <DetailItem
                                icon={<Clock size={17} />}
                                label="Time"
                                value={`${formatTime(selectedClass.startTime)} – ${formatTime(
                                    selectedClass.endTime
                                )}`}
                            />
                            <DetailItem
                                icon={<Video size={17} />}
                                label="Platform"
                                value={selectedClass.platform}
                            />
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-700">
                                Description
                            </p>
                            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                {selectedClass.description || "No description provided."}
                            </p>
                        </div>

                        <a
                            href={selectedClass.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                            <PlayCircle size={18} />
                            Open Meeting Link
                            <ExternalLink size={15} />
                        </a>

                        <div>
                            <label className={labelClass}>Update Class Status</label>
                            <select
                                value={selectedClass.status}
                                onChange={(event) =>
                                    changeStatus(selectedClass.id, event.target.value)
                                }
                                className={inputClass}
                            >
                                <option>Scheduled</option>
                                <option>Live</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setSelectedClass(null)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function StatCard({ title, value, description, icon, iconColor }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
                    <p className="mt-2 text-xs text-slate-500">{description}</p>
                </div>

                <div className={`rounded-xl p-3 ${iconColor}`}>{icon}</div>
            </div>
        </div>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-400">
                {icon}
                <span className="text-xs font-medium uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <p className="break-words text-sm font-semibold text-slate-800">
                {value || "—"}
            </p>
        </div>
    );
}