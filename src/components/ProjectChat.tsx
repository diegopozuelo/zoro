'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Message = { role: 'user' | 'assistant'; content: string }

export default function ProjectChat({
  projectId,
  projectName,
  conversationId,
  onConversationReady,
}: {
  projectId: number
  projectName: string
  conversationId: number | null
  onConversationReady: (id: number) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(conversationId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveId(conversationId)
    if (conversationId) loadMessages(conversationId)
    else setMessages([])
  }, [conversationId, projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadMessages(convId: number) {
    const { data } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
  }

  async function startChat() {
    if (starting) return
    setStarting(true)
    try {
      const res = await fetch('/api/start-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (data.conversationId) {
        setActiveId(data.conversationId)
        onConversationReady(data.conversationId)
        await loadMessages(data.conversationId)
      }
    } finally {
      setStarting(false)
    }
  }

  async function send() {
    if (!input.trim() || loading || !activeId) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    await supabase.from('messages').insert({
      role: 'user',
      content: userMsg.content,
      conversation_id: activeId,
    })

    try {
      const res = await fetch('/api/project-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, messages: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoading(false)
        return
      }
      const reply = data.reply || 'I could not complete that request.'
      const assistantMsg: Message = { role: 'assistant', content: reply }
      setMessages([...next, assistantMsg])
      await supabase.from('messages').insert({
        role: 'assistant',
        content: reply,
        conversation_id: activeId,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!activeId) {
    return (
      <section className="hud-panel relative mt-6 p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">Project chat</h2>
        </div>
        <div className="mt-2 flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] px-6 py-10 text-center">
          <p className="max-w-md text-sm text-[var(--ink-soft)]">
            Start a focused chat for {projectName}. Zoro will read the project context and linked items.
          </p>
          <button onClick={startChat} disabled={starting} className="btn-primary">
            {starting ? 'Starting...' : 'Start project chat'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="hud-panel relative mt-6 p-5 sm:p-6">
      <span className="hud-corners-tr" aria-hidden />
      <span className="hud-corners-bl" aria-hidden />
      <div className="section-rail">
        <h2 className="eyebrow eyebrow-accent !mb-0">Project chat</h2>
      </div>
      <div
        className="mt-2 flex flex-col rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_40%,transparent)] p-4"
        style={{ height: '520px' }}
      >
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-[#041018] shadow-[0_0_16px_var(--accent-glow)]'
                    : 'border border-[var(--line)] bg-[var(--card)] text-[var(--ink)]'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="font-mono-metric text-sm text-[var(--accent)]">Thinking...</p>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Ask about ${projectName}...`}
            className="input-dark flex-1 px-4 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="btn-primary"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  )
}
