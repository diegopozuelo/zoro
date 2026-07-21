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
    return (
      <p className="font-mono-metric text-sm text-[var(--ink-soft)]">Loading project...</p>
    )
  }

  if (!project) {
    return (
      <div className="motion-fade-in">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--accent)]"
        >
          <ArrowLeft size={16} />
          Back to projects
        </Link>
        <p className="mt-6 text-[var(--ink-soft)]">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="motion-fade-in-slow pb-10">
      <Link
        href="/projects"
        className="relative z-[1] inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--accent)]"
      >
        <ArrowLeft size={16} />
        Back to projects
      </Link>

      <header className="hero-command relative mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-7">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="hero-glow opacity-50" aria-hidden />

        <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
          <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
            ZORO // PROJECT
          </span>
          {saving && (
            <span className="font-mono-metric text-[var(--accent)]">Saving...</span>
          )}
        </div>

        <div className="relative z-[1] mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), saveName())}
            className="hero-title w-full bg-transparent font-display text-4xl tracking-tight text-[var(--ink)] outline-none sm:text-5xl"
            aria-label="Project name"
          />
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={project.status}
              onChange={(e) => update({ status: e.target.value })}
              className="input-dark rounded-full px-3 py-1.5 text-sm font-medium"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={remove}
              className="btn-ghost !p-2 text-[var(--ink-faint)] hover:!text-[var(--danger)]"
              title="Delete project"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="hero-title-rule relative z-[1] mt-4" aria-hidden />
      </header>

      <section className="hud-panel relative mt-6 p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">Context</h2>
        </div>
        <p className="text-xs text-[var(--ink-soft)]">
          What this project is about. The project assistant will read this later.
        </p>
        <textarea
          rows={8}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          onBlur={saveContext}
          placeholder="Goals, constraints, strategy, what done looks like..."
          className="input-dark mt-3 w-full resize-y px-3 py-2 text-sm"
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
