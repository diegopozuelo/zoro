import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { jobId, company, role, location, fit_score, why, apply_url } = await req.json()

  if (!jobId || !company) {
    return NextResponse.json({ error: 'Missing jobId or company' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profile').select('*').single()

  const systemPrompt = `You are Zoro, the personal AI assistant for Diego Pozuelo, helping him win a specific job application. Be direct, warm, and practical. Give verdicts first, then brief reasoning. Never use dashes in written content you draft for him.

You have a web search tool. Use it when company or role research would help him answer application questions accurately.

FORMATTING RULES, follow strictly: Write in plain prose and short paragraphs. Do not use markdown headers (no # or ##). Do not use emoji. Never use dashes anywhere, not em dashes, en dashes, or hyphens as punctuation. Keep it clean and readable like a sharp text message from a smart friend.

=== EVERYTHING YOU KNOW ABOUT DIEGO ===
${profile?.context || 'Context not loaded.'}

=== THIS APPLICATION ===
Company: ${company}
Role: ${role || 'Not specified'}
${location ? `Location: ${location}` : ''}
${fit_score ? `Fit score: ${fit_score}` : ''}
${why ? `Why it surfaced: ${why}` : ''}
${apply_url ? `Apply URL: ${apply_url}` : ''}

Your job in this chat: help Diego complete this application. Research the company and role when useful, draft answers to form questions in his voice, and interpret screenshots he uploads of application forms. Stay focused on this one role.`

  const kickoff = `I am applying to ${company} for ${role || 'this role'}. Give me a tight briefing: what this company and role are about (search the web if needed), how it fits me, and the strongest angles I should use in the application. Then we will work through the form questions together, including any screenshots I drop in.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: kickoff }],
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 5 }],
  })

  const working: Anthropic.MessageParam[] = [{ role: 'user', content: kickoff }]
  let text = ''
  let current = response
  for (let step = 0; step < 6; step++) {
    if (current.stop_reason === 'tool_use') {
      working.push({ role: 'assistant', content: current.content })
      current = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: working,
        tools: [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 5 }],
      })
      continue
    }
    text = current.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
    break
  }

  const { data: conv } = await supabase
    .from('conversations')
    .insert({ title: `${company} application`, kind: 'fresh' })
    .select()
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  await supabase.from('messages').insert([
    { role: 'user', content: kickoff, conversation_id: conv.id },
    { role: 'assistant', content: text || 'Ready when you are.', conversation_id: conv.id },
  ])

  const { error: linkError } = await supabase
    .from('fresh_jobs')
    .update({ conversation_id: conv.id })
    .eq('id', jobId)

  if (linkError) {
    return NextResponse.json({ error: 'Conversation created but failed to link job' }, { status: 500 })
  }

  return NextResponse.json({ conversationId: conv.id })
}
