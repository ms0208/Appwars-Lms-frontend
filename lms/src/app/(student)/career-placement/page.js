"use client";

import { useRef, useState } from "react";
import { FileText, Upload, CalendarDays, Video, BriefcaseBusiness, CheckCircle2, X } from "lucide-react";

const initialInterviews = [
{ title: "Aptitude round", detail: "Tomorrow · 10:00 AM", action: "Join" },
  { title: "Technical round", detail: "Sat · 11:00 AM", action: "Join" },
  { title: "HR round", detail: "Next week", action: "Book" },
];

const jobs = [
  { title: "Junior MERN Developer", detail: "[Company Name] · Remote", url: "https://www.linkedin.com/jobs/" },
  { title: "React Intern", detail: "[Company Name] · Delhi", url: "https://www.linkedin.com/jobs/" },
];

export default function CareerPlacementPage() {
  const fileInput = useRef(null);
  const [resume, setResume] = useState(null);
  const [message, setMessage] = useState("");
  const [interviews, setInterviews] = useState(initialInterviews);

  function handleResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validType = /\.(pdf|docx)$/i.test(file.name);
    if (!validType) {
      setMessage("Please choose a PDF or DOCX file.");
      event.target.value = "";
      return;
    }

    setResume(file);
    setMessage(`${file.name} selected. Connect a backend to save your resume.`);
  }

  function handleInterview(index) {
    setInterviews((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, action: item.action === "Join" ? "Ready" : "Booked" }
          : item
      )
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-[#102f63]">Career &amp; Placement</h1>
        <p className="text-xs text-slate-500">Resume, mock interviews, interview preparation and job updates</p>
      </header>

      {message && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
          <span>{message}</span>
          <button aria-label="Dismiss message" onClick={() => setMessage("")}><X size={15}/></button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Placement preparation */}
        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#17345f]">Placement preparation</h2>
          {[
            { label: "Aptitude practice", value: 70 },
            { label: "DSA practice", value: 45 },
            { label: "Mock interviews", value: 40, text: "2 of 5" },
            { label: "Portfolio projects", value: 75, text: "3 of 4" },
          ].map((item) => (
            <div key={item.label} className="mb-3 last:mb-0">
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="text-[#17345f]">{item.label}</span>
                <span className="font-bold text-[#17345f]">{item.text || `${item.value}%`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full rounded-full bg-[#2864ed]" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </section>

        {/* Resume upload */}
        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#17345f]">Resume</h2>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex min-h-[96px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#5b8dff] bg-blue-50/60 px-4 py-3 text-center transition hover:bg-blue-50"
          >
            <Upload size={18} className="mb-1 text-[#2864ed]" />
            <span className="text-xs font-bold text-[#17345f]">{resume ? resume.name : "Upload your resume"}</span>
            <span className="mt-1 text-[10px] text-slate-500">PDF or DOCX</span>
            <span className="mt-2 rounded-md bg-[#2864ed] px-3 py-2 text-[10px] font-semibold text-white">Browse files</span>
          </button>
          <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResume} className="hidden" />
        </section>

        {/* Mock interviews */}
        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#17345f]">Mock interviews</h2>
          <div className="divide-y divide-slate-100">
            {interviews.map((item, index) => (
              <div key={item.title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <h3 className="text-xs font-bold text-[#17345f]">{item.title}</h3>
                  <p className="text-[10px] text-slate-500">{item.detail}</p>
                </div>
                <button onClick={() => handleInterview(index)} className="rounded-md border border-[#8bb0ff] px-3 py-2 text-xs font-semibold text-[#2864ed] hover:bg-blue-50">{item.action}</button>
              </div>
            ))}
          </div>
        </section>

        {/* Job updates */}
        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#17345f]">Job updates</h2>
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div key={job.title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#17345f]">{job.title}</h3>
                  <p className="text-[10px] text-slate-500">{job.detail}</p>
                </div>
                <a href={job.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-md bg-[#2864ed] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Apply</a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}