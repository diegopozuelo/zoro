import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
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

    // Open notes that are due by the target date or high priority
    const { data: allNotes } = await supabase
      .from('notes')
      .select('title, description, type, priority, due_date')
      .eq('done', false)
    const relevantNotes = (allNotes ?? []).filter(
      (n) => (n.due_date && n.due_date <= targetDate) || n.priority === 'High'
    )
    const notesBlock =
      relevantNotes.length > 0
        ? relevantNotes
            .map(
              (n) =>
                `- [${n.type}, ${n.priority}${n.due_date ? `, due ${n.due_date}` : ''}] ${n.title}${n.description ? `: ${n.description}` : ''}`
            )
            .join('\n')
        : 'None.'

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

HIS DUE TASKS AND REMINDERS FOR THIS DAY (weave these into the plan as real blocks, do not ignore them):
${notesBlock}
Place these intelligently by their nature: deep or important tasks in the 11 to 5 window, admin and reminders in lighter slots, quick errands where they fit. If a task is a reminder like calling someone, give it a short realistic block. Honor his brain-dump first, then fit these due tasks around it so nothing important gets missed.

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

    let items
    try {
      items = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Could not parse plan', raw }, { status: 500 })
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Plan response was not an array', raw }, { status: 500 })
    }

    return NextResponse.json({ items })
  } catch (err) {
    console.error('plan route error:', err)
    return NextResponse.json({ error: 'Plan request failed' }, { status: 500 })
  }
}
