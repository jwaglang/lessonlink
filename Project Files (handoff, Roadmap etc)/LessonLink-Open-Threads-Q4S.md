# LessonLink — Open Threads

**Last updated:** Q4S (April 29, 2026)
**Purpose:** Short living list of in-flight work, deferred decisions, and open questions. Glance at this when opening a session. Update at session close. Keep it ≤30 lines wherever possible.

---

## In Flight

- **Templates to build (priority TBD by Captain).** 14 workbook templates missing (full WHITE/YELLOW/ORANGE/GREEN × Narrative/Informational/Inquiry/Functional matrix, minus WHITE Narrative ✅ and YELLOW Narrative ⚠️ untested). 3 song templates missing (YELLOW, ORANGE, GREEN — assuming existing song template covers WHITE). Captain to identify next 2–3 templates needed for actual upcoming teaching, not all 17 at once.
- **YELLOW WB Narrative template needs testing.** Built, untested. Run one real lesson through it before relying on it.
- **Song template — verify which level it's built for.** Existing `Kiddoland_Worksheet_Song_TEMPLATE.html` exists; level coverage unknown. Captain to inspect and confirm.

## Stacked (ready when Captain gives the word)

- **Phase 19-K-1: Bundle templates inside LL.** Replace upload-from-disk with auto-load from `public/templates/`. ~1 VSC session. Blocked on Captain confirming which templates are stable enough to bundle (WHITE WB Narrative is; YELLOW needs testing first).
- **Defensive: lazy-init refactor of `src/lib/firebase-admin.ts`.** Low priority. Currently working with eager init. Brittle pattern — any future env-var hiccup fails every petshop route on import. ~30 min VSC task, do it the next time anything else in that file is touched.

## Decisions Made (don't relitigate)

- **Templates bundle in `public/templates/`, not Firebase Storage.** Reason: matches existing static-hosting pattern, version-controlled in Git, no new Firebase rules.
- **KHGT lives inside LL, not standalone HTML.** Q42 spec's standalone-first plan was bypassed. Built directly at `/t-portal/students/[id]/create-homework` (Q46 session). Standalone HTML phase no longer applicable.
- **AI source for `lessonData` JSON: BBC or VSC, not Qwen.** Qwen kept as emergency fallback only.

## Open Questions (need Captain answer next session)

- **Which 2–3 templates to build first?** Tied to actual teaching pipeline next 2–3 weeks. Don't try to build all 17.
- **Version-string discipline.** Roadmap was self-versioned by VSC as "Q4S (7.1)." Captain to decide whether to enforce strict hexdate-only versioning or allow VSC's incremental numbers.

## Lessons Recorded (Q4S)

- Project knowledge files describe intent, not current state. When Captain says X is built, update mental model immediately. Don't re-anchor to specs.
- VSC diagnostic narratives are hypotheses, not findings. Verify with logs/errors before accepting. (Q4S example: VSC blamed `firebase-admin.ts` rewrite for pet generation failure; real cause was missing `GEMINI_API_KEY` in Netlify, unrelated.)
- VSC will summarize and truncate roadmap updates unless explicitly told not to. Hardened prompts (with "do not summarize / consolidate / improve" + length floor + verification step) work. Always verify VSC's roadmap output before accepting.
- For structural questions about a large repo, use grep, not full reads. Saves tokens and avoids hallucinating from partial context.

## Resolved This Session

- ✅ Pet image generation on kiddoland.co — `GEMINI_API_KEY` added to Netlify, redeployed, working.
- ✅ Vercel mystery — VSC misspoke, no Vercel anywhere in repo, confirmed clean.
- ✅ KHGT state clarified — built, location confirmed, content types confirmed, template inventory built.
- ✅ Roadmap refreshed Q4Q → Q4S with hardened VSC prompt, verified, accepted.
