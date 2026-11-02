
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
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const INITIAL_STATS = [
  {
    title: "Total Students",
    value: "—",
    change: "Loading...",
    icon: Users,
  },
  {
    title: "Total Trainers",
    value: "—",
    change: "Loading...",
    icon: GraduationCap,
  },
  {
    title: "Active Courses",
    value: "—",
    change: "Loading...",
    icon: BookOpen,
  },
  {
    title: "Pending Payments",
    value: "—",
    change: "Loading...",
    icon: Wallet,
  },
];

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
// MAIN DASHBOARD
// --------------------------------------------------

export default function AdminDashboard() {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // API REQUEST
  // --------------------------------------------------

  const apiRequest = async (endpoint, token) => {
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
  };

  // --------------------------------------------------
  // FETCH DASHBOARD DATA
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

      // Fetch dashboard and payment summary together.
      const [dashboardResult, paymentResult] = await Promise.all([
        apiRequest("/api/admin/dashboard", token),

        apiRequest("/api/admin/payments?limit=500", token).catch(
          (err) => {
            console.error("Payment summary loading error:", err);
            return null;
          }
        ),
      ]);

      // --------------------------------------------------
      // DASHBOARD RESPONSE
      // --------------------------------------------------

      const dashboardData =
        dashboardResult.data || dashboardResult;

      const dashboardStats =
        dashboardData.stats ||
        dashboardData.metrics ||
        {};

      // --------------------------------------------------
      // PAYMENT SUMMARY
      // --------------------------------------------------

      const paymentSummary =
        paymentResult?.summary || {};

      // Priority:
      // 1. Payment API summary.remainingAmount
      // 2. Dashboard stats.pendingPayments
      // 3. Dashboard metrics.pendingFeeAccounts
      // 4. Dashboard feeStatus.totalPending

      let pendingAmount = 0;

      if (
        paymentSummary.remainingAmount !== undefined &&
        paymentSummary.remainingAmount !== null
      ) {
        pendingAmount = Number(
          paymentSummary.remainingAmount
        ) || 0;
      } else if (
        dashboardStats.pendingPayments !== undefined
      ) {
        pendingAmount =
          Number(dashboardStats.pendingPayments) || 0;
      } else if (
        dashboardStats.pendingFeeAccounts !== undefined
      ) {
        pendingAmount =
          Number(dashboardStats.pendingFeeAccounts) || 0;
      } else if (
        dashboardData.feeStatus?.totalPending !== undefined
      ) {
        pendingAmount =
          Number(dashboardData.feeStatus.totalPending) || 0;
      }

      // --------------------------------------------------
      // UPDATE STATISTICS
      // --------------------------------------------------

      setStats([
        {
          title: "Total Students",
          value: formatNumber(
            dashboardStats.totalStudents
          ),
          change: "Currently active",
          icon: Users,
        },
        {
          title: "Total Trainers",
          value: formatNumber(
            dashboardStats.totalTrainers
          ),
          change: "Currently active",
          icon: GraduationCap,
        },
        {
          title: "Active Courses",
          value: formatNumber(
            dashboardStats.activeCourses
          ),
          change: "Across all courses",
          icon: BookOpen,
        },
        {
          title: "Pending Payments",
          value: formatCurrency(pendingAmount),
          change: "Outstanding course fee balance",
          icon: Wallet,
        },
      ]);

      // --------------------------------------------------
      // RECENT ACTIVITY
      // --------------------------------------------------

      const recentActivities =
        dashboardData.recentActivity ||
        dashboardData.activities ||
        [];

      setActivities(
        recentActivities.map((activity) => ({
          text: activity.text || "Recent activity",
          date: activity.date || activity.createdAt || null,
        }))
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

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
    ["Manage Students", "/admin/students"],
    ["Manage Trainers", "/admin/trainers"],
    ["Courses & Batches", "/admin/courses"],
    ["Payment Reports", "/admin/payments"],
  ];

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">
            Welcome to Admin Portal
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage students, trainers, courses, batches, and payments.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#102f63] transition hover:bg-blue-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
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
            className="rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
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
                    {loading ? "Fetching data..." : stat.change}
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
          <h2 className="text-lg font-bold text-[#102f63]">
            Quick Actions
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickActions.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-[#102f63] transition hover:border-blue-400 hover:bg-blue-50"
              >
                {label} →
              </Link>
            ))}
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#102f63]">
              Recent Activity
            </h2>

            <span className="text-xs text-slate-400">
              {activities.length} records
            </span>
          </div>

          <div className="mt-4">
            {loading ? (
              <p className="py-5 text-sm text-slate-500">
                Loading recent activity...
              </p>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div
                    key={`${activity.text}-${index}`}
                    className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-600">
                        {activity.text}
                      </p>

                      {activity.date && (
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(activity.date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-5 text-sm text-slate-500">
                No recent activity available.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
