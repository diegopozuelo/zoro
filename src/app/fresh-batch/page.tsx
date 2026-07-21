'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, ExternalLink, ImagePlus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import HudShell from '@/components/HudShell'

type FreshJob = {
  id: string
  rank: number
  company: string
  role: string
  location: string | null
  fit_score: string | null
  why: string | null
  apply_url: string | null
  status: string
  batch_date: string | null
  conversation_id: number | null
}

function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pipelineNotes(job: FreshJob) {
  const parts: string[] = []
  if (job.fit_score) parts.push(`Fit ${job.fit_score}.`)
  if (job.why) parts.push(job.why)
  return parts.join(' ') || ''
}

export default function FreshBatchPage() {
  const [jobs, setJobs] = useState<FreshJob[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [chatImage, setChatImage] = useState<{ data: string; media_type: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('fresh_jobs')
      .select(
        'id, rank, company, role, location, fit_score, why, apply_url, status, batch_date, conversation_id'
      )
      .eq('status', 'fresh')
      .order('rank', { ascending: true })
    setJobs((data as FreshJob[]) ?? [])
    setLoading(false)
  }

  function attachImageFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setChatImage({ data: base64, media_type: file.type })
    }
    reader.readAsDataURL(file)
  }

  function pickChatImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) attachImageFile(file)
    e.target.value = ''
  }

  function handleChatDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) attachImageFile(file)
  }

  async function openWorkspace(job: FreshJob) {
    setOpenId(job.id)
    setChatMessages([])
    setChatInput('')
    setChatImage(null)
    if (job.conversation_id) {
      const { data } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', job.conversation_id)
        .order('created_at', { ascending: true })
      setChatMessages((data as { role: 'user' | 'assistant'; content: string }[]) ?? [])
    }
  }

  async function startFreshChat(job: FreshJob) {
    setStarting(true)
    const res = await fetch('/api/start-fresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        company: job.company,
        role: job.role,
        location: job.location,
        fit_score: job.fit_score,
        why: job.why,
        apply_url: job.apply_url,
      }),
    })
    const data = await res.json()
    setStarting(false)
    if (data.conversationId) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, conversation_id: data.conversationId } : j
        )
      )
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', data.conversationId)
        .order('created_at', { ascending: true })
      setChatMessages((msgs as { role: 'user' | 'assistant'; content: string }[]) ?? [])
    } else if (data.error) {
      window.alert(data.error)
    }
  }

  async function sendChat(job: FreshJob) {
    if ((!chatInput.trim() && !chatImage) || chatLoading || !job.conversation_id) return
    const marker = chatImage ? `${chatInput}\n\n[image attached]`.trim() : chatInput
    const userMsg = { role: 'user' as const, content: marker }
    const next = [...chatMessages, userMsg]
    setChatMessages(next)

    const apiMessages = next.map((m, i) => {
      if (i === next.length - 1 && chatImage) {
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: chatImage.media_type, data: chatImage.data },
            },
            { type: 'text', text: chatInput || 'What is in this image?' },
          ],
        }
      }
      return m
    })

    setChatInput('')
    setChatImage(null)
    setChatLoading(true)

    await supabase
      .from('messages')
      .insert({ role: 'user', content: marker, conversation_id: job.conversation_id })

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages }),
    })
    const data = await res.json()
    const aiMsg = { role: 'assistant' as const, content: data.reply }
    setChatMessages([...next, aiMsg])
    setChatLoading(false)

    await supabase.from('messages').insert({
      role: 'assistant',
      content: data.reply,
      conversation_id: job.conversation_id,
    })
  }

  async function markApplied(job: FreshJob) {
    if (
      !window.confirm(
        `Move ${job.company} into Pipeline as Applied? This removes it from Fresh Batch.`
      )
    ) {
      return
    }

    setApplyingId(job.id)
    const today = todayYmd()

    const { error: insertError } = await supabase.from('pipeline').insert({
      company: job.company,
      role_title: job.role || '',
      role_type: '',
      city: job.location || '',
      status: 'Applied',
      date_added: today,
      date_applied: today,
      job_url: job.apply_url || '',
      notes: pipelineNotes(job),
      project_id: null,
    })

    if (insertError) {
      window.alert('Could not add to Pipeline. The Fresh Batch row was left alone.')
      setApplyingId(null)
      return
    }

    const convId = job.conversation_id
    if (convId) {
      await supabase.from('messages').delete().eq('conversation_id', convId)
      await supabase.from('conversations').delete().eq('id', convId)
    }

    const { error: deleteError } = await supabase.from('fresh_jobs').delete().eq('id', job.id)
    if (deleteError) {
      window.alert(
        'Added to Pipeline, but could not remove the Fresh Batch row. You can delete it manually.'
      )
      setApplyingId(null)
      return
    }

    setJobs((prev) => prev.filter((j) => j.id !== job.id))
    setOpenId(null)
    setChatMessages([])
    setApplyingId(null)
  }

  const openJob = jobs.find((j) => j.id === openId) ?? null

  const batchLabel = (() => {
    const dates = [...new Set(jobs.map((j) => j.batch_date).filter(Boolean))] as string[]
    if (dates.length === 1) return dates[0]
    if (dates.length > 1) return `${dates.length} batches`
    return null
  })()

  // ---------- WORKSPACE VIEW ----------
  if (openJob) {
    return (
      <HudShell>
        <button
          onClick={() => setOpenId(null)}
          className="btn-ghost !border-0 !bg-transparent !px-0 !py-0 text-sm text-[var(--ink-soft)] hover:!text-[var(--ink)]"
        >
          <ArrowLeft size={16} />
          Back to board
        </button>

        <header className="hero-command motion-fade-in-slow relative mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-7">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="hero-glow opacity-60" aria-hidden />

          <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--accent-dim)] px-3 py-1 font-mono-metric tracking-wide text-[var(--accent)]">
              <span className="live-dot !bg-[var(--accent)] !shadow-[0_0_10px_var(--accent)]" />
              WORKSPACE
            </span>
            <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
              ZORO // FRESH BATCH
            </span>
            <span className="font-mono-metric text-[var(--accent)]">#{openJob.rank}</span>
          </div>

          <div className="relative z-[1] mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow eyebrow-accent">Application</p>
              <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl">
                {openJob.company}
              </h1>
              <div className="hero-title-rule mt-3" aria-hidden />
              <p className="mt-3 text-base text-[var(--ink-soft)]">{openJob.role}</p>
              {openJob.location && (
                <p className="mt-1 text-sm text-[var(--ink-faint)]">{openJob.location}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {openJob.fit_score && (
                <span className="status-pill status-pill-blue">Fit {openJob.fit_score}</span>
              )}
              {openJob.apply_url && (
                <a
                  href={openJob.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  Open listing
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => markApplied(openJob)}
                disabled={applyingId === openJob.id}
                className="btn-primary"
              >
                <CheckCircle2 size={15} />
                {applyingId === openJob.id ? 'Moving...' : 'Applied'}
              </button>
            </div>
          </div>
        </header>

        {(openJob.why || openJob.fit_score) && (
          <section className="hud-panel relative mt-6 p-5 sm:p-6">
            <span className="hud-corners-tr" aria-hidden />
            <span className="hud-corners-bl" aria-hidden />
            <div className="section-rail">
              <h2 className="eyebrow eyebrow-accent !mb-0">Why this role</h2>
            </div>
            {openJob.why ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{openJob.why}</p>
            ) : (
              <p className="mt-2 text-sm text-[var(--ink-faint)]">No writeup on file.</p>
            )}
          </section>
        )}

        <section className="hud-panel relative mt-4 p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Application chat</h2>
          </div>
          {!openJob.conversation_id ? (
            <div className="mt-2 flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] px-6 py-10 text-center">
              <p className="max-w-md text-sm text-[var(--ink-soft)]">
                Start a focused chat for this {openJob.company} application. Drop screenshots of the form and ask what to answer.
              </p>
              <button
                onClick={() => startFreshChat(openJob)}
                disabled={starting}
                className="btn-primary"
              >
                {starting ? 'Briefing...' : 'Start application chat'}
              </button>
            </div>
          ) : (
            <div
              className="mt-2 flex flex-col rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_40%,transparent)] p-4"
              style={{ height: '520px' }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleChatDrop}
            >
              <div
                className={`flex-1 space-y-4 overflow-y-auto rounded-lg transition ${
                  dragOver
                    ? 'bg-[var(--accent-dim)] ring-2 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]'
                    : ''
                }`}
              >
                {dragOver && (
                  <p className="flex h-full min-h-[12rem] items-center justify-center font-mono-metric text-sm text-[var(--accent)]">
                    Drop screenshot to attach
                  </p>
                )}
                {!dragOver &&
                  chatMessages.map((m, i) => (
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
                {!dragOver && chatLoading && (
                  <p className="font-mono-metric text-sm text-[var(--accent)]">Thinking...</p>
                )}
              </div>
              <div className="mt-3">
                {chatImage && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-[var(--ink-faint)]">
                    <span className="rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-1">
                      Image attached
                    </span>
                    <button
                      onClick={() => setChatImage(null)}
                      className="text-[var(--ink-faint)] hover:text-[var(--danger)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="btn-ghost cursor-pointer !px-3" title="Attach image">
                    <ImagePlus size={18} className="text-[var(--ink-soft)]" />
                    <input type="file" accept="image/*" onChange={pickChatImage} className="hidden" />
                  </label>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat(openJob)}
                    placeholder={`Ask about the ${openJob.company} application...`}
                    className="input-dark flex-1 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={() => sendChat(openJob)}
                    disabled={chatLoading}
                    className="btn-primary"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </HudShell>
    )
  }

  // ---------- BOARD VIEW ----------
  return (
    <HudShell>
      <header className="hero-command motion-fade-in-slow relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-7">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="hero-glow opacity-60" aria-hidden />
        <div className="hero-orbit hero-orbit-c opacity-50" aria-hidden />

        <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--accent-dim)] px-3 py-1 font-mono-metric tracking-wide text-[var(--accent)]">
            <span className="live-dot !bg-[var(--accent)] !shadow-[0_0_10px_var(--accent)]" />
            INTAKE
          </span>
          <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
            ZORO // FRESH BATCH
          </span>
        </div>

        <div className="relative z-[1] mt-6">
          <p className="eyebrow eyebrow-accent">Daily drop</p>
          <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl">
            Fresh Batch
          </h1>
          <div className="hero-title-rule mt-3" aria-hidden />
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
            Ranked roles from the latest feed. Review fit, open listings, and decide what enters Pipeline.
          </p>
          <p className="mt-3 font-mono-metric text-sm text-[var(--ink-faint)]">
            <span className="text-[var(--accent)]">{jobs.length}</span>
            {' '}fresh
            {batchLabel && (
              <>
                {' · '}
                batch {batchLabel}
              </>
            )}
          </p>
        </div>
      </header>

      <section className="motion-fade-in mt-8" style={{ animationDelay: '80ms' }}>
        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">Open roles</h2>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--ink-faint)]">Loading batch...</p>
        ) : jobs.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--ink-faint)]">
            No fresh roles right now. When n8n drops the next batch, they will show up here.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                onClick={() => openWorkspace(job)}
                className="group relative flex cursor-pointer flex-col rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 transition duration-[var(--dur-med)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono-metric text-xs tracking-wider text-[var(--accent)]">
                    #{job.rank}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {job.conversation_id && (
                      <span className="status-pill status-pill-green !text-xs">Chat</span>
                    )}
                    {job.fit_score && (
                      <span className="status-pill status-pill-blue !text-xs">
                        Fit {job.fit_score}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-2 font-medium leading-snug text-[var(--ink)]">
                  {job.company}
                </h3>
                <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{job.role}</p>

                {job.location && (
                  <p className="mt-2 text-xs text-[var(--ink-faint)]">{job.location}</p>
                )}

                {job.why && (
                  <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-[var(--ink-soft)]">
                    {job.why}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  {job.apply_url ? (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] transition hover:underline"
                    >
                      Open listing
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--ink-faint)]">No apply link</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      markApplied(job)
                    }}
                    disabled={applyingId === job.id}
                    className="btn-primary ml-auto !px-3 !py-1.5 !text-xs"
                  >
                    <CheckCircle2 size={14} />
                    {applyingId === job.id ? 'Moving...' : 'Applied'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </HudShell>
  )
}
