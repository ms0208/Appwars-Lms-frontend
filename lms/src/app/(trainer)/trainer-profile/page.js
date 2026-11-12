
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  Save,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BriefcaseBusiness,
  Mail,
  Phone,
  CalendarDays,
  Award,
  ShieldCheck,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const INITIAL_PROFILE = {
  _id: "",
  userId: "",
  name: "",
  email: "",
  role: "Trainer",
  isActive: true,
  phone: "",
  expertise: "",
  experience: "",
  joiningDate: "",
  availability: "Available",
};

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token") ||
        sessionStorage.getItem("appwars_token")
      : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error
        : data;

    throw new Error(
      message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

function formatDate(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function TrainerProfilePage() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // FETCH TRAINER PROFILE
  // =========================================

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const token =
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("appwars_token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      const response = await apiRequest("/api/trainer/profile");

      const trainer =
        response?.trainer ||
        response?.data?.trainer ||
        response?.user ||
        response?.data?.user ||
        response?.data ||
        response;

      const details = trainer?.trainerDetails || {};

      setProfile({
        _id: trainer._id || "",
        userId: trainer.userId || "",
        name: trainer.name || trainer.fullName || "",
        email: trainer.email || "",
        role: trainer.role || "Trainer",
        isActive: trainer.isActive ?? true,

        phone:
          details.phone ||
          trainer.phone ||
          trainer.phoneNumber ||
          "",

        expertise: details.expertise || "",

        experience: details.experience || "",

        joiningDate: details.joiningDate
          ? String(details.joiningDate).slice(0, 10)
          : "",

        availability: details.availability || "Available",
      });
    } catch (err) {
      setError(err.message || "Failed to load trainer profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // =========================================
  // UPDATE FORM
  // =========================================

  function update(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
    setError("");
  }

  // =========================================
  // SAVE TRAINER PROFILE
  // =========================================

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const token =
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("appwars_token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      const response = await apiRequest("/api/trainer/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),

          trainerDetails: {
            phone: profile.phone.trim(),
            expertise: profile.expertise.trim(),
            experience: profile.experience.trim(),
            joiningDate: profile.joiningDate || null,
            availability: profile.availability,
          },
        }),
      });

      const updatedTrainer =
        response?.trainer ||
        response?.data?.trainer ||
        response?.user ||
        response?.data?.user;

      if (updatedTrainer) {
        const details = updatedTrainer.trainerDetails || {};

        setProfile((current) => ({
          ...current,
          name: updatedTrainer.name || current.name,
          email: updatedTrainer.email || current.email,
          phone: details.phone ?? current.phone,
          expertise: details.expertise ?? current.expertise,
          experience: details.experience ?? current.experience,
          joiningDate: details.joiningDate
            ? String(details.joiningDate).slice(0, 10)
            : current.joiningDate,
          availability:
            details.availability || current.availability,
        }));
      }

      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to update trainer profile.");
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // REUSABLE INPUT CLASS
  // =========================================

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "block text-xs font-semibold text-slate-700";

  // =========================================
  // UI
  // =========================================

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-7">

      {/* PAGE HEADER */}

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-[#102e60]">
            My Profile
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Manage your trainer information and professional details.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProfile}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#102e60] hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
          Refresh Profile
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {saved && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          <CheckCircle2 size={18} />
          Trainer profile updated successfully.
        </div>
      )}

      {/* PROFILE CONTAINER */}

      <section className="max-w-3xl rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

        {loading ? (
          <div className="flex min-h-48 flex-col items-center justify-center">
            <RefreshCw
              size={28}
              className="mb-3 animate-spin text-blue-600"
            />

            <p className="text-sm text-slate-500">
              Loading your profile...
            </p>
          </div>
        ) : (
          <>

            {/* PROFILE HEADER */}

            <div className="flex flex-col gap-4 border-b border-blue-50 pb-5 sm:flex-row sm:items-center">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <UserRound size={30} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="break-words text-lg font-bold text-[#102e60]">
                  {profile.name || "Trainer"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Trainer
                  {profile.userId ? ` · ${profile.userId}` : ""}
                </p>

                {profile.email && (
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {profile.email}
                  </p>
                )}
              </div>

              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    profile.isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      profile.isActive
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  {profile.isActive ? "Active" : "Inactive"}
                </span>
              </div>

            </div>

            {/* TRAINER INFORMATION */}

            <div className="mt-5">

              <div className="mb-4 flex items-center gap-2">
                <BriefcaseBusiness
                  size={17}
                  className="text-blue-600"
                />

                <h3 className="text-sm font-bold text-[#102e60]">
                  Trainer Information
                </h3>
              </div>

              <form onSubmit={handleSave} className="space-y-4">

                {/* TRAINER ID */}

                <div>
                  <label className={labelClass}>
                    Trainer ID
                  </label>

                  <input
                    type="text"
                    value={profile.userId}
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
                  />
                </div>

                {/* NAME AND EMAIL */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <label className={labelClass}>
                    Full Name

                    <input
                      type="text"
                      value={profile.name}
                      onChange={(event) =>
                        update("name", event.target.value)
                      }
                      required
                      maxLength={100}
                      placeholder="Enter your name"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Email Address

                    <input
                      type="email"
                      value={profile.email}
                      onChange={(event) =>
                        update("email", event.target.value)
                      }
                      required
                      maxLength={254}
                      placeholder="Enter your email"
                      className={inputClass}
                    />
                  </label>

                </div>

                {/* PHONE AND EXPERTISE */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <label className={labelClass}>
                    Phone Number

                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(event) =>
                        update("phone", event.target.value)
                      }
                      maxLength={20}
                      placeholder="Enter phone number"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Expertise

                    <input
                      type="text"
                      value={profile.expertise}
                      onChange={(event) =>
                        update("expertise", event.target.value)
                      }
                      maxLength={200}
                      placeholder="e.g. MERN Stack, React, Node.js"
                      className={inputClass}
                    />
                  </label>

                </div>

                {/* EXPERIENCE AND AVAILABILITY */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <label className={labelClass}>
                    Experience

                    <input
                      type="text"
                      value={profile.experience}
                      onChange={(event) =>
                        update("experience", event.target.value)
                      }
                      maxLength={100}
                      placeholder="e.g. 3 Years"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Availability

                    <select
                      value={profile.availability}
                      onChange={(event) =>
                        update("availability", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </label>

                </div>

                {/* JOINING DATE */}

                <label className={labelClass}>
                  Joining Date

                  <input
                    type="date"
                    value={profile.joiningDate}
                    onChange={(event) =>
                      update("joiningDate", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                {/* ROLE */}

                <div>
                  <label className={labelClass}>
                    Account Role
                  </label>

                  <input
                    type="text"
                    value={profile.role}
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
                  />
                </div>

                {/* ACTION BUTTONS */}

                <div className="flex flex-col-reverse gap-3 border-t border-blue-50 pt-5 sm:flex-row sm:items-center sm:justify-between">

                  <Link
                    href="/signin"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-xs font-semibold text-[#102e60] transition hover:bg-blue-50"
                  >
                    <ArrowLeft size={15} />
                    Back to Sign In
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102e60] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={15} />
                    )}

                    {saving ? "Saving..." : "Save Profile"}
                  </button>

                </div>

              </form>
            </div>
          </>
        )}

      </section>

    </main>
  );
}
