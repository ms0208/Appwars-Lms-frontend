
"use client";

import { useState } from "react";
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
  LogOut,
  Trash2,
  Globe,
  Clock,
  X,
} from "lucide-react";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const initialProfile = {
  fullName: "Manav Sharma",
  email: "manav@appwars.in",
  phone: "",
  designation: "Counsellor",
  department: "Admissions",
  employeeId: "APP-EMP-001",
  timezone: "Asia/Kolkata",
  language: "English",
};

const initialNotifications = {
  emailAdmissions: true,
  emailPayments: true,
  emailAnnouncements: true,
  emailReports: false,
  browserAlerts: true,
  reminders: true,
  weeklySummary: false,
};

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
        <p className="text-sm font-semibold text-slate-800">{label}</p>
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

function SaveButton({ onClick, label = "Save Changes" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
    >
      <Save size={17} />
      {label}
    </button>
  );
}

export default function CounsellorSettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [profile, setProfile] = useState(initialProfile);
  const [notifications, setNotifications] = useState(initialNotifications);

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

  const [appearance, setAppearance] = useState({
    theme: "Light",
    compactMode: false,
    animations: true,
  });

  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showPhone: false,
    sessionAlerts: true,
  });

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

  function showSavedMessage(text) {
    setError("");
    setMessage(text);
  }

  function updateProfile(event) {
    event.preventDefault();

    if (!profile.fullName.trim() || !profile.email.trim()) {
      setError("Name and email are required.");
      setMessage("");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setError("Please enter a valid email address.");
      setMessage("");
      return;
    }

    showSavedMessage(
      "Profile changes are updated in this page. Connect an API to save them permanently."
    );
  }

  function updatePassword(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!passwords.current || !passwords.newPassword || !passwords.confirm) {
      setError("Please complete all password fields.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setError(
      "Password changes require a secure backend endpoint. No password was changed."
    );
  }

  function updateNotifications() {
    showSavedMessage(
      "Notification preferences updated on this page. Connect an API to persist them."
    );
  }

  function updateAppearance() {
    if (appearance.theme === "Dark") {
      setError(
        "Dark mode is selected, but this page does not apply a global dark theme yet."
      );
      setMessage("");
      return;
    }

    setError("");
    showSavedMessage(
      "Appearance preferences updated on this page. Connect an API to persist them."
    );
  }

  function updatePrivacy() {
    showSavedMessage(
      "Privacy preferences updated on this page. Connect an API to persist them."
    );
  }

  function updateTab(tab) {
    setActiveTab(tab);
    setMessage("");
    setError("");
  }

  function updateNotification(key, value) {
    setNotifications((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updatePrivacySetting(key, value) {
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

  function updateShowPassword(key) {
    setShowPassword((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      setMessage("");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be 2 MB or less.");
      setMessage("");
      return;
    }

    showSavedMessage(
      "Image selected. Connect profile photo upload storage to save it permanently."
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
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

        {/* Account Summary */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-800">
              {profile.fullName
                .split(" ")
                .filter(Boolean)
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "CS"}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {profile.fullName || "Counsellor"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {profile.designation} · {profile.department}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Employee ID: {profile.employeeId}
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <Camera size={17} />
            Upload Photo
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Settings Layout */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">

          {/* Sidebar */}
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

          {/* Main Settings Panel */}
          <main className="min-w-0 space-y-6">

            {/* Alerts */}
            {(message || error) && (
              <div
                role="status"
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  error
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {error ? (
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                )}

                <p className="flex-1 leading-6">{error || message}</p>

                <button
                  onClick={() => {
                    setMessage("");
                    setError("");
                  }}
                  aria-label="Dismiss message"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {/* Profile */}
            {activeTab === "Profile" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <SectionHeading
                  icon={UserRound}
                  title="Personal Information"
                  description="Update the contact and work information associated with your account."
                />

                <form onSubmit={updateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Full Name *
                      <input
                        required
                        value={profile.fullName}
                        onChange={(e) =>
                          setProfile({ ...profile, fullName: e.target.value })
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
                            setProfile({ ...profile, email: e.target.value })
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
                            setProfile({ ...profile, phone: e.target.value })
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
                            setProfile({
                              ...profile,
                              designation: e.target.value,
                            })
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
                          setProfile({
                            ...profile,
                            department: e.target.value,
                          })
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
                            setProfile({
                              ...profile,
                              timezone: e.target.value,
                            })
                          }
                          className={`${inputClass} pl-10`}
                        >
                          <option value="Asia/Kolkata">
                            India Standard Time (IST)
                          </option>
                          <option value="UTC">UTC</option>
                          <option value="Europe/London">
                            London
                          </option>
                          <option value="America/New_York">
                            New York
                          </option>
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
                            setProfile({
                              ...profile,
                              language: e.target.value,
                            })
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
                    <SaveButton onClick={undefined} label="Save Profile" />
                    <button type="submit" className="hidden">
                      Submit
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Security */}
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
                      {
                        key: "current",
                        label: "Current Password",
                      },
                      {
                        key: "newPassword",
                        label: "New Password",
                      },
                      {
                        key: "confirm",
                        label: "Confirm New Password",
                      },
                    ].map((field) => (
                      <label
                        key={field.key}
                        className="block text-sm font-semibold text-slate-700"
                      >
                        {field.label}
                        <span className="relative block">
                          <input
                            required
                            type={showPassword[field.key] ? "text" : "password"}
                            autoComplete={
                              field.key === "current"
                                ? "current-password"
                                : "new-password"
                            }
                            value={passwords[field.key]}
                            onChange={(e) =>
                              updatePasswordField(field.key, e.target.value)
                            }
                            className={`${inputClass} pr-11`}
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            onClick={() => updateShowPassword(field.key)}
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
                      Use at least 8 characters. A backend must verify your
                      current password and securely store the new password.
                    </p>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        <LockKeyhole size={17} />
                        Update Password
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <SectionHeading
                    icon={ShieldCheck}
                    title="Account Security"
                    description="Security controls that can be connected to your authentication system."
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

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Enabling two-factor authentication requires backend and
                    identity-provider support.
                  </p>
                </section>
              </>
            )}

            {/* Notifications */}
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
                    onClick={updateNotifications}
                    label="Save Preferences"
                  />
                </div>
              </section>
            )}

            {/* Appearance */}
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
                    { name: "Light", icon: Sun, description: "Bright interface" },
                    { name: "Dark", icon: Moon, description: "Dark interface" },
                    {
                      name: "System",
                      icon: Monitor,
                      description: "Use device setting",
                    },
                  ].map((theme) => {
                    const Icon = theme.icon;
                    const selected = appearance.theme === theme.name;

                    return (
                      <button
                        type="button"
                        key={theme.name}
                        onClick={() =>
                          setAppearance({
                            ...appearance,
                            theme: theme.name,
                          })
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
                            selected ? "text-blue-700" : "text-slate-500"
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
                      setAppearance({
                        ...appearance,
                        compactMode: value,
                      })
                    }
                  />

                  <Toggle
                    label="Interface Animations"
                    description="Enable small transitions and animations."
                    checked={appearance.animations}
                    onChange={(value) =>
                      setAppearance({
                        ...appearance,
                        animations: value,
                      })
                    }
                  />
                </div>

                <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                  <SaveButton
                    onClick={updateAppearance}
                    label="Save Appearance"
                  />
                </div>
              </section>
            )}

            {/* Privacy */}
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
                        updatePrivacySetting("showEmail", value)
                      }
                    />

                    <Toggle
                      label="Display Phone Number"
                      description="Allow your phone number to appear on shared staff profiles."
                      checked={privacy.showPhone}
                      onChange={(value) =>
                        updatePrivacySetting("showPhone", value)
                      }
                    />

                    <Toggle
                      label="Login and Session Alerts"
                      description="Receive alerts about account sign-in activity when supported."
                      checked={privacy.sessionAlerts}
                      onChange={(value) =>
                        updatePrivacySetting("sessionAlerts", value)
                      }
                    />
                  </div>

                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-5">
                    <SaveButton
                      onClick={updatePrivacy}
                      label="Save Privacy Settings"
                    />
                  </div>
                </section>

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
                        Account deactivation must be handled by an authorized
                        administrator.
                      </p>
                    </div>
                  </div>

                  {!confirmDelete ? (
                    <button
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
                        This demo does not deactivate or delete your account.
                        Contact your administrator to submit a real request.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setConfirmDelete(false);
                            showSavedMessage(
                              "No account was deactivated. Please contact your administrator to submit a request."
                            );
                          }}
                          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                        >
                          Confirm Request
                        </button>
                        <button
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

            {/* Footer */}
            <div className="flex flex-col justify-between gap-2 px-1 text-xs text-slate-400 sm:flex-row">
              <p>APPWARS TECHNOLOGIES PVT. LTD.</p>
              <p>Counsellor Portal Settings</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
