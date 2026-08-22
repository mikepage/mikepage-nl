import type { Post } from './types'

export const rateLimitBinding: Post = {
  slug: 'rate-limit-binding',
  title: 'A tiny rate limiter with the Workers binding',
  date: '2026-08-22',
  summary:
    'The authless MCP server and JSON APIs needed a guardrail. Cloudflare’s rate-limiting binding is about six lines — config plus one call.',
  Body: () => (
    <>
      <p>
        Once the <a href="/tools">tools</a> were <a href="/posts/agent-friendly-mcp">authless over MCP</a>,
        anyone could call them — and <code>dns_discovery</code> fans out ~50 subrequests per call. That
        wants a guardrail. Cloudflare has a rate-limiting binding built in, and it’s about as small as
        it gets.
      </p>

      <h2>Configure it</h2>
      <p>
        Declare a namespace in <code>wrangler.jsonc</code>. <code>period</code> must be{' '}
        <strong>10 or 60</strong> seconds — those are the only two values the binding supports:
      </p>
      <pre>
        <code>{`// wrangler.jsonc
"ratelimits": [
  { "name": "API_RL", "namespace_id": "1001", "simple": { "limit": 120, "period": 60 } }
]`}</code>
      </pre>
      <p>
        Run <code>wrangler types</code> and the binding shows up as <code>API_RL: RateLimit</code> on
        your env.
      </p>

      <h2>Use it</h2>
      <p>
        One call. It returns <code>{'{ success }'}</code> — under budget or not — and you decide what
        429 looks like. Key it by whatever identifies the caller; here, the client IP:
      </p>
      <pre>
        <code>{`const key = request.headers.get('cf-connecting-ip') ?? 'local'
const { success } = await env.API_RL.limit({ key })
if (!success) return new Response('rate limit exceeded', { status: 429 })`}</code>
      </pre>
      <p>
        I dropped that in front of both the JSON <code>/api</code> routes and the <code>/mcp</code>{' '}
        endpoint, keyed <code>api:&lt;ip&gt;</code> and <code>mcp:&lt;ip&gt;</code> so the two budgets
        don’t interfere.
      </p>

      <h2>Two things worth knowing</h2>
      <ul class="checks">
        <li class="plain">
          <strong>No binding locally?</strong> The wrapper returns <code>true</code> so{' '}
          <code>wrangler dev</code> never rate-limits you — the counting is an edge concern.
        </li>
        <li class="plain">
          <strong>It’s best-effort, not a strict quota.</strong> Counting is fast and approximate
          across the edge, not a transactional ledger. Perfect for shrugging off abuse; not what you’d
          bill against.
        </li>
      </ul>
      <p>
        That’s the whole feature: a namespace and one <code>await</code>. The tools stay open and
        authless, and a runaway client just meets a 429.
      </p>
    </>
  ),
}
