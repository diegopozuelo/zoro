'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Mail, ArrowLeft, ImagePlus, X, CheckCircle2, Clock } from 'lucide-react'
import ProjectSelect from '@/components/ProjectSelect'
import AmbientField from '@/components/AmbientField'

type Lead = {
  id: number
  company: string
  background: string | null
  contact_email: string | null
  contact_name: string | null
  contact_handle: string | null
  job_url: string | null
  status: string
  conversation_id: number | null
  last_outreach_at: string | null
  project_id: number | null
}

const STATUSES = ['Watchlist', 'Researching', 'Messaged', 'Replied', 'Archived']

const statusPill: Record<string, string> = {
  Watchlist: 'status-pill status-pill-amber',
  Researching: 'status-pill status-pill-blue',
  Messaged: 'status-pill status-pill-amber',
  Replied: 'status-pill status-pill-green',
  Archived: 'status-pill status-pill-neutral',
}

function HudShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hud-stage hud-stage-bleed">
      <AmbientField />
      <div className="hud-grid" aria-hidden />
      <div className="hud-scan" aria-hidden />
      <div className="hud-content mx-auto max-w-6xl">{children}</div>
    </div>
  )
}

export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [adding, setAdding] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [chatImage, setChatImage] = useState<{ data: string; media_type: string } | null>(null)
  const [graduated, setGraduated] = useState(false)

  function pickChatImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setChatImage({ data: base64, media_type: file.type })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function logOutreachEvent(leadId: number, actionType: string, note?: string) {
    const now = new Date().toISOString()
    await supabase.from('outreach_events').insert({
      lead_id: leadId,
      action_type: actionType,
      note: note ?? null,
    })
    await supabase.from('leads').update({ last_outreach_at: now }).eq('id', leadId)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, last_outreach_at: now } : l)))
  }

  async function logAndSetMessaged(lead: Lead) {
    await logOutreachEvent(lead.id, 'messaged')
    // Only advance status if it is behind; never override Replied or Archived
    if (lead.status === 'Watchlist' || lead.status === 'Researching') {
      await updateLead(lead.id, { status: 'Messaged' })
    }
  }

  async function graduateToPipeline(lead: Lead) {
    if (!window.confirm(`Add ${lead.company} to your Pipeline as an application?`)) return
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    await supabase.from('pipeline').insert({
      company: lead.company,
      role_title: 'Outreach lead',
      status: 'Applied',
      date_added: today,
      date_applied: today,
      job_url: lead.job_url,
      notes: lead.background,
    })
    await updateLead(lead.id, { status: 'Messaged' })
    setGraduated(true)
    setTimeout(() => setGraduated(false), 2500)
  }

  async function openWorkspace(lead: Lead) {
    setOpenId(lead.id)
    setChatMessages([])
    if (lead.conversation_id) {
      const { data } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', lead.conversation_id)
        .order('created_at', { ascending: true })
      setChatMessages((data as { role: 'user' | 'assistant'; content: string }[]) ?? [])
    }
  }

  async function startOutreachChat(lead: Lead) {
    setStarting(true)
    const res = await fetch('/api/start-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        company: lead.company,
        background: lead.background,
        contact_name: lead.contact_name,
        contact_email: lead.contact_email,
        contact_handle: lead.contact_handle,
        job_url: lead.job_url,
      }),
    })
    const data = await res.json()
    setStarting(false)
    if (data.conversationId) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, conversation_id: data.conversationId, status: 'Researching' } : l
        )
      )
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', data.conversationId)
        .order('created_at', { ascending: true })
      setChatMessages((msgs as { role: 'user' | 'assistant'; content: string }[]) ?? [])
    }
  }

  async function sendChat(lead: Lead) {
    if ((!chatInput.trim() && !chatImage) || chatLoading || !lead.conversation_id) return
    const marker = chatImage ? `${chatInput}\n\n[image attached]`.trim() : chatInput
    const userMsg = { role: 'user' as const, content: marker }
    const next = [...chatMessages, userMsg]
    setChatMessages(next)

    const apiMessages = next.map((m, i) => {
      if (i === next.length - 1 && chatImage) {
        return {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: chatImage.media_type, data: chatImage.data } },
            { type: 'text', text: chatInput || 'What is in this image?' },
          ],
        }
      }
      return m
    })

    setChatInput('')
    setChatImage(null)
    setChatLoading(true)

    await supabase.from('messages').insert({ role: 'user', content: marker, conversation_id: lead.conversation_id })

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages }),
    })
    const data = await res.json()
    const aiMsg = { role: 'assistant' as const, content: data.reply }
    setChatMessages([...next, aiMsg])
    setChatLoading(false)

    await supabase.from('messages').insert({ role: 'assistant', content: data.reply, conversation_id: lead.conversation_id })
  }

  async function load() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads((data as Lead[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function addBulk() {
    if (!bulkText.trim() || saving) return
    setSaving(true)
    const rows = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [company, background, email] = line.split('|').map((s) => s?.trim() ?? '')
        return {
          company: company || 'Untitled',
          background: background || null,
          contact_email: email || null,
          status: 'Watchlist',
        }
      })
    const { data } = await supabase.from('leads').insert(rows).select()
    if (data) setLeads((prev) => [...(data as Lead[]), ...prev])
    setBulkText('')
    setAdding(false)
    setSaving(false)
  }

  async function deleteLead(id: number) {
    if (!window.confirm('Delete this lead?')) return
    setLeads((prev) => prev.filter((l) => l.id !== id))
    if (openId === id) setOpenId(null)
    await supabase.from('leads').delete().eq('id', id)
  }

  async function updateLead(id: number, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    await supabase.from('leads').update(patch).eq('id', id)
  }

  const openLead = leads.find((l) => l.id === openId) ?? null

  // ---------- WORKSPACE VIEW ----------
  if (openLead) {
    return (
      <HudShell>
        <button
          onClick={() => setOpenId(null)}
          className="btn-ghost !px-0 !py-0 !border-0 !bg-transparent text-sm text-[var(--ink-soft)] hover:!text-[var(--ink)]"
        >
          <ArrowLeft size={16} />
          Back to board
        </button>

        <header className="hero-command motion-fade-in-slow relative mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_55%,transparent)] p-5 sm:p-7 backdrop-blur-sm">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="hero-glow opacity-60" aria-hidden />

          <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--accent-dim)] px-3 py-1 font-mono-metric tracking-wide text-[var(--accent)]">
              <span className="live-dot !bg-[var(--accent)] !shadow-[0_0_10px_var(--accent)]" />
              WORKSPACE
            </span>
            <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
              ZORO // OUTREACH
            </span>
          </div>

          <div className="relative z-[1] mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow eyebrow-accent">Target company</p>
              <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl">
                {openLead.company}
              </h1>
              <div className="hero-title-rule mt-3" aria-hidden />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => graduateToPipeline(openLead)}
                className="btn-ghost"
                title="Add to Pipeline as an application"
              >
                {graduated ? <CheckCircle2 size={15} className="text-[var(--ok)]" /> : null}
                {graduated ? 'Added' : 'Add to Pipeline'}
              </button>
              <select
                value={openLead.status}
                onChange={(e) => {
                  const newStatus = e.target.value
                  updateLead(openLead.id, { status: newStatus })
                  if (newStatus === 'Messaged') logOutreachEvent(openLead.id, 'messaged')
                }}
                className={`input-dark rounded-full px-3 py-1.5 text-sm font-medium ${statusPill[openLead.status] ?? 'status-pill status-pill-neutral'}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Company info */}
        <section className="hud-panel relative mt-6 p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <label className="eyebrow eyebrow-accent">Background</label>
          <textarea
            rows={3}
            value={openLead.background ?? ''}
            onChange={(e) => updateLead(openLead.id, { background: e.target.value })}
            placeholder="What this company does, why it is interesting, timing signals..."
            className="input-dark mt-2 w-full resize-none px-3 py-2 text-sm"
          />

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow">Contact name</label>
              <input
                value={openLead.contact_name ?? ''}
                onChange={(e) => updateLead(openLead.id, { contact_name: e.target.value })}
                placeholder="Who to reach"
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="eyebrow">Contact email</label>
              <input
                value={openLead.contact_email ?? ''}
                onChange={(e) => updateLead(openLead.id, { contact_email: e.target.value })}
                placeholder="name@company.com"
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="eyebrow">LinkedIn or handle</label>
              <input
                value={openLead.contact_handle ?? ''}
                onChange={(e) => updateLead(openLead.id, { contact_handle: e.target.value })}
                placeholder="LinkedIn URL or @handle"
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="eyebrow">Job or company URL</label>
              <input
                value={openLead.job_url ?? ''}
                onChange={(e) => updateLead(openLead.id, { job_url: e.target.value })}
                placeholder="https://..."
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="eyebrow">Project</label>
              <ProjectSelect
                value={openLead.project_id}
                onChange={(projectId) => updateLead(openLead.id, { project_id: projectId })}
                includeDoneIds={openLead.project_id ? [openLead.project_id] : []}
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Log actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Log</span>
          <button
            onClick={() => logOutreachEvent(openLead.id, 'researched')}
            className="btn-ghost !px-3 !py-1.5 !text-xs"
          >
            Researched
          </button>
          <button
            onClick={() => logAndSetMessaged(openLead)}
            className="btn-ghost !px-3 !py-1.5 !text-xs"
          >
            Messaged
          </button>
          <button
            onClick={() => logOutreachEvent(openLead.id, 'followed up')}
            className="btn-ghost !px-3 !py-1.5 !text-xs"
          >
            Followed up
          </button>
          {openLead.last_outreach_at && (
            <span className="ml-2 flex items-center gap-1 text-xs text-[var(--ink-faint)]">
              <Clock size={12} />
              Last touch {new Date(openLead.last_outreach_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Outreach chat */}
        <section className="hud-panel relative mt-4 p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Outreach chat</h2>
          </div>
          {!openLead.conversation_id ? (
            <div className="mt-2 flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] px-6 py-10 text-center">
              <p className="max-w-md text-sm text-[var(--ink-soft)]">
                Start a focused chat for {openLead.company}. Zoro will research them and recommend how to approach.
              </p>
              <button
                onClick={() => startOutreachChat(openLead)}
                disabled={starting}
                className="btn-primary"
              >
                {starting ? 'Researching...' : 'Start outreach chat'}
              </button>
            </div>
          ) : (
            <div
              className="mt-2 flex flex-col rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_40%,transparent)] p-4"
              style={{ height: '520px' }}
            >
              <div className="flex-1 space-y-4 overflow-y-auto">
                {chatMessages.map((m, i) => (
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
                {chatLoading && (
                  <p className="font-mono-metric text-sm text-[var(--accent)]">Thinking...</p>
                )}
              </div>
              <div className="mt-3">
                {chatImage && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-[var(--ink-faint)]">
                    <span className="rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-1">Image attached</span>
                    <button onClick={() => setChatImage(null)} className="text-[var(--ink-faint)] hover:text-[var(--danger)]">
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
                    onKeyDown={(e) => e.key === 'Enter' && sendChat(openLead)}
                    placeholder={`Strategize your ${openLead.company} outreach...`}
                    className="input-dark flex-1 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={() => sendChat(openLead)}
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
      <header className="hero-command motion-fade-in-slow relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_55%,transparent)] p-5 sm:p-7 backdrop-blur-sm">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="hero-glow opacity-60" aria-hidden />
        <div className="hero-orbit hero-orbit-c opacity-50" aria-hidden />

        <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--accent-dim)] px-3 py-1 font-mono-metric tracking-wide text-[var(--accent)]">
            <span className="live-dot !bg-[var(--accent)] !shadow-[0_0_10px_var(--accent)]" />
            PROSPECT
          </span>
          <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
            ZORO // OUTREACH
          </span>
        </div>

        <div className="relative z-[1] mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow eyebrow-accent">Target companies</p>
            <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl">
              Outreach
            </h1>
            <div className="hero-title-rule mt-3" aria-hidden />
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
              Your target companies, worked one at a time.
            </p>
          </div>
          <button onClick={() => setAdding((v) => !v)} className="btn-primary shrink-0">
            <Plus size={16} />
            Add companies
          </button>
        </div>
      </header>

      {adding && (
        <section className="hud-panel relative mt-6 p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <label className="eyebrow eyebrow-accent">Paste your list</label>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            One company per line, in the format: Company | background | email. Background and email are optional.
          </p>
          <textarea
            rows={8}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'Ramp | fintech, corporate cards, $44B valuation | careers@ramp.com\nMercury | banking for startups | \nVanta | security compliance automation | jobs@vanta.com'}
            className="input-dark mt-3 w-full px-3 py-2 font-mono text-xs"
          />
          <div className="mt-3 flex items-center gap-2">
            <button onClick={addBulk} disabled={saving} className="btn-primary">
              {saving ? 'Adding...' : 'Add to Watchlist'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-sm text-[var(--ink-faint)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="motion-fade-in mt-8 space-y-8" style={{ animationDelay: '80ms' }}>
        {STATUSES.map((status) => {
          const group = leads.filter((l) => l.status === status)
          return (
            <section key={status}>
              <div className="flex items-center gap-2">
                <h2 className="eyebrow eyebrow-accent">{status}</h2>
                <span className={`${statusPill[status] ?? 'status-pill status-pill-neutral'} !px-2 !py-0.5 !text-xs`}>
                  {group.length}
                </span>
              </div>
              {group.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--ink-faint)]">Nothing here yet.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {group.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => openWorkspace(lead)}
                      className="group relative cursor-pointer rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] p-4 transition duration-[var(--dur-med)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:shadow-[0_0_28px_var(--accent-glow)]"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteLead(lead.id)
                        }}
                        className="absolute right-3 top-3 text-[var(--ink-faint)] opacity-0 transition hover:text-[var(--danger)] group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="font-medium text-[var(--ink)]">{lead.company}</div>
                      {lead.background && (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-soft)]">{lead.background}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={statusPill[lead.status] ?? 'status-pill status-pill-neutral'}>
                          {lead.status}
                        </span>
                        {lead.contact_email && (
                          <span className="flex items-center gap-1 text-xs text-[var(--ink-faint)]">
                            <Mail size={12} />
                            {lead.contact_email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </HudShell>
  )
}
