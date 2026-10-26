
const stats = [
  { title: "Total Students", value: "1,248", change: "+12% this month" },
  { title: "Total Trainers", value: "36", change: "4 new this month" },
  { title: "Active Courses", value: "18", change: "Across all batches" },
  { title: "Pending Payments", value: "₹45,000", change: "Requires attention" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#102f63]">
          Welcome to Admin Portal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage students, trainers, courses, batches, and payments.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {stat.title}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#102f63]">
              {stat.value}
            </h2>
            <p className="mt-3 text-xs text-slate-500">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-[#102f63]">
            Quick Actions
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Manage Students", "/admin/students"],
              ["Manage Trainers", "/admin/trainers"],
              ["Courses & Batches", "/admin/courses"],
              ["Payment Reports", "/admin/payments"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-[#102f63] transition hover:border-blue-400 hover:bg-blue-50"
              >
                {label} →
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-[#102f63]">
            Recent Activity
          </h2>

          <div className="mt-4 space-y-4">
            {[
              "New student registration",
              "Trainer batch assignment",
              "Course enrollment updated",
              "Payment pending verification",
            ].map((activity, index) => (
              <div
                key={activity}
                className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {index + 1}
                </span>
                <p className="text-sm text-slate-600">{activity}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
