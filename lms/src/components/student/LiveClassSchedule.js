"use client";

import { useState } from "react";
import { Bell, Video } from "lucide-react";

const classes = [
  { id: 1, name: "Node.js APIs", time: "Today · 6:00 PM", live: true },
  { id: 2, name: "React Router", time: "Tomorrow · 6:00 PM", live: false },
];

export default function LiveClassSchedule({ onJoin }) {
  const [reminders, setReminders] = useState([2]);

  function toggleReminder(id) {
    setReminders((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4">
      <h2 className="text-xs font-bold text-[#102e60]">Live class schedule</h2>
      <div className="mt-3 divide-y divide-blue-50">
        {classes.map((item) => {
          const reminderOn = reminders.includes(item.id);
          return (
            <div key={item.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-[#102e60]">{item.name}</h3>
                <p className="text-[10px] text-slate-500">{item.time}</p>
              </div>
              <button
                onClick={() => item.live ? onJoin(item.name) : toggleReminder(item.id)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${
                  item.live ? "bg-blue-600 text-white hover:bg-blue-700" : reminderOn ? "bg-sky-100 text-blue-800" : "bg-slate-100 text-slate-700"
                }`}
              >
                {item.live ? <Video size={11} /> : <Bell size={10} />}
                {item.live ? "Join class" : reminderOn ? "Reminder on" : "Set reminder"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
