"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRound, Save, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: "Aarav",
    email: "aarav@example.com",
    batch: "MERN-07",
    phone: "",
  });

  const [saved, setSaved] = useState(false);

  function update(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <h1 className="text-xl font-bold text-[#102e60]">
        My Profile
      </h1>

      <p className="mt-1 text-xs text-slate-500">
        Manage your student details.
      </p>

      <section className="mt-5 max-w-2xl rounded-xl border border-blue-100 p-5">
        {/* Profile Header */}
        <div className="flex items-center gap-3 border-b border-blue-50 pb-5">
          <div className="rounded-full bg-blue-100 p-4 text-blue-700">
            <UserRound size={25} />
          </div>

          <div>
            <h2 className="font-bold">{profile.name}</h2>
            <p className="text-xs text-slate-500">
              Student · {profile.batch}
            </p>
          </div>
        </div>

        {/* Profile Form */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
          className="mt-5 space-y-4"
        >
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
              className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
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
              className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
            />
          </label>

          {/* Batch */}
          <label className="block text-xs font-semibold text-slate-700">
            Batch
            <input
              type="text"
              value={profile.batch}
              onChange={(event) =>
                update("batch", event.target.value)
              }
              required
              className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
            />
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
              placeholder="Enter phone number"
              className="mt-1.5 w-full rounded-lg border border-blue-100 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
            />
          </label>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            {/* Back to Sign In - Left */}
            <Link
              href="/signin"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-xs font-semibold text-[#102e60] transition hover:bg-blue-50"
            >
              <ArrowLeft size={15} />
              Back to Sign In
            </Link>

            {/* Save Profile - Right */}
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <Save size={15} />
              Save Profile
            </button>
          </div>

          {/* Save Confirmation */}
          {saved && (
            <p
              role="status"
              className="text-xs text-green-700"
            >
              Demo profile saved in this page state only.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}