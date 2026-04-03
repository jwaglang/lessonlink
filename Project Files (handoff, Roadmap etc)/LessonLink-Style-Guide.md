# LessonLink | Design System & Style Guide

---

## 1. Brand Overview

**Personality:** Professional, approachable, modern, trustworthy  
**Tone:** Clean and focused — no playful or distracting elements  
**Audience:** Independent online teachers and their students

---

## 2. Color Palette

### Primary Colors

| Name | HSL | Hex | Tailwind Class | Usage |
|------|-----|-----|----------------|-------|
| **Primary Purple** | `291 64% 42%` | `#9C27B0` | `bg-primary` / `text-primary` | Buttons, links, active states |
| **Indigo** | `231 48% 48%` | `#3F51B5` | `from-[#3F51B5]` | Gradient start |
| **Purple** | `291 64% 42%` | `#9C27B0` | `to-[#9C27B0]` | Gradient end |

### Light Mode

| Token | HSL | Hex | Tailwind Class | Usage |
|-------|-----|-----|----------------|-------|
| **Background** | `290 60% 96%` | `#F8F4FA` | `bg-background` | Page background |
| **Foreground** | `224 71% 4%` | `#030712` | `text-foreground` | Primary text |
| **Card** | `0 0% 100%` | `#FFFFFF` | `bg-card` | Cards, panels |
| **Muted** | `290 50% 90%` | `#EDE4F0` | `bg-muted` | Subtle backgrounds |
| **Muted Foreground** | `224 20% 45%` | `#5C6370` | `text-muted-foreground` | Secondary text |
| **Border** | `0 0% 89.8%` | `#E5E5E5` | `border-border` | Borders, dividers |
| **Accent** | `291 50% 80%` | `#D9A3E0` | `bg-accent` | Highlights |
| **Secondary** | `290 50% 90%` | `#EDE4F0` | `bg-secondary` | Secondary buttons |

### Dark Mode

| Token | HSL | Hex | Tailwind Class | Usage |
|-------|-----|-----|----------------|-------|
| **Background** | `224 71% 4%` | `#030712` | `bg-background` | Page background |
| **Foreground** | `0 0% 98%` | `#FAFAFA` | `text-foreground` | Primary text |
| **Card** | `224 71% 6%` | `#0A1628` | `bg-card` | Cards, panels |
| **Muted** | `224 71% 10%` | `#142033` | `bg-muted` | Subtle backgrounds |
| **Muted Foreground** | `0 0% 63.9%` | `#A3A3A3` | `text-muted-foreground` | Secondary text |
| **Border** | `224 71% 10%` | `#142033` | `border-border` | Borders, dividers |
| **Accent** | `291 64% 42%` | `#9C27B0` | `bg-accent` | Highlights (purple stays vibrant) |
| **Primary** | `0 0% 98%` | `#FAFAFA` | `bg-primary` | Buttons flip to white |

### Chart Colors

| Token | HSL | Usage |
|-------|-----|-------|
| **Chart 1** | `291 64% 42%` | Primary data (purple) |
| **Chart 2** | `231 48% 48%` | Secondary data (indigo) |
| **Chart 3** | `291 50% 70%` | Tertiary (light purple) |
| **Chart 4** | `231 40% 68%` | Quaternary (light indigo) |
| **Chart 5** | `291 30% 80%` | Quinary (pale purple) |

### Semantic Colors

| Name | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| **Destructive** | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Errors, delete actions |
| **Success** | Use green-500 | Use green-400 | Success states |
| **Warning** | Use yellow-500 | Use yellow-400 | Warnings |
| **Info** | Use blue-500 | Use blue-400 | Informational |

---

## 3. Gradients

### Primary Gradient (Brand Signature)

The indigo-to-purple gradient is the signature LessonLink style, used for page titles.

**CSS Classes (defined in globals.css):**

```css
/* Background gradient */
.primary-gradient {
  @apply bg-gradient-to-r from-[#3F51B5] to-[#9C27B0];
}

/* Text gradient */
.primary-gradient-text {
  @apply bg-gradient-to-r from-[#3F51B5] to-[#9C27B0] bg-clip-text text-transparent;
}
```

