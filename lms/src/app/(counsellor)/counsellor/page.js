
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
  Wallet,
  Receipt,
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

  if (["paid", "active", "completed", "success", "clear"].includes(value)) {
    return "bg-green-100 text-green-700";
  }

  if (["pending", "upcoming", "partial"].includes(value)) {
    return "bg-amber-100 text-amber-700";
  }

  if (["failed", "inactive", "cancelled", "refunded"].includes(value)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const storedUser =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") 

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function getObjectName(value, fields = ["name", "batch", "batchName", "courseName"]) {
  if (!value) return "—";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    for (const field of fields) {
      if (value[field]) return value[field];
    }
  }

  return "—";
}

function getStudentName(admission) {
  return (
    getObjectName(admission?.student, ["name", "fullName"]) !== "—"
      ? getObjectName(admission?.student, ["name", "fullName"])
      : admission?.studentName || admission?.name || "—"
  );
}

function getStudentEmail(admission) {
  return (
    admission?.student?.email ||
    admission?.email ||
    admission?.studentEmail ||
    "—"
  );
}

function getStudentId(admission) {
  return (
    admission?.student?.userId ||
    admission?.student?.studentId ||
    admission?.studentId ||
    admission?.userId ||
    "—"
  );
}

function getBatchName(admission) {
  return (
    getObjectName(admission?.batch, ["batch", "name", "batchName", "code"]) !== "—"
      ? getObjectName(admission?.batch, ["batch", "name", "batchName", "code"])
      : admission?.batchName || admission?.batchCode || "—"
  );
}

function getPaidAmount(admission) {
  return (
    Number(
      admission?.totalPaid ??
        admission?.paidAmount ??
        admission?.collectedFees ??
        admission?.totalCollected ??
        0
    ) || 0
  );
}

function getPendingAmount(admission) {
  return (
    Number(
      admission?.totalPending ??
        admission?.pendingAmount ??
        admission?.pendingFees ??
        0
    ) || 0
  );
}

function getAdmissionDate(admission) {
  return (
    admission?.admissionDate ||
    admission?.createdAt ||
    admission?.date ||
    admission?.student?.createdAt ||
    null
  );
}

function getFeeStatus(admission) {
  if (admission?.feeStatus) return admission.feeStatus;

  const pending = getPendingAmount(admission);

  return pending <= 0 ? "Paid" : "Pending";
}

