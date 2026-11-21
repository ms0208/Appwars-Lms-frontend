
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  Users,
  GraduationCap,
  BookOpen,
  Wallet,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  UserPlus,
  Layers,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const INITIAL_STATS = [
  {
    title: "Total Students",
    value: "—",
    change: "Loading students...",
    icon: Users,
  },
  {
    title: "Total Trainers",
    value: "—",
    change: "Loading trainers...",
    icon: GraduationCap,
  },
  {
    title: "Active Batches",
    value: "—",
    change: "Loading batches...",
    icon: BookOpen,
  },
  {
    title: "Remaining Fees",
    value: "—",
    change: "Loading payments...",
    icon: Wallet,
  },
];

// --------------------------------------------------
// FORMAT HELPERS
// --------------------------------------------------

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --------------------------------------------------
// AUTH TOKEN
// --------------------------------------------------

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

// --------------------------------------------------
// EXTRACT PAYMENT RECORDS
// --------------------------------------------------

function getPaymentRecords(result) {
  if (!result) return [];

  if (Array.isArray(result.payments)) {
    return result.payments;
  }

  if (Array.isArray(result.data?.payments)) {
    return result.data.payments;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (Array.isArray(result)) {
    return result;
  }

  return [];
}

// --------------------------------------------------
// CALCULATE REMAINING FEES
// --------------------------------------------------

function calculateRemainingFees(payments) {
  return payments.reduce((total, payment) => {
    const amount = Number(
      payment.totalFees ?? payment.amount ?? 0
    );

    const collected = Number(
      payment.collectedFees ??
        (payment.status === "Paid" ? amount : 0)
    );

    let remaining = 0;

    if (
      payment.pendingFees !== undefined &&
      payment.pendingFees !== null
    ) {
      remaining = Number(payment.pendingFees);
    } else if (
      payment.collectedFees !== undefined &&
      payment.collectedFees !== null
    ) {
      remaining = amount - collected;
    } else {
      remaining =
        payment.status === "Pending" ? amount : 0;
    }

    if (!Number.isFinite(remaining)) {
      remaining = 0;
    }

    return total + Math.max(0, remaining);
  }, 0);
}

// --------------------------------------------------
// CREATE RECENT ACTIVITIES
// --------------------------------------------------

function createRecentActivities(data) {
  const activities = [];

  // Recent students
  (data.recentStudents || []).forEach((student) => {
    activities.push({
      type: "student",
      text: `${student.name || "New student"} added to the LMS`,
      date: student.createdAt,
      icon: UserPlus,
    });
  });

  // Recent batches
  (data.recentBatches || []).forEach((batch) => {
    const batchName =
      batch.batch ||
      batch.batchName ||
      batch.name ||
      "New batch";

    const trainerName =
      batch.trainer?.name ||
      batch.trainerName ||
      "";

    activities.push({
      type: "batch",
      text: trainerName
        ? `${batchName} batch updated — Trainer: ${trainerName}`
        : `${batchName} batch updated`,
      date: batch.createdAt,
      icon: Layers,
    });
  });

  // Recent payments
  (data.recentPayments || []).forEach((payment) => {
    const studentName =
      payment.student?.name ||
      payment.studentName ||
      "Student";

    activities.push({
      type: "payment",
      text: `Payment record updated for ${studentName}`,
      date: payment.createdAt,
      icon: CreditCard,
    });
  });

  return activities
    .filter((activity) => activity.date)
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, 8);
}

// --------------------------------------------------
// MAIN ADMIN DASHBOARD
// --------------------------------------------------

