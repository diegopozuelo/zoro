'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Pencil, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Conversation = { id: number; title: string }
type Attachment = {
  kind: 'image' | 'pdf'
  data: string // base64
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

    // Build the real API payload: attachment blocks first, then text, on the last message
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
      <div
        className="flex flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className={`flex-1 space-y-4 overflow-y-auto rounded-lg ${dragOver ? 'bg-neutral-100 ring-2 ring-neutral-300' : ''}`}>
          {messages.length === 0 && !dragOver && (
            <p className="text-neutral-400">Ask me anything. I am your Zoro assistant. Drop an image or PDF to have me read it.</p>
          )}
          {dragOver && (
            <p className="flex h-full items-center justify-center text-neutral-500">Drop files to attach</p>
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

        <div className="mt-4">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                  {a.kind === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}
                  <span className="max-w-[140px] truncate">{a.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-neutral-400 hover:text-red-600">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex cursor-pointer items-center rounded-lg border border-neutral-300 px-3 hover:bg-neutral-50" title="Attach images or PDFs">
              <Paperclip size={18} className="text-neutral-500" />
              <input type="file" accept="image/*,application/pdf" multiple onChange={handleFilePick} className="hidden" />
            </label>
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
    </div>
  )
}