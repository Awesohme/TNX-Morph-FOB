# Reliability fixes — 26 October 2026

This batch addresses all 16 findings from the 25 October usability audit.

## Changes

- Privileged record, task, comment, attachment, resource, escalation, plan, and cohort-setting actions verify the authenticated user's cohort access. Bulk changes require explicit cohort scope, reject mixed or missing IDs, and never trust a navigation URL for permission.
- Cohort, filter, and page navigation clear bulk selections. Operational lists filter their full lightweight metadata scope, show accurate totals, and paginate full records in groups of 50. Blank activity-week filters mean all weeks.
- CM reports accept legacy participant IDs and object snapshots without crashing. Session editors receive dynamic week and assignee choices.
- Attendance schedule removal persists immediately with rollback; settings reset per cohort. Failed sign-out validation or server writes preserve identity and reflection drafts.
- Modal typing retains focus; keyboard focus is contained; nested dialogs share background/scroll locks. Errors appear inline and global feedback is announced above overlays.
- Repeated task saves close their modal; status controls stay synchronized. Tasks remain editable after their source record is deleted, without allowing source-link spoofing.
- Reviews use participant IDs, not display names. Migration 027 conservatively backfills only unambiguous legacy rows, adds a unique participant/cohort/week index, and archives old assessment data atomically under the replacement update's row lock. Replacement submissions return to Not Reviewed while retaining reviewer ownership.
- Review imports and Sheets sync validate stable IDs, reject ambiguous names, preserve existing column positions, and correctly handle non-first-row sheet headers.

## Validation

Passed on the final source:

```sh
npm run verify
npm run lint
node scripts/test-cohort-authorization.cjs
node scripts/test-list-pagination.mjs
node scripts/test-submission-review.cjs
node scripts/test-review-import-identity.cjs
node scripts/test-sync-header-migration.cjs
node --env-file=.env.local scripts/test-database-isolation.mjs
```

The database check clones tables into a fresh isolated schema and creates transaction-only identities/cohorts for deployed RLS checks. It always rolls back. Migration backfill, duplicate-name isolation, idempotence, unique upsert, reviewer retention, atomic archive, two separate cohort members, and admin access passed.

Migration `027_review_participant_identity.sql` was then applied transactionally to the configured Supabase project. Its UUID column, unique index, and archive trigger were verified before commit.

Production-build browser checks used isolated HTTP test data: all-week results; typing/Tab/Escape; cohort selection reset; attendance state/removal/failure rollback; CM report rendering; session assignee options; repeated task creation; completion/status synchronization; attendance validation/server-failure draft retention; resubmission reset; 106-record pagination and filters; nested-dialog route navigation; mobile inline errors and uncovered toast feedback.

Independent backend and UI reviews returned ship after corrections. Database RLS/constraint tests used PostgreSQL; browser checks used a fixture rather than production authentication. Real Storage uploads, email delivery, web-push delivery, and a signed-in production smoke test were not exercised.

The user's pre-existing README/user-guide deletions and temporary working folders were not included.
