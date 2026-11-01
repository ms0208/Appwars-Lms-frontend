"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  GraduationCap,
  IndianRupee,
  Clock,
  RefreshCw,
  AlertCircle,
  LogOut,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ArrowUpRight,
} from "lucide-react";

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (API_ROOT.endsWith("/api")) {
    return `${API_ROOT}${
      normalizedPath.startsWith("/api/")
        ? normalizedPath.slice(4)
        : normalizedPath
    }`;
  }

  return `${API_ROOT}/api${
    normalizedPath.startsWith("/api/")
      ? normalizedPath.slice(4)
      : normalizedPath
  }`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (["paid", "active", "completed", "success"].includes(value)) {
    return "bg-green-100 text-green-700";
  }

  if (["pending", "upcoming", "partial"].includes(value)) {
    return "bg-amber-100 text-amber-700";
  }

  if (["failed", "inactive", "cancelled"].includes(value)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

// Safely convert common backend response formats to arrays.
function toArray(value) {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.records)) return value.records;
  if (Array.isArray(value.payments)) return value.payments;
  if (Array.isArray(value.admissions)) return value.admissions;
  if (Array.isArray(value.students)) return value.students;
  if (Array.isArray(value.docs)) return value.docs;

  return [];
}

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const storedUser =
    sessionStorage.getItem("user") ||
    localStorage.getItem("user");

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

