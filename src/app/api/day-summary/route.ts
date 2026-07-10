import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { date } = await req.json()
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { data: profile } = await supabase.from('profile').select('context').single()

  // Completed notes today
  const { data: completed } = await supabase
    .from('notes')
    .select('title, type, priority')
    .eq('done', true)
    .gte('completed_at', dayStart)
    .lte('completed_at', dayEnd)

  // Still-open notes (pending)
  const { data: pending } = await supabase
    .from('notes')
    .select('title, type, priority, due_date')
    .eq('done', false)
    .order('due_date', { ascending: true, nullsFirst: false })

  // Today's plan and how much got done
  const { data: plan } = await supabase
    .from('plan_items')
    .select('start_time, end_time, content, category, done')
    .eq('entry_date', date)
    .order('sort_order', { ascending: true })
  const planDone = (plan ?? []).filter((p) => p.done).length

  // Today's life data
  const { data: life } = await supabase
    .from('life_days')
    .select('sleep_hours, work_hours, reading_minutes')
    .eq('entry_date', date)
    .maybeSingle()
  const { data: workouts } = await supabase
    .from('workouts')
    .select('label, minutes')
    .eq('entry_date', date)

  const systemPrompt = `You are Zoro, Diego's personal assistant, giving him a warm, sharp end-of-day recap. Be direct and practical. Give the recap in plain prose, short paragraphs. Do not use markdown headers, no emoji, never use dashes. Keep it real, not corny. End by pointing at what matters tomorrow.

WHO DIEGO IS:
${profile?.context || 'Context not loaded.'}`

  const userPrompt = `Give me a recap of my day (${date}).

Tasks I completed today:
${completed?.map((c) => `- ${c.title} (${c.type}, ${c.priority})`).join('\n') || 'None logged as completed.'}

My time-blocked plan: ${plan?.length ?? 0} blocks, ${planDone} marked done.
${plan?.map((p) => `- ${p.start_time} ${p.content}${p.done ? ' [done]' : ''}`).join('\n') || 'No plan.'}

Life data today: ${life ? `sleep ${life.sleep_hours ?? 0}h, work ${life.work_hours ?? 0}h, reading ${life.reading_minutes ?? 0}min` : 'not logged'}. Workouts: ${workouts?.map((w) => `${w.label} ${w.minutes}min`).join(', ') || 'none'}.

Still pending (not done):
${pending?.map((p) => `- ${p.title} (${p.type}, ${p.priority}${p.due_date ? `, due ${p.due_date}` : ''})`).join('\n') || 'Nothing pending.'}

Give me: what I got done and whether it was a strong day, how my work and life balance looked, what is still hanging over me, and the one or two things I should aim at tomorrow. Keep it tight and honest.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

  return NextResponse.json({ summary: text })
}