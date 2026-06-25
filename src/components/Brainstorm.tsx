'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'

type Idea = {
  id: number
  content: string
  tag: string | null
  created_at: string
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
    <div className="max-w-2xl">
      {/* Add new idea */}
      <div className="rounded-lg border border-neutral-200 p-4">
        <textarea
          rows={3}
          placeholder="Drop an idea... a project, a routine change, anything."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            placeholder="Tag (optional): project, routine, idea..."
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <button
            onClick={add}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Ideas list */}
      <div className="mt-6 space-y-3">
        {ideas.length === 0 && (
          <p className="text-sm text-neutral-400">No ideas yet. Start capturing.</p>
        )}
        {ideas.map((idea) => (
          <div key={idea.id} className="group flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-4">
            <div>
              {idea.tag && (
                <span className="mb-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {idea.tag}
                </span>
              )}
              <p className="whitespace-pre-wrap text-sm">{idea.content}</p>
            </div>
            <button
              onClick={() => remove(idea.id)}
              className="hidden text-neutral-400 hover:text-red-600 group-hover:block"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}