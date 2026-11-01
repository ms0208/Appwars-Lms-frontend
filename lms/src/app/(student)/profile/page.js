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
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const INITIAL_PROFILE = {
  name: "",
  email: "",
  batch: "",
  phone: "",
};

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token")
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

export default function ProfilePage() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Load the logged-in student's profile from the backend.
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      const response = await apiRequest("/api/student/profile");

      // Supports common API response structures.
      const user =
        response?.user ||
        response?.data?.user ||
        response?.data ||
        response;

      const batch =
        typeof user.batch === "object" && user.batch !== null
          ? user.batch.batchName ||
            user.batch.name ||
            user.batch.batchCode ||
            ""
          : user.batch || user.batchName || user.batchCode || "";

      setProfile({
        name: user.name || user.fullName || "",
        email: user.email || "",
        batch,
        phone: user.phone || user.phoneNumber || "",
      });
    } catch (err) {
      setError(err.message || "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Update form state.
  function update(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
    setError("");
  }

  // Save the profile to the backend.
  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const token = sessionStorage.getItem("appwars_token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      const response = await apiRequest("/api/student/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
        }),
      });

      // Use the updated profile returned by the backend when available.
      const updatedUser =
        response?.user ||
        response?.data?.user ||
        response?.data;

      if (updatedUser && typeof updatedUser === "object") {
        setProfile((current) => ({
          ...current,
          name:
            updatedUser.name ||
            updatedUser.fullName ||
            current.name,
          email: updatedUser.email || current.email,
          phone:
            updatedUser.phone ||
            updatedUser.phoneNumber ||
            current.phone,
        }));
      }

      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-4 sm:p-6 lg:p-7">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#102e60]">
          My Profile
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Manage your student details.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          <CheckCircle2 size={18} />
          Profile updated successfully.
        </div>
      )}

      <section className="max-w-2xl rounded-xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
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
            {/* Profile Header */}
            <div className="flex items-center gap-3 border-b border-blue-50 pb-5">
              <div className="rounded-full bg-blue-100 p-4 text-blue-700">
                <UserRound size={25} />
              </div>

              <div className="min-w-0">
                <h2 className="break-words font-bold text-[#102e60]">
                  {profile.name || "Student"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Student
                  {profile.batch ? ` · ${profile.batch}` : ""}
                </p>

                {profile.email && (
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {profile.email}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* Full Name */}
              <label className="block text-xs font-semibold text-slate-700">
                Full name

                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) =>
                    update("name", event.target.value)
                  }
                  required
                  maxLength={100}
                  placeholder="Enter your full name"
                  className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Email Address */}
              <label className="block text-xs font-semibold text-slate-700">
                Email address

                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) =>
                    update("email", event.target.value)
                  }
                  required
                  maxLength={254}
                  placeholder="Enter your email address"
                  className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Batch */}
              <label className="block text-xs font-semibold text-slate-700">
                Batch

                <input
                  type="text"
                  value={profile.batch}
                  readOnly
                  placeholder="Batch assigned by admin"
                  className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-500 outline-none"
                />

                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  Your batch is assigned by the administrator.
                </span>
              </label>

              {/* Phone Number */}
              <label className="block text-xs font-semibold text-slate-700">
                Phone number

                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(event) =>
                    update("phone", event.target.value)
                  }
                  maxLength={20}
                  placeholder="Enter phone number"
                  className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
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
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          </>
        )}
      </section>
    </main>
  );
}