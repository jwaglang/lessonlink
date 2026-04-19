# LessonLink Session Handoff | Q4J (April 19, 2026)

---

## Session Overview

**Date:** April 19, 2026  
**Primary Focus:** Kiddoland landing page polish — routing, animations, contact form, login improvements, email fixes  
**Status:** ✅ **COMPLETE** — All features committed.

---

## What Was Accomplished

### 1. Routing Restructure

Kiddoland landing page moved from `/kiddoland` → `/` (root). Login/signup moved from `/` → `/login`. `/kiddoland` now redirects to `/`.

**Files:**
- `src/app/page.tsx` — now the Kiddoland landing page
- `src/app/login/page.tsx` — login/signup (moved from root)
- `src/app/kiddoland/page.tsx` — redirect to `/`

---

### 2. Hero Logo Bounce System

`damped-bounce` keyframe moved from inline `<style>` in `page.tsx` → `globals.css` (globally available). Removed inline style block from page.

**HeroLogo client component** (`src/components/hero-logo.tsx`):
- Always plays bounce on first page load
- Replays on **NavBrand click** (same-page custom event `kiddoland-bounce`)
- Replays on **navigate-back** from login (via `?bounce=1` URL param + `useSearchParams` + Suspense)
- After triggering, calls `router.replace('/')` to clean the param from URL
- Animation restart uses DOM reflow technique: `el.classList.remove → void el.offsetWidth → el.classList.add`

**NavBrand client component** (`src/components/nav-brand.tsx`):
- Clicking the star logo or "Kiddoland" title in nav → `window.scrollTo({ top: 0 })` + `dispatchEvent('kiddoland-bounce')`

**LLButton home button** (in expandLeft panel):
- Navigates to `/?bounce=1` to trigger hero bounce on arrival
- Panel order: **theme toggle → LL logo → flag**
- No bounce animation on the icon itself

---

### 3. Enter the Dragon — DragonDork

Replaced star logo (`/Logo Star Big.png`) in the "Enter the Dragon" heading with `DragonDork` client component (`src/components/dragon-dork.tsx`):
- Uses `/Dork2.png` at `w-12 h-12`
- `IntersectionObserver` (threshold: 0.5) triggers damped bounce every time the section scrolls into view — no cap, repeats on every scroll-in
- Same DOM reflow restart technique

**Note:** Star = the Kiddoland brand logo. Dork = the dragon character (Dork1.png, Dork2.png). These are separate assets — not the same.

---

### 4. Quote Carousel

Real iTalki parent reviews carousel (`src/components/quote-carousel.tsx`):
- 28 quotes from `src/lib/seed-reviews.ts` — all real, none fabricated
- Auto-rotates every 6 seconds
- Prev/next chevron buttons + dot navigation
- Chinese/Portuguese quotes show "🌐 Show translation" toggle
- Translation resets on quote change
- Pinned: Huiwei (Gordon's dad, 60 lessons), Daria (Ilya's mom, 200 lessons), Luciana Mendes

---

### 5. Contact Form (Resend)

`ContactFAB` — floating action button fixed bottom-right (`src/components/contact-modal.tsx`):
- Mail icon opens modal with name/email/message fields
- Previously used `mailto:` (unreliable, no email arrived)
- Now POSTs to `/api/email/send-contact/route.ts` using Resend via `sendEmail()` (same pattern as homework/feedback)
- `replyTo` set to sender's email so replies go directly back to them
- Shows "Sending…" state + error display on failure

---

### 6. Reset Password

Added to both Learner and Tutor login dialogs (`src/app/login/page.tsx`):
- `resetPassword()` added to `src/lib/auth.ts` using Firebase `sendPasswordResetEmail`
- `ForgotPassword` sub-component: **idle → form → sent** states
- "Forgot password?" link below Log In button
- Pre-fills email from whatever was typed in the email field
- On success: "Check your inbox ✉️" with the email address shown
- Cancel returns to idle; dialog close resets all state

---

### 7. Sidebar Auto-Collapse (Both Portals)

Both S-portal and T-portal now start open on login to signal the sidebar exists, then auto-collapse after **3 seconds**.

