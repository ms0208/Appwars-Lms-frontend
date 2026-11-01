
"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  UserRound,
  LockKeyhole,
  Bell,
  Palette,
  ShieldCheck,
  Camera,
  Save,
  Eye,
  EyeOff,
  Mail,
  Phone,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Globe,
  Clock,
  X,
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
  photo: "",
};

const defaultNotifications = {
  emailAdmissions: true,
  emailPayments: true,
  emailAnnouncements: true,
  emailReports: false,
  browserAlerts: true,
  reminders: true,
  weeklySummary: false,
};

const defaultAppearance = {
  theme: "Light",
  compactMode: false,
  animations: true,
};

const defaultPrivacy = {
  showEmail: false,
  showPhone: false,
  sessionAlerts: true,
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
    throw new Error(
      "Your session has expired. Please log in again."
    );
  }

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData
        ? {}
        : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";

  let result = {};

  if (contentType.includes("application/json")) {
    result = await response.json();
  } else {
    const text = await response.text();
    result = { message: text };
  }

  if (response.status === 401) {
    throw new Error(
      result?.message || "Session expired. Please log in again."
    );
  }

  if (response.status === 403) {
    throw new Error(
      result?.message || "You do not have permission to perform this action."
    );
  }

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
   COMMON COMPONENTS
-------------------------------------------------- */

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
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

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-blue-700" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SaveButton({ onClick, label = "Save Changes", loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <Save size={17} />
      )}

      {loading ? "Saving..." : label}
    </button>
  );
}

/* --------------------------------------------------
   MAIN SETTINGS PAGE
-------------------------------------------------- */

