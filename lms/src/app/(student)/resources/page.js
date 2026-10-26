import { BookOpen, FileText, PlayCircle, Download } from "lucide-react";

const resources = [
  { title: "HTML, CSS & JavaScript", detail: "Course notes and frontend fundamentals", type: "Notes" },
  { title: "React.js Frontend", detail: "Components, props, state and hooks", type: "Video lessons" },
  { title: "Node.js & Express", detail: "REST APIs, middleware and authentication", type: "Course material" },
  { title: "MongoDB & Deployment", detail: "Database fundamentals and deployment guide", type: "Study guide" },
];

export default function ResourcesPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-7">
      <h1 className="text-xl font-bold text-[#102e60]">Learning Resources</h1>
      <p className="mt-1 text-xs text-slate-500">Access course lessons, notes and study materials.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource, index) => (
          <article key={resource.title} className="rounded-xl border border-blue-100 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><BookOpen size={21} /></div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-blue-600">{resource.type}</p>
            <h2 className="mt-1 font-bold text-[#102e60]">{resource.title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">{resource.detail}</p>
            <button className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              {index === 1 ? <PlayCircle size={15} /> : index === 0 ? <FileText size={15} /> : <Download size={15} />}
              Open resource
            </button>
          </article>
        ))}
      </div>
      <p className="mt-5 text-xs text-slate-500">Sample resources are shown. Connect your course API to load real files and lesson links.</p>
    </main>
  );
}
