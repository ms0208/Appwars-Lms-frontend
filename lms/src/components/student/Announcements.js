"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Bell } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in to view announcements.");
        }

       // Verify the logged-in user through your existing API.
        const profileResponse = await fetch(`${API_URL}/api/student/notifications`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        const profileResult = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(
            profileResult.message ||
              profileResult.error ||
              "Unable to verify your login."
          );
        }

        // Fetch announcements for the authenticated student.
        const response = await fetch(
          `${API_URL}/api/student/notifications`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              "Failed to fetch announcements."
          );
        }

        const items =
          result.announcements ??
          result.data?.announcements ??
          result.data ??
          [];

        if (!Array.isArray(items)) {
          throw new Error("Invalid announcements data received.");
        }

        setAnnouncements(
          items.map((item, index) => ({
            ...item,
            id: item._id || item.id || index,
            title: item.title || item.subject || "Announcement",
            description:
              item.description ||
              item.message ||
              item.content ||
              "",
          }))
        );
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-[#102e60]">
          Announcements
        </h2>
        <Bell size={15} className="text-blue-600" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
          <RefreshCw size={14} className="animate-spin" />
          Loading announcements...
        </div>
      ) : error ? (
        <div className="py-5 text-center">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            Try again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No announcements available.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-blue-50">
          {announcements.map((item) => (
            <article
              key={item.id}
              className="py-2 first:pt-0 last:pb-0"
            >
              <h3 className="text-xs font-semibold text-[#102e60]">
                {item.title}
              </h3>

              <p className="text-[10px] leading-4 text-slate-500">
                {item.description}
              </p>

              {item.createdAt && (
                <p className="mt-1 text-[9px] text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString("en-IN")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}