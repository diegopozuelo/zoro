export default function TodayPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-1 text-neutral-500">Welcome to Zoro. Your daily command center.</p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500">Top 3 priorities</h2>
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-neutral-200 px-4 py-3 text-neutral-400">
              Priority {n}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}