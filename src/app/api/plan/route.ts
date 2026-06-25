import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { brainDump, targetDate } = await req.json()

  const { data: profile } = await supabase.from('profile').select('context').single()

  // Pipeline snapshot for context
  const { data: pipeline } = await supabase
    .from('pipeline')
    .select('status')
  const counts: Record<string, number> = {}
  pipeline?.forEach((r) => {
    const s = r.status || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })

  const systemPrompt = `You are Zoro, Diego's personal planning assistant. You build his daily plan so he wakes up and just executes without overthinking.

WHO DIEGO IS AND HOW HE WORKS:
${profile?.context || 'Context not loaded.'}

HIS PIPELINE RIGHT NOW: ${Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(', ')}

CRITICAL RULES FOR BUILDING HIS DAY:
- Match his real rhythm. Morning (8:30 to 11): light ramp-up to warm up his brain, like reading news, science articles, light admin, checking statuses. Deep work (11 to 5): his peak locked-in window, put the hardest and most important work here. Evening (after gym at 5): wind-down, light tasks, planning.
- Order tasks so easy warm-up comes first, heavy cognitive work lands in the 11 to 5 block, and lighter things close the day.
- Be concrete with time blocks. Give each item a start and end time.
- Respect what he asked for in his brain-dump, but organize it intelligently around his rhythm and goals.
- Keep it realistic, do not overpack the day.
- Categories to use: ramp-up, applications, outreach, deep-work, learning, admin, wind-down.

Return ONLY valid JSON, no markdown, no preamble. An array of plan items in this exact shape:
[{"start_time":"8:30 AM","end_time":"9:10 AM","content":"Read science and tech news","category":"ramp-up"}]`

  const userPrompt = `Build my plan for ${targetDate}. Here is my brain-dump of what I want to get done:

${brainDump}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')
    .replace(/```json|```/g, '')
    .trim()

  let items = []
  try {
    items = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Could not parse plan', raw }, { status: 500 })
  }

  return NextResponse.json({ items })
}