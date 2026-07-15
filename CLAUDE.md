@AGENTS.md

# Zoro — Project Guide for Claude Code

## What this is
Zoro is my personal job-search command center and second brain. Single user (me, Diego Pozuelo). Built as both a daily-use tool and a portfolio project.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS (v4)
- Supabase (Postgres) — client in `src/lib/supabase.ts`, single-user, RLS disabled
- Anthropic Claude API — used in API routes under `src/app/api/`
- Runs locally with `npm run dev` at localhost:3000
- Deployed target: not yet deployed

## Structure
- `src/app/` — pages (Today at `page.tsx`, plus notes, projects, profile, pipeline, assistant, outreach, planner, journal, brainstorm, life)
- `src/app/api/` — API routes (chat, plan, outreach, start-task, start-outreach, start-project, project-chat, replan, day-summary)
- `src/components/` — UI components
- `src/lib/supabase.ts` — Supabase client

## Key conventions (follow these)
- Never use dashes in any user-facing written content or AI prompts. No em dashes, en dashes, or hyphens as punctuation.
- No markdown headers or emoji in AI-generated user-facing text.
- Match the existing design system: `.card`, `.eyebrow`, `.font-display` (Instrument Serif) classes defined in `globals.css`. Paper background, hairline borders, activity rings as the one colorful accent.
- Client components need `'use client'`. Today page is a server component that hands data to client components.
- Do not put secrets in code. `.env.local` holds keys and is gitignored.
- Sidebar nested routes: use `pathname === href || pathname.startsWith(href + '/')` so sections like Projects stay active on `/projects/[id]`.

## How I work
- Explain what you are changing and why before making edits.
- One clear step at a time. I like to review changes before they apply.
- When you finish a change, tell me exactly how to test it.
- Commit at natural stopping points with clear messages.

## Database note
Tables include: profile, pipeline, conversations, messages, notes, leads, outreach_events, plan_items, plan_meta, priorities, journal, brainstorm, life_days, workouts, projects.

Projects link via nullable `project_id` on notes, leads, and pipeline only (not plan_items). Project chats use `conversations.kind = 'project'` and `projects.conversation_id`. Ask before altering schema.
