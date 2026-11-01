
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Eye,
  EyeOff,
  AlertCircle,
  X,
  LoaderCircle,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| API Configuration
|--------------------------------------------------------------------------
| If NEXT_PUBLIC_API_URL=http://localhost:5000, the endpoint becomes:
| http://localhost:5000/api/admin/users
|
| If NEXT_PUBLIC_API_URL=http://localhost:5000/api, it also works.
*/

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_ROOT.endsWith("/api")
  ? API_ROOT
  : `${API_ROOT}/api`;

const USERS_ENDPOINT = `${API_URL}/admin/users`;

const ROLES = ["Student", "Trainer", "Counsellor"];

const ROLE_STYLES = {
  Student: "bg-blue-100 text-blue-700",
  Trainer: "bg-purple-100 text-purple-700",
  Counsellor: "bg-emerald-100 text-emerald-700",
};

const INITIAL_FORM = {
  name: "",
  email: "",
  role: "Student",
  batch: "",
};

/*
|--------------------------------------------------------------------------
| API Helpers
|--------------------------------------------------------------------------
*/

function getToken() {
  if (typeof window === "undefined") return "";

  return sessionStorage.getItem("token") || "";
}

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

/*
|--------------------------------------------------------------------------
| Normalize API Responses
|--------------------------------------------------------------------------
*/

function mapUser(user = {}) {
  return {
    id: String(user.userId || user.id || user._id || ""),
    name: user.name || "",
    email: user.email || "",
    role: user.role || "",
    batch: user.batch || "",
    status: user.isActive === false ? "Inactive" : "Active",
    createdAt: user.createdAt || "",
  };
}

function extractUsers(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.users)) return data.users;

  if (Array.isArray(data?.data?.users)) return data.data.users;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function extractCreatedUser(data) {
  return (
    data?.user ||
    data?.data?.user ||
    (data?.data && !Array.isArray(data.data) ? data.data : {}) ||
    {}
  );
}

function extractCredentials(data) {
  return data?.credentials || data?.data?.credentials || {};
}

