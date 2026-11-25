
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import {
  LayoutDashboard,
  ClipboardCheck,
  Menu,
  ClipboardList,
  BriefcaseBusiness,
  X,
} from "lucide-react";

// Trainer navigation
const navigation = [
  {
    name: "Dashboard",
    href: "/trainerdashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Attendance",
    href: "/attendance-grading",
    icon: ClipboardCheck,
  },
  {
    name: "Assignments",
    href: "/trainerassignments",
    icon: ClipboardList,
  },
  {
    name: "Assessments",
    href: "/Trainerassesments",
    icon: ClipboardList,
  },
  {
    name: "Learning Resources",
    href: "/trainerlearning-resources",
    icon: ClipboardList,
  },
  {
    name: "Student Marks",
    href: "/student-marks",
    icon: ClipboardList,
  },
  {
    name: "Student Rank",
    href: "/student-rank",
    icon: ClipboardList,
  },
  {
    name: "Batch Progress",
    href: "/batch-progress",
    icon: ClipboardList,
  },
  {
    name: "Career & Placement",
    href: "/career-placement",
    icon: BriefcaseBusiness,
  },
  {
    name: "Trainer Profile",
    href: "/trainer-profile",
    icon: ClipboardList,
  },
];

// Sidebar component: usePathname is called here,
// inside the Suspense boundary rendered below.
function TrainerSidebar({ menuOpen, setMenuOpen }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {menuOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[250px] bg-[#102f63] px-3 py-5 text-white transition-transform duration-300 md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo and Branding */}
        <div className="mb-7 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1">
              <Image
                src="/logos/APPWARS-LOGO-PRINT.png"
                alt="APPWARS Technologies Private Limited"
                width={50}
                height={50}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <div className="flex flex-col leading-tight">
              <h2 className="text-base font-bold text-white">
                Trainer Portal
              </h2>

              <p className="mt-1 text-[11px] font-medium text-blue-200">
                APPWARS TECHNOLOGIES Pvt. Ltd.
              </p>
            </div>
          </div>

          <button
            onClick={() => setMenuOpen(false)}
            className="md:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  active
                    ? "bg-[#2864ed] font-semibold text-white"
                    : "text-blue-100 hover:bg-blue-900"
                }`}
              >
                <Icon size={17} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-5 left-5 right-5 border-t border-blue-800 pt-4 text-xs text-blue-200">
          APPWARS TECHNOLOGIES PVT. LTD.
        </div>
      </aside>
    </>
  );
}

// Main trainer layout
export default function TrainerLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white md:flex">
      {/* Suspense boundary for usePathname */}
      <Suspense
        fallback={
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] bg-[#102f63] md:block" />
        }
      >
        <TrainerSidebar
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </Suspense>

      {/* Main Content */}
      <div className="min-w-0 flex-1 md:ml-[250px]">
        {/* Mobile Header */}
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 md:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open sidebar"
            className="rounded-lg border border-slate-200 p-2 text-[#102f63]"
          >
            <Menu size={19} />
          </button>

          <span className="font-bold text-[#102f63]">
            LMS Trainer
          </span>
        </header>

        {/* Dashboard or Other Trainer Pages */}
        {children}
      </div>
    </div>
  );
}
