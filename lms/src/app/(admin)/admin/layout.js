
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  {
    name: "Doubts & Support",
    href: "/admin/doubts",
    icon: MessageCircleQuestion,
  },
  {
    name: "ID-Generation",
    href: "/admin/id_generation",
    icon: MessageCircleQuestion,
  },
  { name: "Payments & Reports", href: "/admin/payments", icon: CreditCard },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  // Get the logged-in administrator from the backend.
  useEffect(() => {
    let cancelled = false;

    const fetchAdmin = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          router.replace("/");
          return;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");

          if (!cancelled) {
            router.replace("/");
          }

          return;
        }

        if (!response.ok || !data.success || !data.user) {
          throw new Error(
            data.message || "Unable to fetch administrator details."
          );
        }

        // Only Admin accounts can access this layout.
        if (data.user.role !== "Admin") {
          if (!cancelled) {
            router.replace("/");
          }

          return;
        }

        if (!cancelled) {
          setAdmin(data.user);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to connect to the authentication server."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAdmin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Log out the current administrator.
  const handleLogout = () => {
    setLoggingOut(true);

    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    // Remove these only if your application uses them.
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    router.replace("/");
  };

  const currentPage =
    navigation.find((item) => item.href === pathname)?.name ||
    navigation.find(
      (item) =>
        item.href !== "/admin" &&
        pathname.startsWith(item.href + "/")
    )?.name ||
    "Admin Dashboard";

  const adminName = admin?.name || "Administrator";
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || "A";

  // Prevent protected admin content from rendering before authentication.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
          <p className="mt-4 text-sm text-slate-600">
            Verifying administrator account...
          </p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-[#102f63]">
            Unable to load admin account
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {error || "Redirecting to sign in..."}
          </p>

          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          bg-[#102f63] text-white transition-transform duration-300
          lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
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
              <h1 className="text-lg font-bold tracking-wide">
                APPWARS
              </h1>
              <p className="text-xs text-blue-200">ADMIN PORTAL</p>
            </div>
          </Link>

          <button
            type="button"
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

        {/* Navigation */}
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
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
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

        {/* Logged-in administrator */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold">
              {adminInitial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {adminName}
              </p>

              <p className="truncate text-xs text-blue-200">
                {admin.userId || "Admin Account"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-blue-100 hover:bg-white/10 disabled:opacity-60"
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out..." : "Back to Sign In"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[#102f63] sm:text-xl">
                {currentPage}
              </h2>

              <p className="hidden text-xs text-slate-500 sm:block">
                APPWARS TECHNOLOGIES PVT. LTD.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-48 truncate text-sm font-semibold">
                {adminName}
              </p>

              <p className="text-xs text-slate-500">
                {admin.role}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {adminInitial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} APPWARS TECHNOLOGIES PVT. LTD.
          {" "}All rights reserved.
        </footer>
      </div>
    </div>
  );
}
