
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Video, Plus, Search, CalendarDays, Clock, Users,
    ExternalLink, Pencil, Trash2, X, Download, PlayCircle,
    CircleCheck, Radio, Link as LinkIcon, BookOpen,
    UserRound, Filter, Eye, RefreshCw,
} from "lucide-react";

// Set NEXT_PUBLIC_API_URL in your frontend .env.local file.
const API_URL =
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api")
        .replace(/\/$/, "");

const ENDPOINT = `${API_URL}/admin/live-classes`;

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

// Supports common MongoDB/Mongoose response formats.
function normalizeClass(item) {
    const dateValue = item.date || item.classDate || "";

    return {
        id: String(item._id || item.id),
        title: item.title || item.classTitle || "",
        course:
            typeof item.course === "object"
                ? item.course?.name || item.course?.courseName || ""
                : item.course || item.courseName || "MERN Stack Development",
        trainer:
            typeof item.trainer === "object"
                ? item.trainer?.name || item.trainer?.fullName || ""
                : item.trainer || item.trainerName || "",
        batch:
            typeof item.batch === "object"
                ? item.batch?.name || item.batch?.batchName || ""
                : item.batch || item.batchName || "",
        date: String(dateValue).slice(0, 10),
        startTime: String(item.startTime || "10:00").slice(0, 5),
        endTime: String(item.endTime || "11:30").slice(0, 5),
        meetingLink: item.meetingLink || item.meetingUrl || "",
        platform: item.platform || "Google Meet",
        status: item.status || "Scheduled",
        description: item.description || "",
    };
}

function getToken() {
    if (typeof window === "undefined") return "";

    return (
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("appwars_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("appwars_token") ||
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
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

function getArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.classes)) return data.classes;
    if (Array.isArray(data.liveClasses)) return data.liveClasses;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.data?.classes)) return data.data.classes;
    if (Array.isArray(data.data?.liveClasses)) return data.data.liveClasses;

    return [];
}

