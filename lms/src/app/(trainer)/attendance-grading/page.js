"use client";

import { useState } from "react";
import { Check, Save, ExternalLink } from "lucide-react";
import Panel from "@/src/components/trainer/Panel.js";

const students = [
  { id: "01", name: "Aarav Mehta", initial: "Present" },
  { id: "02", name: "Riya Singh", initial: "Present" },
  { id: "03", name: "Kabir Khan", initial: "Absent" },
  { id: "04", name: "Dev Patel", initial: "Present" },
];
const submissions = [
  { name: "Aarav Mehta · Todo app", detail: "Hooks assignment", type: "GitHub link" },
  { name: "Riya Singh · API report", detail: "Express assignment", type: "PDF" },
  { name: "Kabir Khan · UI screenshot", detail: "Layout task", type: "Image" },
];

export default function AttendanceGradingPage() {
  const [attendance, setAttendance] = useState(Object.fromEntries(students.map((s) => [s.id, s.initial])));
  const [marks, setMarks] = useState("42");
  const [result, setResult] = useState("Graded");
  const [feedback, setFeedback] = useState("Clean structure. Add error handling to fetch calls.");
  const [selectedStudent, setSelectedStudent] = useState("Aarav Mehta");
  const [notice, setNotice] = useState("");

  function notify(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  }

  return (
    <div className="p-4 sm:p-6">
      <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">Attendance & Grading</h1>
          <p className="text-xs text-slate-500">Record attendance and review submissions</p>
        </div>
        <button onClick={() => notify("Attendance saved in demo mode.")} className="flex items-center justify-center gap-2 rounded-md bg-[#2864ed] px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700"><Save size={14}/>Save attendance</button>
      </header>

      {notice && <div role="status" className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</div>}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Mark attendance · MERN-07 · Node.js APIs">
          <div className="divide-y divide-slate-100">
            {students.map((student) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
              <div><p className="text-sm font-bold text-[#17345f]">{student.name}</p><p className="text-xs text-slate-500">Roll {student.id}</p></div>
              <div className="flex gap-2">
                {["Present", "Absent"].map((status) => <button key={status} onClick={() => setAttendance((current) => ({ ...current, [student.id]: status }))} className={`rounded-md border px-3 py-2.5 text-xs font-semibold transition ${attendance[student.id] === status ? "border-[#2864ed] bg-[#2864ed] text-white" : "border-[#8bb0ff] text-[#2864ed] hover:bg-blue-50"}`}>{status}</button>)}
              </div>
            </div>)}
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Present: {Object.values(attendance).filter((s) => s === "Present").length} / {students.length} students
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Submissions to review">
            <div className="divide-y divide-slate-100">
              {submissions.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div><p className="text-sm font-bold text-[#17345f]">{item.name}</p><p className="text-xs text-slate-500">{item.detail}</p></div>
                <button onClick={() => { setSelectedStudent(item.name.split(" · ")[0]); notify(`${item.type} preview is a demo placeholder.`); }} className="flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700">{item.type}<ExternalLink size={11}/></button>
              </div>)}
            </div>
          </Panel>

          <Panel title={`Grade · ${selectedStudent}`}>
            <form onSubmit={(event) => { event.preventDefault(); notify(`Grade saved for ${selectedStudent} in demo mode.`); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold">Marks (out of 50)
                  <input type="number" min="0" max="50" value={marks} onChange={(e) => setMarks(e.target.value)} required className="mt-1.5 w-full rounded-md border border-[#cfe0ff] px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500"/>
                </label>
                <label className="block text-xs font-semibold">Result
                  <select value={result} onChange={(e) => setResult(e.target.value)} className="mt-1.5 w-full rounded-md border border-[#cfe0ff] px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500">
                    <option>Graded</option><option>Needs revision</option><option>Pending</option>
                  </select>
                </label>
              </div>
              <label className="mt-3 block text-xs font-semibold">Feedback
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Write feedback for the student..." className="mt-1.5 w-full resize-y rounded-md border border-[#cfe0ff] px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500"/>
              </label>
              <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#2864ed] px-3 py-3 text-xs font-semibold text-white hover:bg-blue-700"><Check size={14}/>Save grade</button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}