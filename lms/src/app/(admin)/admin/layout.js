
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Video,
  Megaphone,
  MessageCircleQuestion,
  CreditCard,
  Settings,

  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Trainers", href: "/admin/trainers", icon: GraduationCap },
  { name: "Courses", href: "/admin/courses", icon: BookOpen },
  { name: "Batches", href: "/admin/batches", icon: BookOpen },
  { name: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { name: "Results", href: "/admin/results", icon: CalendarCheck },
  { name: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { name: "Live Classes", href: "/admin/live-classes", icon: Video },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Doubts & Support", href: "/admin/doubts", icon: MessageCircleQuestion },
  { name: "ID-Generation", href: "/admin/id_generation", icon: MessageCircleQuestion },
  { name: "Payments & Reports", href: "/admin/payments", icon: CreditCard },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          bg-[#102f63] text-white transition-transform duration-300
          lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
              <Image
                src="/logos/APPWARS-LOGO-PRINT.png"
                alt="APPWARS Technologies Private Limited"
                width={50}
                height={50}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide">APPWARS</h1>
              <p className="text-xs text-blue-200">ADMIN PORTAL</p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-2 pt-6 text-xs font-semibold uppercase tracking-widest text-blue-300">
          Main Menu
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Administrator</p>
              <p className="text-xs text-blue-200">Admin Account</p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-100 hover:bg-white/10"
          >
            <LogOut size={18} />
            Back to Sign In
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <h2 className="text-lg font-bold text-[#102f63] sm:text-xl">
                Admin Dashboard
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                APPWARS TECHNOLOGIES PVT. LTD.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Administrator</p>
              <p className="text-xs text-slate-500">Portal Management</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              A
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
          <span>
            {"© 2026 APPWARS TECHNOLOGIES PVT. LTD. All rights reserved."}
          </span>
        </footer>
      </div>
    </div>
  );
}