- `useState(true)` for `sidebarOpen`, `useEffect` sets timeout
- `SidebarProvider` controlled with `open={sidebarOpen} onOpenChange={setSidebarOpen}`
- `useEffect` placed **above all conditional returns** (Rules of Hooks compliance)

**Files:** `src/app/s-portal/layout.tsx`, `src/app/t-portal/layout.tsx`

---

### 8. Namecheap DNS — Email Forwarding Setup

Diagnosed why `kiddo@kiddoland.co` emails were not arriving:
- "Send mail as" in Gmail = outbound only. No MX record on root domain = no inbound.
- Added MX records in Namecheap Advanced DNS:
  - `@ → fwd1.pns.ch (priority 10)`
  - `@ → fwd2.pns.ch (priority 20)`
- Existing record `send.updates → feedback-smtp.eu-west-1.amazonses.com` kept (Resend outbound)
- **Waiting for DNS propagation** — once live, Captain adds email forwards in Namecheap Domain tab:
  - `kiddo` → `jwag.lang@gmail.com`
  - `hello` → `jwag.lang@gmail.com`
  - `notifications` → `jwag.lang@gmail.com`

---

### 9. Content Corrections

- Stats: **5,000+ students**, **50,000+ lessons**, **5.0 Average Rating**
- Credentials: TESOL Trinity (1998), BFA NYU (1997), Cambridge Speaking Examiner (2014–2020), Curriculum Developer & Content Creator
- Subtitle: "Fluency Specialist · Certified Teacher · Native English speaker" / "Lisbon, Portugal"
- All em dashes replaced with hyphens

---

## New Files Created

| File | Purpose |
|------|---------|
| `src/components/hero-logo.tsx` | HeroLogo client component with bounce mechanics |
| `src/components/dragon-dork.tsx` | DragonDork scroll-triggered bounce |
| `src/components/nav-brand.tsx` | Clickable nav logo + title with bounce trigger |
| `src/components/quote-carousel.tsx` | Real iTalki review carousel |
| `src/components/contact-modal.tsx` | ContactFAB + ContactForm |
| `src/app/api/email/send-contact/route.ts` | Resend contact form API route |
| `src/app/kiddoland/page.tsx` | Redirect → `/` |
| `src/app/login/page.tsx` | Login/signup page (moved from root) |

---

## Open Items

| Priority | Item | Owner |
|----------|------|-------|
| 🟡 High | **Namecheap email forwards** — once MX propagates, add `kiddo`/`hello`/`notifications` → `jwag.lang@gmail.com` | Captain |
| 🟡 High | **Client/student procurement** — Captain flagged as 1000% important; topic was lost to context compaction. Re-raise next session. | Next session |
| 🟡 High | **Phase 17C** — End-of-session scoreboard overlay | Build next session |
| 🟡 High | **Create courses for real learners** — Firebase Console → update `studentProgress.unitId` | Captain (manual) |
| 🟡 High | **Publisher proposal** — ELT curriculum (stacked by Captain) | Stacked |
| 🔵 Med | **Real photo of Jon** — for landing page About section | Captain |
| 🔵 Med | **Ocean/Farm/Desert/City themes** — one background per week (Ocean next) | One per session |
| ⬜ Low | **Language translation** — stacked until AI translation step done | Stacked |

---

## Architecture Notes (Updated Q4J)

```
/               → Kiddoland public landing page (was /kiddoland)
/login          → LessonLink login/signup (was /)
/kiddoland      → redirect to /
/s-portal       → Student portal
/t-portal       → Teacher portal
/admin          → Admin portal (jwag.lang@gmail.com only)
/t/[slug]       → Public teacher profiles
```

---

## Real Learner UIDs

| Name | UID |
|------|-----|
| Arina | `iaWH8v359kXT3qMTuIwT7OHpCRJ2` |
| Luke | `ylhpEoEIIHULLlzqS3re0K7lKSl1` |
| Gordon | `kF86mIJ3MNZPe7dosNbKfaS5YIt1` |
| Mark | `8wa5iV5RA9NsqpR4PD74TLxep952` |
| Max (test) | `1SLNgciKQlhKVzE9INPBROgBsEz2` |

---

**Session Closed:** April 19, 2026  
**Next Focus:** Re-raise client/student procurement topic → Phase 17C scoreboard → Namecheap email forwarding check → real photo of Jon
