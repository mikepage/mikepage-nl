---
name: tailwind-craft
description: >-
  Make a web UI look genuinely good with plain Tailwind CSS v4 and NO component
  library — no daisyUI, shadcn/ui, Nuxt UI, Flowbite, Material, or Bootstrap.
  Use this whenever you are styling or building UI with Tailwind and want a
  distinctive, hand-crafted look rather than a templated one: landing pages,
  marketing sites, blogs, dashboards, docs, portfolios, app chrome, nav bars,
  cards, forms, buttons, tabs, modals, empty states. Trigger on "make this look
  better/nicer/more polished", "design a UI/page/component", "style this",
  "it looks generic/plain/AI-generated", "Tailwind theme/design system", or any
  frontend UI work where the goal is a bespoke aesthetic without pulling in a UI
  kit. Prefer this over reaching for a component library when the look should be
  the project's own.
---

# Tailwind Craft — great UI without a component library

A component library (daisyUI, shadcn/ui, Nuxt UI, Bootstrap) buys speed and
consistency at the cost of identity: every site built with one is recognizable
as "a daisyUI site." When the look is supposed to be *the project's own* — a
brand, a personal site, a product with a point of view — you get further with a
small, deliberate design system built from Tailwind utilities. This skill is how
to do that so the result looks designed, not defaulted.

The whole trick: **constraint plus consistency**. A few tokens, applied
everywhere the same way, read as intentional. Ten fonts, five accent colors, and
random spacing read as an accident. Almost everything below is a way to remove
choices so the ones that remain line up.

## Start from tokens, not from screens

Before styling anything, define the vocabulary once in Tailwind v4's `@theme`.
Everything downstream references these, so a change in one place re-tunes the
whole site and nothing drifts.

```css
@import "tailwindcss";

@theme {
  /* Neutrals do the heavy lifting; name them by role, not by shade. */
  --color-bg:      #0b0d12;   /* page */
  --color-surface: #12151c;   /* cards, raised areas */
  --color-line:    #232833;   /* hairline borders */
  --color-ink:     #e8ecf3;   /* primary text */
  --color-muted:   #9aa4b2;   /* secondary text */
  --color-accent:  #f6821f;   /* ONE accent, used sparingly */
  --color-accent-soft: #ffb066;

  /* Two families max: one for display, one for text. Or just one, well-set. */
  --font-display: "Fraunces", Georgia, serif;
  --font-body:    "Inter", system-ui, sans-serif;
}
```

Why role-names (`--color-line`) over shade-names (`--color-gray-800`): they make
intent legible and let you retheme without renaming. Why *one* accent: an accent
only reads as emphasis if it's rare — the moment two colors compete, neither
leads the eye. Everything that isn't the single most important action on a
screen should be a neutral.

## The design decisions that actually matter

These are the levers that move "generic" to "designed," roughly in order of
impact.

1. **Restraint in color.** Let neutrals carry 95% of the page. Use the accent
   for the single most important thing in a view and almost nothing else. If
   everything is highlighted, nothing is.

2. **Type with a clear hierarchy and a real measure.** Pick a modest scale
   (e.g. 0.85 / 1 / 1.25 / 1.6 / 2.6rem) and stick to it. Give running text a
   comfortable line-height (~1.6–1.8) and cap prose width at ~60–70 characters
   (`max-w-[68ch]` or ~44rem) — long lines are the number-one thing that makes
   text feel unread-able and amateurish. A display face for headings paired with
   a clean body face is the cheapest way to look distinctive.

3. **Spacing rhythm.** Reuse a small set of spacing steps and prefer generous
   whitespace over cramming. Consistent vertical rhythm between sections does
   more for "polish" than any single element's styling.

4. **Depth from layers and hairlines, not heavy shadows.** Separate planes with
   a subtle background shift (`bg-surface` on `bg-bg`) plus a 1px border in
   `--color-line`. Reserve shadows for things that genuinely float (menus,
   popovers), and keep them soft. Big drop-shadows on everything is a classic
   tell of un-designed UI.

5. **One border radius, one border width.** Decide (e.g. `rounded-xl`, `1px`)
   and apply it everywhere. Mixed radii read as sloppy.

6. **Focus and motion as first-class polish.** Visible `focus-visible` rings and
   small, purposeful transitions signal care. Loud animation signals the
   opposite.

## Where each rule lives (Tailwind v4)

Keep the layers straight and you avoid specificity fights:

- **`@theme`** — the tokens above. Generates `bg-surface`, `text-ink`,
  `border-line`, `font-display`, etc.
- **`@layer base`** — element defaults for content you don't control per-element:
  prose (`h1`–`h3`, `p`, `a`, `pre`, `code`, `table`) and form controls
  (`input`, `select`, `button`). This is why a rendered Markdown post looks right
  without classes on every tag.
