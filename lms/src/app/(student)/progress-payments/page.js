import { CheckCircle2, CreditCard, Trophy } from "lucide-react";

const courses = [
  { name: "HTML, CSS & JavaScript", progress: 100, lessons: "24 of 24 lessons" },
  { name: "React.js Frontend", progress: 67, lessons: "12 of 18 lessons" },
  { name: "Node.js & Express", progress: 31, lessons: "5 of 16 lessons" },
  { name: "MongoDB & Deployment", progress: 0, lessons: "Not started" },
];

export default function ProgressPaymentsPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <h1 className="text-xl font-bold text-[#102e60]">Progress & Payments</h1>
      <p className="mt-1 text-xs text-slate-500">Your learning progress, batch rank and payment overview.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 p-4"><CheckCircle2 className="text-blue-600" size={20} /><p className="mt-3 text-xs text-slate-500">Course progress</p><p className="mt-1 text-2xl font-bold">68%</p></div>
        <div className="rounded-xl border border-blue-100 p-4"><Trophy className="text-blue-600" size={20} /><p className="mt-3 text-xs text-slate-500">Batch rank</p><p className="mt-1 text-2xl font-bold">#1 of 32</p></div>
        <div className="rounded-xl border border-blue-100 p-4"><CreditCard className="text-blue-600" size={20} /><p className="mt-3 text-xs text-slate-500">Payment records</p><p className="mt-1 text-sm font-bold">Connect payment data</p></div>
      </div>
      <section className="mt-5 rounded-xl border border-blue-100 p-4">
        <h2 className="text-sm font-bold">Course completion</h2>
        <div className="mt-4 space-y-4">
          {courses.map((course) => <div key={course.name}><div className="flex justify-between gap-3"><p className="text-xs font-semibold">{course.name}</p><p className="text-[10px] text-slate-500">{course.lessons}</p></div><div className="mt-2 h-2 rounded-full bg-sky-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${course.progress}%` }} /></div></div>)}
        </div>
      </section>
      <p className="mt-4 text-xs text-slate-500">Payment information is a placeholder. Connect your billing or payment provider before displaying real records.</p>
    </main>
  );
}
