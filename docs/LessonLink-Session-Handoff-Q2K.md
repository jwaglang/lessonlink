# LessonLink Development Session Handoff

## Session Date
February 20, 2026 (Q2K)

## Session Summary
Updated the S-portal "Buy" dialog text per user feedback and prepared Firestore rules for deployment. Reviewed the handoff and roadmap files to get up to date with the project.

---

## What We Completed

### Major Achievements
- **Buy dialog text updated** — Changed button labels and descriptions to match user request:
  - "Continue with {tutor}" → "Add credit for {tutor}"
  - "View packages for your current tutor" → "View sessions for your current tutor"
  - "Find another tutor" / "Find a tutor" → "Explore tutors"
- **Firestore rules prepared** — Added rules for `payments` and `learnerAvailability` collections, ready for deployment
- **Project status review** — Read handoff (Q2I) and roadmap (Q2I) documents to understand current project state

### Technical Changes Made
1. **S-Portal Top Bar (`src/components/s-portal-top-bar.tsx`)**
   - Updated Buy dialog button text at lines 124, 125, 140
   - Button 1 now shows "Add credit for {tutor}" with subtitle "View sessions for your current tutor"
   - Button 2 now shows "Explore tutors" (static, no conditional)

2. **Firestore Rules (`firestore.rules`)**
   - Added `payments` collection rules (line 237+) — allows learners to read their own payments
   - Added `learnerAvailability` collection rules (line 220+) — allows learners to read/write their own availability
   - **Not yet deployed** — needs Firebase Console publish

---

## Files Created

| File Path | Purpose |
|-----------|---------|
| `docs/LessonLink-Session-Handoff-Q2K.md` | This handoff document |

## Files Modified

| File Path | Changes Made |
|-----------|-------------|
| `src/components/s-portal-top-bar.tsx` | Updated Buy dialog text: button labels and subtitles |
| `firestore.rules` | Added `payments` and `learnerAvailability` collection rules (written, not deployed) |

---

## Current State

### ✅ What's Working
- Build passes (no new errors)
- App loads and runs on localhost
- Buy dialog displays with updated text
- All existing S-portal functionality intact
- Phase 13 (Stripe/webhooks) complete
- Phase 14 (Assessments/Evaluations) mostly complete — finalize and parent report buttons need wiring

### ⚠️ Known Issues / Warnings
- **Firestore rules not deployed** — `payments` and `learnerAvailability` rules are written but not published to Firebase. This blocks:
  - My Balance page (needs `payments` read)
  - Calendar Availability tab (needs `learnerAvailability` read/write)
- **AI_USE_MOCK=true** — MiniMax API not tested in production

### 🧪 Needs Testing
- [ ] Deploy Firestore rules via Firebase Console
- [ ] Test My Balance page loads payment history
- [ ] Test Calendar Availability tab allows setting learner availability
- [ ] Test Buy dialog buttons navigate correctly

---

## Next Session Should

### Immediate Priority
1. **Deploy Firestore rules** — Go to Firebase Console → Firestore Database → Rules, paste content from `firestore.rules`, click Publish
2. **Test My Balance page** — Verify payment history and credit activity load
3. **Test Calendar Availability tab** — Verify learner can set their availability

### Secondary Tasks
4. Complete Phase 14 — wire "Finalize" and "Generate Parent Report" buttons
5. Test real MiniMax API (`AI_USE_MOCK=false`)
6. Begin Phase 15 (Homework System) or address roadmap items

### Blocked By
- Firestore rules need deployment before Balance and Availability features work

---

## Important Context

### Critical Information for Next Claude
- **Dev environment:** VSCode + MiniMax M2.5 for code execution and codebase searches. Claude (Anthropic) for planning and architecture.
- **MiniMax handling:** Give it exact code to paste with "DO NOT MAKE ANY CHANGES BEYOND WHAT IS SPECIFIED" bookend warnings. It follows instructions well but will edit code unprompted if not explicitly told otherwise.
- **Codebase search protocol:** Generate ready-to-paste MiniMax prompts bookended with "DO NOT MAKE ANY CHANGES" warnings. Wait for user to paste results.
- **Captain/Number One dynamic:** User is Captain, Claude is Number One. Captain gives orders, Number One plans and delegates to MiniMax. Don't ask Captain to do manual work — generate prompts for MiniMax instead.
- **Terminology:** Use "Learner" (L) not "Student" (S) in Kiddoland/assessment context. S is used for the portal role.
- **3 courses exist:** Fun Phonics, Real Reading, Fast Fluency — all same price currently
- **Pricing source of truth:** `lessonlink-pricing-scheme-v_2.md` in project knowledge
- **Chinese customers** — email payment link is mandatory fallback (can't redirect in WeChat)
- **AI_USE_MOCK=true** is currently active — no real API calls happening
- **MiniMax API key** is in `.env.local` as `MINIMAX_API_KEY` — the "Create secret key" one (not "Coding Plan Key")
- **Multi-provider AI:** `TASK_PROVIDERS` in `src/lib/ai/providers.ts` maps task types to providers. Currently all set to `minimax`. Change to `claude` etc. when ready.
- **55 pre-existing TypeScript errors** — legacy tech debt from earlier phases

### Recent Decisions
- **Decision:** Buy dialog text updated per user request
- **Rationale:** User feedback indicated button labels should be more action-oriented ("Add credit", "Explore tutors") rather than passive ("Continue with", "Find")

---

## Development Rules Followed
- [X] No direct Firebase access by AI
- [X] All code reviewed before pasting
- [X] No GitHub fetch without permission
- [X] Session closure before compaction

---

**Status:** Buy dialog ✅ updated. Firestore rules written, awaiting deployment.
**Ready for:** Deploy Firestore rules → Test Balance + Availability features → Phase 14 completion → Phase 15
**Git status:** Changes committed and pushed.