
"use client";

import { useEffect, useState } from "react";
import {
    UserPlus,
    Users,
    GraduationCap,
    Search,
    Copy,
    Check,
    RefreshCw,
    IdCard,
    Mail,
    ShieldCheck,
    Trash2,
    Download,
    KeyRound,
    Eye,
    EyeOff,
} from "lucide-react";

const STORAGE_KEY = "appwars_generated_ids";

const roleConfig = {
    Student: {
        prefix: "STU",
        color: "bg-blue-100 text-blue-700",
    },
    Trainer: {
        prefix: "TRN",
        color: "bg-purple-100 text-purple-700",
    },
    Counsellor: {
        prefix: "CNS",
        color: "bg-emerald-100 text-emerald-700",
    },
};

export default function IDGenerationPage() {
    const [records, setRecords] = useState([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Student");
    const [department, setDepartment] = useState("");
    const [batch, setBatch] = useState("");

    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("All");

    const [generatedRecord, setGeneratedRecord] = useState(null);
    const [copiedValue, setCopiedValue] = useState("");
    const [showGeneratedPassword, setShowGeneratedPassword] =
        useState(false);

    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");
    const [ready, setReady] = useState(false);

    // Load records from browser storage.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved) {
                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed)) {
                    setRecords(parsed);
                }
            }
        } catch {
            setMessage("Unable to load saved records.");
            setMessageType("error");
        } finally {
            setReady(true);
        }
    }, []);

    // Save records whenever they change.
    useEffect(() => {
        if (!ready) return;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(records)
            );
        } catch {
            setMessage("Unable to save records in browser storage.");
            setMessageType("error");
        }
    }, [records, ready]);

    function notify(text, type = "success") {
        setMessage(text);
        setMessageType(type);
    }

    // Generate a temporary password using the browser crypto API.
    function createTemporaryPassword() {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!";

        const randomValues = new Uint32Array(12);
        crypto.getRandomValues(randomValues);

        return Array.from(
            randomValues,
            (value) => chars[value % chars.length]
        ).join("");
    }

    // Generate the next sequential ID for the selected role.
    function generateID(selectedRole, existingRecords) {
        const prefix = roleConfig[selectedRole].prefix;
        const year = new Date().getFullYear();

        const existingNumbers = existingRecords.map((record) => {
            const match = record.id.match(
                new RegExp(`^${prefix}${year}(\\d+)$`)
            );

            return match ? Number(match[1]) : 0;
        });

        const nextNumber =
            Math.max(0, ...existingNumbers) + 1;

        return `${prefix}${year}${String(nextNumber).padStart(4, "0")}`;
    }

    function handleGenerate(event) {
        event.preventDefault();

        if (!ready) {
            notify("Please wait for records to load.", "error");
            return;
        }

        if (!name.trim() || !email.trim()) {
            notify("Please enter the name and email address.", "error");
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const duplicate = records.some(
            (record) =>
                record.email.toLowerCase() === normalizedEmail
        );

        if (duplicate) {
            notify(
                "This email address already has a generated record.",
                "error"
            );
            return;
        }

        if (!crypto?.getRandomValues) {
            notify(
                "Secure password generation is not supported in this browser.",
                "error"
            );
            return;
        }

        const newRecord = {
            id: generateID(role, records),
            name: name.trim(),
            email: normalizedEmail,
            role,
            password: createTemporaryPassword(),
            department:
                role === "Student" ? "" : department.trim(),
            batch: role === "Student" ? batch.trim() : "",
            status: "Active",
            createdAt: new Date().toISOString(),
        };

        setRecords((previous) => [...previous, newRecord]);
        setGeneratedRecord(newRecord);
        setShowGeneratedPassword(false);

        setName("");
        setEmail("");
        setDepartment("");
        setBatch("");

        notify(`${role} ID and temporary password generated!`);
    }

    async function handleCopy(value, label) {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedValue(value);
            notify(`${label} copied successfully!`);

            setTimeout(() => setCopiedValue(""), 2000);
        } catch {
            notify(
                "Copy failed. Please select and copy the value manually.",
                "error"
            );
        }
    }

    function handleDelete(id) {
        const confirmed = window.confirm(
            `Delete the record for ${id}?`
        );

        if (!confirmed) return;

        setRecords((previous) =>
            previous.filter((record) => record.id !== id)
        );

        if (generatedRecord?.id === id) {
            setGeneratedRecord(null);
        }

        notify("Record deleted from the demonstration.");
    }

    function exportCSV() {
        if (!records.length) {
            notify("There are no records to export.", "error");
            return;
        }

        // Never include passwords in the exported file.
        const headings = [
            "ID",
            "Name",
            "Email",
            "Role",
            "Department",
            "Batch",
            "Status",
            "Created At",
        ];

        const escapeCSV = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = records.map((record) => [
            record.id,
            record.name,
            record.email,
            record.role,
            record.department,
            record.batch,
            record.status,
            new Date(record.createdAt).toLocaleDateString("en-IN"),
        ]);

        const csv = [headings, ...rows]
            .map((row) => row.map(escapeCSV).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "appwars-generated-ids.csv";
        link.click();

        URL.revokeObjectURL(url);
    }

    const filteredRecords = records.filter((record) => {
        const matchesSearch = [
            record.id,
            record.name,
            record.email,
            record.role,
        ].some((value) =>
            String(value).toLowerCase().includes(search.toLowerCase())
        );

        const matchesRole =
            filterRole === "All" || record.role === filterRole;

        return matchesSearch && matchesRole;
    });

    const studentCount = records.filter(
        (record) => record.role === "Student"
    ).length;

    const trainerCount = records.filter(
        (record) => record.role === "Trainer"
    ).length;

    const counsellorCount = records.filter(
        (record) => record.role === "Counsellor"
    ).length;

    const stats = [
        {
            title: "Total Students",
            value: studentCount,
            icon: GraduationCap,
            color: "bg-blue-100 text-blue-700",
        },
        {
            title: "Total Trainers",
            value: trainerCount,
            icon: Users,
            color: "bg-purple-100 text-purple-700",
        },
        {
            title: "Total Counsellors",
            value: counsellorCount,
            icon: ShieldCheck,
            color: "bg-emerald-100 text-emerald-700",
        },
        {
            title: "Total IDs Generated",
            value: records.length,
            icon: IdCard,
            color: "bg-orange-100 text-orange-700",
        },
    ];

    return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">

                {/* Page heading */}
                <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="mb-2 text-sm font-medium text-blue-600">
                            Admin Portal / Account Management
                        </p>

                        <h1 className="text-2xl font-bold text-[#102e60] sm:text-3xl">
                            ID & Password Generation
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Create Student, Trainer, and Counsellor
                            credentials.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={exportCSV}
                        disabled={records.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#102e60] hover:bg-blue-50 disabled:opacity-50"
                    >
                        <Download size={18} />
                        Export Records
                    </button>
                </div>

                {/* Notification */}
                {message && (
                    <div
                        role="status"
                        className={`mb-6 rounded-lg p-4 text-sm ${
                            messageType === "error"
                                ? "border border-red-200 bg-red-50 text-red-700"
                                : "border border-green-200 bg-green-50 text-green-700"
                        }`}
                    >
                        {message}
                    </div>
                )}

                {/* Statistics */}
                <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <div
                                key={stat.title}
                                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        {stat.title}
                                    </p>

                                    <div className={`rounded-lg p-3 ${stat.color}`}>
                                        <Icon size={22} />
                                    </div>
                                </div>

                                <h2 className="mt-4 text-3xl font-bold text-[#102e60]">
                                    {stat.value.toLocaleString("en-IN")}
                                </h2>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">

                    {/* Generate credentials form */}
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-1">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
                                <UserPlus size={22} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-[#102e60]">
                                    Generate Credentials
                                </h2>

                                <p className="text-xs text-slate-500">
                                    Create a new user record
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-5">

                            {/* Role */}
                            <div>
                                <label
                                    htmlFor="role"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Select Role
                                </label>

                                <select
                                    id="role"
                                    value={role}
                                    onChange={(event) =>
                                        setRole(event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="Student">Student</option>
                                    <option value="Trainer">Trainer</option>
                                    <option value="Counsellor">Counsellor</option>
                                </select>

                                <p className="mt-2 text-xs text-slate-500">
                                    ID format:{" "}
                                    <span className="font-bold text-blue-700">
                                        {roleConfig[role].prefix}
                                        {new Date().getFullYear()}XXXX
                                    </span>
                                </p>
                            </div>

                            {/* Name */}
                            <div>
                                <label
                                    htmlFor="name"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Full Name
                                </label>

                                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500">
                                    <Users size={18} className="text-slate-400" />

                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                        placeholder="Enter full name"
                                        maxLength={100}
                                        required
                                        className="w-full py-3 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Email Address
                                </label>

                                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500">
                                    <Mail size={18} className="text-slate-400" />

                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        placeholder="Enter email address"
                                        maxLength={254}
                                        required
                                        className="w-full py-3 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            {/* Batch */}
                            {role === "Student" && (
                                <div>
                                    <label
                                        htmlFor="batch"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Batch
                                    </label>

                                    <input
                                        id="batch"
                                        type="text"
                                        value={batch}
                                        onChange={(event) =>
                                            setBatch(event.target.value)
                                        }
                                        placeholder="e.g. MERN-07"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* Department */}
                            {role !== "Student" && (
                                <div>
                                    <label
                                        htmlFor="department"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Department
                                    </label>

                                    <input
                                        id="department"
                                        type="text"
                                        value={department}
                                        onChange={(event) =>
                                            setDepartment(event.target.value)
                                        }
                                        placeholder={
                                            role === "Trainer"
                                                ? "Technical Training"
                                                : "Admissions"
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!ready}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                                <RefreshCw size={17} />
                                Generate ID & Password
                            </button>
                        </form>

                        {/* Generated credentials */}
                        {generatedRecord && (
                            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                                <div className="flex items-center gap-2 text-green-700">
                                    <Check size={19} />

                                    <h3 className="text-sm font-bold">
                                        Credentials Generated
                                    </h3>
                                </div>

                                <p className="mt-4 text-xs text-slate-500">
                                    Full Name
                                </p>

                                <p className="mt-1 font-semibold text-slate-800">
                                    {generatedRecord.name}
                                </p>

                                <p className="mt-4 text-xs text-slate-500">
                                    Generated ID
                                </p>

                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <span className="break-all text-lg font-bold text-[#102e60]">
                                        {generatedRecord.id}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCopy(
                                                generatedRecord.id,
                                                "ID"
                                            )
                                        }
                                        aria-label="Copy generated ID"
                                        className="shrink-0 rounded-lg border border-green-200 bg-white p-2 text-green-700 hover:bg-green-100"
                                    >
                                        {copiedValue === generatedRecord.id ? (
                                            <Check size={18} />
                                        ) : (
                                            <Copy size={18} />
                                        )}
                                    </button>
                                </div>

                                <p className="mt-4 text-xs text-slate-500">
                                    Temporary Password
                                </p>

                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <span className="break-all font-mono text-base font-bold text-[#102e60]">
                                        {showGeneratedPassword
                                            ? generatedRecord.password
                                            : "•".repeat(12)}
                                    </span>

                                    <div className="flex shrink-0 gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowGeneratedPassword(
                                                    (previous) => !previous
                                                )
                                            }
                                            aria-label={
                                                showGeneratedPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            className="rounded-lg border border-green-200 bg-white p-2 text-green-700 hover:bg-green-100"
                                        >
                                            {showGeneratedPassword ? (
                                                <EyeOff size={17} />
                                            ) : (
                                                <Eye size={17} />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(
                                                    generatedRecord.password,
                                                    "Password"
                                                )
                                            }
                                            aria-label="Copy temporary password"
                                            className="rounded-lg border border-green-200 bg-white p-2 text-green-700 hover:bg-green-100"
                                        >
                                            {copiedValue === generatedRecord.password ? (
                                                <Check size={17} />
                                            ) : (
                                                <Copy size={17} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleCopy(
                                            `Role: ${generatedRecord.role}\nName: ${generatedRecord.name}\nID: ${generatedRecord.id}\nTemporary Password: ${generatedRecord.password}`,
                                            "Credentials"
                                        )
                                    }
                                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-3 text-sm font-semibold text-white hover:bg-green-800"
                                >
                                    <Copy size={17} />
                                    Copy All Credentials
                                </button>

                                <p className="mt-3 text-xs leading-5 text-slate-600">
                                    Demo only: these credentials are stored
                                    in browser storage and are not yet
                                    connected to the login backend.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Records table */}
                    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-[#102e60]">
                                Generated Credentials
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Search and manage registered records.
                            </p>
                        </div>

                        {/* Search and filter */}
                        <div className="mb-5 flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search ID, name, or email..."
                                    className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <select
                                value={filterRole}
                                onChange={(event) =>
                                    setFilterRole(event.target.value)
                                }
                                aria-label="Filter by role"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="All">All Roles</option>
                                <option value="Student">Students</option>
                                <option value="Trainer">Trainers</option>
                                <option value="Counsellor">Counsellors</option>
                            </select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[650px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-3 py-4 text-xs font-bold uppercase text-slate-500">
                                            Person
                                        </th>

                                        <th className="px-3 py-4 text-xs font-bold uppercase text-slate-500">
                                            ID
                                        </th>

                                        <th className="px-3 py-4 text-xs font-bold uppercase text-slate-500">
                                            Role
                                        </th>

                                        <th className="px-3 py-4 text-xs font-bold uppercase text-slate-500">
                                            Status
                                        </th>

                                        <th className="px-3 py-4 text-xs font-bold uppercase text-slate-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                        >
                                            <td className="px-3 py-4">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {record.name}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {record.email}
                                                </p>
                                            </td>

                                            <td className="px-3 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-blue-700">
                                                        {record.id}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleCopy(
                                                                record.id,
                                                                "ID"
                                                            )
                                                        }
                                                        aria-label={`Copy ${record.id}`}
                                                        className="text-slate-400 hover:text-blue-600"
                                                    >
                                                        {copiedValue === record.id ? (
                                                            <Check size={15} />
                                                        ) : (
                                                            <Copy size={15} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="px-3 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleConfig[record.role].color}`}
                                                >
                                                    {record.role}
                                                </span>
                                            </td>

                                            <td className="px-3 py-4">
                                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                                    {record.status}
                                                </span>
                                            </td>

                                            <td className="px-3 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(record.id)
                                                    }
                                                    aria-label={`Delete ${record.id}`}
                                                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredRecords.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-3 py-12 text-center"
                                            >
                                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                    <IdCard size={24} />
                                                </div>

                                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                                    No records found
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Generate credentials or
                                                    change your filters.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-5 flex flex-col justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row">
                            <p>
                                Showing {filteredRecords.length} of{" "}
                                {records.length} records
                            </p>

                            <p>
                                <ShieldCheck
                                    size={14}
                                    className="mr-1 inline"
                                />
                                Admin ID Management
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
