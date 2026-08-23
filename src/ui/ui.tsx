import type { Child } from 'hono/jsx'

// Small utility-carrying components — Tailwind's recommended way to reuse styles
// across files (utilities live in the markup, not in an @apply class).

export const Lede = ({ children }: { children: Child }) => (
  <p class="max-w-[38rem] text-[1.15rem] text-muted">{children}</p>
)

export const Meta = ({ children, class: cls = '' }: { children: Child; class?: string }) => (
  <div class={`mt-1.5 text-[0.85rem] text-muted ${cls}`}>{children}</div>
)

export const Summary = ({ children }: { children: Child }) => (
  <p class="mt-2.5 text-ink">{children}</p>
)

export const Pattern = ({ children }: { children: Child }) => (
  <p class="text-[0.9rem] text-glow">{children}</p>
)

export const Mono = ({ children }: { children: Child }) => (
  <span class="font-mono text-[0.85em]">{children}</span>
)

export const Card = ({ children, class: cls = 'p-6' }: { children: Child; class?: string }) => (
  <div class={`rounded-box border border-line bg-card ${cls}`}>{children}</div>
)

export const Facts = ({ rows }: { rows: [string, Child][] }) => (
  <dl class="my-7 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-box border border-line bg-card px-6 py-5">
    {rows.map(([label, value]) => (
      <>
        <dt class="text-muted">{label}</dt>
        <dd class="m-0 [overflow-wrap:anywhere]">{value}</dd>
      </>
    ))}
  </dl>
)