export default function CounsellorSettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");

  const [profile, setProfile] = useState(defaultProfile);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [appearance, setAppearance] = useState(defaultAppearance);
  const [privacy, setPrivacy] = useState(defaultPrivacy);

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    newPassword: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tabs = [
    { name: "Profile", icon: UserRound },
    { name: "Security", icon: LockKeyhole },
    { name: "Notifications", icon: Bell },
    { name: "Appearance", icon: Palette },
    { name: "Privacy", icon: ShieldCheck },
  ];

  function notifySuccess(text) {
    setError("");
    setMessage(text);
  }

  function notifyError(text) {
    setMessage("");
    setError(text);
  }

  function clearAlerts() {
    setMessage("");
    setError("");
  }

  /* --------------------------------------------------
     LOAD SETTINGS
  -------------------------------------------------- */

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
        clearAlerts();

        const response = await apiRequest("/counsellor/settings");

        const data =
          response?.data ||
          response?.settings ||
          response;

        if (!active) return;

        const backendProfile = data.profile || data.user || {};
        const backendNotifications = data.notifications || {};
        const backendAppearance = data.appearance || {};
        const backendPrivacy = data.privacy || {};

        setProfile({
          ...defaultProfile,
          ...backendProfile,

          fullName:
            backendProfile.fullName ||
            backendProfile.name ||
            "",

          email: backendProfile.email || "",
          phone: backendProfile.phone || "",

          employeeId:
            backendProfile.employeeId ||
            backendProfile.userId ||
            "",

          photo:
            backendProfile.photo ||
            backendProfile.profilePhoto ||
            "",
        });

        setNotifications({
          ...defaultNotifications,
          ...backendNotifications,
        });

        setAppearance({
          ...defaultAppearance,
          ...backendAppearance,
        });

        setPrivacy({
          ...defaultPrivacy,
          ...backendPrivacy,
        });
      } catch (err) {
        if (active) {
          notifyError(err.message || "Unable to load settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  /* --------------------------------------------------
     APPLY THEME
  -------------------------------------------------- */

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    let dark = appearance.theme === "Dark";

    if (appearance.theme === "System") {
      dark =
        window.matchMedia?.(
          "(prefers-color-scheme: dark)"
        ).matches || false;
    }

    root.classList.toggle("dark", dark);

    root.dataset.compact = appearance.compactMode
      ? "true"
      : "false";

    root.dataset.animations = appearance.animations
      ? "true"
      : "false";
  }, [appearance]);

  /* --------------------------------------------------
     PROFILE FUNCTIONS
  -------------------------------------------------- */

  function updateProfileField(key, value) {
    setProfile((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

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
     SAVE PREFERENCES
  -------------------------------------------------- */

  async function savePreferences(type, values, successText) {
    clearAlerts();

    try {
      setSaving(true);

      const response = await apiRequest(
        "/counsellor/settings/preferences",
        {
          method: "PATCH",
          body: JSON.stringify({
            [type]: values,
          }),
        }
      );

      notifySuccess(response?.message || successText);
    } catch (err) {
      notifyError(err.message || "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------
     PASSWORD UPDATE
  -------------------------------------------------- */

  async function updatePassword(event) {
    event.preventDefault();
    clearAlerts();

    if (
      !passwords.current ||
      !passwords.newPassword ||
      !passwords.confirm
    ) {
      notifyError("Please complete all password fields.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      notifyError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      notifyError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);

      const response = await apiRequest(
        "/counsellor/settings/password",
        {
          method: "PATCH",
          body: JSON.stringify({
            currentPassword: passwords.current,
            newPassword: passwords.newPassword,
          }),
        }
      );

      setPasswords({
        current: "",
        newPassword: "",
        confirm: "",
      });

      notifySuccess(
        response?.message || "Password changed successfully."
      );
    } catch (err) {
      notifyError(err.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------
     PROFILE PHOTO UPLOAD
  -------------------------------------------------- */

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    clearAlerts();

    if (!file.type.startsWith("image/")) {
      notifyError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notifyError("Image size must be 2 MB or less.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("photo", file);

      const response = await apiRequest(
        "/counsellor/settings/photo",
        {
          method: "POST",
          body: formData,
        }
      );

      const photoUrl =
        response?.data?.photo ||
        response?.data?.profilePhoto ||
        response?.photo ||
        response?.profilePhoto;

      if (photoUrl) {
        setProfile((previous) => ({
          ...previous,
          photo: photoUrl,
        }));
      }

      notifySuccess(
        response?.message ||
        "Profile photo uploaded successfully."
      );
    } catch (err) {
      notifyError(err.message || "Unable to upload profile photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  /* --------------------------------------------------
     DEACTIVATION REQUEST
  -------------------------------------------------- */

  async function requestDeactivation() {
    clearAlerts();

    try {
      setSaving(true);

      const response = await apiRequest(
        "/counsellor/settings/deactivation-request",
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Account deactivation requested by counsellor.",
          }),
        }
      );

      setConfirmDelete(false);

      notifySuccess(
        response?.message ||
        "Account deactivation request submitted."
      );
    } catch (err) {
      notifyError(
        err.message || "Unable to submit deactivation request."
      );
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------
     OTHER FUNCTIONS
  -------------------------------------------------- */

  function updateTab(tab) {
    setActiveTab(tab);
    clearAlerts();
  }

  function updateNotification(key, value) {
    setNotifications((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updatePrivacy(key, value) {
    setPrivacy((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updatePasswordField(key, value) {
    setPasswords((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function togglePassword(key) {
    setShowPassword((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

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
            Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your profile, account security and portal preferences.
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
                Loading your settings...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ACCOUNT SUMMARY */}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-4">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="Profile"
                    className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-800">
                    {initials || "CS"}
                  </div>
                )}

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

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                {uploading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Camera size={17} />
                )}

                {uploading ? "Uploading..." : "Upload Photo"}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* SETTINGS LAYOUT */}

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">

              {/* SIDEBAR */}

              <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account Settings
                </p>

                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.name;

                    return (
                      <button
                        key={tab.name}
                        type="button"
                        onClick={() => updateTab(tab.name)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                          isActive
                            ? "bg-blue-50 text-blue-800"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon size={18} />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Building2 size={17} className="text-blue-700" />
                      APPWARS
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      APPWARS TECHNOLOGIES PVT. LTD.
                    </p>
                  </div>
                </div>
              </aside>

              {/* MAIN PANEL */}

              <main className="min-w-0 space-y-6">

                {/* ALERTS */}

                {(message || error) && (
                  <div
                    role="status"
                    className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                      error
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {error ? (
                      <AlertCircle
                        size={19}
                        className="mt-0.5 shrink-0"
                      />
                    ) : (
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0"
                      />
                    )}

                    <p className="flex-1 leading-6">
                      {error || message}
                    </p>

                    <button
                      type="button"
                      onClick={clearAlerts}
                      aria-label="Dismiss message"
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}

                {/* PROFILE */}

                {activeTab === "Profile" && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <SectionHeading
                      icon={UserRound}
                      title="Personal Information"
                      description="Update the contact and work information associated with your account."
                    />

                    <form onSubmit={saveProfile} className="space-y-5">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

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

                        <label className="text-sm font-semibold text-slate-700">
                          Department

                          <select
                            value={profile.department}
                            onChange={(e) =>
                              updateProfileField("department", e.target.value)
                            }
                            className={inputClass}
                          >
                            <option>Admissions</option>
                            <option>Training</option>
                            <option>Student Support</option>
                            <option>Placement</option>
                            <option>Administration</option>
                          </select>
                        </label>

                        <label className="text-sm font-semibold text-slate-700">
                          Employee ID

                          <input
                            value={profile.employeeId}
                            disabled
                            className={`${inputClass} cursor-not-allowed bg-slate-50`}
                          />
                        </label>

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

                      <div className="flex justify-end border-t border-slate-100 pt-5">
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          {saving ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Save size={17} />
                          )}

                          {saving ? "Saving..." : "Save Profile"}
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                {/* SECURITY */}

                {activeTab === "Security" && (
                  <>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                      <SectionHeading
                        icon={LockKeyhole}
                        title="Change Password"
                        description="Keep your account secure by using a strong, unique password."
                      />

                      <form onSubmit={updatePassword} className="space-y-4">
                        {[
                          { key: "current", label: "Current Password" },
                          { key: "newPassword", label: "New Password" },
                          { key: "confirm", label: "Confirm New Password" },
                        ].map((field) => (
                          <label
                            key={field.key}
                            className="block text-sm font-semibold text-slate-700"
                          >
                            {field.label}

                            <span className="relative block">
                              <input
                                required
                                type={
                                  showPassword[field.key]
                                    ? "text"
                                    : "password"
                                }
                                autoComplete={
                                  field.key === "current"
                                    ? "current-password"
                                    : "new-password"
                                }
                                value={passwords[field.key]}
                                onChange={(e) =>
                                  updatePasswordField(
                                    field.key,
                                    e.target.value
                                  )
                                }
                                className={`${inputClass} pr-11`}
                                placeholder="Enter password"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  togglePassword(field.key)
                                }
                                className="absolute right-3 top-4 text-slate-400 hover:text-slate-700"
                                aria-label={
                                  showPassword[field.key]
                                    ? "Hide password"
                                    : "Show password"
                                }
                              >
                                {showPassword[field.key] ? (
                                  <EyeOff size={17} />
                                ) : (
                                  <Eye size={17} />
                                )}
                              </button>
                            </span>
                          </label>
                        ))}

                        <p className="text-xs text-slate-500">
                          Use at least 8 characters. Your current password
                          will be verified by the backend.
                        </p>

                        <div className="flex justify-end border-t border-slate-100 pt-5">
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                          >
                            {saving ? (
                              <Loader2
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <LockKeyhole size={17} />
                            )}

                            {saving ? "Updating..." : "Update Password"}
                          </button>
                        </div>
                      </form>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                      <SectionHeading
                        icon={ShieldCheck}
                        title="Account Security"
                        description="Security controls supported by your authentication system."
                      />

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Two-factor authentication
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Add an extra verification step when signing in.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Not configured
                        </span>
                      </div>
                    </section>
                  </>
                )}

                {/* NOTIFICATIONS */}

                {activeTab === "Notifications" && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <SectionHeading
                      icon={Bell}
                      title="Notification Preferences"
                      description="Choose the types of updates you want to receive."
                    />

                    <div className="divide-y divide-slate-100">
                      <Toggle
                        label="Admission Updates"
                        description="Notifications about new enquiries and admissions."
                        checked={notifications.emailAdmissions}
                        onChange={(value) =>
                          updateNotification("emailAdmissions", value)
                        }
                      />

                      <Toggle
                        label="Fee and Payment Alerts"
                        description="Updates about pending fees, receipts and payments."
                        checked={notifications.emailPayments}
                        onChange={(value) =>
                          updateNotification("emailPayments", value)
                        }
                      />

                      <Toggle
                        label="Announcements"
                        description="Important announcements from the administration team."
                        checked={notifications.emailAnnouncements}
                        onChange={(value) =>
                          updateNotification("emailAnnouncements", value)
                        }
                      />

                      <Toggle
                        label="Reports and Analytics"
                        description="Periodic reports about student and batch performance."
                        checked={notifications.emailReports}
                        onChange={(value) =>
                          updateNotification("emailReports", value)
                        }
                      />

                      <Toggle
                        label="Browser Notifications"
                        description="Receive alerts in your browser when supported."
                        checked={notifications.browserAlerts}
                        onChange={(value) =>
                          updateNotification("browserAlerts", value)
                        }
                      />

                      <Toggle
                        label="Class Reminders"
                        description="Reminders for upcoming classes and appointments."
                        checked={notifications.reminders}
                        onChange={(value) =>
                          updateNotification("reminders", value)
                        }
                      />

                      <Toggle
                        label="Weekly Summary"
                        description="A weekly summary of activity in the counsellor portal."
                        checked={notifications.weeklySummary}
                        onChange={(value) =>
                          updateNotification("weeklySummary", value)
                        }
                      />
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <SaveButton
                        onClick={() =>
                          savePreferences(
                            "notifications",
                            notifications,
                            "Notification preferences saved successfully."
                          )
                        }
                        loading={saving}
                        label="Save Preferences"
                      />
                    </div>
                  </section>
                )}

                {/* APPEARANCE */}

                {activeTab === "Appearance" && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <SectionHeading
                      icon={Palette}
                      title="Appearance Settings"
                      description="Choose your preferred portal display options."
                    />

                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      Theme
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          name: "Light",
                          icon: Sun,
                          description: "Bright interface",
                        },
                        {
                          name: "Dark",
                          icon: Moon,
                          description: "Dark interface",
                        },
                        {
                          name: "System",
                          icon: Monitor,
                          description: "Use device setting",
                        },
                      ].map((theme) => {
                        const Icon = theme.icon;
                        const selected =
                          appearance.theme === theme.name;

                        return (
                          <button
                            type="button"
                            key={theme.name}
                            onClick={() =>
                              setAppearance((previous) => ({
                                ...previous,
                                theme: theme.name,
                              }))
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              selected
                                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Icon
                              size={23}
                              className={
                                selected
                                  ? "text-blue-700"
                                  : "text-slate-500"
                              }
                            />

                            <p className="mt-3 text-sm font-bold text-slate-800">
                              {theme.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {theme.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
                      <Toggle
                        label="Compact Layout"
                        description="Reduce spacing to display more information on screen."
                        checked={appearance.compactMode}
                        onChange={(value) =>
                          setAppearance((previous) => ({
                            ...previous,
                            compactMode: value,
                          }))
                        }
                      />

                      <Toggle
                        label="Interface Animations"
                        description="Enable small transitions and animations."
                        checked={appearance.animations}
                        onChange={(value) =>
                          setAppearance((previous) => ({
                            ...previous,
                            animations: value,
                          }))
                        }
                      />
                    </div>

                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                      <SaveButton
                        onClick={() =>
                          savePreferences(
                            "appearance",
                            appearance,
                            "Appearance preferences saved successfully."
                          )
                        }
                        loading={saving}
                        label="Save Appearance"
                      />
                    </div>
                  </section>
                )}

                {/* PRIVACY */}

                {activeTab === "Privacy" && (
                  <>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                      <SectionHeading
                        icon={ShieldCheck}
                        title="Privacy Preferences"
                        description="Control which contact details are displayed to other users."
                      />

                      <div className="divide-y divide-slate-100">
                        <Toggle
                          label="Display Email Address"
                          description="Allow your email address to appear on shared staff profiles."
                          checked={privacy.showEmail}
                          onChange={(value) =>
                            updatePrivacy("showEmail", value)
                          }
                        />

                        <Toggle
                          label="Display Phone Number"
                          description="Allow your phone number to appear on shared staff profiles."
                          checked={privacy.showPhone}
                          onChange={(value) =>
                            updatePrivacy("showPhone", value)
                          }
                        />

                        <Toggle
                          label="Login and Session Alerts"
                          description="Receive alerts about account sign-in activity when supported."
                          checked={privacy.sessionAlerts}
                          onChange={(value) =>
                            updatePrivacy("sessionAlerts", value)
                          }
                        />
                      </div>

                      <div className="mt-4 flex justify-end border-t border-slate-100 pt-5">
                        <SaveButton
                          onClick={() =>
                            savePreferences(
                              "privacy",
                              privacy,
                              "Privacy settings saved successfully."
                            )
                          }
                          loading={saving}
                          label="Save Privacy Settings"
                        />
                      </div>
                    </section>

                    {/* ACCOUNT DEACTIVATION */}

                    <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-7">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-red-50 p-2.5 text-red-700">
                          <Trash2 size={20} />
                        </div>

                        <div>
                          <h2 className="font-bold text-slate-900">
                            Account Actions
                          </h2>

                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            Submit an account deactivation request to the administrator.
                          </p>
                        </div>
                      </div>

                      {!confirmDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="mt-5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Request Account Deactivation
                        </button>
                      ) : (
                        <div className="mt-5 rounded-xl bg-red-50 p-4">
                          <p className="text-sm font-semibold text-red-800">
                            Are you sure you want to request deactivation?
                          </p>

                          <p className="mt-1 text-xs leading-5 text-red-700">
                            This submits a request. It does not immediately delete your account.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={requestDeactivation}
                              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                            >
                              {saving ? "Submitting..." : "Confirm Request"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  </>
                )}

                {/* FOOTER */}

                <div className="flex flex-col justify-between gap-2 px-1 text-xs text-slate-400 sm:flex-row">
                  <p>APPWARS TECHNOLOGIES PVT. LTD.</p>
                  <p>Counsellor Portal Settings</p>
                </div>
              </main>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
