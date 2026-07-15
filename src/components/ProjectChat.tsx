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
      <section className="mt-10">
        <h2 className="eyebrow">Project chat</h2>
        <div className="card mt-3 flex flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">
            Start a focused chat for {projectName}. Zoro will read the project context and linked items.
          </p>
          <button
            onClick={startChat}
            disabled={starting}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {starting ? 'Starting...' : 'Start project chat'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-10">
      <h2 className="eyebrow">Project chat</h2>
      <div className="card mt-3 flex flex-col p-4" style={{ height: '520px' }}>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                  m.role === 'user' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-neutral-400">Thinking...</p>}
          <div ref={bottomRef} />
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Ask about ${projectName}...`}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  )
}
