"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/trainer/trainerdashboard", Icon: LayoutDashboard },
  { label: "Attendance & Grading", href: "/trainer/attendance-grading", Icon: ClipboardCheck },
];

export default function TrainerShell({ children }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white md:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[250px] bg-[#102f63] px-3 py-4 text-white transition-transform md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-7 flex items-center justify-between px-2">
          <Link href="/trainer/trainerdashboard" className="text-[15px] font-bold tracking-wide">LMS Trainer</Link>
          <button className="md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20}/></button>
        </div>
        <nav className="space-y-1.5">
          {navItems.map(({ label, href, Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition ${active ? "bg-[#2864ed] font-semibold text-white" : "text-blue-100 hover:bg-blue-900"}`}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-5 right-5 border-t border-blue-800 pt-4 text-xs text-blue-200">
          APPWARS TECHNOLOGIES PVT. LTD.
        </div>
      </aside>

      {menuOpen && <button aria-label="Close menu overlay" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}

      <main className="min-w-0 flex-1 md:ml-[250px]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 md:hidden">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-md border border-slate-200 p-2"><Menu size={18}/></button>
          <span className="font-bold text-[#102f63]">LMS Trainer</span>
        </div>
        {children}
      </main>
    </div>
  );
}