export default function AdminDashboard() {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // API REQUEST
  // --------------------------------------------------

  const apiRequest = useCallback(async (endpoint, token) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Request failed (${response.status})`
      );
    }

    return result;
  }, []);

  // --------------------------------------------------
  // FETCH DASHBOARD
  // --------------------------------------------------

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      // Dashboard and payment API
      const [dashboardResult, paymentResult] =
        await Promise.all([
          apiRequest("/api/admin/dashboard", token),

          apiRequest(
            "/api/admin/payments?limit=500&page=1",
            token
          ).catch((err) => {
            console.error("Payment loading error:", err);
            return null;
          }),
        ]);

      // --------------------------------------------------
      // DASHBOARD DATA
      // --------------------------------------------------

      const dashboardData =
        dashboardResult.data || dashboardResult;

      const dashboardStats =
        dashboardData.stats ||
        dashboardData.metrics ||
        {};

      // --------------------------------------------------
      // PAYMENT DATA
      // --------------------------------------------------

      const paymentRecords = getPaymentRecords(paymentResult);

      const pendingAmount =
        calculateRemainingFees(paymentRecords);

      // --------------------------------------------------
      // UPDATE STATISTICS
      // --------------------------------------------------

      setStats([
        {
          title: "Total Students",
          value: formatNumber(
            dashboardStats.totalStudents
          ),
          change: "Registered students",
          icon: Users,
        },
        {
          title: "Total Trainers",
          value: formatNumber(
            dashboardStats.totalTrainers
          ),
          change: "Registered trainers",
          icon: GraduationCap,
        },
        {
          title: "Active Batches",
          value: formatNumber(
            dashboardStats.activeBatches
          ),
          change: "Currently running batches",
          icon: BookOpen,
        },
        {
          title: "Remaining Fees",
          value: paymentResult
            ? formatCurrency(pendingAmount)
            : "Unavailable",
          change: paymentResult
            ? "Outstanding student fee balance"
            : "Unable to load payment records",
          icon: Wallet,
        },
      ]);

      // --------------------------------------------------
      // RECENT ACTIVITY
      // --------------------------------------------------

      const backendActivities =
        dashboardData.recentActivity ||
        dashboardData.activities ||
        [];

      if (backendActivities.length > 0) {
        setActivities(
          backendActivities.map((activity) => ({
            type: "activity",
            text: activity.text || "Recent activity",
            date: activity.date || activity.createdAt,
            icon: Clock,
          }))
        );
      } else {
        setActivities(createRecentActivities(dashboardData));
      }
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // --------------------------------------------------
  // QUICK ACTIONS
  // --------------------------------------------------

  const quickActions = [
    {
      label: "Manage Students",
      href: "/admin/students",
      icon: Users,
    },
    {
      label: "Manage Trainers",
      href: "/admin/trainers",
      icon: GraduationCap,
    },
    {
      label: "Manage Batches",
      href: "/admin/batches",
      icon: BookOpen,
    },
    {
      label: "Payment Reports",
      href: "/admin/payments",
      icon: Wallet,
    },
  ];

  // --------------------------------------------------
  // ACTIVITY ICON
  // --------------------------------------------------

  const getActivityIcon = (type) => {
    switch (type) {
      case "student":
        return UserPlus;
      case "batch":
        return Layers;
      case "payment":
        return CreditCard;
      default:
        return Clock;
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">
            Welcome to Admin Portal
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage students, trainers, batches, and payments.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#102f63] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={fetchDashboard}
            className="rounded-lg border border-red-300 px-3 py-2 font-semibold transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-3 break-words text-3xl font-bold text-[#102f63]">
                    {stat.value}
                  </h2>

                  <p className="mt-3 text-xs text-slate-500">
                    {loading
                      ? "Fetching data..."
                      : stat.change}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-[#102f63]">
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK ACTIONS AND RECENT ACTIVITY */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* QUICK ACTIONS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#102f63]">
              Quick Actions
            </h2>

            <CheckCircle2
              size={19}
              className="text-green-600"
            />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Quickly access your LMS management sections.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="rounded-lg bg-blue-50 p-2.5 text-[#102f63] transition group-hover:bg-white">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#102f63]">
                      {action.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Open section
                    </p>
                  </div>

                  <span className="text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#102f63]">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#102f63]">
                Recent Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest updates from your LMS.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#102f63]">
              {activities.length} records
            </span>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-slate-100" />
                      <div className="h-2 w-1/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="max-h-[340px] space-y-4 overflow-y-auto pr-2">
                {activities.map((activity, index) => {
                  const Icon =
                    activity.icon ||
                    getActivityIcon(activity.type);

                  return (
                    <div
                      key={`${activity.text}-${index}`}
                      className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#102f63]">
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700">
                          {activity.text}
                        </p>

                        {activity.date && (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(activity.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Clock
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  No recent activity available.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  New LMS updates will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
