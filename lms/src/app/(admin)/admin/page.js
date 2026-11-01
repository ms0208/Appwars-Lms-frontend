"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { title: "Total Students", value: "—", change: "Loading..." },
    { title: "Total Trainers", value: "—", change: "Loading..." },
    { title: "Active Courses", value: "—", change: "Loading..." },
    { title: "Pending Payments", value: "—", change: "Loading..." },
  ]);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        // Change "token" if your login flow uses another storage key.
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Authentication token not found. Please sign in again.");
        }

        const response = await fetch(`${API_URL}/api/admin/dashboard`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch dashboard data.");
        }

        const dashboardStats = data.stats || {};

        setStats([
          {
            title: "Total Students",
            value: Number(dashboardStats.totalStudents || 0).toLocaleString("en-IN"),
            change: "Currently active",
          },
          {
            title: "Total Trainers",
            value: Number(dashboardStats.totalTrainers || 0).toLocaleString("en-IN"),
            change: "Currently active",
          },
          {
            title: "Active Courses",
            value: Number(dashboardStats.activeCourses || 0).toLocaleString("en-IN"),
            change: "Across all courses",
          },
          {
            title: "Pending Payments",
            value: `₹${Number(
              dashboardStats.pendingPayments || 0
            ).toLocaleString("en-IN")}`,
            change: "Requires attention",
          },
        ]);

        setActivities(
          (data.recentActivity || []).map((activity) => ({
            text: activity.text || "Recent activity",
            date: activity.date,
          }))
        );
      } catch (err) {
        setError(err.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const quickActions = [
    ["Manage Students", "/admin/students"],
    ["Manage Trainers", "/admin/trainers"],
    ["Courses & Batches", "/admin/courses"],
    ["Payment Reports", "/admin/payments"],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#102f63]">
          Welcome to Admin Portal
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage students, trainers, courses, batches, and payments.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
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
        ))}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
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