 "use client";

import { useState } from "react";
import { ClipboardList, Upload } from "lucide-react";

const initialAssignments = [
  { id: 1, title: "React hooks assignment", course: "React.js Frontend", due: "Due tomorrow", status: "Pending" },
  { id: 2, title: "Build a REST API", course: "Node.js & Express", due: "Due in 2 days", status: "Pending" },
  { id: 3, title: "JavaScript quiz", course: "HTML, CSS & JavaScript", due: "Due Friday", status: "Pending" },
];

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState(initialAssignments);
  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <h1 className="text-xl font-bold text-[#102e60]">Assignments & Tests</h1>
      <p className="mt-1 text-xs text-slate-500">Track deadlines and mark sample assignments as submitted.</p>
      <div className="mt-5 overflow-hidden rounded-xl border border-blue-100">
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto] gap-4 bg-blue-50 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 sm:grid"><span>Assignment</span><span>Course</span><span>Deadline</span><span>Status</span></div>
        {assignments.map((item) => (
          <div key={item.id} className="grid gap-3 border-t border-blue-50 p-4 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center sm:gap-4">
            <div className="flex items-center gap-2"><ClipboardList size={17} className="text-blue-600" /><span className="text-sm font-semibold">{item.title}</span></div>
            <p className="text-xs text-slate-500">{item.course}</p>
            <p className="text-xs text-slate-500">{item.due}</p>
            <button disabled={item.status === "Submitted"} onClick={() => setAssignments((old) => old.map((a) => a.id === item.id ? { ...a, status: "Submitted" } : a))} className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:cursor-default disabled:border-green-200 disabled:text-green-700"><Upload size={13} />{item.status === "Submitted" ? "Submitted" : "Mark submitted"}</button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Demo only: submission status is held in page state and is not uploaded to a server.</p>
    </main>
  );
}