function escapeCSV(value) {
  let text = String(value ?? "");

  // Prevent spreadsheet formula injection in exported user-controlled fields.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

export default function IDGenerationPage() {
  const [records, setRecords] = useState([]);

  const [form, setForm] = useState(INITIAL_FORM);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  const [generatedRecord, setGeneratedRecord] = useState(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copiedValue, setCopiedValue] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [ready, setReady] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState("");

  const notify = useCallback((text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const updateForm = useCallback((field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load Users
  |--------------------------------------------------------------------------
  */

  const loadRecords = useCallback(async () => {
    if (!getToken()) {
      setRecords([]);
      setReady(true);
      setLoadingRecords(false);
      notify("Please log in as Admin to manage user accounts.", "error");
      return;
    }

    setLoadingRecords(true);

    try {
      const data = await apiRequest(USERS_ENDPOINT);
      const users = extractUsers(data).map(mapUser);

      setRecords(users);
      setReady(true);
    } catch (error) {
      notify(
        getErrorMessage(error, "Unable to load users from the backend."),
        "error"
      );
      setReady(true);
    } finally {
      setLoadingRecords(false);
    }
  }, [notify]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  /*
  |--------------------------------------------------------------------------
  | Create User and Generate Credentials
  |--------------------------------------------------------------------------
  */

  async function handleGenerate(event) {
    event.preventDefault();

    if (submitting) return;

    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      notify("Please enter the full name and email address.", "error");
      return;
    }

    if (!getToken()) {
      notify("Please log in as Admin first.", "error");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setGeneratedRecord(null);
    setCopiedValue("");

    try {
      const payload = {
        name: cleanName,
        email: cleanEmail,
        role: form.role,
      };

      if (form.role === "Student" && form.batch.trim()) {
        payload.batch = form.batch.trim();
      }

      const data = await apiRequest(USERS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const user = extractCreatedUser(data);
      const credentials = extractCredentials(data);

      const generatedId =
        credentials.userId ||
        data?.userId ||
        data?.data?.userId ||
        user?.userId ||
        user?.id ||
        user?._id;

      const temporaryPassword =
        credentials.temporaryPassword ||
        data?.temporaryPassword ||
        data?.data?.temporaryPassword ||
        "";

      /*
       * The account may already have been created even if the backend
       * does not return the credentials expected by the frontend.
       * Do not silently retry the POST, as this could create a duplicate.
       */
      if (!generatedId || !temporaryPassword) {
        await loadRecords();

        throw new Error(
          !generatedId
            ? "The account response did not include a generated ID. Check your backend createUser controller."
            : "The account may have been created, but the temporary password was not returned. Check the backend response before trying again."
        );
      }

      const newRecord = {
        ...mapUser(user),
        id: String(generatedId),
        name: user?.name || cleanName,
        email: user?.email || cleanEmail,
        role: user?.role || form.role,
        batch:
          user?.batch ||
          (form.role === "Student" ? form.batch.trim() : ""),
        status: user?.isActive === false ? "Inactive" : "Active",
        password: temporaryPassword,
      };

      setGeneratedRecord(newRecord);
      setShowPassword(true);
      setForm(INITIAL_FORM);

      notify(
        `${newRecord.role} account created. Save the temporary password securely.`
      );

      await loadRecords();
    } catch (error) {
      notify(
        getErrorMessage(error, "Unable to create the account."),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Copy Credentials
  |--------------------------------------------------------------------------
  */

  async function handleCopy(value, label) {
    if (!value) {
      notify(`No ${label.toLowerCase()} is available to copy.`, "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));

      setCopiedValue(String(value));
      notify(`${label} copied successfully.`);
    } catch {
      notify(
        "Copy failed. Please select and copy the value manually.",
        "error"
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Deactivate User
  |--------------------------------------------------------------------------
  */

  async function handleDelete(id) {
    const record = records.find((item) => item.id === id);

    if (!record || record.status === "Inactive") return;

    const confirmed = window.confirm(
      `Deactivate ${record.name} (${record.id})? They will no longer be able to log in.`
    );

    if (!confirmed) return;

    if (!getToken()) {
      notify("Please log in as Admin first.", "error");
      return;
    }

    setDeactivatingId(id);

    try {
      await apiRequest(
        `${USERS_ENDPOINT}/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      setRecords((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, status: "Inactive" } : item
        )
      );

      if (generatedRecord?.id === id) {
        setGeneratedRecord(null);
      }

      notify(`User ${id} has been deactivated.`);
    } catch (error) {
      notify(
        getErrorMessage(error, "Unable to deactivate this user."),
        "error"
      );
    } finally {
      setDeactivatingId("");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Export CSV
  |--------------------------------------------------------------------------
  | Passwords are never exported.
  */

  function exportCSV() {
    if (!records.length) {
      notify("There are no records to export.", "error");
      return;
    }

    const headings = [
      "ID",
      "Name",
      "Email",
      "Role",
      "Batch",
      "Status",
      "Created At",
    ];

    const rows = records.map((record) => [
      record.id,
      record.name,
      record.email,
      record.role,
      record.batch,
      record.status,
      record.createdAt
        ? new Date(record.createdAt).toLocaleDateString("en-IN")
        : "",
    ]);

    const csv = [headings, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appwars-user-records.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  /*
  |--------------------------------------------------------------------------
  | Search, Filters, and Statistics
  |--------------------------------------------------------------------------
  */

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch = [
        record.id,
        record.name,
        record.email,
        record.role,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesRole =
        filterRole === "All" || record.role === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [records, search, filterRole]);

  const stats = useMemo(() => {
    const counts = {
      Student: 0,
      Trainer: 0,
      Counsellor: 0,
    };

    records.forEach((record) => {
      if (record.role in counts) {
        counts[record.role] += 1;
      }
    });

    return [
      {
        title: "Total Students",
        value: counts.Student,
        icon: GraduationCap,
        color: "bg-blue-100 text-blue-700",
      },
      {
        title: "Total Trainers",
        value: counts.Trainer,
        icon: Users,
        color: "bg-purple-100 text-purple-700",
      },
      {
        title: "Total Counsellors",
        value: counts.Counsellor,
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
  }, [records]);

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-600">
              Admin Portal / Account Management
            </p>

            <h1 className="text-2xl font-bold text-[#102e60] sm:text-3xl">
              ID &amp; Password Generation
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create and manage Student, Trainer, and Counsellor accounts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadRecords}
              disabled={loadingRecords}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#102e60] hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={loadingRecords ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={!records.length}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#102e60] hover:bg-blue-50 disabled:opacity-50"
            >
              <Download size={18} />
              Export Records
            </button>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div
            role="status"
            className={`mb-6 flex items-start justify-between gap-3 rounded-lg border p-4 text-sm ${
              messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            <span className="flex items-start gap-2">
              {messageType === "error" ? (
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
              ) : (
                <Check size={18} className="mt-0.5 shrink-0" />
              )}
              {message}
            </span>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss notification"
              className="shrink-0"
            >
              <X size={17} />
            </button>
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
                  <p className="text-sm text-slate-500">{stat.title}</p>

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
          {/* Create User */}
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
                  Create a real user account
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Select Role
                </label>

                <select
                  id="role"
                  value={form.role}
                  onChange={(event) => {
                    updateForm("role", event.target.value);
                    updateForm("batch", "");
                  }}
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  The backend generates the ID and temporary password.
                </p>
              </div>

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
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    placeholder="Enter full name"
                    maxLength={100}
                    minLength={2}
                    autoComplete="name"
                    required
                    disabled={submitting}
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>

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
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    placeholder="Enter email address"
                    maxLength={254}
                    autoComplete="email"
                    required
                    disabled={submitting}
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {form.role === "Student" && (
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
                    value={form.batch}
                    onChange={(event) =>
                      updateForm("batch", event.target.value)
                    }
                    placeholder="e.g. MERN-07"
                    maxLength={100}
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!ready || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <UserPlus size={17} />
                )}

                {submitting ? "Creating Account..." : "Generate ID & Password"}
              </button>
            </form>

            {/* Generated Credentials */}
            {generatedRecord && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Check size={19} />
                  <h3 className="text-sm font-bold">
                    Account Created Successfully
                  </h3>
                </div>

                <p className="mt-4 text-xs text-slate-500">Full Name</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {generatedRecord.name}
                </p>

                <p className="mt-4 text-xs text-slate-500">Email Address</p>
                <p className="mt-1 break-all font-medium text-slate-800">
                  {generatedRecord.email}
                </p>

                <p className="mt-4 text-xs text-slate-500">Role</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {generatedRecord.role}
                </p>

                <p className="mt-4 text-xs text-slate-500">Generated User ID</p>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="break-all text-lg font-bold text-[#102e60]">
                    {generatedRecord.id}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopy(generatedRecord.id, "ID")}
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

                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Temporary Password
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff size={14} />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        Show
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-white p-3">
                  <span className="break-all font-mono text-base font-bold text-[#102e60]">
                    {showPassword
                      ? generatedRecord.password
                      : "•".repeat(
                          Math.min(generatedRecord.password.length, 16)
                        )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(generatedRecord.password, "Password")
                    }
                    aria-label="Copy temporary password"
                    className="shrink-0 rounded-lg border border-green-200 bg-white p-2 text-green-700 hover:bg-green-100"
                  >
                    {copiedValue === generatedRecord.password ? (
                      <Check size={17} />
                    ) : (
                      <Copy size={17} />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      [
                        `Role: ${generatedRecord.role}`,
                        `Name: ${generatedRecord.name}`,
                        `Email: ${generatedRecord.email}`,
                        `ID: ${generatedRecord.id}`,
                        `Temporary Password: ${generatedRecord.password}`,
                      ].join("\n"),
                      "Credentials"
                    )
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-3 text-sm font-semibold text-white hover:bg-green-800"
                >
                  <Copy size={17} />
                  Copy All Credentials
                </button>

                <p className="mt-3 text-xs leading-5 text-slate-600">
                  Save these credentials securely. Passwords are not included
                  in the CSV export.
                </p>
              </div>
            )}
          </section>

          {/* Registered Users */}
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-[#102e60]">
                Registered Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                User records are loaded from your backend.
              </p>
            </div>

            {/* Search and Filter */}
            <div className="mb-5 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ID, name, or email..."
                  className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={filterRole}
                onChange={(event) => setFilterRole(event.target.value)}
                aria-label="Filter by role"
                className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All Roles</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}s
                  </option>
                ))}
              </select>
            </div>

            {/* Users Table */}
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
                            {record.id || "—"}
                          </span>

                          {record.id && (
                            <button
                              type="button"
                              onClick={() => handleCopy(record.id, "ID")}
                              aria-label={`Copy ${record.id}`}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              {copiedValue === record.id ? (
                                <Check size={15} />
                              ) : (
                                <Copy size={15} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ROLE_STYLES[record.role] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {record.role || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            record.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          disabled={
                            !record.id ||
                            record.status === "Inactive" ||
                            deactivatingId === record.id
                          }
                          aria-label={`Deactivate ${record.id}`}
                          title={
                            record.status === "Inactive"
                              ? "Already inactive"
                              : "Deactivate user"
                          }
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deactivatingId === record.id ? (
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          {loadingRecords ? (
                            <LoaderCircle
                              size={24}
                              className="animate-spin"
                            />
                          ) : (
                            <IdCard size={24} />
                          )}
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          {loadingRecords
                            ? "Loading users..."
                            : "No records found"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {loadingRecords
                            ? "Please wait while users are fetched."
                            : "Create a user or change your search and filters."}
                        </p>

                        {!loadingRecords && messageType === "error" && (
                          <button
                            type="button"
                            onClick={loadRecords}
                            className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Try again
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row">
              <p>
                Showing {filteredRecords.length} of {records.length} records
              </p>

              <p>
                <ShieldCheck size={14} className="mr-1 inline" />
                Admin ID Management
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
