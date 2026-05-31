# Morph Ops Control Room

The operational source of truth for running Morph by TNX cohorts — participants, reviews, sessions, community-manager activity, recruitment, partnerships, and alumni — in one mobile-first, role-aware app.

**Live app:** https://tnx-morph-fob.vercel.app _(Vercel default URL — update if a custom domain is added)_
**GitHub:** https://github.com/Awesohme/TNX-Morph-FOB

---

## What it does

Replaces the Excel control workbook with a Supabase-backed Next.js app so the whole team works from current, accountable data. It surfaces at-risk students early, pushes role-scoped tasks and daily reminders, lets participants self-submit work and sign into sessions via public links, and keeps an audit trail of every change.

Three roles:
- **Admin** — full access: modules, settings, user management, import/export, cohorts, reviews & reminders config.
- **Facilitator** — view all data; action assignment reviews and sessions.
- **Community Manager** — see everything; edit **Participants** and **Community (CM Tracker)**; work role tasks; flag risk; raise escalations.

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS + local shadcn-style primitives, Chakra UI, lucide-react, framer-motion
- **Data/Auth:** Supabase (Auth, Postgres, RLS, audit logs)
- **Push:** web-push + service worker (installable PWA)
- **Imports:** xlsx, read-excel-file, react-spreadsheet-import
- **Hosting:** Vercel (Free) + Vercel Cron (daily reminders at 08:00)

## Local development

### Prerequisites
- Node 18+ (Next 15 / React 19)
- A Supabase Free project
- Environment variables (below)

### Setup
```bash
git clone https://github.com/Awesohme/TNX-Morph-FOB.git
cd TNX-Morph-FOB
npm install
cp .env.example .env.local
# fill in the variables below, then:
npm run dev
```

Then:
1. Run `supabase/migrations/001_foundation.sql` (and subsequent migrations) in the Supabase SQL editor.
2. Create your first Supabase Auth user and sign in. If no active admin exists, the app calls `claim_first_admin()` to activate the first admin.
3. Visit `/admin/import`, type `IMPORT_MORPH_OPS`, and import the workbook.

### Environment variables
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server-only** service role key — never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (e.g. `http://localhost:3000` locally) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | For push | Web Push VAPID keypair |

## Project structure
```
src/
  app/
    (protected)/        # authenticated routes: dashboard, participants,
                        # reviews, sessions, ops, community, tasks, admin, …
    attendance/[slug]/  # public session sign-in/out
    submit/[slug]/      # public weekly submission
    api/                # admin import, push, reminders cron
  components/           # app-shell (nav + role gating), workflow, modules, guides
  lib/
    auth.ts             # AppRole = admin | facilitator | community_manager
    modules.ts          # the 8 module configs
    actions/            # server actions (records, submissions, notifications, …)
supabase/migrations/    # SQL migrations (run manually in the SQL editor)
```

## Deployment
Auto-deploys on push to `main` via Vercel. A Vercel Cron (`vercel.json`) hits `/api/reminders/send` daily at 08:00 UTC to dispatch due/overdue task reminders. `NEXT_PUBLIC_*` values are build-time on Vercel — redeploy after changing them.

## Verification
```bash
npm run typecheck
npm run build
npm run doctor      # react-doctor health check
```

## Safety
- Never commit `.env.local`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Use `/admin/export` regularly for JSON backups.

## Contributing
Branch flow: after a clean `npm run build` + browser test, push straight to `main`. Browser-test the exact user path you changed before pushing.
