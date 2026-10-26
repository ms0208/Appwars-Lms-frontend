"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export default function TrainerLayout({ children }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/trainerdashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Attendance & Grading",
      href: "/attendance-grading",
      icon: ClipboardCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-white md:flex">
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
        className={`fixed inset-y-0 left-0 z-40 w-[250px] bg-[#102f63] px-3 py-5 text-white transition-transform duration-300 md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="mb-7 flex items-center justify-between px-2">
          <h2 className="text-base font-bold">
            Trainer Portal
          </h2>

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
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${active
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

        <div className="absolute bottom-5 left-5 right-5 border-t border-blue-800 pt-4 text-xs text-blue-200">
          APPWARS TECHNOLOGIES PVT. LTD.
        </div>
      </aside>

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

        {/* Dashboard or Attendance Page */}
        {children}
      </div>
    </div>
  );
}