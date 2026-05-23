# Morph Ops Control Room

A configurable, mobile-responsive operations app for Morph by TNX Cohort 2, migrated from the Excel control workbook into a Supabase-backed Next.js app.

## Free Stack

- Next.js + React 19 + TypeScript
- Tailwind CSS with local shadcn-style primitives
- Supabase Auth, Postgres, RLS, and audit logs
- Vercel Free for hosting
- GitHub Free for source control

## Setup

1. Create a Supabase Free project.
2. Run `supabase/migrations/001_foundation.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
5. Create your first Supabase Auth user.
6. Sign in. If no active admin exists, the app calls `claim_first_admin()` and activates the first admin.
7. Visit `/admin/import`, type `IMPORT_MORPH_OPS`, and import the workbook.

## Safety Rules

- Never commit `.env.local`.
- Rotate any temporary secrets after setup.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix.
- `NEXT_PUBLIC_*` values are build-time values on Vercel, so redeploy after changing them.
- Use `/admin/export` regularly for JSON backups.

## Verification

```bash
npm run typecheck
npm run build
npm run doctor
```
