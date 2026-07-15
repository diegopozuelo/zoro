import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const { data: profile } = await supabase.from('profile').select('*').single()
    const { data: pipeline } = await supabase
      .from('pipeline')
      .select('company, role_title, role_type, city, status, date_applied, notes')
      .order('date_added', { ascending: false })

    const counts: Record<string, number> = {}
    pipeline?.forEach((r) => {
      const s = r.status || 'Unknown'
      counts[s] = (counts[s] || 0) + 1
    })

    // Recent window for time-based data (local calendar dates)
    const since = new Date()
    since.setDate(since.getDate() - 14)
    const sinceStr = ymd(since)
    const todayStr = ymd(new Date())

    // Open notes (current tasks, reminders, thoughts)
    const { data: notes } = await supabase
      .from('notes')
      .select('title, description, type, priority, due_date')
      .eq('done', false)
      .order('due_date', { ascending: true, nullsFirst: false })

    // Recent journal entries
    const { data: journal } = await supabase
      .from('journal')
      .select('entry_date, content')
      .gte('entry_date', sinceStr)
      .order('entry_date', { ascending: false })

    // Recent life data
    const { data: lifeDays } = await supabase
      .from('life_days')
      .select('entry_date, sleep_hours, work_hours, reading_minutes')
      .gte('entry_date', sinceStr)
      .order('entry_date', { ascending: false })

    // Recent brainstorm ideas
    const { data: brainstorm } = await supabase
      .from('brainstorm')
      .select('content, tag, created_at')
      .gte('created_at', sinceStr)
      .order('created_at', { ascending: false })

    const systemPrompt = `You are Zoro, the personal AI assistant for Diego Pozuelo. You know him deeply and help with his job search, outreach, planning, building, and thinking. Be direct, warm, and practical. Give verdicts first, then brief reasoning. Keep responses focused, not dense. Never use dashes in written content you draft for him.

You have a web search tool. Use it whenever current information would help: researching a company before outreach, checking recent news, funding, or hiring signals, verifying facts, or anything where your training data might be stale. Search proactively rather than guessing, but do not search for things you already know well.

FORMATTING RULES, follow strictly: Write in plain prose and short paragraphs. Do not use markdown headers (no # or ##). Do not use emoji. Never use dashes anywhere, not em dashes, en dashes, or hyphens as punctuation. Keep it clean and readable.

=== EVERYTHING YOU KNOW ABOUT DIEGO ===
${profile?.context || 'Context not loaded.'}

=== QUICK PROFILE ===
${profile ? `${profile.full_name}. ${profile.headline}. ${profile.about}` : ''}

=== HIS LIVE JOB SEARCH (${pipeline?.length ?? 0} applications) ===
Status breakdown: ${Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(', ')}

Applications:
${pipeline?.map((r) => `- ${r.company} | ${r.role_title} | ${r.status}${r.notes ? ` | ${r.notes}` : ''}`).join('\n') ?? 'None.'}

=== HIS OPEN NOTES AND TASKS (today is ${todayStr}) ===
These are his current tasks, reminders, and thoughts. Pay attention to anything due today or overdue.
${notes?.map((n) => `- [${n.type}, ${n.priority}${n.due_date ? `, due ${n.due_date}` : ''}] ${n.title}${n.description ? `: ${n.description}` : ''}`).join('\n') ?? 'None.'}

=== RECENT JOURNAL (last 14 days) ===
${journal?.map((j) => `${j.entry_date}: ${j.content}`).join('\n\n') ?? 'None.'}

=== RECENT LIFE DATA (last 14 days) ===
${lifeDays?.map((d) => `${d.entry_date}: sleep ${d.sleep_hours ?? 0}h, work ${d.work_hours ?? 0}h, reading ${d.reading_minutes ?? 0}min`).join('\n') ?? 'None.'}

=== RECENT BRAINSTORM IDEAS (last 14 days) ===
${brainstorm?.map((b) => `- ${b.content}${b.tag ? ` (${b.tag})` : ''}`).join('\n') ?? 'None.'}

Use everything above naturally. You genuinely know Diego, his background, his projects, his goals, his strategy, his voice, his daily rhythm, what is currently on his mind, and how he has been doing lately. Draw on all of it to give advice that fits him specifically. When he asks what to focus on, factor in his due tasks and how his week has been going.`
    const tools = [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 5 }]

    // Loop until Claude stops requesting tools and returns a final answer
    const working = [...messages]
    let finalText = ''

    for (let step = 0; step < 6; step++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: working,
        tools,
      })

      if (response.stop_reason === 'tool_use') {
        // Claude is mid-search. Feed its turn back and let it continue.
        working.push({ role: 'assistant', content: response.content })
        // web_search runs server-side, so we just continue the loop
        continue
      }

      finalText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n')
      break
    }

    return NextResponse.json({ reply: finalText || 'I could not complete that request.' })
  } catch (err) {
    console.error('chat route error:', err)
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 })
  }
}