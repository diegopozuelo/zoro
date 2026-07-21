# Zoro

**A personal job search command center.** One app for daily planning, outreach, applications, ranked job intake, and AI coaching. Built solo as a daily use tool and a portfolio project demonstrating full stack development, Claude API integration, and an external automation pipeline.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-API-D97757?style=flat-square)
![n8n](https://img.shields.io/badge/n8n-automation-EA4B71?style=flat-square)

---

## Overview

Zoro is a single user web app that turns a job search into an operating system. Instead of juggling spreadsheets, notes, chat tabs, and job board inboxes, everything lives in one place: what to do today, who to reach out to, which ranked roles just arrived, where each application stands, and an AI assistant that already knows your background and pipeline.

The core loop: capture what matters in **Notes**, group related work under **Projects**, plan your day in the **Planner**, execute from the **Today** dashboard, review inbound ranked roles in **Fresh Batch**, run proactive company targeting from the **Outreach** board, track formal applications in the **Pipeline**, and ask the **Assistant** when you need a second brain. Supporting modules (**Profile**, **Journal**, **Brainstorm**, **Life**) keep personal context and habits in the same system.

Inbound jobs do not start inside Zoro. They are discovered and ranked on a separate machine (**career-ops**), orchestrated with **n8n**, emailed to Diego as a daily digest, and written into Supabase so Fresh Batch can pick them up for review, application chat, and one click graduation into Pipeline.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase, and the Anthropic Claude API. Developed in Cursor. UI is a dark Jarvis style command center with day and night theming.

---

## Features

| Module | What it does |
|--------|--------------|
| **Today** | Morning command center. Shows your AI generated time blocked plan with category labels (ramp up, deep work, outreach, applications, and more). Edit any block inline, add or delete tasks, reorder by start time, mark done, or hit **Replan with AI** to rebuild the rest of the day from a natural language description of what actually happened. Each task has a **Start working** button that opens a focused AI coaching chat tied to that block. A **Focus today** strip surfaces the most relevant open notes as sticky note cards, ranked by urgency (overdue and due today first, then high priority, then backfilled), capped with a stacked "more" tile linking to Notes. Inline quick add (with expandable details) captures a task for today without leaving the dashboard. Outreach is the primary daily metric: status breakdown of target companies plus messages sent today, this week, and total. Also surfaces pipeline status breakdown, weekly application count, interview count, life logging streak, top 3 priorities, and yesterday's activity ring summary. One click **Summarize my day** reviews completed tasks, plan progress, life data, and pending items, then generates a warm, honest recap and a pointer toward tomorrow. |
| **Notes** | Dedicated second brain for tasks, reminders, thoughts, and general notes. Each note has a type, priority (Low / Medium / High), optional due date, completion tracking, and an optional project link. Filterable by type. Stored in a dedicated Supabase table and wired into Today, the Planner, the Assistant, Projects, and end of day summaries. |
| **Projects** | Big containers (for example Find a job) that connect notes, outreach leads, and pipeline applications. Each project has a context field, status (Active / Paused / Done), a linked items view with link and unlink controls, and a dedicated AI chat (`kind: project`) that reads project context plus linked items. Assign projects from Notes, Outreach, and Pipeline as well. |
| **Fresh Batch** | Intake board for ranked roles written by the external career-ops / n8n pipeline into the `fresh_jobs` table. Shows every row with `status = fresh`, ordered by rank. Each card surfaces company, role, location, fit score, why it matched, and an apply link. Opening a card launches a workspace with an application scoped AI chat (`kind: fresh`): research the company and role, draft form answers in Diego's voice, and interpret screenshots of application forms (file picker or drag and drop). **Applied** inserts the role into Pipeline as Applied (mapping company, role, location, URL, and fit/why into notes), then deletes the Fresh Batch row so the board stays clean. |
| **Outreach** | Command center for proactive company targeting. Companies appear as cards on a kanban board grouped by status: Watchlist, Researching, Messaged, Replied, Archived. Bulk add targets from a pasted list (company name, background notes, contact email per line). Opening a company launches a dedicated workspace with editable background, contact fields, optional project link, and a persistent AI chat. The chat researches the company with live web search, recommends approach and channel, and drafts outreach in your voice. Image upload supported in chat. Every outreach action (researched, messaged, followed up) logs to a dedicated events table with timestamps, feeding dashboard metrics. One click **Add to Pipeline** graduates a lead into formal application tracking. |
| **Assistant** | General purpose AI with live web search, image upload, and PDF upload (drag and drop or file picker). Reads your full second brain on every request: profile context, live application pipeline, open notes and due tasks, recent journal entries, life tracking data, and brainstorm ideas. Advice is tailored to what is currently on your mind, what is due, and how your week has been going. Multi chat with rename, delete, and persistent message history stored in Supabase. Personalized greeting on open. |
| **Pipeline** | Searchable, editable tracker for job applications. Fields include company, role, type, city, status, date applied, job URL, notes, and optional project. Color coded statuses: Watchlist, Applied, Interview, Rejected, Ghosted, Offer. Inline add and edit, plus bulk add by pasting a pipe delimited list (`Company \| Role \| Location \| URL \| Status Date`) that parses status and date automatically. Status counts surface on the Today dashboard. Rows also arrive from Fresh Batch (Applied) and Outreach (Add to Pipeline). |
| **Planner** | Nightly planning workflow. Write a freeform brain dump of what you want to accomplish, pick a target date, and Claude generates a structured time blocked plan matched to your daily rhythm (light ramp up in the morning, deep work mid day, wind down in the evening). Due and high priority notes are pulled in and woven into the day as real scheduled blocks, placed around your work rhythm so nothing important gets missed. Review, edit, mark tasks done, then save. Saved plans appear on the Today dashboard for that date. |
| **Profile** | Stores the personal context every AI feature reads: background, goals, voice, strategy, and work rhythm. The Assistant, Planner, outreach chats, Fresh Batch application chats, and task sessions all inject this context into their system prompts alongside live data. |
| **Journal** | Calendar based daily writing. Navigate by month, see which days have entries, and write or edit per day with automatic persistence. Recent entries feed the Assistant. |
| **Brainstorm** | Lightweight idea capture. Add notes with optional tags, browse chronologically, delete when done. Recent ideas feed the Assistant. |
| **Life** | Activity ring habit tracker inspired by Apple Watch rings. Four goals: work hours, sleep hours, exercise minutes, reading minutes. Log multiple workouts per day. Rings show overflow styling when you exceed a goal. Week strip for day navigation. Yesterday's ring summary and goal hit count appear on the Today dashboard. Life data also feeds the Assistant and end of day summaries. |

---

## External pipeline: career-ops + n8n

Zoro is the command center. Job discovery and ranking live on a separate machine named **career-ops**.

```
career-ops (n8n + ranking)
        │
        ├─► Email digest to Diego (direct email from the automation)
        │
        └─► Insert ranked rows into Supabase `fresh_jobs`
                    │
                    ▼
            Zoro Fresh Batch
                    │
                    ├─► Application chat (Claude, screenshots)
                    └─► Applied ► Pipeline
```

**What career-ops does**

- Runs outside this Next.js repo on its own machine
- Uses **n8n** to orchestrate scraping, filtering, ranking, and delivery
- Produces a ranked batch of roles with company, role, location, fit score, rationale (`why`), apply URL, and batch date
- **Emails Diego directly** with the batch so he sees the digest in his inbox without opening Zoro first
- Writes the same batch into the shared Supabase table `fresh_jobs` with `status = 'fresh'`

**What Zoro does with that data**

- Fresh Batch reads `fresh_jobs` where `status = 'fresh'`, ordered by `rank`
- Diego reviews fit, opens the listing, and optionally starts a per job application chat
- When he is ready, **Applied** creates a Pipeline row and removes the Fresh Batch record (plus any linked chat)

This split keeps heavy automation and ranking off the web app while Zoro stays the place to decide, apply, and track.

**`fresh_jobs` columns used by Zoro**

| Column | Role |
|--------|------|
| `id` | UUID primary key |
| `rank` | Display and sort order |
| `company`, `role`, `location` | Card and Pipeline mapping |
| `fit_score`, `why` | Fit signal and rationale (also copied into Pipeline notes) |
| `apply_url` | Open listing |
| `status` | Intake filter (`fresh`) |
| `batch_date` | Batch label on the board |
| `conversation_id` | Optional link to a `kind: fresh` chat |
| `created_at` | Insert timestamp from n8n |

---

## Technical highlights

**Claude integrated across the product, not bolted on.** API routes power distinct workflows: daily plan generation, mid day replanning, general assistant chat, per company outreach research kickoff, outreach message drafting, Fresh Batch application kickoff (`start-fresh`), focused task coaching sessions, end of day summaries, and project workspace chats. Each route builds a tailored system prompt from live Supabase data.

**A connected second brain.** The Assistant and Planner do not only see profile and pipeline. They also read open notes, journal, life tracking, and brainstorm data, so planning and advice reflect what is due and how the week has actually gone. Project chats stay scoped to one project and its linked notes, leads, and applications. Fresh Batch chats stay scoped to one application.

**Tool use beyond text generation.** Assistant, outreach, project, and Fresh Batch kickoff chats use Claude's web search tool for live research. The Assistant accepts image and PDF attachments via vision. Outreach and Fresh Batch workspaces support image upload and drag and drop screenshots in chat.

**Relational Supabase schema.** Conversations link to plan tasks (`conversation_id` on plan items), outreach leads, projects, and fresh jobs. Messages persist per conversation, tagged by kind (`assistant`, `outreach`, `project`, `fresh`). Projects hold context and optionally a dedicated conversation. Notes, leads, and pipeline rows can each carry a nullable `project_id`. Outreach events track researched, messaged, and followed up actions with timestamps for aggregated dashboard metrics. Separate tables also cover plan items, plan meta, priorities, journal, brainstorm, life days, workouts, and `fresh_jobs` (fed by career-ops / n8n).

**App Router architecture.** Server components fetch dashboard data at request time (Today page pulls from multiple tables in one render). Interactive surfaces (plan editor, notes board, focus strip, projects workspace, outreach board, Fresh Batch board, assistant, pipeline table, life tracker) are client components that read and write to Supabase directly. API routes handle all Claude calls server side.

**Jarvis command center UI.** Dark HUD styling with cyan accents, IBM Plex Sans / Mono, day to night theme driven by local time (`--night`), shared `HudShell` chrome, and a lightweight SVG ambient field tuned for scroll performance.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Today dashboard (server component)
│   ├── notes/                # Notes / second brain
│   ├── projects/             # Project list + workspace
│   ├── fresh-batch/          # Ranked intake from career-ops / n8n
│   ├── outreach/             # Outreach kanban + company workspaces
│   ├── assistant/            # Multi chat AI assistant
│   ├── pipeline/             # Application tracker
│   ├── planner/              # Nightly brain dump → plan builder
│   ├── profile/              # Personal context editor
│   ├── journal/              # Daily journal
│   ├── brainstorm/           # Idea capture
│   ├── life/                 # Activity ring tracker
│   └── api/
│       ├── chat/             # Assistant + follow up chats
│       ├── plan/             # Generate daily plan from brain dump
│       ├── replan/           # Revise plan mid day
│       ├── day-summary/      # End of day AI recap
│       ├── outreach/         # Draft outreach message
│       ├── start-outreach/   # Kick off company research chat
│       ├── start-fresh/      # Kick off Fresh Batch application chat
│       ├── start-task/       # Launch focused task session
│       ├── start-project/    # Kick off project workspace chat
│       └── project-chat/     # Project scoped follow up chat
├── components/               # Feature UI modules (HudShell, boards, trackers, …)
└── lib/supabase.ts           # Supabase client
```

---

## Roadmap

_Planned. Not yet built._

| Item | Description |
|------|-------------|
| **Follow up reminders** | Flag outreach with no reply after a configurable window (event data layer already in place) |
| **Completed tasks calendar** | Review what was finished on past days |
| **Context / dump space** | Dedicated longer form situational notes the Assistant reads |
| **Fresh Batch on Today** | Surface fresh role count on the morning dashboard |
| **Deployment** | Ship to Vercel with production environment |

---

## About

Built by **Diego Pozuelo** as a personal productivity system and a portfolio piece for full stack, AI integration, and automation adjacent work. Zoro is designed to be used every day, not just demonstrated. Job discovery and email digests run on **career-ops** via **n8n**; Zoro is where those roles get reviewed, applied to, and tracked.

**For reviewers:** Start with the **Today** page, **Fresh Batch**, **Projects**, and the **Outreach** board to see the core loop. Then look at `src/app/api/` to see how Claude is wired into each workflow, and at the career-ops / n8n section above for how inbound jobs enter the system.
