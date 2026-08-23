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

// Form controls — real components carrying utilities, used by the experiments.
export const Form = ({ children, ...rest }: { children: Child; [k: string]: unknown }) => (
  <form {...rest} class="my-8 flex flex-wrap gap-3">
    {children}
  </form>
)

export const Input = (props: Record<string, unknown>) => (
  <input
    {...props}
    class="min-w-0 flex-[1_1_16rem] rounded-field border border-line bg-code px-[0.9rem] py-[0.6rem] text-ink [font:inherit] focus:outline-2 focus:outline-accent focus:outline-offset-1"
  />
)

export const Select = ({ children, ...rest }: { children: Child; [k: string]: unknown }) => (
  <select {...rest} class="rounded-field border border-line bg-code px-[0.9rem] py-[0.6rem] text-ink [font:inherit]">
    {children}
  </select>
)

export const Button = ({ children, ...rest }: { children: Child; [k: string]: unknown }) => (
  <button
    {...rest}
    class="cursor-pointer rounded-field border-0 bg-accent px-[1.4rem] py-[0.6rem] font-semibold text-[#14100a] hover:bg-glow"
  >
    {children}
  </button>
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
