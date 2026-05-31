# Product Requirements Document — Morph Ops Control Room

**Version:** 1.0
**Date:** May 2026
**Product Manager:** Product Lead, Morph by TNX
**Status:** Live (Beta)

---

## 1. Overview

The Morph Ops Control Room is the operational source of truth for running **Morph by TNX Cohort 2** — a structured, multi-week programme that tracks participants, weekly assignment reviews, sessions, community-manager activity, recruitment, partnerships, and alumni. It replaces a sprawling Excel control workbook with a Supabase-backed Next.js application that any team member can use from a phone or laptop.

The product exists because cohort operations have a single failure mode: **stale, scattered data hides risk.** When attendance, submissions, and at-risk flags live in a spreadsheet that only one person updates, students slip through the cracks and the core team finds out too late. The Control Room makes the app the source of truth — "if it isn't in the app, it didn't happen" — and pushes the right work to the right person at the right time through role-scoped task queues, daily reminders, and a risk-escalation system grounded in the safeguarding policy.

It is mobile-first (installable as a PWA with push notifications), role-aware (Admin, Facilitator, Community Manager), and configurable across eight operational modules. Public, unauthenticated pages let participants submit weekly work and sign in to sessions without needing an account.

## 2. Problem Statement

Cohort operations were run from an Excel control workbook. As the cohort scaled, that broke down:

- **One editor, many readers.** Only the workbook owner kept it current; everyone else worked from stale copies.
- **Risk was invisible until too late.** A silent or stuck student was buried in a row no one re-read until the weekly meeting.
- **No accountability loop.** "Who was supposed to chase this?" had no answer — work wasn't assigned, due, or trackable.
- **Submissions were chaos.** Participants sent work over multiple channels; matching it to the right person and the right week was manual and error-prone.
- **No audit trail.** Changes overwrote each other with no history of who changed what, when.
- **Not mobile.** Community Managers work from their phones; a desktop spreadsheet didn't reach them.

## 3. Goals

| Goal | Metric |
|------|--------|
| Make the app the single source of truth | 100% of attendance/submission/risk data entered in-app, no side sheets |
| Surface at-risk students early | Red/Amber risk flag auto-creates an outreach task the same day it's set |
| Close the accountability loop | Every recurring duty appears as a dated, role-owned task in `/tasks` |
| Cut submission-matching effort | Participants self-submit via public link; work lands in the correct week bucket automatically |
| Reach CMs where they work | Installable PWA with daily push reminders at 08:00 |
| Preserve a defensible record | All edits captured in an audit log; JSON export available on demand |

## 4. User Roles & Permissions

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Admin** | Full access to every module and setting; import the workbook; manage users; configure reviews, reminders, and cohorts; export backups; promote alumni | — |
| **Facilitator** | View all operational data; action assignment reviews and sessions; see dashboards and alerts | Manage users, change global settings, run imports/exports |
| **Community Manager (CM)** | See every page (read-only on most); **edit Participants and Community (CM Tracker)**; work tasks tagged to their role; flag students at risk; raise escalations | Edit modules outside Participants/Community; manage users or settings |

Public (no login): participants can **submit weekly work** (`/submit/[slug]`) and **sign in/out of sessions** (`/attendance/[slug]`).

## 5. Core Features

### Dashboard
- At-a-glance operational health: today's attention items (red-risk students, review backlog), workload by owner, and escalations surfaced for the core team.
- User story: "As a CM, I can open the Dashboard and immediately see whether my role has overdue work, so that I can clear it before standup."

### Participants
- The roster of cohort members with attendance, submission status, risk level, owning CM, and next action per student.
- Setting **Risk = Red** automatically creates an outreach task on the owning CM.
- User story: "As a CM, I can flag a silent student as Red so that an outreach task is created and the core team sees the risk."

### Assignment Reviews
- Weekly submission review queue. Surfaces submission details on review cards; supports per-week buckets and open/close toggles with a copyable submission link.
- User story: "As a Facilitator, I can review a participant's weekly submission inline so that feedback is logged against the right week."

### Sessions
- Session records with an editable readiness checklist and a public sign-in/out page per session.
- User story: "As an Admin, I can publish a session attendance link so that participants sign themselves in without an account."

### Weekly Ops
- Operational task tracking per week with owner assignment.

### Community (CM Tracker)
- Per-CM weekly report: prompts posted, attendance/submissions updated, silent + stuck counts, escalations raised, energy level, key concerns, next actions, and a Done/weekly-report-sent status.
- User story: "As a CM, I can file my weekly Community row so that the core team has a structured read on cohort health."

### Tasks
- Role-scoped task workspace. Tasks are owned by role *labels* (e.g. "CM Owner") and land in the assignee's `/tasks`. Inline status select, hide-completed, comments with @mentions rendered as chips.
- User story: "As any team member, I can work my task queue and comment on blockers so that nothing sits overdue silently."

### Recruitment, Partnerships, Alumni
- Recruitment funnel tracking, partnership records, and an alumni module (with alumni-group-joined tracking and promotion from active participants).

### Safeguarding Escalations
- An escalation system grounded in the Safeguarding Policy; escalations surface on the Dashboard for the core team rather than being raised over DMs.

### Notifications & Reminders
- Web push notifications (PWA). A daily cron at 08:00 sends reminders for due/overdue role tasks.

### Admin: Import & Export
- One-time guarded workbook import (`/admin/import`) and JSON export (`/admin/export`) for backups.

## 6. Non-Goals (v1)

- No participant-facing portal beyond public submit/attendance links (participants don't log in).
- No in-app messaging/chat — the app records activity; conversations happen elsewhere.
- No automated grading of submissions — reviews are human.
- No billing, payments, or finance tracking.
- No multi-org / multi-tenant support — scoped to Morph by TNX cohorts.

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| UI | Tailwind CSS + local shadcn-style primitives; Chakra UI; lucide-react icons; framer-motion |
| Auth & data | Supabase Auth, Postgres, Row-Level Security, audit logs |
| Server access | `@supabase/ssr`; service-role client for server actions; direct `pg` for some paths |
| Push | Web Push (`web-push`) + service worker (PWA) |
| Imports | `xlsx`, `read-excel-file`, `react-spreadsheet-import` |
| Hosting | Vercel (Free), with a Vercel Cron for daily reminders |
| Source control | GitHub |

## 8. Success Criteria

- The Excel workbook is retired; all Cohort 2 operations run in-app.
- At-risk students are flagged and have an owned outreach task the same day.
- CMs file weekly Community reports without prompting beyond the in-app nudge.
- Participant submissions land in the correct week bucket without manual matching.
- The team can produce an up-to-date JSON backup at any time.

## 9. Open Questions

- Should facilitators get scoped edit rights on Sessions/Reviews beyond actioning (e.g. bulk operations)?
- Do we need per-cohort archival once Cohort 2 ends, or a clean re-seed for Cohort 3?
- Should escalations notify the core team via push in addition to surfacing on the Dashboard?
- Is a participant login worth building for v2, or do public links remain sufficient?
