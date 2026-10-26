 "use client";

import { useState } from "react";
import { Video, Bell } from "lucide-react";

const sessions = [
  { id: 1, title: "Node.js APIs", date: "Today", time: "6:00 PM", trainer: "Trainer Name", status: "Upcoming" },
  { id: 2, title: "React Router", date: "Tomorrow", time: "6:00 PM", trainer: "Trainer Name", status: "Scheduled" },
  { id: 3, title: "JavaScript Revision", date: "Friday", time: "6:00 PM", trainer: "Trainer Name", status: "Scheduled" },
];

export default function LiveClassesPage() {
  const [reminders, setReminders] = useState([2]);
  const [message, setMessage] = useState("");
  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <h1 className="text-xl font-bold text-[#102e60]">Live Classes</h1>
      <p className="mt-1 text-xs text-slate-500">Your upcoming sessions and class timetable.</p>
      {message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">{message}</p>}
      <div className="mt-5 space-y-3">
        {sessions.map((session) => {
          const on = reminders.includes(session.id);
          return (
            <article key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Video size={20} /></div>
                <div><h2 className="text-sm font-bold text-[#102e60]">{session.title}</h2><p className="mt-1 text-xs text-slate-500">{session.date} · {session.time} · {session.trainer}</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReminders((old) => on ? old.filter((id) => id !== session.id) : [...old, session.id])} className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700"><Bell size={14} />{on ? "Reminder on" : "Set reminder"}</button>
                <button onClick={() => setMessage(`${session.title}: add the actual meeting URL to enable joining.`)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Join class</button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
