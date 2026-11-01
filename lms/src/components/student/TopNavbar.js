"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown, GraduationCap } from "lucide-react";

export default function TopNavbar({ studentName = "Aarav" }) {
  const [profile, setProfile] = useState({
    name: studentName,
    role: "Student",
  });

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const token = sessionStorage.getItem("appwars_token");

        if (!token) {
          console.warn("Authentication token not found.");
          return;
        }

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        const response = await fetch(`${API_URL}/api/student/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch student profile: ${response.status}`
          );
        }

        const result = await response.json();

        // Supports common backend response formats.
        const student =
          result.profile || result.user || result.student || result;

        setProfile({
          name: student.name || student.fullName || studentName,
          role: student.role || "Student",
        });
      } catch (error) {
        console.error("Error fetching student profile:", error);
      }
    };

    fetchStudentProfile();
  }, [studentName]);

  const initial = profile.name?.trim()?.charAt(0)?.toUpperCase() || "A";

  return (
    <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b border-blue-100 bg-white px-4 sm:px-6">
      {/* Logo and portal name */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
          <GraduationCap size={22} className="text-blue-600" />
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#102e60]">
            APPWARS LMS
          </h2>
          <p className="text-[10px] text-slate-500">Student Portal</p>
        </div>
      </div>

      {/* Notifications and student profile */}
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-600 hover:bg-blue-50"
        >
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-blue-50"
          aria-label="Student account"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            {initial}
          </span>

          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold text-[#102e60]">
              {profile.name}
            </span>

            <span className="block text-[10px] capitalize text-slate-500">
              {profile.role}
            </span>
          </span>

          <ChevronDown
            size={14}
            className="hidden text-slate-500 sm:block"
          />
        </button>
      </div>
    </header>
  );
}