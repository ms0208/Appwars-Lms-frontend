"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  IndianRupee,
  Clock,
  CheckCircle,
  CalendarDays,
  ArrowUpRight,
  GraduationCap,
  LoaderCircle,
} from "lucide-react";

const initialAdmissions = [
  {
    id: 1,
    studentName: "Rahul Sharma",
    course: "MERN Stack Development",
    totalFee: 45000,
    registrationFee: 5000,
    installment0: 10000,
    installment1: 10000,
    installment2: 10000,
    installment3: 10000,
    bajajFinance: "No",
    paymentMode: "UPI",
    feeStatus: "Pending",
    trainer: "Manav Sharma",
    mode: "Online",
    batchType: "Mon-Th",
    batchStartDate: "2026-10-05",
    time: "10:00 AM",
    batchEndDate: "2027-02-05",
    videoAccess: "Yes",
    admissionDate: "2026-10-05",
  },
  {
    id: 2,
    studentName: "Priya Verma",
    course: "AWS Cloud Computing",
    totalFee: 35000,
    registrationFee: 5000,
    installment0: 15000,
    installment1: 15000,
    installment2: 0,
    installment3: 0,
    bajajFinance: "Yes",
    paymentMode: "Bajaj Finance",
    feeStatus: "Clear",
    trainer: "Amit Kumar",
    mode: "Hybrid",
    batchType: "Weekend",
    batchStartDate: "2026-10-12",
    time: "11:00 AM",
    batchEndDate: "2027-01-12",
    videoAccess: "Yes",
    admissionDate: "2026-10-12",
  },
  {
    id: 3,
    studentName: "Aman Gupta",
    course: "Full Stack Development",
    totalFee: 50000,
    registrationFee: 5000,
    installment0: 10000,
    installment1: 10000,
    installment2: 0,
    installment3: 0,
    bajajFinance: "No",
    paymentMode: "Bank Transfer",
    feeStatus: "Pending",
    trainer: "Manav Sharma",
    mode: "Offline",
    batchType: "Custom",
    batchStartDate: "2026-10-15",
    time: "02:00 PM",
    batchEndDate: "2027-03-15",
    videoAccess: "No",
    admissionDate: "2026-10-15",
  },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Deterministic date formatting for date-only values.
// Avoids reading the current time during the initial render.
function formatDate(dateString) {
  if (!dateString) return "—";

  const parts = dateString.split("-");

  if (parts.length !== 3) return dateString;

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

function getMonthLabel(monthString) {
  if (!monthString) return "Loading...";

  const [year, month] = monthString.split("-");

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${monthNames[Number(month) - 1]} ${year}`;
}

export default function CounsellorHomePage() {
  const [currentMonth, setCurrentMonth] = useState(null);
  const [admissions, setAdmissions] = useState(initialAdmissions);
  const [loading, setLoading] = useState(true);

  // FIX: Calculate the current local month after the component mounts.
  useEffect(() => {
    const now = new Date();

    const month = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    setCurrentMonth(month);
    setLoading(false);
  }, []);

  // Keep the initial server render and first client render deterministic.
  if (loading || !currentMonth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-blue-700" />
          <p className="mt-4 text-sm text-slate-500">
            Loading counsellor dashboard...
          </p>
        </div>
      </div>
    );
  }

  const monthAdmissions = admissions.filter((admission) =>
    admission.admissionDate?.startsWith(currentMonth)
  );

  const totalCourseFees = monthAdmissions.reduce(
    (total, admission) => total + Number(admission.totalFee || 0),
    0
  );

  const totalRegistrationFees = monthAdmissions.reduce(
    (total, admission) =>
      total + Number(admission.registrationFee || 0),
    0
  );

  const pendingCount = monthAdmissions.filter(
    (admission) => admission.feeStatus === "Pending"
  ).length;

  const clearCount = monthAdmissions.filter(
    (admission) => admission.feeStatus === "Clear"
  ).length;

  const stats = [
    {
      title: "Monthly Admissions",
      value: monthAdmissions.length,
      description: `Admissions in ${getMonthLabel(currentMonth)}`,
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
    },
    {
      title: "Total Course Fees",
      value: formatCurrency(totalCourseFees),
      description: "Fees of this month's admissions",
      icon: IndianRupee,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-700",
    },
    {
      title: "Registration Fees",
      value: formatCurrency(totalRegistrationFees),
      description: "Registration fees collected/recorded",
      icon: GraduationCap,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-700",
    },
    {
      title: "Pending Fee Accounts",
      value: pendingCount,
      description: `${clearCount} accounts marked clear`,
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Counsellor Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor admissions, course fees, and student batches.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <CalendarDays className="h-5 w-5 text-blue-700" />

          <div>
            <p className="text-xs text-slate-500">Current month</p>
            <p className="text-sm font-semibold text-slate-800">
              {getMonthLabel(currentMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-3 break-words text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h2>
                </div>

                <div className={`rounded-xl p-3 ${stat.iconBg}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Admission summary */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Admissions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Admissions recorded for {getMonthLabel(currentMonth)}.
              </p>
            </div>

            <Link
              href="/counsellor/admissions"
              className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              View Admissions
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Admission Date</th>
                  <th className="px-4 py-3 font-semibold">Total Fee</th>
                  <th className="px-4 py-3 font-semibold">Fee Status</th>
                </tr>
              </thead>

              <tbody>
                {monthAdmissions.length > 0 ? (
                  monthAdmissions
                    .slice()
                    .sort((a, b) =>
                      (b.admissionDate || "").localeCompare(
                        a.admissionDate || ""
                      )
                    )
                    .slice(0, 5)
                    .map((admission) => (
                      <tr
                        key={admission.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {admission.studentName}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {admission.course}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(admission.admissionDate)}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-800">
                          {formatCurrency(admission.totalFee)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              admission.feeStatus === "Clear"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {admission.feeStatus === "Clear" ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}

                            {admission.feeStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                      <p className="font-medium">
                        No admissions for {getMonthLabel(currentMonth)}
                      </p>

                      <p className="mt-1 text-xs">
                        Admissions for the current month will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fee status summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Fee Status Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current months admission records
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Fee Clear
                </span>

                <span className="text-sm font-bold text-green-700">
                  {clearCount}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${
                      monthAdmissions.length
                        ? (clearCount / monthAdmissions.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Fee Pending
                </span>

                <span className="text-sm font-bold text-amber-700">
                  {pendingCount}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{
                    width: `${
                      monthAdmissions.length
                        ? (pendingCount / monthAdmissions.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-xl bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <IndianRupee className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Monthly Fee Summary
                </p>

                <p className="mt-1 text-xl font-bold text-blue-800">
                  {formatCurrency(totalCourseFees)}
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Total course fees for this month&apos;s admissions.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/counsellor/fees"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage Fees
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Batch overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Batch Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Batch details for students admitted this month.
            </p>
          </div>

          <Link
            href="/counsellor/batches"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View Batches
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Online",
              count: monthAdmissions.filter((item) => item.mode === "Online")
                .length,
            },
            {
              label: "Offline",
              count: monthAdmissions.filter((item) => item.mode === "Offline")
                .length,
            },
            {
              label: "Hybrid",
              count: monthAdmissions.filter((item) => item.mode === "Hybrid")
                .length,
            },
            {
              label: "Video Access Enabled",
              count: monthAdmissions.filter(
                (item) => item.videoAccess === "Yes"
              ).length,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="text-sm text-slate-500">{item.label}</p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {item.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Demo dashboard data only. Connect your backend to load real admission
        records.
      </p>
    </div>
  );
}