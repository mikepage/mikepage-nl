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

## Tools

Alongside posts, the site hosts interactive tools (the utilities migrating from Deno Deploy). A tool is a self-contained module in `src/tools/<slug>.tsx` exporting `{ slug, title, summary, pattern, router }` — its own Hono router rendering a form page at `GET /` (results server-rendered from query params, so every result has a shareable URL) and optionally a JSON API under `/api`. The registry `src/tools/index.ts` lists them; the composition root mounts each at `/tools/<slug>`.

Shared plumbing lives in `src/lib/` (named by domain noun): `doh.ts` (DNS-over-HTTPS queries), `domain.ts` (input validation).

### Cloudflare patterns the tools demonstrate

Each tool is also an example of one platform pattern — that's the site's angle:

| Tool | Pattern |
|---|---|
| dns-lookup, dmarc-validator, spf-validator | **Stateless fetch-out**: query public APIs (Cloudflare DNS-over-HTTPS) from the edge, no state |
| dns-discovery | **Fetch-out fan-out**: ~50 concurrent DoH probes per request, gathered with Promise.all (dnsspy-style initial scan, discovery not monitoring) |
| rdap-lookup | **Fetch-out with redirects**: rdap.org bootstrap redirecting to the registry's RDAP server |
| ipv6-utils | **Pure compute at the edge**: BigInt math, zero I/O |
| browserinfo | **Request introspection**: the `request.cf` object Cloudflare attaches to every request (colo, geo, ASN, TLS) |
| smtp-submission-test | **Raw TCP from a Worker**: `cloudflare:sockets` `connect()` — port 25 is blocked, submission ports 587/465 work |
| dns-monitor (planned) | **Stateful scheduled Worker**: cron trigger + D1 for history + email on change |

## Migration backlog: Deno Deploy projects

Existing utilities on Deno Deploy to migrate to this Worker as posts with live demos (removed from the GitHub profile README on 2026-08-22):

Status: all migrated as of 2026-08-22 (dns-monitor became `dns-discovery` — the Deno version was a discovery scan, not a monitor).

- Email & DNS: https://dmarc-validator.mikepage.deno.net ✅ · https://dns-lookup.mikepage.deno.net ✅ · https://dns-monitor.mikepage.deno.net ✅ (→ dns-discovery) · https://smtp-submission-test.mikepage.deno.net ✅ · https://spf-validator.mikepage.deno.net ✅ · https://rdap-lookup.mikepage.deno.net ✅
- Network: https://ipv6-utils.mikepage.deno.net ✅
- Web utilities: https://browserinfo.mikepage.deno.net ✅

## Milestones

1. Layout + home + post rendering + footer (~1–2 hours)
2. First post: Cloudflare setup guide (~1 hour)
3. Deploy to mikepage.nl via Workers custom domain (~15 min)
