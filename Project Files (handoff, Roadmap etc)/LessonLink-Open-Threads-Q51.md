# LessonLink — Open Threads

**Last updated:** Q4V (May 1, 2026)
**Purpose:** Short living list of in-flight work, deferred decisions, and open questions. Glance at this when opening a session. Update at session close. Keep it ≤30 lines wherever possible.

---

## In Flight

- *(Nothing actively in flight at session close. Captain to pick the next thing from "Stacked" below at next session start.)*

## Stacked (ready when Captain gives the word)

- **Action Hub + Alerts Engine.** Spec: `LessonLink-Action-Hub-Alerts-Engine-Spec-Q4U.md`. Eight alert types, action buttons on L page, Dashboard panel. Was queued behind Markdown Views; now next in line for VSC. Captain to drop spec into project files and hand to VSC when ready.
- **Phase 19-K-1: Bundle templates inside LL.** Replace upload-from-disk with auto-load from `public/templates/`. ~1 VSC session. Blocked on Captain confirming which templates are stable enough to bundle (WHITE WB Narrative is; YELLOW needs testing first).
- **Templates to build (priority TBD by Captain).** 14 workbook templates missing (full WHITE/YELLOW/ORANGE/GREEN × Narrative/Informational/Inquiry/Functional matrix, minus WHITE Narrative ✅ and YELLOW Narrative ⚠️ untested). 3 song templates missing (YELLOW, ORANGE, GREEN — assuming existing song template covers WHITE). Captain to identify next 2–3 templates needed for actual upcoming teaching, not all 17 at once.
- **YELLOW WB Narrative template needs testing.** Built, untested. Run one real lesson through it before relying on it.
- **Song template — verify which level it's built for.** Existing `Kiddoland_Worksheet_Song_TEMPLATE.html` exists; level coverage unknown. Captain to inspect and confirm.
- **KUPT prompt completeness (low priority).** KUPT v11 generates `tPrompt` and `expectedLResponse` only for the first 1–2 slides of a repeating pattern (e.g. Farm Animals slides 11–16 left blank). LL renderer fallbacks now cover this, but unit-package JSON is no longer self-contained for export. Fix only if/when LL needs to export packages back out to other tools.
- **Defensive: lazy-init refactor of `src/lib/firebase-admin.ts`.** Low priority. Currently working with eager init. Brittle pattern — any future env-var hiccup fails every petshop route on import. ~30 min VSC task, do it the next time anything else in that file is touched.
- **KUPT v11 emoji verification (~10 min, do anytime).** Reload `Kiddoland-Unit-Plan-Tool-v11-Q4R.html`, regenerate Farm Animals JSON via the emoji-corrected dropdown, inspect `course.title` field. Pass = `🌟 Fast Fluency 🌟` emits natively, no manual edit. Fail = diagnose.

## Decisions Made (don't relitigate)

- **Asset codes are session-scoped, not unit-wide.** Code A in Session 1 is a different asset than code A in Session 2. The unit-plan renderer no longer dedups across sessions. (Q4V)
- **Templates bundle in `public/templates/`, not Firebase Storage.** Reason: matches existing static-hosting pattern, version-controlled in Git, no new Firebase rules.
- **KHGT lives inside LL, not standalone HTML.** Q42 spec's standalone-first plan was bypassed. Built directly at `/t-portal/students/[id]/create-homework` (Q46 session). Standalone HTML phase no longer applicable.
- **AI source for `lessonData` JSON: BBC or VSC, not Qwen.** Qwen kept as emergency fallback only.

## Open Questions (need Captain answer next session)

- **Which 2–3 templates to build first?** Tied to actual teaching pipeline next 2–3 weeks. Don't try to build all 17.
- **Version-string discipline.** Roadmap was self-versioned by VSC as "Q4S (7.1)." Captain to decide whether to enforce strict hexdate-only versioning or allow VSC's incremental numbers.
- **Bump roadmap version stamp.** Roadmap still says "Q4S, Last Updated April 29" despite Phase 19-L addition on Q4V. Update version line on next roadmap edit.

## Lessons Recorded (Q4V)

- When VSC narrates code rather than pasting it, ask again. Narration is a hypothesis; pasted code is evidence. (Q4V example: VSC's first description of `str()` was directionally right but glossed over the nested-content path that turned out to be the real bug.)
- Two-bug diagnoses can collapse to one root cause. The "JSON blobs in slides" and "missing T prompts on slides 11–16" looked like separate problems; both traced back to the renderer not knowing how to read structured `slide.content` objects.
- Per-session asset codes are local labels, not unit-wide IDs. The dedup logic in the original unit renderer assumed unit-wide; corrected in Q4V.

## Lessons Recorded (Q4S — kept for reference)

- Project knowledge files describe intent, not current state. When Captain says X is built, update mental model immediately. Don't re-anchor to specs.
- VSC diagnostic narratives are hypotheses, not findings. Verify with logs/errors before accepting. (Q4S example: VSC blamed `firebase-admin.ts` rewrite for pet generation failure; real cause was missing `GEMINI_API_KEY` in Netlify, unrelated.)
- VSC will summarize and truncate roadmap updates unless explicitly told not to. Hardened prompts (with "do not summarize / consolidate / improve" + length floor + verification step) work. Always verify VSC's roadmap output before accepting.
- For structural questions about a large repo, use grep, not full reads. Saves tokens and avoids hallucinating from partial context.

## Resolved (Q4V)

- ✅ **Markdown Views build shipped.** Both Unit-plan and Lesson-plan markdown views render cleanly from LL data. Download .md works on both. Three renderer bugs caught and fixed during review:
  - JSON blobs leaking into slide content (`str()` fallback dumping `JSON.stringify` on structured `slide.content` objects). Fixed via type-aware `renderSlideContent()` helper covering 12+ slide types.
  - Missing T prompts and expected L responses on repeat slides (KUPT only generates them for first 1–2 of a pattern). Fixed via per-type defaults in renderer fallback.
  - Unit-plan Anchor Song reading wrong field path (`slide.title`/`slide.url` instead of `slide.content.title`/`slide.content.url`). Fixed.
- ✅ **Asset Pack dedup logic corrected.** Codes are now session-scoped, not unit-wide. Table shows all 9 Farm Animals asset rows (4 sessions × 2–3 assets each) with proper names.
- ✅ Roadmap updated with Phase 19-L entry. Version stamp bump pending.

## Resolved (Q4S — kept for reference)

- ✅ Pet image generation on kiddoland.co — `GEMINI_API_KEY` added to Netlify, redeployed, working.
- ✅ Vercel mystery — VSC misspoke, no Vercel anywhere in repo, confirmed clean.
- ✅ KHGT state clarified — built, location confirmed, content types confirmed, template inventory built.
- ✅ Roadmap refreshed Q4Q → Q4S with hardened VSC prompt, verified, accepted.
