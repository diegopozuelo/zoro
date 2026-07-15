import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function buildSystemPrompt(projectId: number) {
  const { data: profile } = await supabase.from('profile').select('*').single()
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, context, status')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return null

  const [{ data: notes }, { data: leads }, { data: apps }] = await Promise.all([
    supabase
      .from('notes')
      .select('title, description, type, priority, due_date')
      .eq('project_id', projectId)
      .eq('done', false)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('leads')
      .select('company, status, background')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('pipeline')
      .select('company, role_title, status, notes')
      .eq('project_id', projectId)
      .order('date_added', { ascending: false }),
  ])

  return `You are Zoro, the personal AI assistant for Diego Pozuelo, focused on one project at a time. Be direct, warm, and practical. Give verdicts first, then brief reasoning. Never use dashes in written content you draft for him.

You have a web search tool. Use it when current information would help with this project. Search proactively rather than guessing.

FORMATTING RULES, follow strictly: Write in plain prose and short paragraphs. Do not use markdown headers (no # or ##). Do not use emoji. Never use dashes anywhere, not em dashes, en dashes, or hyphens as punctuation. Keep it clean and readable.

=== EVERYTHING YOU KNOW ABOUT DIEGO ===
${profile?.context || 'Context not loaded.'}

=== THIS PROJECT ===
Name: ${project.name}
Status: ${project.status}
${project.context ? `Context:\n${project.context}` : 'No project context written yet.'}

=== LINKED OPEN NOTES ===
${notes?.map((n) => `- [${n.type}, ${n.priority}${n.due_date ? `, due ${n.due_date}` : ''}] ${n.title}${n.description ? `: ${n.description}` : ''}`).join('\n') || 'None.'}

=== LINKED OUTREACH LEADS ===
${leads?.map((l) => `- ${l.company} | ${l.status}${l.background ? ` | ${l.background}` : ''}`).join('\n') || 'None.'}

=== LINKED PIPELINE APPLICATIONS ===
${apps?.map((a) => `- ${a.company} | ${a.role_title} | ${a.status}${a.notes ? ` | ${a.notes}` : ''}`).join('\n') || 'None.'}

Your job in this chat: help Diego move this project forward. Use the project context and linked items. Suggest concrete next steps, draft messages when useful, and keep him focused on what matters for this project specifically.`
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, messages } = await req.json()
    if (!projectId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'projectId and messages required' }, { status: 400 })
    }

    const systemPrompt = await buildSystemPrompt(projectId)
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const tools = [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 5 }]
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
        working.push({ role: 'assistant', content: response.content })
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
    console.error('project-chat error:', err)
    return NextResponse.json({ error: 'Project chat failed' }, { status: 500 })
  }
}
