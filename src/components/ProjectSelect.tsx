'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type ProjectOption = { id: number; name: string }

export function useProjectOptions() {
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name')
      .neq('status', 'Done')
      .order('name', { ascending: true })
      .then(({ data }) => setProjects((data as ProjectOption[]) ?? []))
  }, [])

  return projects
}

export default function ProjectSelect({
  value,
  onChange,
  className = '',
  allowNone = true,
  includeDoneIds = [],
}: {
  value: number | null
  onChange: (projectId: number | null) => void
  className?: string
  allowNone?: boolean
  /** Keep a Done project visible if this item is already linked to it */
  includeDoneIds?: number[]
}) {
  const projects = useProjectOptions()
  const [extra, setExtra] = useState<ProjectOption[]>([])

  useEffect(() => {
    const missing = includeDoneIds.filter(
      (id) => id && !projects.some((p) => p.id === id)
    )
    if (missing.length === 0) {
      setExtra([])
      return
    }
    supabase
      .from('projects')
      .select('id, name')
      .in('id', missing)
      .then(({ data }) => setExtra((data as ProjectOption[]) ?? []))
  }, [includeDoneIds.join(','), projects])

  const options = [...projects]
  for (const e of extra) {
    if (!options.some((p) => p.id === e.id)) options.push(e)
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v ? Number(v) : null)
      }}
      className={className || 'input-dark px-2 py-1.5 text-sm'}
    >
      {allowNone && <option value="">No project</option>}
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
