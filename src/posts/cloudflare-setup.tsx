import type { Post } from './types'

export const cloudflareSetup: Post = {
  slug: 'cloudflare-setup',
  title: 'Setting up Claude Code for Cloudflare',
  date: '2026-08-22',
  summary:
    'Scaffold a Hono Worker and teach Claude Code the Cloudflare platform with the official skills plugin.',
  Body: () => (
    <>
      <p>
        This site runs as a single Cloudflare Worker, and it was built with an AI agent that
        actually knows the platform. Here is the whole setup, start to finish.
      </p>

      <h2>1. Scaffold a Hono Worker</h2>
      <p>
        <a href="https://hono.dev">Hono</a> is a tiny router with first-class Workers support and
        server-side JSX, so there is no client framework and no bundler config:
      </p>
      <pre>
        <code>{`npm create hono@latest my-site
# pick the "cloudflare-workers" template
cd my-site
npm install
npm run dev`}</code>
      </pre>

      <h2>2. Teach your agent the platform</h2>
      <p>
        Cloudflare publishes{' '}
        <a href="https://developers.cloudflare.com/agent-setup/">official agent setup</a> — a
        plugin that gives Claude Code skills for Workers, Durable Objects, D1, R2, Wrangler and
        more, plus MCP servers for docs and bindings:
      </p>
      <pre>
        <code>{`claude plugin marketplace add cloudflare/skills
claude plugin install cloudflare@cloudflare`}</code>
      </pre>
      <p>
        Then run <code>/reload-plugins</code> inside Claude Code. From that point on the agent
        pulls current Cloudflare docs instead of guessing from training data.
      </p>

      <h2>3. Ship it</h2>
      <pre>
        <code>{`npm run deploy`}</code>
      </pre>
      <p>
        That is the entire stack behind this page: one Worker, Hono, TypeScript, and Wrangler.
        Every post that follows adds a live example on top of it.
      </p>
    </>
  ),
}
