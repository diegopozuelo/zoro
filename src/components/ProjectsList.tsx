'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

type Project = {
  id: number
  name: string
  status: string
  created_at: string
}

const statusColor: Record<string, string> = {
  Active: 'bg-green-50 text-green-700',
  Paused: 'bg-amber-50 text-amber-700',
  Done: 'bg-neutral-100 text-neutral-500',
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false })
    setProjects((data as Project[]) ?? [])
  }

  async function create() {
    if (!name.trim() || saving) return
    setSaving(true)
    const { data } = await supabase
      .from('projects')
      .insert({ name: name.trim(), status: 'Active' })
      .select('id, name, status, created_at')
      .single()
    if (data) setProjects((prev) => [data as Project, ...prev])
    setName('')
    setAdding(false)
    setSaving(false)
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this project? Linked notes, leads, and applications will stay, but lose their project link.')) return
    setProjects((prev) => prev.filter((p) => p.id !== id))
    await supabase.from('projects').delete().eq('id', id)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">All projects</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
        >
          <Plus size={16} />
          New project
        </button>
      </div>

      {adding && (
        <div className="card mt-3 flex gap-2 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Project name, e.g. Find a job"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
            autoFocus
          />
          <button
            onClick={create}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
          <button
            onClick={() => {
              setAdding(false)
              setName('')
            }}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {projects.length === 0 && !adding && (
          <p className="text-sm text-[var(--ink-soft)]">
            No projects yet. Create one to group notes, outreach, and applications.
          </p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className="group flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--card)] px-5 py-4"
          >
            <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
              <p className="font-display text-2xl leading-tight">{p.name}</p>
              <span
                className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusColor[p.status] ?? 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {p.status}
              </span>
            </Link>
            <button
              onClick={() => remove(p.id)}
              className="hidden shrink-0 p-2 text-neutral-400 hover:text-red-600 group-hover:block"
              title="Delete project"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
