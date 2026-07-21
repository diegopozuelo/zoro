'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Pencil, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'
import HudShell from '@/components/HudShell'

type Message = { role: 'user' | 'assistant'; content: string }
type Conversation = { id: number; title: string }
type Attachment = {
  kind: 'image' | 'pdf'
  data: string
  media_type: string
  name: string
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const chatParam = params.get('chat')
    loadConversations(chatParam ? Number(chatParam) : null)
  }, [])

  async function loadConversations(preferredId: number | null = null) {
    const { data } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('kind', 'assistant')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setConversations(data)
      if (preferredId && data.some((c) => c.id === preferredId)) {
        selectChat(preferredId)
      } else if (activeId === null) {
        selectChat(data[0].id)
      }
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
      .insert({ title: 'New chat', kind: 'assistant' })
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

  function addFiles(files: FileList | File[]) {
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      if (!isImage && !isPdf) return
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachments((prev) => [
          ...prev,
          {
            kind: isImage ? 'image' : 'pdf',
            data: base64,
            media_type: file.type,
            name: file.name,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function send() {
    if ((!input.trim() && attachments.length === 0) || loading || activeId === null) return
    const isFirst = messages.length === 0

    const marker =
      attachments.length > 0
        ? `\n\n[${attachments.length} file${attachments.length > 1 ? 's' : ''} attached: ${attachments.map((a) => a.name).join(', ')}]`
        : ''
    const displayContent = `${input}${marker}`.trim()
    const userMsg: Message = { role: 'user', content: displayContent }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const apiMessages = newMessages.map((m, i) => {
      if (i === newMessages.length - 1 && attachments.length > 0) {
        const blocks = attachments.map((a) =>
          a.kind === 'image'
            ? { type: 'image', source: { type: 'base64', media_type: a.media_type, data: a.data } }
            : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data } }
        )
        return {
          role: 'user',
          content: [...blocks, { type: 'text', text: input || 'Please review the attached files.' }],
        }
      }
      return m
    })

    setInput('')
    setAttachments([])
    setLoading(true)

    await supabase.from('messages').insert({ role: 'user', content: displayContent, conversation_id: activeId })

    if (isFirst) {
      const title = (input || 'Attachment').slice(0, 40)
      await supabase.from('conversations').update({ title }).eq('id', activeId)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, title } : c))
      )
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages }),
    })
    const data = await res.json()
    const assistantMsg: Message = { role: 'assistant', content: data.reply }
    setMessages([...newMessages, assistantMsg])
    setLoading(false)

    await supabase.from('messages').insert({ role: 'assistant', content: data.reply, conversation_id: activeId })
  }

  return (
    <HudShell>
        <header className="hero-command motion-fade-in-slow relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="hero-glow opacity-50" aria-hidden />

          <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ok)_35%,var(--line))] bg-[color-mix(in_srgb,var(--ok)_10%,transparent)] px-3 py-1 font-mono-metric tracking-wide text-[var(--ok)]">
              <span className="live-dot" />
              ONLINE
            </span>
            <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
              ZORO // ASSISTANT
            </span>
          </div>

          <div className="relative z-[1] mt-4">
            <p className="eyebrow eyebrow-accent">Personal OS</p>
            <h1 className="hero-title mt-2 font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl">
              Hello Mr. Pozuelo, how can I assist you today?
            </h1>
            <div className="hero-title-rule mt-3" aria-hidden />
          </div>
        </header>

        <div className="motion-fade-in mt-5 flex min-h-0 flex-1 gap-4 pb-6" style={{ animationDelay: '60ms', minHeight: 'calc(100vh - 14rem)' }}>
          {/* Chat list */}
          <aside className="hud-panel relative flex w-56 shrink-0 flex-col p-3 sm:w-60">
            <span className="hud-corners-tr" aria-hidden />
            <span className="hud-corners-bl" aria-hidden />
            <button onClick={newChat} className="btn-primary w-full justify-center">
              <Plus size={16} />
              New chat
            </button>
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-0.5 rounded-lg pr-1 text-sm transition duration-[var(--dur-med)] ${
                    c.id === activeId
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] shadow-[0_0_16px_var(--accent-glow)]'
                      : 'text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:text-[var(--ink)]'
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
                    className="hidden rounded p-1 text-[var(--ink-faint)] hover:text-[var(--ink)] group-hover:block"
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteChat(c.id)}
                    className="hidden rounded p-1 text-[var(--ink-faint)] hover:text-[var(--danger)] group-hover:block"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* Conversation */}
          <div
            className="hud-panel relative flex min-w-0 flex-1 flex-col p-4"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="hud-corners-tr" aria-hidden />
            <span className="hud-corners-bl" aria-hidden />

            <div
              className={`flex-1 space-y-4 overflow-y-auto rounded-xl p-2 transition ${
                dragOver
                  ? 'bg-[var(--accent-dim)] ring-2 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]'
                  : ''
              }`}
            >
              {messages.length === 0 && !dragOver && (
                <p className="px-2 text-sm text-[var(--ink-faint)]">
                  Ask me anything. I am your Zoro assistant. Drop an image or PDF to have me read it.
                </p>
              )}
              {dragOver && (
                <p className="flex h-full items-center justify-center font-mono-metric text-sm text-[var(--accent)]">
                  Drop files to attach
                </p>
              )}
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

            <div className="mt-4">
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--ink-soft)]"
                    >
                      {a.kind === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}
                      <span className="max-w-[140px] truncate">{a.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-[var(--ink-faint)] hover:text-[var(--danger)]"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label
                  className="btn-ghost cursor-pointer !px-3"
                  title="Attach images or PDFs"
                >
                  <Paperclip size={18} />
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFilePick}
                    className="hidden"
                  />
                </label>
                <input
                  className="input-dark flex-1 px-4 py-2 text-sm"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                />
                <button
                  onClick={send}
                  disabled={loading}
                  className="btn-primary"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
    </HudShell>
  )
}
