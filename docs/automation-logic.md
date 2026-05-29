# How Auto-Tasks Work (Admin/Ops Reference)

The control room generates follow-up tasks on its own so work routes to owners instead of funnelling through one person. Two engines do this.

## 1. Event rules (fire when you edit a record)
When you create or edit a record, the app checks the rules for that table and creates a task if a condition matches. The rules live in the database (`workflow_rules`).

Current Cohort 2 rules:
| When you… | …a task is created for | Labelled |
|---|---|---|
| Set a session's readiness below 100% | finish session prep | Session Lead |
| Set a review to "Not Reviewed" | review the submission | Reviewer |
| Mark a review "resubmission needed" | chase the learner | CM Owner |
| Set a participant's Risk = Red | reach out to the student | CM Owner |

- **Labels are roles, not people.** A task tagged "CM Owner" or "Reviewer" shows in **My Tasks** and on the **Dashboard → Workload by owner** under that role. Once you map a real person to a task (open it → assign), they also get push reminders.
- **No duplicates.** If a matching open task already exists for that record, the rule won't create another.

## 2. Weekly cadence sweep (runs daily on a schedule)
A daily job generates the recurring weekly-ops tasks (Friday reminder, Saturday session, upload, Monday recap, midweek check-in, deadline, weekly report) for each week of the programme. Due dates are calculated from the **cohort start date** (set on the cohort), and only tasks due within the next ~2 weeks are created at a time, so the task list isn't flooded up front. Each is tagged to its role (Session Lead, CM Lead, CM Owner, Iyanu, etc.).

## Reminders
Tasks that have **both** a real assigned person and a due date trigger web-push reminders (overdue / due-soon) once a day. Role-only tasks (no person mapped yet) stay visible in the app but don't push until assigned.

## Changing the rules
Rules and the cohort start date are database values, not code. To add/adjust a rule or change owners, edit `workflow_rules` / `cohorts.starts_on` (or ask in a session and we'll write the migration).
