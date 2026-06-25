import { supabase } from '@/lib/supabase'

export default async function PipelinePage() {
  const { data: rows } = await supabase
    .from('pipeline')
    .select('*')
    .order('date_added', { ascending: false })

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold">Pipeline</h1>
      <p className="mt-1 text-neutral-500">{rows?.length ?? 0} applications tracked</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Applied</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-medium">{r.company}</td>
                <td className="px-4 py-3 text-neutral-700">{r.role_title}</td>
                <td className="px-4 py-3 text-neutral-500">{r.role_type}</td>
                <td className="px-4 py-3 text-neutral-500">{r.city}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 text-neutral-500">{r.date_applied ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}