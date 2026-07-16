'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Check } from 'lucide-react'

type Project = {
  id: number
  name: string
  status: string
  created_at: string
}

const statusPill: Record<string, string> = {
  Active: 'status-pill status-pill-green',
  Paused: 'status-pill status-pill-amber',
  Done: 'status-pill status-pill-neutral',
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
    if (
      !window.confirm(
        'Delete this project? Linked notes, leads, and applications will stay, but lose their project link.'
      )
    )
      return
    setProjects((prev) => prev.filter((p) => p.id !== id))
    await supabase.from('projects').delete().eq('id', id)
  }

  const active = projects.filter((p) => p.status === 'Active').length
  const paused = projects.filter((p) => p.status === 'Paused').length
  const done = projects.filter((p) => p.status === 'Done').length

  return (
    <section className="motion-fade-in mt-8" style={{ animationDelay: '80ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-rail !mb-1">
              <h2 className="eyebrow eyebrow-accent !mb-0">All projects</h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-mono-metric text-[var(--accent)]">{projects.length}</span>
              {' '}total
              <span className="text-[var(--ink-faint)]">
                {' '}· {active} active · {paused} paused · {done} done
              </span>
            </p>
          </div>
          <button onClick={() => setAdding((v) => !v)} className="btn-primary">
            <Plus size={16} />
            New project
          </button>
        </div>

        {adding && (
          <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--card))] p-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Project name, e.g. Find a job"
              className="input-dark min-w-[12rem] flex-1 px-3 py-2 text-sm"
              autoFocus
            />
            <button
              onClick={create}
              disabled={saving || !name.trim()}
              className="btn-primary !px-4 !py-2"
            >
              <Check size={14} />
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setAdding(false)
                setName('')
              }}
              className="btn-ghost !px-3 !py-2"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {projects.length === 0 && !adding && (
            <p className="text-sm text-[var(--ink-faint)]">
              No projects yet. Create one to group notes, outreach, and applications.
            </p>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className="group interactive-row flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--card)] px-5 py-4"
            >
              <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                <p className="font-display text-2xl leading-tight tracking-tight text-[var(--ink)]">
                  {p.name}
                </p>
                <span className={`mt-2 inline-flex ${statusPill[p.status] ?? 'status-pill status-pill-neutral'}`}>
                  {p.status}
                </span>
              </Link>
              <button
                onClick={() => remove(p.id)}
                className="shrink-0 p-2 text-[var(--ink-faint)] opacity-0 transition hover:text-[var(--danger)] group-hover:opacity-100"
                title="Delete project"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
