import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { leadId, company, background, contact_name, contact_email, contact_handle, job_url } = await req.json()

  const { data: profile } = await supabase.from('profile').select('*').single()

  const systemPrompt = `You are Zoro, the personal AI assistant for Diego Pozuelo, helping him win a specific outreach target. Be direct, warm, and practical. Give verdicts first, then brief reasoning. Never use dashes in written content you draft for him.

You have a web search tool. Use it to research this company deeply: what they do, recent news, funding, hiring signals, and who Diego should contact. Search proactively.

FORMATTING RULES, follow strictly: Write in plain prose and short paragraphs. Do not use markdown headers (no # or ##). Do not use emoji. Never use dashes anywhere, not em dashes, en dashes, or hyphens as punctuation. Keep it clean and readable like a sharp text message from a smart friend.

=== EVERYTHING YOU KNOW ABOUT DIEGO ===
${profile?.context || 'Context not loaded.'}

=== THE COMPANY DIEGO IS TARGETING ===
Company: ${company}
${background ? `Background: ${background}` : ''}
${contact_name ? `Contact: ${contact_name}` : ''}
${contact_email ? `Email: ${contact_email}` : ''}
${contact_handle ? `LinkedIn/handle: ${contact_handle}` : ''}
${job_url ? `URL: ${job_url}` : ''}

Your job in this chat: help Diego research this company, decide the best way to approach them (apply, warm intro, email, or LinkedIn DM), identify who to contact, and draft the actual outreach message in his voice. This is a focused workspace for this one company.`

  const kickoff = `I'm working on outreach to ${company}. Give me a tight briefing: research them (search the web for what they are doing right now), tell me why they fit me specifically, recommend the best channel to approach them, who to target, and then we will draft the message together. Start with the research and your recommended approach.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: kickoff }],
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 5 }],
  })

  // Web search may return a tool_use turn; loop until final text
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
    .insert({ title: `${company} outreach`, kind: 'outreach' })
    .select()
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  await supabase.from('messages').insert([
    { role: 'user', content: kickoff, conversation_id: conv.id },
    { role: 'assistant', content: text, conversation_id: conv.id },
  ])

  await supabase.from('leads').update({ conversation_id: conv.id, status: 'Researching' }).eq('id', leadId)

  return NextResponse.json({ conversationId: conv.id })
}