export default function CounsellorDashboard() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [counsellorName, setCounsellorName] = useState("Counsellor");

  // Support the token key used by the current sign-in page,
  // as well as the older APPWARS token key.
  const getToken = useCallback(() => {
    if (typeof window === "undefined") return "";

    return (
      sessionStorage.getItem("token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("appwars_token") ||
      localStorage.getItem("appwars_token") ||
      ""
    );
  }, []);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      const token = getToken();

      if (!token) {
        router.replace("/signin");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          getApiUrl("/counsellor/dashboard"),
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          sessionStorage.removeItem("token");
          localStorage.removeItem("token");
          sessionStorage.removeItem("appwars_token");
          localStorage.removeItem("appwars_token");
          sessionStorage.removeItem("appwars_user");
          localStorage.removeItem("appwars_user");

          router.replace("/signin");
          return;
        }

        if (response.status === 403) {
          setError(
            "Access denied. Your account does not have permission to access this dashboard."
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              `Unable to load dashboard (HTTP ${response.status}).`
          );
        }

        if (result.success === false) {
          throw new Error(result.message || "Unable to load dashboard.");
        }

        // Supports { data: {...} }, { dashboard: {...} }, or direct objects.
        const data = result.data ?? result.dashboard ?? result;

        setDashboard(
          data && typeof data === "object" ? data : {}
        );

        const user = getStoredUser();

        if (user) {
          const role = String(user.role || "").toLowerCase();

          if (
            role &&
            role !== "counsellor" &&
            role !== "admin"
          ) {
            router.replace("/signin");
            return;
          }

          setCounsellorName(
            user.name ||
              user.fullName ||
              user.userId ||
              "Counsellor"
          );
        }
      } catch (err) {
        setError(
          err.message ||
            "Unable to connect to the backend. Check that your API server is running."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, router]
  );

  useEffect(() => {
    const user = getStoredUser();

    if (user) {
      setCounsellorName(
        user.name || user.fullName || user.userId || "Counsellor"
      );
    }

    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    sessionStorage.removeItem("appwars_token");
    localStorage.removeItem("appwars_token");
    sessionStorage.removeItem("appwars_user");
    localStorage.removeItem("appwars_user");

    router.replace("/signin");
  };

  // Safely handle nested dashboard response formats.
  const metricsSource =
    dashboard?.metrics ||
    dashboard?.stats ||
    dashboard?.summary ||
    dashboard ||
    {};

  const metrics =
    metricsSource && typeof metricsSource === "object"
      ? metricsSource
      : {};

  const recentAdmissions = toArray(
    dashboard?.recentAdmissions ??
      dashboard?.admissions ??
      dashboard?.recentStudents ??
      dashboard?.students ??
      []
  );

  // FIX: feeStatus is always an array before rendering with .map().
  const rawFeeStatus =
    dashboard?.feeStatus ??
    dashboard?.fees ??
    dashboard?.recentPayments ??
    dashboard?.payments ??
    [];

  const feeStatus = toArray(rawFeeStatus);

  const cards = [
    {
      title: "Total Students",
      value:
        metrics.totalStudents ??
        metrics.activeStudents ??
        metrics.studentsCount ??
        0,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
      description: "Registered students",
    },
    {
      title: "New Admissions",
      value:
        metrics.monthlyAdmissions ??
        metrics.newAdmissions ??
        metrics.admissionsThisMonth ??
        0,
      icon: UserPlus,
      color: "bg-purple-100 text-purple-700",
      description: "Admissions this month",
    },
    {
      title: "Active Batches",
      value:
        metrics.activeBatches ??
        metrics.totalBatches ??
        0,
      icon: GraduationCap,
      color: "bg-green-100 text-green-700",
      description: "Available batches",
    },
    {
      title: "Pending Fees",
      value: formatCurrency(
        metrics.pendingFees ??
          metrics.totalPending ??
          metrics.pendingAmount ??
          (dashboard?.fees &&
          typeof dashboard.fees === "object" &&
          !Array.isArray(dashboard.fees)
            ? dashboard.fees.pending
            : 0) ??
          0
      ),
      icon: IndianRupee,
      color: "bg-amber-100 text-amber-700",
      description: "Outstanding amount",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">
            Loading counsellor dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">
              APPWARS LMS
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              Counsellor Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Welcome back, {counsellorName}. Here is your admissions overview.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </header>

        {/* API errors */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Dashboard could not be loaded
              </p>

              <p className="mt-1 text-sm">{error}</p>

              <button
                type="button"
                onClick={() => loadDashboard(true)}
                className="mt-3 text-sm font-semibold underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {card.title}
                    </p>

                    <p className="mt-3 break-words text-2xl font-bold text-gray-900">
                      {card.value}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {card.description}
                    </p>
                  </div>

                  <div className={`rounded-xl p-3 ${card.color}`}>
                    <Icon size={22} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Quick links */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Manage Admissions",
                description: "Add and update student admissions",
                icon: UserPlus,
                href: "/counsellor/admissions",
              },
              {
                title: "Student Records",
                description: "View registered students",
                icon: Users,
                href: "/counsellor/students",
              },
              {
                title: "Batches",
                description: "Check courses and batch assignments",
                icon: BookOpen,
                href: "/counsellor/batches",
              },
              {
                title: "Schedule",
                description: "Review your schedule",
                icon: CalendarDays,
                href: "/counsellor/schedule",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm"
                >
                  <span className="rounded-lg bg-blue-50 p-3 text-blue-900">
                    <Icon size={21} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900">
                      {item.title}
                    </span>

                    <span className="mt-1 block text-xs text-gray-500">
                      {item.description}
                    </span>
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="text-gray-400 group-hover:text-blue-800"
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent admissions */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">
                Recent Admissions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest students registered in the system
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/counsellor/admissions")}
              className="text-sm font-semibold text-blue-800 hover:underline"
            >
              View all
            </button>
          </div>

          {recentAdmissions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Users
                className="mx-auto text-gray-400"
                size={32}
              />

              <p className="mt-3 font-medium text-gray-700">
                No recent admissions found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                New student admissions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Student ID</th>
                    <th className="px-5 py-3 font-semibold">Batch</th>
                    <th className="px-5 py-3 font-semibold">Admission Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentAdmissions.map((admission, index) => {
                    const student =
                      admission?.student &&
                      typeof admission.student === "object"
                        ? admission.student
                        : admission;

                    const batch =
                      student?.batch &&
                      typeof student.batch === "object"
                        ? student.batch.batch ||
                          student.batch.batchName ||
                          student.batch.name ||
                          "—"
                        : student?.batch || "—";

                    const id =
                      student?._id ||
                      student?.id ||
                      student?.userId ||
                      `admission-${index}`;

                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {student?.name || "—"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {student?.email || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {student?.userId || "—"}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {batch}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(
                            admission?.createdAt || student?.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              student?.isActive === false
                                ? "inactive"
                                : admission?.status || "active"
                            )}`}
                          >
                            {student?.isActive === false
                              ? "Inactive"
                              : admission?.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Fee status */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">Fee Status</h2>

              <p className="mt-1 text-sm text-gray-500">
                Recent payment and outstanding-fee information
              </p>
            </div>

            <IndianRupee
              size={22}
              className="text-blue-800"
            />
          </div>

          {feeStatus.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Clock
                className="mx-auto text-gray-400"
                size={30}
              />

              <p className="mt-3 text-sm text-gray-500">
                No fee-status records are available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Payment Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {feeStatus.map((fee, index) => {
                    const student =
                      fee?.student &&
                      typeof fee.student === "object"
                        ? fee.student
                        : null;

                    return (
                      <tr
                        key={fee?._id || fee?.id || `fee-${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {student?.name ||
                            fee?.studentName ||
                            fee?.name ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {formatCurrency(
                            fee?.amount ??
                              fee?.totalAmount ??
                              0
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              fee?.status
                            )}`}
                          >
                            {fee?.status || "Pending"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(
                            fee?.paymentDate || fee?.createdAt
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <CheckCircle size={15} />
            Fee information is loaded from your authenticated backend response.
          </div>
        </section>
      </div>
    </main>
  );
}
