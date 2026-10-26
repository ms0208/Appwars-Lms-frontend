export default function Panel({ title, children }) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-[#d9e6ff] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-5 text-base font-bold leading-6 text-[#102f63] sm:text-lg">
        {title}
      </h2>

      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}
