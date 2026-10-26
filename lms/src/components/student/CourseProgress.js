"use client";

const courses = [
  { name: "HTML, CSS & JavaScript", completed: 24, total: 24, status: "Completed" },
  { name: "React.js Frontend", completed: 12, total: 18, status: "12 of 18 lessons" },
  { name: "Node.js & Express", completed: 5, total: 16, status: "5 of 16 lessons" },
  { name: "MongoDB & Deployment", completed: 0, total: 12, status: "Not started" },
];

export default function CourseProgress({ onDetails }) {
  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4">
      <h2 className="text-xs font-bold text-[#102e60]">My courses</h2>
      <div className="mt-3 space-y-3">
        {courses.map((course) => {
          const percentage = Math.round((course.completed / course.total) * 100);
          return (
            <div key={course.name}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-[#102e60]">{course.name}</h3>
                <span className="shrink-0 text-[10px] text-slate-500">{course.status}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-label={`${course.name} completion`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-blue-50 pt-3">
        <p className="text-[20px] text-slate-500">Batch:  Starts 1 Jan - Ends 28 Jun</p>
        <button onClick={onDetails} className="shrink-0 rounded-lg border border-blue-500 px-3 py-2 text-[10px] font-semibold text-blue-600 hover:bg-blue-50">
          Batch details
        </button>
      </div>
    </section>
  );
}
