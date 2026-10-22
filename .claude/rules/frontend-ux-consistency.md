---
name: frontend-ux-consistency
description: Typography scale, radii, button variants and mobile overflow invariants for the LAMP TIK design system.
globs: ["app/**/*.tsx", "components/**/*.tsx", "app/globals.css"]
alwaysApply: true
---

# frontend-ux-consistency

Adapted from ECC's frontend rules, rewritten for this "obsidian glass" system.
The design language is already defined in `app/globals.css` and
`tailwind.config.ts`; the job is to spend it, not to extend it.

## Type scale — 7 steps, 12px floor

| token | size | use |
| --- | --- | --- |
| `text-xs` | 12px | captions, spec chips, ad disclosure, metadata |
| `text-sm` | 14px | body copy, buttons, form values |
| `text-base` | 16px | lead paragraphs, result titles |
| `text-lg` | 18px | card headings |
| `text-2xl` | 24px | section headings |
| `text-4xl` | 36px | page headings |
| `text-5xl` | 48px | hero headline (sm+) |

- Nothing renders below **12px**. `text-[10px]` / `text-[11px]` are banned; the
  `.micro` utility is `text-xs` for exactly this reason.
- No arbitrary sizes outside the table (`text-[13px]`, `text-[15px]`). If a
  layout needs a new step, the layout is wrong.
- Headlines use `tracking-headline` + `text-wrap: balance` (`.balance`);
  paragraphs use `.pretty`. Do not re-declare letter-spacing inline.

## Radii — 4 values only

`rounded-lg` (8) · `rounded-xl` (12) · `rounded-2xl` (16) · `rounded-full`.
The config aliases `rounded-panel` / `rounded-card` / `rounded-control` /
`rounded-pill` point into the same set. Never `rounded-[13px]`, never a fifth
value; nested cards may go one step smaller, never larger than the parent.

## Buttons — 3 variants

`.btn` sets size/shape; exactly three skins exist and every action must use one:

1. `.btn-primary` — the one gradient CTA per view (Download, Install App).
2. `.btn-secondary` — glass surface action (SD/MP3 inside a result card).
3. `.btn-ghost` — text/icon/tab actions (reset, New video, theme toggle).

Rules:
- Do not build a `<button>` from raw Tailwind for a new action; compose
  `btn btn-*`. Add `.tool-cta` only to the primary download CTA so it inherits
  the platform accent.
- Sizes: 52px for the tool's download rows, 44–48px for forms, 36px for header
  controls. `aria-label` on every icon-only button; disabled state must read as
  disabled (`.btn-*:disabled` handles it).
- One primary per card. Two gradient buttons side by side is a bug.

## 390px is the layout floor

Every change is checked at **390×844** (and 320px for the header strip):

- No horizontal scroll: `document.documentElement.scrollWidth <= window.innerWidth`.
- Grids start at one column and gain columns at `sm`/`lg`; nothing assumes
  ≥ 420px. Fixed widths above ~320px need `max-w-full`.
- Long strings (titles, URLs, usernames) get `min-w-0` + `truncate` or
  `break-words`; flex rows get `min-w-0` on the shrinking child.
- Touch targets ≥ 40px; sticky/fixed elements must never cover the primary CTA
  (see `monetization-integrity`).
- Ad slots are CLS-safe: they reserve their measured height and scale down
  instead of overflowing (`.AdSlot` in `components/ads/AdSlot.tsx`).

## Motion and colour

- Animate `transform` / `opacity` only; no animating height, filter or blur.
  Respect `prefers-reduced-motion` (framer-motion `useReducedMotion`).
- Colour comes from CSS variables (`var(--text-2)`, `var(--accent)`,
  `data-accent`), never a raw hex in a component — the only sanctioned raw
  values are brand chips (TikTok pink, YouTube red) already in
  `lib/platforms.ts` / `platform-icons.tsx`.
