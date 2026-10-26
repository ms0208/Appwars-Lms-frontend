"use client";

import { useState } from "react";
import { Bell, MessageCircleQuestion, Send } from "lucide-react"; 

const initialDiscussions = [
  { title: "Why does useEffect run twice?", detail: "React.js", replies: 5, status: "Answered" },
  { title: "CORS error in Express", detail: "Node.js", replies: 2, status: "Open" },
  { title: "Docker volume not mounting", detail: "DevOps", replies: 0, status: "Open" },
];

const initialNotifications = [
  { title: "Live class at 6:00 PM", detail: "Node.js APIs", type: "Class" },
  { title: "Assignment due in 2 days", detail: "Todo app with hooks", type: "Deadline" },
  { title: "Test on Friday", detail: "React Mid-Module Test", type: "Test" },
  { title: "Installment due 5 Nov", detail: "₹15,000", type: "Payment" },
];

const courses = ["MERN Stack", "Full Stack Development", "Next.js", "Java", "Python", "AWS Cloud Computing", "DevOps", "Software Testing"];

export default function DoubtsNotificationsPage() {
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [course, setCourse] = useState("MERN Stack");
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");

  function postDoubt(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setDiscussions((current) => [
      { title: trimmed, detail: course, replies: 0, status: "Open" },
      ...current,
    ]);
    setQuestion("");
    setNotice("Your question has been posted in demo mode.");
    setTimeout(() => setNotice(""), 3000);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#102f63]">Doubts &amp; Notifications</h1>
          <p className="text-xs text-slate-500">Course-based discussion and reminders</p>
        </div>
        <button
          onClick={() => document.getElementById("ask-a-doubt")?.focus()}
          className="flex items-center justify-center gap-2 self-start rounded-md bg-[#2864ed] px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700 sm:self-auto"
        >
          <MessageCircleQuestion size={14} />
          Ask a doubt
        </button>
      </header>

      {notice && <p role="status" className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">{notice}</p>}

      <div className="grid items-start gap-3 xl:grid-cols-[1.4fr_0.95fr]">
        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#17345f]">Discussion forum</h2>
          <div className="divide-y divide-slate-100">
            {discussions.map((item, index) => (
              <article key={`${item.title}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-1">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#17345f]">{item.title}</h3>
                  <p className="text-[11px] text-slate-500">{item.detail} · {item.replies} {item.replies === 1 ? "reply" : "replies"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === "Answered" ? "bg-[#2864ed] text-white" : "bg-sky-100 text-[#214d80]"}`}>{item.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#17345f]">Ask in a course</h2>
          <form onSubmit={postDoubt} className="space-y-3">
            <label className="block text-xs font-semibold text-[#17345f]">
              Course
              <select value={course} onChange={(event) => setCourse(event.target.value)} className="mt-1.5 w-full rounded-md border border-[#cfe0ff] bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500">
                {courses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#17345f]">
              Your question
              <textarea id="ask-a-doubt" value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} required maxLength={300} placeholder="Type your question..." className="mt-1.5 w-full resize-y rounded-md border border-[#cfe0ff] px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500" />
            </label>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2864ed] px-3 py-3 text-xs font-semibold text-white hover:bg-blue-700">
              <Send size={13} />
              Post doubt
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-[#d9e6ff] bg-white p-4 xl:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#17345f]"><Bell size={15}/>Notifications</h2>
          <div className="divide-y divide-slate-100">
            {initialNotifications.map((item) => (
              <article key={item.title} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <h3 className="text-xs font-bold text-[#17345f]">{item.title}</h3>
                  <p className="text-[11px] text-slate-500">{item.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold text-[#214d80]">{item.type}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}