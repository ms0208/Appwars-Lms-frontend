export default function StatCard({ title, value, subtitle, progress }) {
  return (
    <div className="min-w-0 rounded-xl border border-blue-100 bg-white p-3.5">
      <p className="text-[10px] text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#102e60]">{value}</h3>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="mt-2 min-h-4 text-[10px] leading-4 text-slate-500">{subtitle || "\u00a0"}</p>
    </div>
  );
}
