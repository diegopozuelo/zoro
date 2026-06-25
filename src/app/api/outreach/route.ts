import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { company, person, role, angle, context } = await req.json()

  const { data: profile } = await supabase.from('profile').select('*').single()

  const systemPrompt = `You write outreach messages for Diego Pozuelo. Write in his real voice: direct, warm, confident, never desperate. Critical rule: never use dashes in the message. Keep it concise, the length of a strong LinkedIn message or short email. Make it specific to the company and person, not generic. Lead with genuine relevance, make one clear ask, and make it easy to say yes.

WHO DIEGO IS:
${profile ? `${profile.full_name}. ${profile.headline}. ${profile.about}` : 'Profile not loaded.'}

He is a CS grad and founder who builds full stack products. His edge for startups is being a high agency generalist who can both build and operate. He is open to roles across engineering, product, operations, and solutions.

Write only the message itself, ready to send. No preamble, no subject line unless it is an email.`

  const userPrompt = `Draft an outreach message.
Company: ${company}
Person: ${person || 'the founder or hiring manager'}
Role or area of interest: ${role || 'open to where he fits best'}
Angle: ${angle}
Extra context: ${context || 'none'}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

  return NextResponse.json({ draft: text })
}