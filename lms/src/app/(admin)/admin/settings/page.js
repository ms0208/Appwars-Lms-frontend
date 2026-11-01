
"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  UserRound,
  Bell,
  GraduationCap,
  ShieldCheck,
  Palette,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  LockKeyhole,
  Camera,
  Settings as SettingsIcon,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  company: {
    companyName: "APPWARS TECHNOLOGIES PVT. LTD.",
    email: "info@appwars.in",
    phone: "",
    website: "",
    address: "",
    timezone: "Asia/Kolkata",
    language: "English",
  },
  admin: {
    fullName: "Admin",
    email: "admin@appwars.in",
    phone: "",
    designation: "Administrator",
  },
  notifications: {
    emailNotifications: true,
    newStudent: true,
    newTrainer: true,
    assignmentSubmission: true,
    liveClassReminder: true,
    announcements: true,
    securityAlerts: true,
  },
  lms: {
    platformName: "APPWARS LMS",
    supportEmail: "support@appwars.in",
    defaultCourseDuration: "12",
    passingPercentage: "40",
    maxUploadSize: "10",
    allowRegistration: true,
    allowStudentDownloads: true,
    enableAssignments: true,
    enableLiveClasses: true,
    enableCertificates: true,
  },
  appearance: {
    theme: "light",
    compactSidebar: false,
    animations: true,
  },
};