- **`@layer components`** — a *small* set of `@apply`-composed classes for
  patterns you repeat and can't cleanly express inline (a `.btn`, a `.card`, a
  check-list with `::before` markers). Composing from utilities keeps them in the
  system.
- **Utilities in the markup** — everything else, especially one-off layout.

Rule of thumb: reach for a component class only on the third repetition, or when
the pattern needs a pseudo-element/`::before` that utilities can't do. Two
usages? Keep it inline.

## Components without a library

You do not need JS or a kit for most "interactive" components — the platform and
CSS state selectors cover a surprising amount, and native elements come with
accessibility for free.

**Button** (`@layer components`) — composed from utilities so it stays on-system:

```css
.btn {
  @apply inline-flex items-center gap-2 rounded-xl border border-line
         bg-surface px-4 py-2 font-medium text-ink transition-colors;
}
.btn:hover { @apply border-transparent bg-accent text-[#14100a]; }
.btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
```

**Card** — a plane, not a shadow box:

```css
.card { @apply rounded-2xl border border-line bg-surface p-6; }
```

**Tabs / segmented control without JS** — radios + labels + `:has()`:

```html
<div class="tabs">
  <input type="radio" name="t" id="t-a" checked /><label for="t-a">Overview</label>
  <input type="radio" name="t" id="t-b" /><label for="t-b">Details</label>
  <div class="panel a">…</div>
  <div class="panel b">…</div>
</div>
```
```css
.tabs input { @apply sr-only; }              /* hide the radio, keep it focusable */
.tabs label { @apply cursor-pointer rounded-full border border-line px-4 py-1.5 text-muted; }
.tabs input:checked + label { @apply bg-accent text-[#14100a]; }
.tabs input:focus-visible + label { outline: 2px solid var(--color-accent); }
.panel { display: none; }
.tabs:has(#t-a:checked) .a,
.tabs:has(#t-b:checked) .b { display: block; }
```

**Accordion / disclosure** — native `<details>`:

```html
<details class="card"><summary class="cursor-pointer">Title</summary>…</details>
```

**Modal** — native `<dialog>` with `showModal()`; style the `::backdrop`.
**Dropdown** — a `<details>` or a `popover` attribute before you reach for JS.

Only write JavaScript when there is genuinely no declarative path (e.g. a nav bar
that hides on scroll-down needs to read scroll position). Keep it a few lines,
unobtrusive, and layered on top — the UI must still render and be usable without
it.

## Accessibility is part of "looks good"

- Style `:focus-visible`, never remove focus outlines without replacing them.
- Meet contrast (WCAG AA: 4.5:1 body, 3:1 large text) — a `*-content`/`ink` token
  per surface keeps you honest. A pretty color no one can read is a bug.
- Use the semantic element (`button`, `a`, `nav`, `main`, `dialog`, `details`)
  so keyboard and screen-reader behavior come for free.
- Wrap motion in `@media (prefers-reduced-motion: reduce)`.

## Theme-aware in one place

If you support light and dark, define the palette once and swap only the tokens,
so no component needs `dark:` variants scattered through it:

```css
:root { --color-bg: #fbfbfa; --color-ink: #1b1f24; /* …light… */ }
@media (prefers-color-scheme: dark) {
  :root { --color-bg: #0b0d12; --color-ink: #e8ecf3; /* …dark… */ }
}
```

Components reference `bg-bg`/`text-ink` and simply follow.

## Anti-patterns (the tells of un-designed UI)

- Reaching for a component library when the look should be bespoke — it flattens
  identity and adds weight and base styles you'll fight.
- More than one accent color, or the accent used everywhere.
- Heavy or multiple drop-shadows; glon-everything gradients; pure-black `#000`
  text on pure-white (use near-black/near-white).
- Inconsistent radii, border widths, and ad-hoc spacing values.
- Full-width running text with no measure.
- Inline `style=""` and one-off hex colors instead of tokens.
- JavaScript for things CSS does declaratively (`:has()`, `:target`, `peer`,
  `group`, `[open]`, `<details>`, `<dialog>`).
- `!important` and deep selector nesting to win specificity — usually a sign a
  token or layer is in the wrong place.

## A quick working method

1. Set `@theme` tokens (neutrals + one accent + fonts).
2. Style base prose + form elements in `@layer base`.
3. Build screens with utilities; lift a pattern into `@layer components` only on
   its third use or when it needs a pseudo-element.
4. Pass over for the levers above: one accent, real measure, spacing rhythm,
   hairline depth, one radius, focus rings.
5. Check contrast and `prefers-reduced-motion`. Ship.

The measure of success: it looks like *someone decided* how it should look — and
you could not swap it for another site without noticing.
