const announcements = [
  { title: "Mock test on Friday", description: "Covers React hooks and state. Carry notes." },
  { title: "Holiday on 2 Nov", description: "Class moved to Saturday, 10:00 AM." },
];

export default function Announcements() {
  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4">
      <h2 className="text-xs font-bold text-[#102e60]">Announcements</h2>
      <div className="mt-3 divide-y divide-blue-50">
        {announcements.map((item) => (
          <article key={item.title} className="py-2 first:pt-0 last:pb-0">
            <h3 className="text-xs font-semibold text-[#102e60]">{item.title}</h3>
            <p className="text-[10px] leading-4 text-slate-500">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
