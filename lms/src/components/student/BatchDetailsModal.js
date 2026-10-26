"use client";

import { X } from "lucide-react";

export default function BatchDetailsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="batch-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="batch-title" className="text-lg font-bold text-[#102e60]">Batch details</h2>
          <button onClick={onClose} aria-label="Close batch details" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <dl className="mt-5 space-y-4 text-sm">
          <div><dt className="text-xs text-slate-500">Batch name</dt><dd className="mt-1 font-semibold">MERN-07</dd></div>
          <div><dt className="text-xs text-slate-500">Schedule</dt><dd className="mt-1 font-semibold">Monday–Friday, 6:00 PM</dd></div>
          <div><dt className="text-xs text-slate-500">Trainer</dt><dd className="mt-1 font-semibold">[Trainer Name]</dd></div>
          <div><dt className="text-xs text-slate-500">Batch duration</dt><dd className="mt-1 font-semibold">12 Jan – 28 Jun</dd></div>
        </dl>
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">Close</button>
      </section>
    </div>
  );
}
