'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

type Idea = {
  id: number
  content: string
  tag: string | null
  created_at: string
}

const tagPill: Record<string, string> = {
  project: 'status-pill status-pill-blue',
  routine: 'status-pill status-pill-green',
  idea: 'status-pill status-pill-purple',
}

function pillForTag(tag: string) {
  const key = tag.toLowerCase()
  return tagPill[key] ?? 'status-pill status-pill-neutral'
}

export default function Brainstorm() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [content, setContent] = useState('')
  const [tag, setTag] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('brainstorm')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setIdeas(data as Idea[])
  }

  async function add() {
    if (!content.trim()) return
    const { data } = await supabase
      .from('brainstorm')
      .insert({ content, tag: tag.trim() || null })
      .select()
      .single()
    if (data) setIdeas((prev) => [data as Idea, ...prev])
    setContent('')
    setTag('')
  }

  async function remove(id: number) {
    await supabase.from('brainstorm').delete().eq('id', id)
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <section className="motion-fade-in mt-8 space-y-5 pb-10" style={{ animationDelay: '80ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">New idea</h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">
          Drop a project spark, routine tweak, or anything worth keeping.
        </p>
        <textarea
          rows={3}
          placeholder="Drop an idea... a project, a routine change, anything."
          className="input-dark mt-3 w-full px-4 py-3 text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            placeholder="Tag (optional): project, routine, idea..."
            className="input-dark min-w-[12rem] flex-1 px-3 py-2 text-sm"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <button onClick={add} className="btn-primary">
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-rail !mb-1">
              <h2 className="eyebrow eyebrow-accent !mb-0">Captured ideas</h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-mono-metric text-[var(--accent)]">{ideas.length}</span>
              {' '}total
            </p>
          </div>
        </div>

        {ideas.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--ink-faint)]">
            No ideas yet. Start capturing above.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="group interactive-row flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  {idea.tag && (
                    <span className={`mb-1.5 inline-block ${pillForTag(idea.tag)}`}>
                      {idea.tag}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                    {idea.content}
                  </p>
                </div>
                <button
                  onClick={() => remove(idea.id)}
                  className="shrink-0 text-[var(--ink-faint)] opacity-0 transition hover:text-[var(--danger)] group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
