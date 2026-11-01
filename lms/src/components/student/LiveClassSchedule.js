"use client";

import { useEffect, useState } from "react";
import { Bell, Video, RefreshCw } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LiveClassSchedule({ onJoin }) {
  const [classes, setClasses] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchClasses() {
    try {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in to view your live classes.");
      }

      const response = await fetch(`${API_URL}/api/student/live-classes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Failed to fetch live classes."
        );
      }

      const classList =
        result.classes ??
        result.data?.classes ??
        result.data ??
        [];

      if (!Array.isArray(classList)) {
        throw new Error("Invalid live class data received from the server.");
      }

      setClasses(
        classList.map((item, index) => ({
          ...item,
          id: item._id || item.id || index + 1,
          name: item.name || item.title || "Untitled class",
          time: formatClassTime(item),
          meetingUrl: item.meetingUrl || item.meetingLink || item.meetUrl || "",
          status: String(item.status || "Scheduled").toLowerCase(),
        }))
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClasses();
  }, []);

  function formatClassTime(item) {
    // Prefer a preformatted time if your backend provides one.
    if (item.timeLabel) return item.timeLabel;

    const dateValue = item.startTime || item.scheduledAt || item.date;

    if (!dateValue) return "Time not announced";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Time not announced";

    const now = new Date();
    const today = date.toDateString() === now.toDateString();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayLabel = today
      ? "Today"
      : isTomorrow
        ? "Tomorrow"
        : date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });

    const timeLabel = date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${dayLabel} · ${timeLabel}`;
  }

  function isLive(item) {
    if (item.status === "live") return true;

    // Only infer live status when start and end times are available.
    const startValue = item.startTime || item.scheduledAt;
    const endValue = item.endTime;

    if (!startValue || !endValue) return false;

    const now = Date.now();
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();

    return (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      now >= start &&
      now <= end
    );
  }

  function toggleReminder(id) {
    setReminders((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  }

  function handleJoin(item) {
    if (typeof onJoin === "function") {
      onJoin(item.name, item);
      return;
    }

    if (item.meetingUrl) {
      try {
        const url = new URL(item.meetingUrl);

        if (url.protocol === "https:" || url.protocol === "http:") {
          window.open(url.href, "_blank", "noopener,noreferrer");
          return;
        }
      } catch {
        // Show the message below if the meeting URL is invalid.
      }
    }

    alert("The meeting link is not available yet. Please contact your trainer.");
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-[#102e60]">
          Live class schedule
        </h2>

        <button
          type="button"
          onClick={fetchClasses}
          disabled={loading}
          aria-label="Refresh live classes"
          className="rounded-md p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-slate-500">
          Loading live classes...
        </p>
      ) : error ? (
        <div className="py-5 text-center">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchClasses}
            className="mt-2 rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            Try again
          </button>
        </div>
      ) : classes.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No live classes scheduled for you.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-blue-50">
          {classes.map((item) => {
            const reminderOn = reminders.includes(item.id);
            const live = isLive(item);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-[#102e60]">
                    {item.name}
                  </h3>

                  <p className="text-[10px] text-slate-500">
                    {item.time}
                  </p>

                  {item.trainerName && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Trainer: {item.trainerName}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    live ? handleJoin(item) : toggleReminder(item.id)
                  }
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${
                    live
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : reminderOn
                        ? "bg-sky-100 text-blue-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {live ? <Video size={11} /> : <Bell size={10} />}
                  {live
                    ? "Join class"
                    : reminderOn
                      ? "Reminder on"
                      : "Set reminder"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}