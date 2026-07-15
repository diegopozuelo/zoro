'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Trash2 } from 'lucide-react'
import ProjectLinkedItems from '@/components/ProjectLinkedItems'
import ProjectChat from '@/components/ProjectChat'

type Project = {
  id: number
  name: string
  context: string | null
  status: string
  conversation_id: number | null
}

const STATUSES = ['Active', 'Paused', 'Done']

const statusColor: Record<string, string> = {
  Active: 'bg-green-50 text-green-700',
  Paused: 'bg-amber-50 text-amber-700',
  Done: 'bg-neutral-100 text-neutral-500',
}

export default function ProjectWorkspace({ projectId }: { projectId: number }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [context, setContext] = useState('')

  useEffect(() => {
    load()
  }, [projectId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('id, name, context, status, conversation_id')
      .eq('id', projectId)
      .maybeSingle()
    if (data) {
      const p = data as Project
      setProject(p)
      setName(p.name)
      setContext(p.context ?? '')
    } else {
      setProject(null)
    }
    setLoading(false)
  }

  async function update(patch: Partial<Project>) {
    if (!project) return
    setProject((prev) => (prev ? { ...prev, ...patch } : prev))
    await supabase.from('projects').update(patch).eq('id', project.id)
  }

  async function saveName() {
    const trimmed = name.trim()
    if (!project || !trimmed || trimmed === project.name) return
    setSaving(true)
    await update({ name: trimmed })
    setSaving(false)
  }

  async function saveContext() {
    if (!project) return
    const next = context.trim() ? context : null
    if ((project.context ?? '') === (next ?? '')) return
    setSaving(true)
    await update({ context: next })
    setSaving(false)
  }

  async function remove() {
    if (!project) return
    if (
      !window.confirm(
        'Delete this project? Linked notes, leads, and applications will stay, but lose their project link.'
      )
    )
      return
    await supabase.from('projects').delete().eq('id', project.id)
    router.push('/projects')
  }

  if (loading) {
    return <p className="text-sm text-[var(--ink-soft)]">Loading project...</p>
  }

  if (!project) {
    return (
      <div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={16} />
          Back to projects
        </Link>
        <p className="mt-6 text-[var(--ink-soft)]">Project not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/projects"
        className="flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
      >
        <ArrowLeft size={16} />
        Back to projects
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), saveName())}
          className="w-full bg-transparent font-display text-5xl outline-none"
          aria-label="Project name"
        />
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => update({ status: e.target.value })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium outline-none ${
              statusColor[project.status] ?? 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={remove}
            className="rounded-lg border border-neutral-300 p-2 text-neutral-400 hover:text-red-600"
            title="Delete project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {saving && (
        <p className="mt-2 text-xs text-[var(--ink-faint)]">Saving...</p>
      )}

      <section className="card mt-8 p-5">
        <label className="eyebrow">Context</label>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          What this project is about. The project assistant will read this later.
        </p>
        <textarea
          rows={8}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          onBlur={saveContext}
          placeholder="Goals, constraints, strategy, what done looks like..."
          className="mt-3 w-full resize-y rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none"
        />
      </section>

      <ProjectLinkedItems projectId={project.id} />

      <ProjectChat
        projectId={project.id}
        projectName={project.name}
        conversationId={project.conversation_id}
        onConversationReady={(id) =>
          setProject((prev) => (prev ? { ...prev, conversation_id: id } : prev))
        }
      />
    </div>
  )
}
