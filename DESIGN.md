# mikepage.nl — Technical Design

## Purpose

A personal site that is **not about me** — it's about **building for the Cloudflare Developer Platform**, with fun, runnable examples. Every article ships with working code, and where possible the example runs live inside the site itself (it's already a Worker).

Basic author info lives only in the footer: name + GitHub link.

## Stack

Keep what's already here — no framework on top:

- **Cloudflare Workers** — hosting and live examples, one Worker (`mikepage-nl`)
- **Hono** — routing + `hono/jsx` for server-side rendered HTML (no client framework, no build step beyond wrangler)
- **TypeScript**, deployed with **Wrangler**
- CSS: a single small stylesheet served from the Worker (or inlined). No Tailwind, no bundler config.

## Content model

Posts are TypeScript modules, not a CMS. Each post is a file in `src/posts/` exporting metadata and a JSX body:

```ts
// src/posts/cloudflare-setup.tsx
export const meta = {
  slug: 'cloudflare-setup',
  title: 'Setting up Claude Code for Cloudflare',
  date: '2026-08-22',
  summary: 'Install the Cloudflare skills plugin and deploy your first Worker.',
}
export const Body = () => <article>…</article>
```

A `src/posts/index.ts` registry exports the ordered list. Adding a post = add file + register it. This keeps everything type-checked and deployable with plain `wrangler deploy`.

When a post has a live demo, it registers its own Hono sub-router under `/demos/<slug>/*`.

## Routes

| Route | Purpose |
|---|---|
| `GET /` | Home: short intro line + list of posts (title, date, summary) |
| `GET /posts/:slug` | Rendered post |
| `GET /demos/:slug/*` | Live example endpoints owned by a post |
| `GET /styles.css` | Stylesheet |
| fallback | 404 page |

## Layout

One shared `Layout` component (`src/components/layout.tsx`):

- **Header**: site name, one-line tagline ("Building on the Cloudflare Developer Platform"), nav back to home.
- **Main**: page content.
- **Footer** (the only about-me surface): "Built by Mike Page — [GitHub](https://github.com/mikepage)" plus a link to this repo's source.

## First post: Cloudflare setup guide

`cloudflare-setup` — how this site's development environment was set up:

1. Scaffold a Hono Worker (`npm create hono@latest` → cloudflare-workers template)
2. Install the Cloudflare agent tooling: `claude plugin marketplace add cloudflare/skills` and `claude plugin install cloudflare@cloudflare` (from https://developers.cloudflare.com/agent-setup/)
3. `npm run dev` locally, `npm run deploy` to ship

## Non-goals (for now)

- No client-side JS framework, no dark/light toggle beyond `prefers-color-scheme`
- No database, KV, analytics, or comments — add a binding only when a post's demo needs it
- No RSS/sitemap yet (easy to add later as Hono routes)

## Migration backlog: Deno Deploy projects

Existing utilities on Deno Deploy to migrate to this Worker as posts with live demos (removed from the GitHub profile README on 2026-08-22):

- Email & DNS: https://dmarc-validator.mikepage.deno.net · https://dns-lookup.mikepage.deno.net · https://dns-monitor.mikepage.deno.net · https://smtp-submission-test.mikepage.deno.net · https://spf-validator.mikepage.deno.net · https://rdap-lookup.mikepage.deno.net
- Network: https://ipv6-utils.mikepage.deno.net
- Web utilities: https://browserinfo.mikepage.deno.net

## Milestones

1. Layout + home + post rendering + footer (~1–2 hours)
2. First post: Cloudflare setup guide (~1 hour)
3. Deploy to mikepage.nl via Workers custom domain (~15 min)
