'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Pencil } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Conversation = { id: number; title: string }

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversation list on open
  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('id, title')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setConversations(data)
      if (activeId === null) selectChat(data[0].id)
    } else {
      await newChat()
    }
  }

  async function loadMessages(convId: number) {
    const { data } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
  }

  function selectChat(id: number) {
    setActiveId(id)
    loadMessages(id)
  }

  async function newChat() {
    const { data } = await supabase
      .from('conversations')
      .insert({ title: 'New chat' })
      .select()
      .single()
    if (data) {
      setConversations((prev) => [data, ...prev])
      setActiveId(data.id)
      setMessages([])
    }
  }

  async function renameChat(id: number) {
    const current = conversations.find((c) => c.id === id)
    const title = window.prompt('Rename chat', current?.title ?? '')
    if (title === null || !title.trim()) return
    await supabase.from('conversations').update({ title }).eq('id', id)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    )
  }

  async function deleteChat(id: number) {
    if (!window.confirm('Delete this chat? This cannot be undone.')) return
    await supabase.from('conversations').delete().eq('id', id)
    const remaining = conversations.filter((c) => c.id !== id)
    setConversations(remaining)
    if (activeId === id) {
      if (remaining.length > 0) {
        selectChat(remaining[0].id)
      } else {
        await newChat()
      }
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    if (!input.trim() || loading || activeId === null) return
    const isFirst = messages.length === 0
    const userMsg: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    await supabase.from('messages').insert({ ...userMsg, conversation_id: activeId })

    // Title the chat from the first message
    if (isFirst) {
      const title = userMsg.content.slice(0, 40)
      await supabase.from('conversations').update({ title }).eq('id', activeId)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, title } : c))
      )
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
    })
    const data = await res.json()
    const assistantMsg: Message = { role: 'assistant', content: data.reply }
    setMessages([...newMessages, assistantMsg])
    setLoading(false)

    await supabase.from('messages').insert({ ...assistantMsg, conversation_id: activeId })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Chat list */}
      <div className="flex w-56 shrink-0 flex-col border-r border-neutral-200 pr-3">
        <button
          onClick={newChat}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700"
        >
          <Plus size={16} />
          New chat
        </button>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
        {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-lg pr-1 text-sm ${
                c.id === activeId ? 'bg-neutral-200' : 'hover:bg-neutral-100'
              }`}
            >
              <button
                onClick={() => selectChat(c.id)}
                className="flex-1 truncate px-3 py-2 text-left"
              >
                {c.title}
              </button>
              <button
                onClick={() => renameChat(c.id)}
                className="hidden rounded p-1 text-neutral-400 hover:text-neutral-700 group-hover:block"
                title="Rename"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteChat(c.id)}
                className="hidden rounded p-1 text-neutral-400 hover:text-red-600 group-hover:block"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-neutral-400">Ask me anything. I am your Zoro assistant.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
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

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}