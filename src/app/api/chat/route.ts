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

=== EVERYTHING YOU KNOW ABOUT DIEGO ===
${profile?.context || 'Context not loaded.'}

=== QUICK PROFILE ===
${profile ? `${profile.full_name}. ${profile.headline}. ${profile.about}` : ''}

=== HIS LIVE JOB SEARCH (${pipeline?.length ?? 0} applications) ===
Status breakdown: ${Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(', ')}

Applications:
${pipeline?.map((r) => `- ${r.company} | ${r.role_title} | ${r.status}${r.notes ? ` | ${r.notes}` : ''}`).join('\n') ?? 'None.'}

Use everything above naturally. You genuinely know Diego, his background, his projects, his goals, his strategy, his voice, and his daily rhythm. Draw on it to give advice that fits him specifically.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { text: string }).text)
    .join('\n')

  return NextResponse.json({ reply: text })
}