**Usage:**

```jsx
{/* Page titles */}
<h1 className="font-headline text-4xl font-bold primary-gradient-text">
  Dashboard
</h1>

{/* Gradient buttons (rare, use sparingly) */}
<button className="primary-gradient text-white px-4 py-2 rounded-lg">
  Get Started
</button>
```

**When to use:**
- ✅ Main page titles (h1)
- ✅ Hero sections
- ✅ Special CTAs
- ❌ NOT for body text
- ❌ NOT for regular buttons (use solid `bg-primary`)
- ❌ NOT for links

---

## 4. Typography

### Font Families

| Role | Font | Tailwind Class | Fallback |
|------|------|----------------|----------|
| **Headlines** | Poppins | `font-headline` | sans-serif |
| **Body** | Work Sans | `font-body` | sans-serif |
| **Code** | System monospace | `font-code` | monospace |

### Font Loading

Fonts should be loaded via Google Fonts in `layout.tsx`:

```jsx
import { Poppins, Work_Sans } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-work-sans',
});
```

### Type Scale

| Element | Class | Size | Weight | Font |
|---------|-------|------|--------|------|
| **Page Title** | `text-4xl font-bold font-headline` | 2.25rem | 700 | Poppins |
| **Section Title** | `text-2xl font-semibold font-headline` | 1.5rem | 600 | Poppins |
| **Card Title** | `text-lg font-medium` | 1.125rem | 500 | Poppins |
| **Body** | `text-base` | 1rem | 400 | Work Sans |
| **Small/Caption** | `text-sm text-muted-foreground` | 0.875rem | 400 | Work Sans |
| **Tiny** | `text-xs text-muted-foreground` | 0.75rem | 400 | Work Sans |

### Typography Examples

```jsx
{/* Page title with gradient */}
<h1 className="text-4xl font-headline font-bold primary-gradient-text">
  Dashboard
</h1>

{/* Section title */}
<h2 className="text-2xl font-headline font-semibold">
  Revenue Overview
</h2>

{/* Card title */}
<h3 className="text-lg font-medium">
  Upcoming Lessons
</h3>

{/* Body text */}
<p className="text-base">
  Your next 5 scheduled lessons.
</p>

{/* Muted helper text */}
<p className="text-sm text-muted-foreground">
  +20.1% from last month
</p>
```

---

## 5. Spacing & Layout

### Border Radius

| Size | Value | Tailwind Class |
|------|-------|----------------|
| **Large** | 0.75rem (12px) | `rounded-lg` |
| **Medium** | 0.5rem (8px) | `rounded-md` |
| **Small** | 0.25rem (4px) | `rounded-sm` |
| **Full** | 9999px | `rounded-full` |

### Standard Spacing

Use Tailwind's default spacing scale. Common patterns:

| Context | Spacing |
|---------|---------|
| Page padding | `p-4 md:p-8` |
| Card padding | `p-6` |
| Section gap | `gap-6` |
| Item gap | `gap-4` |
| Tight gap | `gap-2` |

### Container

```jsx
<main className="container mx-auto px-4 py-8">
  {/* Page content */}
</main>
```

---

## 6. Component Styles

### Buttons

**Primary Button:**
```jsx
<Button>Primary Action</Button>
// Renders: bg-primary text-primary-foreground
```

**Secondary Button:**
```jsx
<Button variant="secondary">Secondary</Button>
// Renders: bg-secondary text-secondary-foreground
```

**Outline Button:**
```jsx
<Button variant="outline">Outline</Button>
// Renders: border border-input bg-background
```

**Ghost Button:**
```jsx
<Button variant="ghost">Ghost</Button>
// Renders: hover:bg-accent hover:text-accent-foreground
```

**Destructive Button:**
```jsx
<Button variant="destructive">Delete</Button>
// Renders: bg-destructive text-destructive-foreground
```

### Cards

```jsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

Cards use:
- `bg-card` background
- `rounded-lg` border radius
- `border` for subtle edge
- `shadow-sm` optional for elevation

### Badges

```jsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Inputs

```jsx
<Input placeholder="Enter text..." />
<Textarea placeholder="Enter longer text..." rows={4} />
```

Inputs use:
- `bg-input` (white in light, dark in dark mode)
- `border-border`
- `rounded-md`
- `focus:ring-ring` for focus state

### Sidebar

The sidebar uses dedicated tokens:

| Token | Purpose |
|-------|---------|
| `--sidebar-background` | Sidebar bg |
| `--sidebar-foreground` | Sidebar text |
| `--sidebar-primary` | Active item bg |
| `--sidebar-accent` | Hover state |
| `--sidebar-border` | Dividers |

---

## 7. Icons

**Library:** Lucide React

**Standard sizes:**
| Context | Size | Class |
|---------|------|-------|
| Inline with text | 16px | `h-4 w-4` |
| Buttons | 16px | `h-4 w-4 mr-2` |
| Card headers | 16px | `h-4 w-4` |
| Feature icons | 24px | `h-6 w-6` |
| Large display | 32px+ | `h-8 w-8` |

**Example:**
```jsx
import { Calendar, Users, Star } from 'lucide-react';

<Calendar className="h-4 w-4 text-muted-foreground" />
```

---

## 8. Dark Mode

Dark mode is implemented via the `class` strategy.

**Toggle:** A theme toggle button switches the `.dark` class on `<html>`.

**Key differences in dark mode:**
- Background flips from light lavender to deep blue-black
- Cards become slightly lighter than background
- Primary buttons flip to white text on dark
- Accent purple remains vibrant
- Borders become subtle dark blue

**Implementation:**
```jsx
// In a theme provider or toggle
document.documentElement.classList.toggle('dark');
```

**Testing:** Always verify both modes when creating new components.

---

## 9. Accessibility

### Color Contrast

- All text meets WCAG AA contrast ratios
- Muted text (`text-muted-foreground`) is still readable
- Interactive elements have visible focus states

### Focus States

```css
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

### Motion

Animations use `tailwindcss-animate` with reasonable durations:
- Accordion: 0.2s ease-out
- Transitions: 150ms default

Users with `prefers-reduced-motion` should see reduced/no animation.

---

## 10. Do's and Don'ts

### ✅ Do

- Use `primary-gradient-text` for page titles only
- Keep UI clean and professional
- Use consistent spacing (multiples of 4px)
- Test both light and dark modes
- Use semantic color tokens (`bg-primary`, not `bg-purple-600`)
- Use shadcn/ui components for consistency

### ❌ Don't

- Don't use gradient for body text or small elements
- Don't add playful illustrations or emojis in UI (profile content is okay)
- Don't use colors outside the defined palette
- Don't override shadcn/ui styles unless necessary
- Don't use inline styles
- Don't hardcode hex colors (use CSS variables)

---

## 11. Quick Reference

### CSS Variables (copy-paste)

```css
/* Light Mode Primary Values */
--primary: 291 64% 42%;        /* #9C27B0 - Purple */
--background: 290 60% 96%;     /* #F8F4FA - Light lavender */
--foreground: 224 71% 4%;      /* #030712 - Near black */

/* Gradient */
--gradient-start: #3F51B5;     /* Indigo */
--gradient-end: #9C27B0;       /* Purple */
```

### Tailwind Classes (most used)

```jsx
// Page title
className="text-4xl font-headline font-bold primary-gradient-text"

// Section title  
className="text-2xl font-headline font-semibold"

// Card
className="bg-card rounded-lg border p-6"

// Muted text
className="text-sm text-muted-foreground"

// Primary button (via shadcn)
<Button>Click me</Button>

// Icon in button
<Button><Plus className="h-4 w-4 mr-2" />Add</Button>
```

---

## 12. File References

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Theme extension, fonts, colors |
| `src/app/globals.css` | CSS variables, gradient classes |
| `src/components/ui/*` | shadcn/ui components |

---

**Last Updated:** January 2026