const NAVIGATION = [
  { id: "company", label: "Company Profile", icon: Building2 },
  { id: "admin", label: "Admin Profile", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "lms", label: "LMS Configuration", icon: GraduationCap },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_ROOT.endsWith("/api")
  ? API_ROOT
  : `${API_ROOT}/api`;

const SETTINGS_URL = `${API_URL}/admin/settings`;

function getAuthToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("appwars_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function settingsRequest(url, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Login token not found. Please log in again.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { message: responseText };
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function mergeSettings(saved = {}) {
  return {
    company: {
      ...DEFAULT_SETTINGS.company,
      ...(saved.company || {}),
    },
    admin: {
      ...DEFAULT_SETTINGS.admin,
      ...(saved.admin || {}),
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(saved.notifications || {}),
    },
    lms: {
      ...DEFAULT_SETTINGS.lms,
      ...(saved.lms || {}),
    },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(saved.appearance || {}),
    },
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  help = "",
  min,
  max,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
      />

      {help && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {help}
        </p>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </p>
        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await settingsRequest(SETTINGS_URL);

        const saved =
          data.settings ||
          data.data?.settings ||
          data.data ||
          {};

        const merged = mergeSettings(saved);

        if (cancelled) return;

        setSettings(merged);

        document.documentElement.classList.toggle(
          "dark",
          merged.appearance.theme === "dark"
        );

        localStorage.setItem("appwars-theme", merged.appearance.theme);
        localStorage.setItem(
          "appwars-admin-settings",
          JSON.stringify(merged)
        );
      } catch (error) {
        if (cancelled) return;

        try {
          const local = JSON.parse(
            localStorage.getItem("appwars-admin-settings") || "{}"
          );

          const merged = mergeSettings(local);
          setSettings(merged);

          document.documentElement.classList.toggle(
            "dark",
            merged.appearance.theme === "dark"
          );
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }

        setErrorMessage(
          `Could not load server settings: ${error.message}`
        );
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;

    document.documentElement.classList.toggle(
      "dark",
      settings.appearance.theme === "dark"
    );

    localStorage.setItem("appwars-theme", settings.appearance.theme);
  }, [settings.appearance.theme, loaded]);

  const updateField = (section, field, value) => {
    setSettings((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));

    setSavedMessage("");
    setErrorMessage("");
  };

  const saveSettings = async (event) => {
    event?.preventDefault();

    setSavedMessage("");
    setErrorMessage("");
    setSaving(true);

    try {
      const data = await settingsRequest(SETTINGS_URL, {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      const saved = data.settings || data.data?.settings;
      const merged = mergeSettings(saved || settings);

      setSettings(merged);

      localStorage.setItem(
        "appwars-admin-settings",
        JSON.stringify(merged)
      );
      localStorage.setItem("appwars-theme", merged.appearance.theme);

      document.documentElement.classList.toggle(
        "dark",
        merged.appearance.theme === "dark"
      );

      setSavedMessage("Settings saved successfully to the server.");
    } catch (error) {
      setErrorMessage(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (
      !window.confirm(
        "Reset all settings to their default values?"
      )
    ) {
      return;
    }

    setSavedMessage("");
    setErrorMessage("");
    setResetting(true);

    try {
      const data = await settingsRequest(SETTINGS_URL, {
        method: "PUT",
        body: JSON.stringify(DEFAULT_SETTINGS),
      });

      const saved =
        data.settings ||
        data.data?.settings ||
        DEFAULT_SETTINGS;

      const merged = mergeSettings(saved);

      setSettings(merged);

      localStorage.setItem(
        "appwars-admin-settings",
        JSON.stringify(merged)
      );
      localStorage.setItem("appwars-theme", merged.appearance.theme);

      document.documentElement.classList.toggle(
        "dark",
        merged.appearance.theme === "dark"
      );

      setSavedMessage("Settings reset successfully.");
    } catch (error) {
      setErrorMessage(`Unable to reset settings: ${error.message}`);
    } finally {
      setResetting(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setSavedMessage("");
    setErrorMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage(
        "Your new password must be different from your current password."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        "The new password and confirmation do not match."
      );
      return;
    }

    setChangingPassword(true);

    try {
      const data = await settingsRequest(
        `${SETTINGS_URL}/password`,
        {
          method: "PATCH",
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      setSavedMessage(
        data.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(`Could not change password: ${error.message}`);
    } finally {
      setChangingPassword(false);
    }
  };

  const activeNavigation = NAVIGATION.find(
    (item) => item.id === activeTab
  );
  const ActiveIcon = activeNavigation?.icon || SettingsIcon;

  if (!loaded) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 transition-colors duration-200 sm:p-6 lg:p-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <SettingsIcon size={16} />
            <span>Admin Portal</span>
            <span>/</span>
            <span>Settings</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
            Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your company, administrator, LMS and appearance preferences.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetSettings}
            disabled={resetting || saving}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={16} />
            {resetting ? "Resetting..." : "Reset"}
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving || resetting}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {savedMessage && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          <CheckCircle2 size={18} />
          {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            General Settings
          </p>

          <nav className="space-y-1">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSavedMessage("");
                    setErrorMessage("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <ShieldCheck size={18} />
              <span className="text-sm font-semibold">Admin Settings</span>
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Settings are loaded and saved through the backend. Local storage
              is used for theme preferences and fallback display only.
            </p>
          </div>
        </aside>

        <main className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <ActiveIcon size={23} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {activeNavigation?.label}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configure your {activeNavigation?.label.toLowerCase()}.
              </p>
            </div>
          </div>

          {activeTab === "company" && (
            <form onSubmit={saveSettings}>
              <SectionHeading
                title="Company Information"
                description="Manage your organization details."
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Company Name"
                  value={settings.company.companyName}
                  onChange={(value) => updateField("company", "companyName", value)}
                  required
                />

                <Field
                  label="Official Email"
                  value={settings.company.email}
                  onChange={(value) => updateField("company", "email", value)}
                  type="email"
                  required
                />

                <Field
                  label="Contact Number"
                  value={settings.company.phone}
                  onChange={(value) => updateField("company", "phone", value)}
                  placeholder="Enter company phone number"
                />

                <Field
                  label="Website"
                  value={settings.company.website}
                  onChange={(value) => updateField("company", "website", value)}
                  placeholder="https://example.com"
                />

                <SelectField
                  label="Default Language"
                  value={settings.company.language}
                  onChange={(value) => updateField("company", "language", value)}
                  options={[
                    { label: "English", value: "English" },
                    { label: "Hindi", value: "Hindi" },
                  ]}
                />

                <SelectField
                  label="Timezone"
                  value={settings.company.timezone}
                  onChange={(value) => updateField("company", "timezone", value)}
                  options={[
                    { label: "India Standard Time (IST)", value: "Asia/Kolkata" },
                    { label: "UTC", value: "UTC" },
                    { label: "London", value: "Europe/London" },
                    { label: "New York", value: "America/New_York" },
                  ]}
                />

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Company Address
                  </label>
                  <textarea
                    rows={3}
                    value={settings.company.address}
                    onChange={(event) => updateField("company", "address", event.target.value)}
                    placeholder="Enter your company address"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Save size={16} /> Save Company Profile
                </button>
              </div>
            </form>
          )}

          {activeTab === "admin" && (
            <form onSubmit={saveSettings}>
              <SectionHeading
                title="Administrator Profile"
                description="Update the profile information displayed in the admin portal."
              />

              <div className="mb-6 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-2xl font-bold text-white">
                  {settings.admin.fullName.trim().charAt(0).toUpperCase() || "A"}
                </div>

                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {settings.admin.fullName || "Administrator"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {settings.admin.designation}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <Camera className="mr-1 inline" size={13} />
                    Profile avatar generated from your initials
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Full Name"
                  value={settings.admin.fullName}
                  onChange={(value) => updateField("admin", "fullName", value)}
                  required
                />

                <Field
                  label="Email Address"
                  value={settings.admin.email}
                  onChange={(value) => updateField("admin", "email", value)}
                  type="email"
                  required
                />

                <Field
                  label="Phone Number"
                  value={settings.admin.phone}
                  onChange={(value) => updateField("admin", "phone", value)}
                />

                <Field
                  label="Designation"
                  value={settings.admin.designation}
                  onChange={(value) => updateField("admin", "designation", value)}
                />
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Save size={16} /> Save Admin Profile
                </button>
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <form onSubmit={saveSettings}>
              <SectionHeading
                title="Notification Preferences"
                description="Choose which notifications the LMS should enable."
              />

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <Toggle
                  label="Email Notifications"
                  description="Master preference for email notifications."
                  checked={settings.notifications.emailNotifications}
                  onChange={(value) => updateField("notifications", "emailNotifications", value)}
                />
                <Toggle
                  label="New Student Registration"
                  description="Notify administrators when a student registers."
                  checked={settings.notifications.newStudent}
                  onChange={(value) => updateField("notifications", "newStudent", value)}
                />
                <Toggle
                  label="New Trainer Registration"
                  description="Notify administrators about new trainers."
                  checked={settings.notifications.newTrainer}
                  onChange={(value) => updateField("notifications", "newTrainer", value)}
                />
                <Toggle
                  label="Assignment Submissions"
                  description="Receive notifications about submitted assignments."
                  checked={settings.notifications.assignmentSubmission}
                  onChange={(value) => updateField("notifications", "assignmentSubmission", value)}
                />
                <Toggle
                  label="Live Class Reminders"
                  description="Enable live class reminder preferences."
                  checked={settings.notifications.liveClassReminder}
                  onChange={(value) => updateField("notifications", "liveClassReminder", value)}
                />
                <Toggle
                  label="Announcements"
                  description="Receive announcements-related notifications."
                  checked={settings.notifications.announcements}
                  onChange={(value) => updateField("notifications", "announcements", value)}
                />
                <Toggle
                  label="Security Alerts"
                  description="Enable security notification preferences."
                  checked={settings.notifications.securityAlerts}
                  onChange={(value) => updateField("notifications", "securityAlerts", value)}
                />
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Save size={16} /> Save Notification Settings
                </button>
              </div>
            </form>
          )}

          {activeTab === "lms" && (
            <form onSubmit={saveSettings}>
              <SectionHeading
                title="LMS Configuration"
                description="Configure your LMS defaults and feature preferences."
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Platform Name"
                  value={settings.lms.platformName}
                  onChange={(value) => updateField("lms", "platformName", value)}
                  required
                />

                <Field
                  label="Support Email"
                  value={settings.lms.supportEmail}
                  onChange={(value) => updateField("lms", "supportEmail", value)}
                  type="email"
                  required
                />

                <Field
                  label="Default Course Duration (weeks)"
                  value={settings.lms.defaultCourseDuration}
                  onChange={(value) => updateField("lms", "defaultCourseDuration", value)}
                  type="number"
                  min="1"
                  required
                />

                <Field
                  label="Passing Percentage"
                  value={settings.lms.passingPercentage}
                  onChange={(value) => updateField("lms", "passingPercentage", value)}
                  type="number"
                  min="0"
                  max="100"
                  required
                />

                <Field
                  label="Maximum Upload Size (MB)"
                  value={settings.lms.maxUploadSize}
                  onChange={(value) => updateField("lms", "maxUploadSize", value)}
                  type="number"
                  min="1"
                  required
                />
              </div>

              <h3 className="mt-8 border-b border-slate-100 pb-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                Platform Features
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <Toggle
                  label="Allow Student Registration"
                  description="Set whether new student registrations are permitted."
                  checked={settings.lms.allowRegistration}
                  onChange={(value) => updateField("lms", "allowRegistration", value)}
                />
                <Toggle
                  label="Student Downloads"
                  description="Set student download preferences."
                  checked={settings.lms.allowStudentDownloads}
                  onChange={(value) => updateField("lms", "allowStudentDownloads", value)}
                />
                <Toggle
                  label="Assignments"
                  description="Enable assignment feature preferences."
                  checked={settings.lms.enableAssignments}
                  onChange={(value) => updateField("lms", "enableAssignments", value)}
                />
                <Toggle
                  label="Live Classes"
                  description="Enable live-class feature preferences."
                  checked={settings.lms.enableLiveClasses}
                  onChange={(value) => updateField("lms", "enableLiveClasses", value)}
                />
                <Toggle
                  label="Certificates"
                  description="Enable course certificate preferences."
                  checked={settings.lms.enableCertificates}
                  onChange={(value) => updateField("lms", "enableCertificates", value)}
                />
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Save size={16} /> Save LMS Configuration
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <div>
              <SectionHeading
                title="Security Settings"
                description="Change the password for the currently authenticated administrator."
              />

              <div className="mb-6 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <LockKeyhole
                  className="shrink-0 text-blue-700 dark:text-blue-300"
                  size={21}
                />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-200">
                    Change Password
                  </p>
                  <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                    Your current password is verified by the backend. Passwords
                    are not stored in browser storage.
                  </p>
                </div>
              </div>

              <form onSubmit={changePassword} className="space-y-5">
                <Field
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  type={showPasswords ? "text" : "password"}
                  required
                />

                <Field
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  type={showPasswords ? "text" : "password"}
                  required
                  help="Use at least 8 characters."
                />

                <Field
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type={showPasswords ? "text" : "password"}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPasswords((previous) => !previous)}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300"
                >
                  {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                  {showPasswords ? "Hide passwords" : "Show passwords"}
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <ShieldCheck size={17} />
                  {changingPassword ? "Changing..." : "Change Password"}
                </button>
              </form>

              <div className="mt-8 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Security recommendations
                </h3>
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>Use a unique password with at least 8 characters.</li>
                  <li>Never store passwords in browser storage.</li>
                  <li>Use server-side authentication and authorization.</li>
                  <li>Enable multi-factor authentication when supported.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div>
              <SectionHeading
                title="Appearance"
                description="Customize the visual appearance of your admin portal."
              />

              <h3 className="mb-3 font-semibold text-slate-800 dark:text-white">
                Choose Theme
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateField("appearance", "theme", "light")}
                  aria-pressed={settings.appearance.theme === "light"}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    settings.appearance.theme === "light"
                      ? "border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
                    <div className="mb-3 flex gap-2">
                      <div className="h-3 w-12 rounded bg-blue-700" />
                      <div className="h-3 w-20 rounded bg-white" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded bg-white shadow-sm" />
                      <div className="h-16 rounded bg-white shadow-sm" />
                      <div className="h-16 rounded bg-white shadow-sm" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                      <Sun size={18} /> Light Mode
                    </span>
                    {settings.appearance.theme === "light" && (
                      <CheckCircle2 size={20} className="text-blue-600" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Bright background and dark text.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateField("appearance", "theme", "dark")}
                  aria-pressed={settings.appearance.theme === "dark"}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    settings.appearance.theme === "dark"
                      ? "border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                    <div className="mb-3 flex gap-2">
                      <div className="h-3 w-12 rounded bg-blue-500" />
                      <div className="h-3 w-20 rounded bg-slate-800" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded bg-slate-800" />
                      <div className="h-16 rounded bg-slate-800" />
                      <div className="h-16 rounded bg-slate-800" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                      <Moon size={18} /> Dark Mode
                    </span>
                    {settings.appearance.theme === "dark" && (
                      <CheckCircle2 size={20} className="text-blue-600" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Dark background and lighter text.
                  </p>
                </button>
              </div>

              <h3 className="mt-8 border-b border-slate-100 pb-3 font-semibold text-slate-800 dark:border-slate-800 dark:text-white">
                Display Preferences
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <Toggle
                  label="Compact Sidebar"
                  description="Save space if your admin layout supports compact mode."
                  checked={settings.appearance.compactSidebar}
                  onChange={(value) => updateField("appearance", "compactSidebar", value)}
                />
                <Toggle
                  label="Animations"
                  description="Save your interface animation preference."
                  checked={settings.appearance.animations}
                  onChange={(value) => updateField("appearance", "animations", value)}
                />
              </div>

              <div className="mt-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                  <Monitor size={18} />
                  Current Theme
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {settings.appearance.theme === "dark"
                    ? "Dark Mode is active."
                    : "Light Mode is active."}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Theme changes apply immediately. Save Settings stores the
                  preference on the server.
                </p>
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Save size={16} /> Save Appearance
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-6 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row dark:text-slate-400">
        <span>APPWARS TECHNOLOGIES PVT. LTD. · LMS Administration</span>
        <span>Settings are managed through the server.</span>
      </footer>
    </div>
  );
}
