# Morph Ops — User Testing Checklist (Round 4)

Live app: https://tnx-morph-fob-zikq.vercel.app
Test cohort: **Morph by TNX Cohort 2** · public submit link: `/submit/morph-cohort-2`

Tip: test as an **admin** first, then sign in as a **community manager** for the CM-specific checks.
Tick each box as you confirm it. Note anything broken in the "Notes" line under each item.

---

## 🔔 Notifications
- [ ] Bell icon shows in the desktop sidebar (top, next to "Morph Ops") and on the mobile header.
- [ ] Bell shows a red unread count when you have unread notifications.
- [ ] Clicking the bell opens the panel; on **desktop it opens to the right** (not cut off).
- [ ] Panel has **Unread / All** tabs; "Mark all read" clears the count.
- [ ] Clicking a notification marks it read and navigates to the linked record.
- [ ] "View all" opens the full `/notifications` page.
- [ ] **Assign a task** to another teammate → they get a notification (in-app + push if enabled).
- [ ] **@mention** a teammate in a record comment (Mention button) → they get a notification.
- [ ] **Announcement** (Settings → Team & Access → "Announcement to community managers") → CMs receive it.
- Notes:

## ✅ My Tasks (Todoist-style)
- [ ] "Add a task and press Enter" quick-add at the top creates a task without a modal.
- [ ] Round checkbox on the left marks a task done (title strikes through).
- [ ] Un-checking reopens it.
- [ ] Task create/edit no longer has an "Owner" free-text field (only assignee dropdown).
- [ ] Edit shows clear **Save** + **Cancel**.
- Notes:

## 📋 Reviews
- [ ] Page **defaults to the current week** (not "All weeks") — needs cohort start date set.
- [ ] Each review row has one **Update** button that opens a menu (submitted / status / reviewer / outcome / open record).
- [ ] **Reviewer** is a dropdown of active staff (not free text).
- [ ] Zoom out on the PWA / browser — the page does **not** crash or break layout.
- [ ] "Settings" button opens a modal to set **per-week assignment labels**; saving updates that week's rows.
- [ ] Worksheets uploaded via the public form show an "Open uploaded worksheet" link.
- Notes:

## 🧑‍🎓 Participants & profiles
- [ ] Open a participant → application profile shows (read-only, clean layout).
- [ ] Email + phone have a subtle **click-to-copy**.
- [ ] Phone has a **WhatsApp** button → opens wa.me with prefilled "Hello {name}, I am {you} from Morph by TNX {cohort}…".
- Notes:

## 🎓 Alumni
- [ ] "Sync alumni" button promotes participants who **presented their demo AND submitted all 5 weeks**.
- [ ] Already-promoted participants aren't duplicated on re-sync.
- [ ] Switching cohort filters the alumni list; "all cohorts" view works.
- Notes:

## 🗂 Resources
- [ ] "Add resource" disables the Save button while saving (no accidental 5× uploads).
- [ ] Uploading a **file** shows a "File" chip (not just "Link").
- [ ] Each resource card has **Edit** (pre-filled modal) and **Delete** (with confirm).
- [ ] "All cohorts" scope option works — resource shows across cohorts and gets an "All cohorts" chip.
- Notes:

## ⚙️ Ops
- [ ] Week filter pills appear and filter the records.
- [ ] **Bulk update → Owner** is a dropdown (roles + team members), not free text.
- [ ] Day and Channel are dropdowns on the ops task edit form.
- Notes:

## 👥 Community (CM reports)
- [ ] Each CM card shows a **per-week** report breakdown (not just the latest).
- Notes:

## 🧑‍💼 Team & Access (admin)
- [ ] Creating a CM shows the temp password with a **reveal/hide** (eye) toggle + copy.
- [ ] **Deactivate** a user → they're hidden from assignee/reviewer pickers and can't log in.
- [ ] **Reactivate** restores them.
- [ ] Active / Deactivated / All **filter** works (defaults to Active).
- Notes:

## 📨 Submissions (public form)
- [ ] Settings → Tools → toggle a cohort's submissions **open/closed** → shows a toast.
- [ ] Open `/submit/morph-cohort-2` while open → branded form (name + week dropdowns, file upload).
- [ ] Submit → review row flips to **Submitted**; the cohort name in the closed/open copy is dynamic.
- [ ] On submit with "Yes, I need help" → a **follow-up task** is created for the team.
- Notes:

## 🔔 Reminders config
- [ ] Settings → Notifications → "Task reminders": pick slots (1 day / 3 hours / at due / overdue).
- [ ] Can't select more than 3 "before due" slots at once.
- [ ] Saving shows a toast.
- Notes:

## 📱 PWA / mobile
- [ ] App can't pinch-zoom (stays full scale).
- [ ] Bottom nav: **Dashboard · Tasks · Review · Alerts · More** (Community is inside More).
- [ ] Tapping **More**, then tapping outside it, **closes** the menu.
- [ ] More menu highlights the page you're currently on.
- [ ] Mobile header has a **user avatar** (tap → Profile + Log out) — no one-tap "Sign out".
- [ ] Tables show as **stacked cards** on a phone.
- [ ] After a new deploy, a "**New version available — Refresh**" prompt appears.
- [ ] Page loader is the **pulsing TNX logo** (no text).
- [ ] TNX logo shows on the **login page** and as the **installed app icon**.
- Notes:

## 🧑‍🔧 Community Manager view (sign in as a CM)
- [ ] Sidebar shows only: Dashboard, My Tasks, Community, Ops, Sessions, Resources, Alumni, Settings.
- [ ] **Reviews / Participants / Cohorts are hidden.**
- [ ] Ops & Sessions are **read-only** (no New/Import/bulk/inline-edit controls).
- [ ] Community shows **only their own** report card.
- [ ] Settings shows the Notifications tab (push + reminders).
- Notes:

## 🎨 General polish
- [ ] Text/icons aren't flush to card edges (record detail, cohort detail, guide cards).
- [ ] Audit trail is behind an **Activity** button (right-side drawer), not always on screen.
- [ ] Dropdowns everywhere are the branded menu (close on select), carets centered.
- Notes:

---

### How to report issues back
For each broken item, jot: **page → what you did → what happened → what you expected.**
Screenshots help a lot. I'll work through them in the next pass.
