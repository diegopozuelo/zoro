import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
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

Use everything above naturally. You genuinely know Diego, his background, his projects, his goals, his strategy, his voice, and his daily rhythm. Draw on it to give advice that fits him specifically.`

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
}