export default function LiveClassesPage() {
    const [classes, setClasses] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [courseFilter, setCourseFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [today, setToday] = useState("");
    const [form, setForm] = useState(emptyForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [pageError, setPageError] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadClasses = useCallback(async () => {
        setLoading(true);
        setPageError("");

        try {
            const data = await apiRequest(ENDPOINT);
            setClasses(getArray(data).map(normalizeClass));
        } catch (err) {
            setPageError(
                `${err.message}. Check your API URL, backend route, server, and authentication.`
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setToday(
            `${new Date().getFullYear()}-${String(
                new Date().getMonth() + 1
            ).padStart(2, "0")}-${String(
                new Date().getDate()
            ).padStart(2, "0")}`
        );

        loadClasses();
    }, [loadClasses]);

    const filteredClasses = classes.filter((item) => {
        const searchText = [
            item.title,
            item.course,
            item.trainer,
            item.batch,
            item.platform,
        ].join(" ").toLowerCase();

        return (
            searchText.includes(search.toLowerCase()) &&
            (statusFilter === "All" || item.status === statusFilter) &&
            (courseFilter === "All" || item.course === courseFilter)
        );
    });

    const scheduledCount = classes.filter(
        (item) => item.status === "Scheduled"
    ).length;

    const liveCount = classes.filter((item) => {
        if (item.status !== "Live" || item.date !== today) return false;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = item.startTime.split(":").map(Number);
        const [eh, em] = item.endTime.split(":").map(Number);

        return (
            currentMinutes >= sh * 60 + sm &&
            currentMinutes <= eh * 60 + em
        );
    }).length;

    const completedCount = classes.filter(
        (item) => item.status === "Completed"
    ).length;

    const totalBatches = new Set(
        classes.map((item) => item.batch).filter(Boolean)
    ).size;

    const courses = [...new Set(classes.map((item) => item.course).filter(Boolean))];

    function updateField(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
        setError("");
    }

    function openCreateForm() {
        setEditingId(null);
        setForm({ ...emptyForm, date: today });
        setError("");
        setSuccess("");
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
        if (saving) return;
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    }

    async function saveClass(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

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
            const meetingUrl = new URL(form.meetingLink);

            if (!["http:", "https:"].includes(meetingUrl.protocol)) {
                setError("Enter a valid HTTP or HTTPS meeting URL.");
                return;
            }
        } catch {
            setError("Please enter a valid meeting URL.");
            return;
        }

        // Payload sent to the Express backend.
        const payload = {
            title: form.title.trim(),
            course: form.course,
            trainer: form.trainer.trim(),
            batch: form.batch.trim(),
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            meetingLink: form.meetingLink.trim(),
            platform: form.platform,
            status: form.status,
            description: form.description.trim(),
        };

        setSaving(true);

        try {
            if (editingId !== null) {
                await apiRequest(`${ENDPOINT}/${encodeURIComponent(editingId)}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });

                setSuccess("Live class updated successfully.");
            } else {
                await apiRequest(ENDPOINT, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });

                setSuccess("Live class scheduled successfully.");
            }

            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm);

            await loadClasses();
        } catch (err) {
            setError(err.message || "Unable to save the live class.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteClass(id) {
        if (!window.confirm("Are you sure you want to delete this live class?")) {
            return;
        }

        setDeletingId(id);
        setPageError("");
        setSuccess("");

        try {
            await apiRequest(`${ENDPOINT}/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });

            setClasses((previous) => previous.filter((item) => item.id !== id));

            if (selectedClass?.id === id) {
                setSelectedClass(null);
            }

            setSuccess("Live class deleted successfully.");
        } catch (err) {
            setPageError(err.message || "Unable to delete the live class.");
        } finally {
            setDeletingId(null);
        }
    }

    async function changeStatus(id, status) {
        setPageError("");
        setSuccess("");

        const current = classes.find((item) => item.id === id);
        if (!current) return;

        try {
            await apiRequest(`${ENDPOINT}/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });

            setClasses((previous) =>
                previous.map((item) =>
                    item.id === id ? { ...item, status } : item
                )
            );

            setSelectedClass((previous) =>
                previous?.id === id ? { ...previous, status } : previous
            );

            setSuccess("Class status updated successfully.");
        } catch (err) {
            setPageError(err.message || "Unable to update class status.");
        }
    }

    function exportCSV() {
        const headers = [
            "Class Title", "Course", "Trainer", "Batch", "Date",
            "Start Time", "End Time", "Platform", "Meeting Link",
            "Status", "Description",
        ];

        const escapeCSV = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = filteredClasses.map((item) =>
            [
                item.title, item.course, item.trainer, item.batch,
                item.date, item.startTime, item.endTime, item.platform,
                item.meetingLink, item.status, item.description,
            ].map(escapeCSV).join(",")
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

        const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);

        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
    }

    function formatTime(timeString) {
        if (!timeString) return "—";

        const [hours, minutes] = timeString.split(":").map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;

        const period = hours >= 12 ? "PM" : "AM";
        return `${String(hours % 12 || 12).padStart(2, "0")}:${String(
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

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
                        <Video size={17} /> LMS Management
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
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                    >
                        <Download size={17} /> Export CSV
                    </button>
                    <button
                        onClick={openCreateForm}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                        <Plus size={18} /> Schedule Class
                    </button>
                </div>
            </div>

            {pageError && (
                <Notice
                    type="error"
                    message={pageError}
                    onClose={() => setPageError("")}
                />
            )}

            {success && (
                <Notice
                    type="success"
                    message={success}
                    onClose={() => setSuccess("")}
                />
            )}

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

            <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <InfoCard
                    icon={<CalendarDays size={23} />}
                    label="Today's Date"
                    value={formatDate(today)}
                    color="blue"
                />
                <InfoCard
                    icon={<Users size={23} />}
                    label="Active Batches"
                    value={`${totalBatches} batches`}
                    color="violet"
                />
                <InfoCard
                    icon={<BookOpen size={23} />}
                    label="Courses"
                    value={`${courses.length} courses`}
                    color="emerald"
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Class Schedule
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                View and manage online training sessions.
                            </p>
                        </div>
                        <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                            {filteredClasses.length} classes found
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search class, trainer, batch..."
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="relative">
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm"
                            >
                                <option value="All">All Statuses</option>
                                <option>Scheduled</option>
                                <option>Live</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                            </select>
                        </div>

                        <select
                            value={courseFilter}
                            onChange={(e) => setCourseFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                        >
                            <option value="All">All Courses</option>
                            {courses.map((course) => (
                                <option key={course} value={course}>{course}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4">Class Details</th>
                                <th className="px-5 py-4">Trainer / Batch</th>
                                <th className="px-5 py-4">Date & Time</th>
                                <th className="px-5 py-4">Meeting Platform</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                                        <RefreshCw className="mx-auto mb-3 animate-spin" size={25} />
                                        Loading live classes from server...
                                    </td>
                                </tr>
                            ) : filteredClasses.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80">
                                    <td className="px-5 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                                                <Video size={19} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{item.title}</p>
                                                <p className="mt-1 text-xs text-slate-500">{item.course}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-800">{item.trainer}</p>
                                        <p className="mt-1 text-xs text-slate-500">{item.batch}</p>
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
                                        <p className="font-medium text-slate-800">{item.platform}</p>
                                        {item.meetingLink && (
                                            <a
                                                href={item.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                                            >
                                                Open meeting <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyle(item.status)}`}>
                                            {item.status === "Live" && (
                                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                                            )}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => setSelectedClass(item)} title="View class" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                                                <Eye size={17} />
                                            </button>
                                            <button onClick={() => openEditForm(item)} title="Edit class" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700">
                                                <Pencil size={17} />
                                            </button>
                                            <button
                                                onClick={() => deleteClass(item.id)}
                                                disabled={deletingId === item.id}
                                                title="Delete class"
                                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && filteredClasses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <Video size={25} className="mx-auto mb-3 text-slate-400" />
                                        <p className="font-semibold text-slate-700">No live classes found</p>
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

            {showForm && (
                <Modal
                    title={editingId !== null ? "Edit Live Class" : "Schedule Live Class"}
                    onClose={closeForm}
                >
                    <form onSubmit={saveClass} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Class Title" required>
                                <input name="title" value={form.title} onChange={updateField} placeholder="e.g. React.js Fundamentals" className={inputClass} required />
                            </Field>

                            <Field label="Course">
                                <select name="course" value={form.course} onChange={updateField} className={inputClass}>
                                    <option>MERN Stack Development</option>
                                    <option>AWS Cloud Computing</option>
                                    <option>DevOps and Cloud Computing</option>
                                    <option>Software Testing</option>
                                    <option>Python Programming</option>
                                    <option>Data Structures and Algorithms</option>
                                    <option>Other</option>
                                </select>
                            </Field>

                            <Field label="Trainer Name" required>
                                <input name="trainer" value={form.trainer} onChange={updateField} placeholder="Enter trainer name" className={inputClass} required />
                            </Field>

                            <Field label="Batch Name" required>
                                <input name="batch" value={form.batch} onChange={updateField} placeholder="e.g. MERN-2026-A" className={inputClass} required />
                            </Field>

                            <Field label="Meeting Platform">
                                <select name="platform" value={form.platform} onChange={updateField} className={inputClass}>
                                    <option>Google Meet</option>
                                    <option>Zoom</option>
                                    <option>Microsoft Teams</option>
                                    <option>Other</option>
                                </select>
                            </Field>

                            <Field label="Class Date" required>
                                <input type="date" name="date" value={form.date} onChange={updateField} className={inputClass} required />
                            </Field>

                            <Field label="Start Time" required>
                                <input type="time" name="startTime" value={form.startTime} onChange={updateField} className={inputClass} required />
                            </Field>

                            <Field label="End Time" required>
                                <input type="time" name="endTime" value={form.endTime} onChange={updateField} className={inputClass} required />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Meeting URL" required>
                                    <div className="relative">
                                        <LinkIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="url" name="meetingLink" value={form.meetingLink} onChange={updateField} placeholder="https://meet.google.com/..." className={`${inputClass} pl-10`} required />
                                    </div>
                                </Field>
                                <p className="mt-1 text-xs text-slate-500">Paste the meeting link created in your selected platform.</p>
                            </div>

                            <Field label="Class Status">
                                <select name="status" value={form.status} onChange={updateField} className={inputClass}>
                                    <option>Scheduled</option>
                                    <option>Live</option>
                                    <option>Completed</option>
                                    <option>Cancelled</option>
                                </select>
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Class Description">
                                    <textarea name="description" value={form.description} onChange={updateField} rows={3} placeholder="Enter class topics or instructions..." className={inputClass} />
                                </Field>
                            </div>
                        </div>

                        {error && <Notice type="error" message={error} />}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                            <button type="button" onClick={closeForm} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                                {saving ? <RefreshCw size={17} className="animate-spin" /> : <CircleCheck size={17} />}
                                {saving ? "Saving..." : editingId !== null ? "Save Changes" : "Schedule Class"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {selectedClass && (
                <Modal title="Live Class Details" onClose={() => setSelectedClass(null)}>
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-blue-50 p-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                                    <Video size={23} />
                                </div>
                                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyle(selectedClass.status)}`}>
                                    {selectedClass.status}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{selectedClass.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{selectedClass.course}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DetailItem icon={<UserRound size={17} />} label="Trainer" value={selectedClass.trainer} />
                            <DetailItem icon={<Users size={17} />} label="Batch" value={selectedClass.batch} />
                            <DetailItem icon={<CalendarDays size={17} />} label="Date" value={formatDate(selectedClass.date)} />
                            <DetailItem icon={<Clock size={17} />} label="Time" value={`${formatTime(selectedClass.startTime)} – ${formatTime(selectedClass.endTime)}`} />
                            <DetailItem icon={<Video size={17} />} label="Platform" value={selectedClass.platform} />
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-700">Description</p>
                            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                {selectedClass.description || "No description provided."}
                            </p>
                        </div>

                        {selectedClass.meetingLink && (
                            <a href={selectedClass.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">
                                <PlayCircle size={18} /> Open Meeting Link <ExternalLink size={15} />
                            </a>
                        )}

                        <div>
                            <label className={labelClass}>Update Class Status</label>
                            <select
                                value={selectedClass.status}
                                onChange={(event) => changeStatus(selectedClass.id, event.target.value)}
                                className={inputClass}
                            >
                                <option>Scheduled</option>
                                <option>Live</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                            </select>
                        </div>

                        <button onClick={() => setSelectedClass(null)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
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

function InfoCard({ icon, label, value, color }) {
    const colors = {
        blue: "border-blue-100 bg-blue-50/70 text-blue-700",
        violet: "border-violet-100 bg-violet-50/70 text-violet-700",
        emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    };

    return (
        <div className={`flex items-center gap-4 rounded-2xl border p-5 ${colors[color]}`}>
            <div className="rounded-xl bg-white p-3 shadow-sm">{icon}</div>
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
}

function Field({ label, required, children }) {
    return (
        <div>
            <label className={labelClass}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

function Notice({ type, message, onClose }) {
    const styles = type === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

    return (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
            <p>{message}</p>
            {onClose && (
                <button type="button" onClick={onClose} aria-label="Dismiss message">
                    <X size={17} />
                </button>
            )}
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
                    <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
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
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="break-words text-sm font-semibold text-slate-800">{value || "—"}</p>
        </div>
    );
}
