import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  // Pull Diego's real data from the database
  const { data: profile } = await supabase.from('profile').select('*').single()
  const { data: pipeline } = await supabase
    .from('pipeline')
    .select('company, role_title, role_type, city, status, date_applied, notes')
    .order('date_added', { ascending: false })

  // Build a status summary
  const counts: Record<string, number> = {}
  pipeline?.forEach((r) => {
    const s = r.status || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })

  const systemPrompt = `You are Zoro, the personal AI assistant for Diego Pozuelo. You know him well and help with his job search, outreach, planning, and building. Be direct, warm, and practical. Do not use dashes in written content you draft for him.

WHO DIEGO IS:
${profile ? `Name: ${profile.full_name}
Headline: ${profile.headline}
About: ${profile.about}` : 'Profile not loaded.'}

HIS JOB SEARCH (${pipeline?.length ?? 0} applications tracked):
Status breakdown: ${Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(', ')}

His applications:
${pipeline?.map((r) => `- ${r.company} | ${r.role_title} | ${r.status}${r.notes ? ` | ${r.notes}` : ''}`).join('\n') ?? 'No applications.'}

Use this context naturally when relevant. You genuinely know his situation.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { text: string }).text)
    .join('\n')

  return NextResponse.json({ reply: text })
}