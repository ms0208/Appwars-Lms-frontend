
"use client";

import { useCallback, useEffect, useState } from "react";
import { Video, Bell, RefreshCw, CalendarDays, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LiveClassesPage() {
  const [sessions, setSessions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getToken = () =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
      : null;

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in to view your live classes.");
      }

      const response = await fetch(`${API_URL}/api/student/live-classes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to load live classes.");
      }

      const classes = Array.isArray(data)
        ? data
        : data.classes || data.liveClasses || [];

      setSessions(classes);
    } catch (err) {
      setError(err.message || "Unable to load live classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const toggleReminder = async (session) => {
    const id = session._id || session.id;
    const enabled = reminders.includes(id);

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/student/live-classes/${id}/reminder`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: !enabled }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Could not update reminder.");
      }

      setReminders((previous) =>
        enabled
          ? previous.filter((item) => item !== id)
          : [...previous, id]
      );

      setMessage(
        data.message ||
          (enabled
            ? `Reminder disabled for ${session.title}.`
            : `Reminder enabled for ${session.title}.`)
      );
    } catch (err) {
      setMessage(err.message || "Unable to update reminder.");
    }
  };

  const joinClass = (session) => {
    const meetingUrl = session.meetingUrl || session.meetingLink || session.joinUrl;

    if (!meetingUrl) {
      setMessage(`The meeting link for "${session.title}" is not available yet.`);
      return;
    }

    try {
      const url = new URL(meetingUrl);

      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Invalid meeting URL.");
      }

      window.open(url.href, "_blank", "noopener,noreferrer");
      setMessage(`Opening ${session.title}...`);
    } catch {
      setMessage("This class has an invalid meeting link. Please contact your trainer.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "Date to be announced";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "Time to be announced";

    // Supports values such as "18:00" and "6:00 PM".
    if (/^\d{1,2}:\d{2}$/.test(value)) {
      const [hours, minutes] = value.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return value;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#102e60]">Live Classes</h1>
          <p className="mt-1 text-xs text-slate-500">
            Your upcoming sessions and class timetable.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchClasses}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchClasses}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-white p-8 text-center text-sm text-slate-500">
          Loading live classes...
        </div>
      ) : !error && sessions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-white p-8 text-center">
          <Video className="mx-auto text-blue-400" size={32} />
          <h2 className="mt-3 text-sm font-bold text-[#102e60]">
            No live classes scheduled
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your upcoming classes will appear here when they are scheduled.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sessions.map((session, index) => {
            const id = session._id || session.id || index;
            const reminderOn = reminders.includes(id);
            const status = session.status || "Scheduled";
            const trainer =
              session.trainerName ||
              session.trainer?.name ||
              session.trainer ||
              "Trainer to be announced";

            return (
              <article
                key={id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-white p-4 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-blue-50 p-3 text-blue-600">
                    <Video size={20} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#102e60]">
                      {session.title || session.className || "Live Class"}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} />
                        {formatDate(
                          session.date || session.scheduledAt || session.startTime
                        )}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {formatTime(session.time)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Trainer: {trainer}
                    </p>

                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${
                        status.toLowerCase() === "live"
                          ? "bg-green-100 text-green-700"
                          : status.toLowerCase() === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleReminder({ ...session, id })}
                    className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    <Bell size={14} />
                    {reminderOn ? "Reminder on" : "Set reminder"}
                  </button>

                  <button
                    type="button"
                    onClick={() => joinClass(session)}
                    disabled={
                      status.toLowerCase() === "cancelled" ||
                      status.toLowerCase() === "completed"
                    }
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Join class
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
