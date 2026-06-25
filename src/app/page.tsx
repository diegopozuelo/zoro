import { supabase } from '@/lib/supabase'

const statusColors: Record<string, string> = {
  Applied: 'bg-blue-50 text-blue-700',
  Interview: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Ghosted: 'bg-neutral-100 text-neutral-600',
  Watchlist: 'bg-amber-50 text-amber-700',
}

export default async function TodayPage() {
  const { data: rows } = await supabase
    .from('pipeline')
    .select('*')
    .order('date_added', { ascending: false })

  const total = rows?.length ?? 0

  const counts: Record<string, number> = {}
  rows?.forEach((r) => {
    const s = r.status || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })
  const statusEntries = Object.entries(counts).sort((a, b) => b[1] - a[1])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const recent = rows?.slice(0, 5) ?? []

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-1 text-neutral-500">{today}</p>

      <section className="mt-8">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-semibold">{total}</span>
          <span className="text-neutral-500">applications tracked</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusEntries.map(([status, count]) => (
            <span
              key={status}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                statusColors[status] ?? 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {status}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">Top 3 priorities</h2>
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-neutral-200 px-4 py-3 text-neutral-400">
              Priority {n}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">Recent activity</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
              <div>
                <p className="font-medium">{r.company}</p>
                <p className="text-sm text-neutral-500">{r.role_title}</p>
              </div>
              <span className="text-sm text-neutral-500">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}