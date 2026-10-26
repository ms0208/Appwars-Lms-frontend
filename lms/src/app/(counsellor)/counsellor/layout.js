
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  GraduationCap,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  UserRound,
  Building2,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    href: "/counsellor",
    icon: LayoutDashboard,
  },
  {
    label: "Admissions",
    href: "/counsellor/admissions",
    icon: UserPlus,
  },
  {
    label: "Fee Management",
    href: "/counsellor/fees",
    icon: Wallet,
  },
  {
    label: "Students",
    href: "/counsellor/students",
    icon: Users,
  },
  {
    label: "Batches & Trainers",
    href: "/counsellor/batches",
    icon: GraduationCap,
  },
  {
    label: "Batch Schedule",
    href: "/counsellor/schedule",
    icon: CalendarDays,
  },
  {
    label: "Settings",
    href: "/counsellor/settings",
    icon: Settings,
  },
];

export default function CounsellorLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(href) {
    if (href === "/counsellor") {
      return pathname === "/counsellor";
    }

    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#102b55] text-white transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link
            href="/counsellor"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-blue-900">
              A
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wider">
                APPWARS
              </h2>
              <p className="mt-1 text-[10px] tracking-widest text-blue-200">
                COUNSELLOR PORTAL
              </p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-blue-100 hover:bg-white/10 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-300">
            Main Menu
          </p>

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
                    active
                      ? "bg-blue-600 font-semibold text-white shadow-md shadow-blue-950/20"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={19} />
                    {item.label}
                  </span>

                  {active && <ChevronRight size={16} />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-300" />
              <span className="text-xs font-semibold">
                APPWARS TECHNOLOGIES
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-blue-200">
              Manage admissions, student fees and training batches.
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-blue-100 hover:bg-white/10"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#102b55]">
                Counsellor Workspace
              </p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                APPWARS LMS / {pathname.split("/").filter(Boolean).join(" / ") || "Dashboard"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
            >
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-800">
                <UserRound size={21} />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-slate-800">
                  Counsellor
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Admissions Team
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
