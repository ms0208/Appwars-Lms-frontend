
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  ClipboardList,
  Wallet,
  UserRound,
  MessageCircleQuestion,
  BriefcaseBusiness,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/studentdashboard", icon: LayoutDashboard },
  { label: "Learning Resources", href: "/resources", icon: BookOpen },
  { label: "Live Classes", href: "/live-classes", icon: Video },
  { label: "Assignments & Tests", href: "/assignments", icon: ClipboardList },
  { label: "Progress & Payments", href: "/progress-payments", icon: Wallet },
  {
    label: "Doubts & Notifications",
    href: "/doubts-notifications",
    icon: MessageCircleQuestion,
  },
  {
    label: "Career & Placement",
    href: "/career-placement",
    icon: BriefcaseBusiness,
  },
  { label: "My Profile", href: "/profile", icon: UserRound },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="z-20 w-full shrink-0 bg-[#102e60] text-white md:sticky md:top-0 md:h-screen md:w-[210px]">

      {/* Logo and Student Sections Header */}
      <div className="flex items-center gap-3 px-4 py-5">

        {/* APPWARS Logo */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
          <Image
            src="/logos/APPWARS-LOGO-PRINT.png"
            alt="APPWARS Technologies Private Limited"
            width={40}
            height={40}
            className="h-full w-full object-contain"
            priority
          />
        </div>

        {/* Heading and Company Name */}
        <div className="min-w-0">
          <h2 className="text-md font-bold leading-tight">
            Student Portal
          </h2>

          <p className="mt-1 text-[10px] font-medium leading-tight tracking-wide text-blue-200">
            APPWARS TECHNOLOGIES Pvt. Ltd.
          </p>
        </div>
      </div>

      {/* Student Navigation */}
      <nav
        aria-label="Student navigation"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-max items-center gap-2 rounded-lg px-2.5 py-3 text-left text-[13px] transition md:w-full ${
                active
                  ? "bg-blue-600 font-semibold text-white"
                  : "text-blue-100 hover:bg-blue-900"
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
