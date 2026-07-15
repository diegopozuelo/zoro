import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function buildProjectPrompt(projectId: number) {
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
      .select('title, description, type, priority, due_date, done')
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

  const systemPrompt = `You are Zoro, the personal AI assistant for Diego Pozuelo, focused on one project at a time. Be direct, warm, and practical. Give verdicts first, then brief reasoning. Never use dashes in written content you draft for him.

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

  return { project, systemPrompt }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const built = await buildProjectPrompt(projectId)
    if (!built) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const { project, systemPrompt } = built

    const kickoff = `I am opening the workspace for my project "${project.name}". Give me a tight briefing: what this project is aiming at based on the context, what is already linked (notes, leads, applications), the one or two most important things to push on next, and how you can help from here.`

    const tools = [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 5 }]
    const working: Anthropic.MessageParam[] = [{ role: 'user', content: kickoff }]
    let text = ''
    let current = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: working,
      tools,
    })

    for (let step = 0; step < 6; step++) {
      if (current.stop_reason === 'tool_use') {
        working.push({ role: 'assistant', content: current.content })
        current = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: systemPrompt,
          messages: working,
          tools,
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
      .insert({ title: `${project.name} project`, kind: 'project' })
      .select()
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    await supabase.from('messages').insert([
      { role: 'user', content: kickoff, conversation_id: conv.id },
      { role: 'assistant', content: text || 'Ready when you are.', conversation_id: conv.id },
    ])

    await supabase.from('projects').update({ conversation_id: conv.id }).eq('id', projectId)

    return NextResponse.json({ conversationId: conv.id })
  } catch (err) {
    console.error('start-project error:', err)
    return NextResponse.json({ error: 'Start project chat failed' }, { status: 500 })
  }
}
