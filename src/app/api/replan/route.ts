import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { items, instruction, currentTime } = await req.json()

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
    }

    const planText = items
      .map(
        (it: { start_time: string; end_time: string; content: string; category: string; done: boolean }) =>
          `- ${it.start_time} to ${it.end_time} | ${it.category} | ${it.done ? 'DONE' : 'not done'} | ${it.content}`
      )
      .join('\n')

    const systemPrompt = `You are Zoro, Diego's planning assistant. You revise his day based on what actually happened. The current time is ${currentTime}.

Rules:
- Return the COMPLETE revised plan, not just the changes. Every block that should exist in the final day.
- Keep blocks he already finished (marked DONE) unless he explicitly says to remove them.
- Respect what he tells you happened: skipped blocks, breaks taken, new work added.
- Use realistic time blocks that flow in order without overlap.
- Categories must be one of: ramp-up, applications, outreach, deep-work, learning, admin, wind-down.
- Keep content concise and practical. Never use dashes in the content text.
- Output ONLY a JSON array, no preamble, no markdown fences. Each element: {"start_time": "9:00 AM", "end_time": "10:00 AM", "content": "...", "category": "deep-work", "done": false}
- Use 12-hour times with AM/PM, matching his existing format.`

    const userPrompt = `Here is my current plan:

${planText}

What actually happened / what I want to change:
${instruction}

Return the complete revised plan as a JSON array.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .replace(/```json|```/g, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Could not parse plan', raw: text }, { status: 500 })
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Plan response was not an array', raw: text }, { status: 500 })
    }

    return NextResponse.json({ items: parsed })
  } catch (err) {
    console.error('replan route error:', err)
    return NextResponse.json({ error: 'Replan request failed' }, { status: 500 })
  }
}
