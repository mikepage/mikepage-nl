# Architecture — full-stack Hono on Cloudflare Workers

This repo is a working reference for building a full-stack site on a single
Cloudflare Worker with [Hono](https://hono.dev): server-rendered HTML, a content
pipeline, a JSON + MCP API, a Durable Object, bindings, and tests — no client
framework, no bundler beyond Wrangler. The folder layout is meant to be read as a
guide: each directory is one concern.

```
src/
  app/        the entry point + routing + the stylesheet
  ui/         our own UI components (no component library)
  content/    posts and skills authored as MDX
  posts/      the content registry built from content/*.mdx
  skills/     the skills registry built from content/skills/*.mdx
  features/   the "experiments" — self-contained tools, one file each
  agent/      what makes the site agent-friendly: the MCP server + discovery docs
  lib/        shared, domain-named helpers
  platform/   data for the /platform explainer
```

## The stack, folder by folder

**`app/` — routing & SSR.** `index.tsx` is the Worker's entry: it builds the Hono
app, defines every route, renders HTML with `hono/jsx`, does content negotiation
(HTML vs markdown), and splits `/mcp` traffic to the Durable Object. `styles.css`
is the Tailwind v4 input; `npm run build` compiles it next to the entry and the
Worker serves it as a text module (see `wrangler.jsonc` `rules`).

**`ui/` — components, no library.** `layout.tsx` (page shell, nav, footer, star
field), `ui.tsx` (`Lede`, `Meta`, `Card`, `Facts`, …), and `experiment-shell.tsx`.
Styling is utilities-in-markup; reuse is via these components, not `@apply`. See
the `tailwind-craft` skill for the philosophy.

**`content/` → `posts/` + `skills/` — the content pipeline.** Posts and skills are
authored as `.mdx` with frontmatter. `scripts/build-posts.mjs` compiles post
bodies to Hono-JSX modules and loads skills as raw `SKILL.md`, emitting typed
registries under `posts/generated/` and `skills/generated/` (git-ignored). Adding
a post = drop an `.mdx` file.

**`features/` — the engine pattern.** Each experiment (DNS lookup, SPF, RDAP, an
SMTP socket probe, …) is one file exporting an `Experiment`: a Hono router *and*
an `Engine` (`parse` + `run` + JSON Schema). The engine is the single source of
truth reused by the HTML page, the JSON API (`/experiments/<slug>/api`), and the
MCP server — so validation and logic are written once.

**`agent/` — agent-friendly surface.** `mcp.ts` is an authless MCP server
(`McpAgent` on a Durable Object) that registers one tool per engine. `catalog.ts`
generates `llms.txt`, OpenAPI, `robots.txt`, and the `.well-known` discovery cards
from the same registries, so docs can't drift from code.

**`lib/` — shared helpers**, named by domain noun (`doh.ts`, `domain.ts`,
`negotiate.ts`, `rate-limit.ts`), never `utils.ts`.

## Cloudflare platform pieces demonstrated

- **Workers + Hono** — the whole site is one Worker (`app/index.tsx`).
- **Durable Object** — the MCP transport session (`agent/mcp.ts`, `wrangler.jsonc`).
- **Rate-limit binding** — per-IP guard on `/api` and `/mcp` (`lib/rate-limit.ts`).
- **Raw TCP** — the SMTP probe via `cloudflare:sockets` (`features/smtp-submission-test.tsx`).
- **Custom domain, text-module assets, `nodejs_compat`** — `wrangler.jsonc`.

## Testing

`test/` runs in real workerd via `@cloudflare/vitest-plugin`, so bindings, the
Durable Object, and sockets work with no mocks. `npm test` builds content + CSS,
then runs unit tests (`lib/`) and integration tests (`SELF.fetch` over the routes).

## Commands

```sh
npm run dev      # build content + CSS, then wrangler dev
npm test         # build, then vitest (unit + integration)
npm run deploy    # build, then wrangler deploy
```
