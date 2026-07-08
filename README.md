# Zoro

**A personal job search command center.** One app for daily planning, outreach, applications, and AI coaching, built solo as a daily use tool and a portfolio project demonstrating full stack development and Claude API integration.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-API-D97757?style=flat-square)

---

## Overview

Zoro is a single user web app that turns a job search into an operating system. Instead of juggling spreadsheets, notes, and chat tabs, everything lives in one place: what to do today, who to reach out to, where each application stands, and an AI assistant that already knows your background and pipeline.

The core loop: plan your day in the **Planner**, execute from the **Today** dashboard, run outreach from the **Outreach** board, track formal applications in the **Pipeline**, and ask the **Assistant** when you need a second brain. Supporting modules (**Profile**, **Journal**, **Brainstorm**, **Life**) keep personal context and habits in the same system.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase, and the Anthropic Claude API. Developed in Cursor.

---

## Features

| Module | What it does |
|--------|--------------|
| **Today** | Morning command center. Shows your AI generated time blocked plan with category labels (ramp up, deep work, outreach, applications, and more). Edit any block inline, add or delete tasks, reorder by start time, mark done, or hit **Replan with AI** to rebuild the rest of the day from a natural language description of what actually happened. Each task has a **Start working** button that opens a focused AI coaching chat tied to that block. Also surfaces outreach metrics (messaged today, this week, all time), pipeline status breakdown, weekly application count, interview count, life logging streak, top 3 priorities, and yesterday's activity ring summary. |
| **Outreach** | Command center for proactive company targeting. Companies appear as cards on a kanban board grouped by status: Watchlist, Researching, Messaged, Replied, Archived. Bulk add targets from a pasted list (company name, background notes, contact email per line). Opening a company launches a dedicated workspace with editable background, contact fields, and a persistent AI chat. The chat researches the company with live web search, recommends approach and channel, and drafts outreach in your voice. Image upload supported in chat. Outreach actions log to a dedicated events table with timestamps, feeding dashboard metrics. One click **Add to Pipeline** graduates a lead into formal application tracking. |
| **Assistant** | General purpose AI with live web search, image upload, and PDF upload (drag and drop or file picker). Reads your full profile context and live application pipeline on every request, so advice is personalized to your background, goals, and current search state. Multi chat with rename, delete, and persistent message history stored in Supabase. |
| **Pipeline** | Searchable, editable tracker for job applications. Fields include company, role, type, city, status, date applied, job URL, and notes. Color coded statuses: Watchlist, Applied, Interview, Rejected, Ghosted, Offer. Inline add and edit. Status counts surface on the Today dashboard. |
| **Planner** | Nightly planning workflow. Write a freeform brain dump of what you want to accomplish, pick a target date, and Claude generates a structured time blocked plan matched to your daily rhythm (light ramp up in the morning, deep work mid day, wind down in the evening). Review, edit, mark tasks done, then save. Saved plans appear on the Today dashboard for that date. |
| **Profile** | Stores the personal context every AI feature reads: background, goals, voice, strategy, and work rhythm. The Assistant, Planner, outreach chats, and task sessions all inject this context into their system prompts alongside live pipeline data. |
| **Journal** | Calendar based daily writing. Navigate by month, see which days have entries, and write or edit per day with automatic persistence. |
| **Brainstorm** | Lightweight idea capture. Add notes with optional tags, browse chronologically, delete when done. |
| **Life** | Activity ring habit tracker inspired by Apple Watch rings. Four goals: work hours, sleep hours, exercise minutes, reading minutes. Log multiple workouts per day. Rings show overflow styling when you exceed a goal. Week strip for day navigation. Yesterday's ring summary and goal hit count appear on the Today dashboard. |

---

## Technical highlights

**Claude integrated across the product, not bolted on.** Six API routes power distinct workflows: daily plan generation, mid day replanning, general assistant chat, per company outreach research kickoff, outreach message drafting, and focused task coaching sessions. Each route builds a tailored system prompt from live Supabase data.

**Tool use beyond text generation.** Assistant and outreach chats use Claude's web search tool for live company research, hiring signals, and current events. The Assistant accepts image and PDF attachments via vision. Outreach workspaces support image upload in chat.

**Relational Supabase schema.** Conversations link to plan tasks (`conversation_id` on plan items) and outreach leads. Messages persist per conversation, tagged by kind (assistant vs outreach). Outreach events track actions with timestamps for aggregated dashboard metrics. Separate tables for pipeline, leads, plan items, plan meta, priorities, journal, brainstorm, life days, and workouts.

**App Router architecture.** Server components fetch dashboard data at request time (Today page pulls from six tables in one render). Interactive surfaces (plan editor, outreach board, assistant, pipeline table, life tracker) are client components that read and write to Supabase directly. API routes handle all Claude calls server side.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Today dashboard (server component)
│   ├── outreach/             # Outreach kanban + company workspaces
│   ├── assistant/            # Multi chat AI assistant
│   ├── pipeline/             # Application tracker
│   ├── planner/              # Nightly brain dump → plan builder
│   ├── profile/              # Personal context editor
│   ├── journal/              # Daily journal
│   ├── brainstorm/           # Idea capture
│   ├── life/                 # Activity ring tracker
│   └── api/
│       ├── chat/             # Assistant + outreach chat
│       ├── plan/             # Generate daily plan from brain dump
│       ├── replan/           # Revise plan mid day
│       ├── outreach/         # Draft outreach message
│       ├── start-outreach/   # Kick off company research chat
│       └── start-task/       # Launch focused task session
├── components/               # Feature UI modules
└── lib/supabase.ts           # Supabase client
```

---

## Roadmap

_Planned. Not yet built._

| Item | Description |
|------|-------------|
| **Follow up reminders** | Flag outreach with no reply after a configurable window |
| **Notes module** | Dedicated second brain for unstructured capture |
| **Richer Assistant context** | Feed journal, brainstorm, and Life data into AI prompts for whole person awareness |
| **Deployment** | Ship to Vercel with production environment |
| **Design pass** | Consistent visual polish across every page |

---

## About

Built by **Diego Pozuelo** as a personal productivity system and a portfolio piece for full stack and AI integration work. Zoro is designed to be used every day, not just demonstrated.

**For reviewers:** Start with the **Today** page and **Outreach** board to see the core loop. Then look at `src/app/api/` to see how Claude is wired into each workflow.
