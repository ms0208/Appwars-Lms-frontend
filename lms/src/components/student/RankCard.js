import { Trophy } from "lucide-react";

export default function RankCard({ rank = 1, total = 32 }) {
  const percentile = Math.round((rank / total) * 100);
  return (
    <section className="min-w-0 rounded-xl border border-blue-800 bg-sky-100/80 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-600">Batch rank</p>
        <Trophy size={16} className="text-blue-600" />
      </div>
      <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#102e60]">
        #{rank} <span className="text-[10px] font-semibold">of {total}</span>
      </h3>
      <p className="mt-2 text-[10px] leading-4 text-slate-600">MERN-07 · Top {percentile}%</p>
    </section>
  );
}