export default function CounsellorDashboard() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [counsellorName, setCounsellorName] = useState("Counsellor");

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return "";

    return (
      sessionStorage.getItem("appwars_token") ||
      localStorage.getItem("appwars_token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("token") ||
      ""
    );
  }, []);

  const clearAuth = useCallback(() => {
    if (typeof window === "undefined") return;

    [
      "token",
      "appwars_token",
      "user",
      "appwars_user",
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
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
        const response = await fetch(getApiUrl("/counsellor/dashboard"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          clearAuth();
          router.replace("/signin");
          return;
        }

        if (response.status === 403) {
          throw new Error(
            "Access denied. Your account does not have permission to access this dashboard."
          );
        }

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message ||
              result.error ||
              `Unable to load dashboard (HTTP ${response.status}).`
          );
        }

        // Backend response:
        // {
        //   success: true,
        //   data: {
        //     month,
        //     metrics,
        //     recentAdmissions,
        //     feeStatus
        //   }
        // }

        const data = result.data ?? result.dashboard ?? result;

        setDashboard({
          ...data,
          metrics: data?.metrics || {},
          feeStatus: data?.feeStatus || {},
          recentAdmissions: Array.isArray(data?.recentAdmissions)
            ? data.recentAdmissions
            : [],
        });

        const user = getStoredUser();

        if (user) {
          const role = String(user.role || "").toLowerCase();

          if (role && role !== "counsellor" && role !== "admin") {
            router.replace("/signin");
            return;
          }

          setCounsellorName(
            user.name || user.fullName || user.userId || "Counsellor"
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
    [getToken, clearAuth, router]
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
    clearAuth();
    router.replace("/signin");
  };

  const metrics = dashboard?.metrics || {};
  const feeStatus = dashboard?.feeStatus || {};

  const recentAdmissions = Array.isArray(dashboard?.recentAdmissions)
    ? dashboard.recentAdmissions
    : [];

  const totalStudents = metrics.totalStudents ?? 0;
  const monthlyAdmissions = metrics.monthlyAdmissions ?? 0;
  const activeBatches = metrics.activeBatches ?? 0;

  const pendingFees = Number(feeStatus.totalPending ?? 0);
  const pendingFeeAccounts = metrics.pendingFeeAccounts ?? feeStatus.pending ?? 0;
  const totalCollected = Number(feeStatus.totalCollected ?? 0);
  const clearFeeAccounts = feeStatus.clear ?? 0;

  const cards = [
    {
      title: "Total Students",
      value: totalStudents,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
      description: "Students referred by you",
    },
    {
      title: "New Admissions",
      value: monthlyAdmissions,
      icon: UserPlus,
      color: "bg-purple-100 text-purple-700",
      description: dashboard?.month
        ? `Admissions in ${dashboard.month}`
        : "Admissions this month",
    },
    {
      title: "Active Batches",
      value: activeBatches,
      icon: GraduationCap,
      color: "bg-green-100 text-green-700",
      description: "Currently active batches",
    },
    {
      title: "Pending Fees",
      value: formatCurrency(pendingFees),
      icon: IndianRupee,
      color: "bg-amber-100 text-amber-700",
      description: `${pendingFeeAccounts} pending fee accounts`,
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

            {dashboard?.month && (
              <p className="mt-1 text-xs font-medium text-blue-700">
                Reporting period: {dashboard.month}
              </p>
            )}
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

        {/* API Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">Dashboard could not be loaded</p>
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

        {/* Main Summary Cards */}
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

        {/* Fee Overview */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Fee Overview
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Collected
                  </p>

                  <p className="mt-3 text-2xl font-bold text-green-700">
                    {formatCurrency(totalCollected)}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Total fees received from your students
                  </p>
                </div>

                <div className="rounded-xl bg-green-100 p-3 text-green-700">
                  <Wallet size={22} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Outstanding Fees
                  </p>

                  <p className="mt-3 text-2xl font-bold text-amber-700">
                    {formatCurrency(pendingFees)}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    {pendingFeeAccounts} students with pending fees
                  </p>
                </div>

                <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                  <Clock size={22} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Fee Accounts Cleared
                  </p>

                  <p className="mt-3 text-2xl font-bold text-blue-800">
                    {clearFeeAccounts}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Students with cleared fees
                  </p>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-800">
                  <Receipt size={22} />
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Quick Actions */}
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
                description: "View your referred students",
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

        {/* Recent Admissions */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">Recent Admissions</h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest students referred by you
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
              <Users className="mx-auto text-gray-400" size={32} />

              <p className="mt-3 font-medium text-gray-700">
                No recent admissions found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Students referred by you will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Student ID</th>
                    <th className="px-5 py-3 font-semibold">Batch</th>
                    <th className="px-5 py-3 font-semibold">Admission Date</th>
                    <th className="px-5 py-3 font-semibold">Paid Amount</th>
                    <th className="px-5 py-3 font-semibold">Pending Amount</th>
                    <th className="px-5 py-3 font-semibold">Fee Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentAdmissions.map((admission, index) => {
                    const paid = getPaidAmount(admission);
                    const pending = getPendingAmount(admission);
                    const status = getFeeStatus(admission);

                    return (
                      <tr
                        key={admission?._id || admission?.student?._id || index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {getStudentName(admission)}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {getStudentEmail(admission)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {getStudentId(admission)}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {getBatchName(admission)}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(getAdmissionDate(admission))}
                        </td>

                        <td className="px-5 py-4 font-medium text-green-700">
                          {formatCurrency(paid)}
                        </td>

                        <td className="px-5 py-4 font-medium text-amber-700">
                          {formatCurrency(pending)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              status
                            )}`}
                          >
                            {status}
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

        {/* Fee Status Summary */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">
                Fee Status Summary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Payment account summary for your referred students
              </p>
            </div>

            <IndianRupee size={22} className="text-blue-800" />
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-medium text-green-700">
                Cleared Accounts
              </p>

              <p className="mt-2 text-2xl font-bold text-green-800">
                {feeStatus.clear ?? 0}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-700">
                Pending Accounts
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-800">
                {feeStatus.pending ?? pendingFeeAccounts}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-700">
                Total Collected
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-800">
                {formatCurrency(feeStatus.totalCollected)}
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-700">
                Total Pending
              </p>

              <p className="mt-2 text-2xl font-bold text-orange-800">
                {formatCurrency(feeStatus.totalPending)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <CheckCircle size={15} />
            Fee summary is loaded directly from the counsellor dashboard API.
          </div>
        </section>
      </div>
    </main>
  );
}
