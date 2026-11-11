
"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  UserRound,
  Mail,
  Phone,
  BriefcaseBusiness,
  Building2,
  Clock,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const defaultProfile = {
  fullName: "",
  email: "",
  phone: "",
  designation: "Counsellor",
  department: "Admissions",
  employeeId: "",
  timezone: "Asia/Kolkata",
  language: "English",
};

/* --------------------------------------------------
   AUTHENTICATION TOKEN
-------------------------------------------------- */

function getToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("appwars_token") ||
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  );
}

/* --------------------------------------------------
   API REQUEST HELPER
-------------------------------------------------- */

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const result = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error ||
      `Request failed (${response.status})`
    );
  }

  return result;
}

/* --------------------------------------------------
   SECTION HEADING
-------------------------------------------------- */

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
        <Icon size={20} />
      </div>

      <div>
        <h2 className="font-bold text-slate-900">{title}</h2>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------
   MAIN COUNSELLOR SETTINGS PAGE
-------------------------------------------------- */

export default function CounsellorSettingsPage() {
  const [profile, setProfile] = useState(defaultProfile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function clearAlerts() {
    setMessage("");
    setError("");
  }

  function notifySuccess(text) {
    setError("");
    setMessage(text);
  }

  function notifyError(text) {
    setMessage("");
    setError(text);
  }

  /* --------------------------------------------------
     LOAD COUNSELLOR PROFILE
  -------------------------------------------------- */

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        clearAlerts();

        const response = await apiRequest("/counsellor/settings");

        const data =
          response?.data ||
          response?.settings ||
          response;

        const backendProfile =
          data?.profile ||
          data?.user ||
          {};

        if (!active) return;

        setProfile({
          ...defaultProfile,
          ...backendProfile,

          fullName:
            backendProfile.fullName ||
            backendProfile.name ||
            "",

          email: backendProfile.email || "",
          phone: backendProfile.phone || "",

          designation:
            backendProfile.designation || "Counsellor",

          department:
            backendProfile.department || "Admissions",

          employeeId:
            backendProfile.employeeId ||
            backendProfile.userId ||
            "",

          timezone:
            backendProfile.timezone || "Asia/Kolkata",

          language:
            backendProfile.language || "English",
        });
      } catch (err) {
        if (active) {
          notifyError(err.message || "Unable to load profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  /* --------------------------------------------------
     UPDATE PROFILE FIELD
  -------------------------------------------------- */

  function updateProfileField(key, value) {
    setProfile((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* --------------------------------------------------
     SAVE PROFILE
  -------------------------------------------------- */

  async function saveProfile(event) {
    event.preventDefault();
    clearAlerts();

    if (!profile.fullName.trim() || !profile.email.trim()) {
      notifyError("Name and email are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      notifyError("Please enter a valid email address.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        designation: profile.designation,
        department: profile.department,
        timezone: profile.timezone,
        language: profile.language,
      };

      const response = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const updated =
        response?.data?.profile ||
        response?.data?.user ||
        response?.profile ||
        response?.user;

      if (updated) {
        setProfile((previous) => ({
          ...previous,
          ...updated,
          fullName:
            updated.fullName ||
            updated.name ||
            previous.fullName,
        }));
      }

      notifySuccess(
        response?.message || "Profile updated successfully."
      );
    } catch (err) {
      notifyError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------
     PROFILE INITIALS
  -------------------------------------------------- */

  const initials = profile.fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADER */}

        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <Settings size={17} />
            Counsellor Portal / Settings
          </div>

          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Profile Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and manage your personal and professional information.
          </p>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <Loader2
                className="mx-auto animate-spin text-blue-700"
                size={35}
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading your profile...
              </p>
            </div>
          </div>
        ) : (
          <>

            {/* ACCOUNT SUMMARY */}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-800">
                {initials || "CS"}
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {profile.fullName || "Counsellor"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {profile.designation} · {profile.department}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Employee ID: {profile.employeeId || "Not assigned"}
                </p>
              </div>

            </div>

            {/* PROFILE FORM */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

              <SectionHeading
                icon={UserRound}
                title="Personal Information"
                description="Update the contact and professional information associated with your counsellor account."
              />

              {/* ALERTS */}

              {(message || error) && (
                <div
                  role="status"
                  className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                    error
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {error ? (
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  )}

                  <p className="flex-1 leading-6">
                    {error || message}
                  </p>

                  <button
                    type="button"
                    onClick={clearAlerts}
                    aria-label="Dismiss message"
                  >
                    ×
                  </button>
                </div>
              )}

              <form onSubmit={saveProfile} className="space-y-6">

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  {/* FULL NAME */}

                  <label className="text-sm font-semibold text-slate-700">
                    Full Name *

                    <input
                      required
                      value={profile.fullName}
                      onChange={(e) =>
                        updateProfileField("fullName", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Enter your name"
                    />
                  </label>

                  {/* EMAIL */}

                  <label className="text-sm font-semibold text-slate-700">
                    Email Address *

                    <span className="relative block">
                      <Mail
                        size={17}
                        className="absolute left-3 top-4 text-slate-400"
                      />

                      <input
                        required
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          updateProfileField("email", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="name@example.com"
                      />
                    </span>
                  </label>

                  {/* PHONE */}

                  <label className="text-sm font-semibold text-slate-700">
                    Phone Number

                    <span className="relative block">
                      <Phone
                        size={17}
                        className="absolute left-3 top-4 text-slate-400"
                      />

                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) =>
                          updateProfileField("phone", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="Enter phone number"
                      />
                    </span>
                  </label>

                  {/* DESIGNATION */}

                  <label className="text-sm font-semibold text-slate-700">
                    Designation

                    <span className="relative block">
                      <BriefcaseBusiness
                        size={17}
                        className="absolute left-3 top-4 text-slate-400"
                      />

                      <input
                        value={profile.designation}
                        onChange={(e) =>
                          updateProfileField("designation", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                      />
                    </span>
                  </label>

                  {/* DEPARTMENT */}

                  <label className="text-sm font-semibold text-slate-700">
                    Department

                    <span className="relative block">
                      <Building2
                        size={17}
                        className="absolute left-3 top-4 text-slate-400"
                      />

                      <select
                        value={profile.department}
                        onChange={(e) =>
                          updateProfileField("department", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                      >
                        <option>Admissions</option>
                        <option>Training</option>
                        <option>Student Support</option>
                        <option>Placement</option>
                        <option>Administration</option>
                      </select>
                    </span>
                  </label>

                  {/* EMPLOYEE ID */}

                  <label className="text-sm font-semibold text-slate-700">
                    Employee ID

                    <input
                      value={profile.employeeId}
                      disabled
                      className={`${inputClass} cursor-not-allowed bg-slate-50`}
                    />
                  </label>

                  {/* TIMEZONE */}

                  <label className="text-sm font-semibold text-slate-700">
                    Time Zone

                    <span className="relative block">
                      <Clock
                        size={17}
                        className="absolute left-3 top-4 text-slate-400"
                      />

                      <select
                        value={profile.timezone}
                        onChange={(e) =>
                          updateProfileField("timezone", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                      >
                        <option value="Asia/Kolkata">
                          India Standard Time (IST)
                        </option>
                        <option value="UTC">UTC</option>
                        <option value="Europe/London">London</option>
                        <option value="America/New_York">New York</option>
                      </select>
                    </span>
                  </label>

                  {/* LANGUAGE */}

                  <label className="text-sm font-semibold text-slate-700">
                    Language

                    <span className="relative block">
                      <Globe
                        size={17}
                        className="absolute left-3 top-4 text-slate-400"
                      />

                      <select
                        value={profile.language}
                        onChange={(e) =>
                          updateProfileField("language", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                      >
                        <option>English</option>
                        <option>Hindi</option>
                      </select>
                    </span>
                  </label>

                </div>

                {/* SAVE BUTTON */}

                <div className="flex justify-end border-t border-slate-100 pt-5">

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}

                    {saving ? "Saving..." : "Save Profile"}
                  </button>

                </div>

              </form>
            </section>

            {/* FOOTER */}

            <div className="flex flex-col justify-between gap-2 px-1 text-xs text-slate-400 sm:flex-row">
              <p>APPWARS TECHNOLOGIES PVT. LTD.</p>
              <p>Counsellor Portal Profile</p>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
