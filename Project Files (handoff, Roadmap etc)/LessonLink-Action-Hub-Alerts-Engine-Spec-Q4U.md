# LessonLink — Action Hub + Alerts Engine Spec

**Hexdate:** Q4U (April 30, 2026)
**Status:** Approved by Captain, ready for VSC implementation
**Replaces:** nothing (new feature)
**Related:** `LessonLink-Course-Page-Architecture-Spec-Q2N.md`, `LessonLink-Roadmap-Q4S.md`

---

## 1. The Idea in One Paragraph

LL becomes the T's trusted system. Common recurring T-side work is one click away via **Action Hub** buttons on the L page and other key pages. Anything with a deadline or recommended lead time is surfaced in an **Alerts** panel on the Dashboard. The T's job is to look at the panel and work the list. The system's job is to make sure no action ever falls through the cracks. Inspired by Allen (GTD), Newport (deep work, no open loops), and Eco's notecard system (the system holds the cards, your mind doesn't have to).

---

## 2. Design Principles (read first, then build)

1. **Non-negotiable system.** All alerts on by default. No user-facing config toggle in v1. Snooze is allowed; turning alerts off is not. The whole point is that the T can't negotiate with the system.
2. **Click the alert, do the thing.** Every alert has a single primary action button that takes the T directly to the work. No "view details" intermediate steps.
3. **Self-dismissing.** Alerts dismiss automatically when the underlying state changes (T completes the action). No manual "mark as done" button on alerts.
4. **One panel, one place.** All alerts live in the Dashboard Alerts panel. No scattered notifications. No email. No browser push. Pull model only in v1.
5. **Action buttons mirror alerts.** The Action Hub buttons on the L page do the same things alerts trigger. A T who never looks at alerts can still do everything from the L page directly. Alerts are the safety net, not the only path.
6. **Course-agnostic, package-aware.** Same data model used everywhere else in LL. Alerts attach to entities (L, package, session, unit), not to courses.

---

## 3. Action Hub — Buttons on Key Pages

### 3.1 L page (T-side)

Top of page, before any L info. Four primary buttons:

| Button | What it does |
|---|---|
| **Plan Session** | Opens session planner for this L's next unplanned upcoming session. If multiple, picks the soonest. AI takes the UP + T notes and produces a moment-by-moment plan. |
| **Book Session** | Opens session booking dialog for this L. |
| **Assign Unit** | Opens unit assignment dialog for this L's active package. |
| **Pause Package** | Pauses this L's active package (with confirm dialog). |

Disabled state rules:
- **Plan Session** disabled if no upcoming unplanned sessions exist. Tooltip: "No sessions to plan."
- **Assign Unit** disabled if no active package. Tooltip: "No active package."
- **Pause Package** disabled if no active package or already paused. Tooltip: "No active package" / "Already paused."
- **Book Session** always enabled if L has any package (active or paused).

### 3.2 Dashboard

The Alerts panel itself acts as the action hub. Each alert has a primary action button. No separate "quick actions" row needed at v1.

### 3.3 Course page, Unit page

Out of scope for v1. Stacked for v2. Note in roadmap.

---

## 4. The Full Inventory of T-Side Recurring Work

This is the master list. Every item below is an alert candidate.

**Course-level (per L)**
- Plan the course (intake → syllabus shuffle, the 40K altitude)

**Unit-level (per unit, recurring)**
- Plan the unit (Frankenclass — gather/create materials, 30K altitude)
- Annotate materials (Hitchcock pass, 20K altitude)

**Session-level (per session, recurring)**
- Plan the lesson / revise the UP (Play the Slots, 10K altitude)
- Rehearse / Sanity Pass (the runway)
- Run the session
- Mark session complete
- Send feedback (within 12 hours)
- Send homework (within 12 hours)

**Package-level (per package)**
- Address paused package
- Address expiring package
- Address completed package (renew or offboard)

**L-level (ongoing)**
- Respond to L messages (reserved for when messaging is built)
- Address L-reported issues (reserved)

---

## 5. Alert Types — v1

Eight alert types ship in v1. Each has a trigger, a dismiss condition, and a primary action.

### 5.1 Plan Course
- **Trigger:** New L is added with no course plan, AND first session is within 30 days.
- **Dismiss:** Course plan exists for this L (any non-empty `coursePlan` object on the L doc).
- **Primary action:** "Plan Course" → opens course planner for this L.
- **Severity:** medium

### 5.2 Plan Unit
- **Trigger:** Unit is assigned and starts in ≤14 days, AND no unit plan exists.
- **Dismiss:** Unit plan exists (`unitPlan.status === 'planned'` or later).
- **Primary action:** "Plan Unit" → opens unit planner for this unit.
- **Severity:** medium

### 5.3 Plan Session
- **Trigger:** Session is scheduled to occur in ≤7 days, AND no session plan exists.
- **Dismiss:** Session plan exists (`sessionPlan` object populated).
- **Primary action:** "Plan Session" → opens session planner for this session.
- **Severity:** high if ≤2 days, medium otherwise.

### 5.4 Sanity Pass
- **Trigger:** Session is scheduled to occur within 24 hours, AND `sessionPlan.rehearsed !== true`.
- **Dismiss:** T marks plan as rehearsed (single button on session plan view), OR session start time passes.
- **Primary action:** "Review Plan" → opens session plan in review mode.
- **Severity:** high

### 5.5 Complete Session
- **Trigger:** Session scheduled end time has passed by ≥30 minutes, AND `session.status !== 'completed'`.
- **Dismiss:** T marks session complete.
- **Primary action:** "Mark Complete" → opens session completion flow.
- **Severity:** high

### 5.6 Send Feedback
- **Trigger:** Session marked complete, AND no feedback sent, AND <12 hours since completion.
- **Dismiss:** Feedback sent (`session.feedbackSentAt` set).
- **Primary action:** "Send Feedback" → opens feedback composer pre-filled from session notes.
- **Severity:** high if >6 hours since completion, medium otherwise. **Escalates to overdue at 12 hours** (alert stays, severity becomes critical, copy changes to "Feedback overdue").

### 5.7 Send Homework
- **Trigger:** Session marked complete, AND HW assignment expected (per unit plan) but not sent, AND <12 hours since completion.
- **Dismiss:** HW assigned (`session.homeworkAssignedAt` set) OR T explicitly marks "no HW this session."
- **Primary action:** "Assign Homework" → opens HW assignment flow for this L.
- **Severity:** same escalation rules as Send Feedback.

### 5.8 Address Package Status
- **Trigger:** Package is paused for >7 days, OR package expiring in ≤14 days, OR package completed (all sessions used) and not yet offboarded/renewed.
- **Dismiss:** Package state changes (resumed, renewed, marked completed-and-closed).
- **Primary action:** Varies by sub-state — "Resume / Renew / Offboard."
- **Severity:** medium

---

## 6. Firestore Schema

One new collection: `alerts`.

```
alerts/{alertId}
  type:              string         // 'plan_session', 'send_feedback', etc.
  tutorId:           string         // who sees this alert
  learnerId:         string         // entity it relates to
  packageId:         string | null
  unitId:            string | null
  sessionId:         string | null
  triggerAt:         Timestamp      // when this alert became active
  dismissedAt:       Timestamp | null
  snoozedUntil:      Timestamp | null
  severity:          'medium' | 'high' | 'critical'
  primaryActionUrl:  string         // route the action button opens
  primaryActionLabel: string        // button copy
  message:           string         // what the T sees
  createdAt:         Timestamp
  updatedAt:         Timestamp
```

**Query pattern for Dashboard Alerts panel:**
```
where tutorId == currentUser.uid
  AND dismissedAt == null
  AND (snoozedUntil == null OR snoozedUntil <= now)
order by severity desc, triggerAt asc
```

**Index needed:** `tutorId + dismissedAt + severity + triggerAt`.

---

## 7. The Alert Lifecycle

Two parts: **creation** and **dismissal**.

### 7.1 Creation — when do alerts appear?

A scheduled job runs every 15 minutes. For each tutor, it checks every trigger condition above and creates alert documents for any condition newly met. Idempotent — if an alert of the same type already exists for the same entity and is not dismissed, do not create a duplicate.

VSC implementation note: Firebase scheduled function (`onSchedule('every 15 minutes')`). Use Firestore queries to find candidate entities (sessions starting in next 7 days with no plan, etc.), then upsert alert docs.

### 7.2 Dismissal — when do alerts disappear?

Two paths:

1. **Automatic.** Whenever the underlying state changes (session marked complete, plan saved, feedback sent), client-side code that performs the change also writes `dismissedAt = serverTimestamp()` to any matching open alert. This is faster than waiting for the next scheduled run and gives the T immediate feedback that the alert cleared.
2. **Snooze.** T can snooze an alert for 1 hour, 4 hours, or until tomorrow morning. Sets `snoozedUntil`. Alert hides from panel until that time passes.

No manual "dismiss without action" button. If an alert shouldn't have fired, that's a bug, not a UX choice.

---

## 8. Dashboard Alerts Panel — UI

Top of Dashboard, above existing widgets. Card layout, one row per alert.

Each row shows:
- **Severity dot** (color-coded: medium=amber, high=orange, critical=red)
- **Message** ("Send feedback for Maya's session from this morning")
- **Primary action button** ("Send Feedback")
- **Snooze menu** (1hr / 4hr / tomorrow)

Empty state: "Nothing pending. You're clear."

Sort: severity desc, then `triggerAt` asc (oldest critical first).

No pagination at v1 — assume <20 active alerts per T at any time. If this assumption breaks, address in v2.

---

## 9. What's Explicitly Out of Scope for v1

- Email notifications
- Browser push notifications
- Per-tutor configuration of which alerts fire
- L-side alerts (this is T-tooling only at v1)
- Action buttons on Course page and Unit page
- Alerts for L messaging or L-reported issues (messaging not built yet)
- Smart batching ("3 sessions need plans" rolled into one alert) — every alert is its own row at v1
- Mobile push or SMS

These are roadmap candidates, not v1 work.

---

## 10. Build Order for VSC

Recommended sequence so something ships fast and the rest layers on:

1. **Firestore schema + index.** Create the `alerts` collection, deploy index.
2. **Dashboard Alerts panel UI.** Read-only first — just renders whatever alerts exist. Empty state included.
3. **Manual alert creation utility.** Admin-only function to insert test alerts. Lets Captain see the panel work end-to-end before triggers are built.
4. **Trigger functions, one alert type at a time.** Start with **Send Feedback** and **Complete Session** (highest-pain per Captain). Then **Plan Session**, then **Sanity Pass**, then the rest.
5. **Auto-dismiss hooks.** Wire each state-change action (mark complete, save plan, send feedback) to dismiss matching alerts.
6. **Snooze.** Add snooze menu and `snoozedUntil` filtering.
7. **L page Action Hub buttons.** Four buttons, disabled states per §3.1. Each routes to the same flow the matching alert opens.

After step 6, the system is functionally complete from the alerts side. Step 7 is the L-page complement.

---

## 11. Kill Criteria

If after one month of use Captain finds himself keeping a parallel mental list "just in case," the system has not earned trust and we revisit. Likely failure modes to watch:

- Alerts firing late (scheduled job interval too long → tighten to 5 min).
- Alerts not dismissing when action is taken (auto-dismiss hook missing on some action paths).
- Alerts firing for things Captain already handled outside LL (means the trigger logic is missing a state check).

Track these as bugs, not feature requests.

---

**END OF SPEC**

Hand to VSC. VSC reads this top to bottom before writing code, asks Captain only about things this spec doesn't answer, builds in the order in §10.
