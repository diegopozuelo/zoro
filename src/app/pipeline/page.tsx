import { supabase } from '@/lib/supabase'
import PipelineTable from '@/components/PipelineTable'

export default async function PipelinePage() {
  const { data: rows } = await supabase
    .from('pipeline')
    .select('id, company, role_title, role_type, city, status, date_applied, job_url, notes')
    .order('date_added', { ascending: false })

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold">Pipeline</h1>
      <p className="mt-1 text-neutral-500">{rows?.length ?? 0} applications tracked</p>

      <div className="mt-6">
        <PipelineTable initial={rows ?? []} />
      </div>
    </div>
  )
}