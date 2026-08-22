import { Hono } from 'hono'
import { Layout } from './components/layout'
import { posts, findPost } from './posts'
import { tools } from './tools'
import { skills, findSkill, skillMd } from './skills'
import { components } from './platform'
import { llmsTxt, llmsFull, openApi, robotsTxt, apiCatalog, mcpCard, agentSkills, a2aCard, aiCatalog, protectedResource } from './lib/catalog'
import { negotiate } from './lib/negotiate'
import { allow, clientKey } from './lib/rate-limit'
import { ToolsMcp } from './mcp'
import css from './styles.generated.css'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Advertise machine-readable resources on every response (RFC 8288 Link header).
app.use('*', async (c, next) => {
  await next()
  const origin = new URL(c.req.url).origin
  c.res.headers.append('Link', `<${origin}/llms.txt>; rel="alternate"; type="text/plain"`)
  c.res.headers.append('Link', `<${origin}/openapi.json>; rel="service-desc"; type="application/json"`)
  c.res.headers.append('Link', `<${origin}/.well-known/api-catalog>; rel="api-catalog"`)
})

app.get('/styles.css', (c) =>
  c.text(css, 200, { 'Content-Type': 'text/css; charset=utf-8' })
)

// Agent-friendly discovery
app.get('/llms.txt', (c) => c.text(llmsTxt(new URL(c.req.url).origin)))
app.get('/llms-full.txt', (c) => c.text(llmsFull(new URL(c.req.url).origin)))
app.get('/openapi.json', (c) => c.json(openApi(new URL(c.req.url).origin)))
app.get('/robots.txt', (c) => c.text(robotsTxt(new URL(c.req.url).origin)))
app.get('/.well-known/api-catalog', (c) =>
  c.json(apiCatalog(new URL(c.req.url).origin), 200, { 'Content-Type': 'application/linkset+json' })
)
app.get('/.well-known/mcp.json', (c) => c.json(mcpCard(new URL(c.req.url).origin)))
app.get('/.well-known/agent-skills/index.json', (c) => c.json(agentSkills(new URL(c.req.url).origin)))
app.get('/.well-known/agent-card.json', (c) => c.json(a2aCard(new URL(c.req.url).origin)))
app.get('/.well-known/ai-catalog.json', (c) => c.json(aiCatalog(new URL(c.req.url).origin)))
app.get('/.well-known/oauth-protected-resource', (c) => c.json(protectedResource(new URL(c.req.url).origin)))
app.get('/.well-known/oauth-protected-resource/mcp', (c) => {
  const origin = new URL(c.req.url).origin
  return c.json(protectedResource(origin, `${origin}/mcp`))
})

const authMd = (c: { req: { url: string } }) => {
  const origin = new URL(c.req.url).origin
  return `# AUTH.md

This service exposes agentic tools that require **no authentication**. It follows the
[Auth.md](https://github.com/workos/auth.md) agentic registration flow using the
\`anonymous\` method — agents connect without an identity assertion, consent, or token exchange.

## Discovery

- MCP endpoint: ${origin}/mcp (Streamable HTTP)
- MCP server card: ${origin}/.well-known/mcp.json
- OpenAPI: ${origin}/openapi.json
- Protected Resource Metadata (PRM): ${origin}/.well-known/oauth-protected-resource (declares an authless resource — empty \`authorization_servers\`)
- Authorization Server metadata: none — there is no OAuth authorization server

## Registration methods

| Method | Supported | Notes |
| --- | --- | --- |
| \`anonymous\` | yes | No identity assertion needed. Default and only method. |
| \`identity_assertion\` (ID-JAG) | no | No user session or identity binding is used. |
| \`service_auth\` | no | No email-based claim ceremony. |

## Registration

No registration is required. There is no \`/agent/identity\` endpoint and no user consent
step — agent access is open and anonymous.

## Claim ceremony

Not applicable — the \`anonymous\` method skips the six-digit code claim ceremony.

## Token exchange

Not applicable. There is no \`/oauth2/token\` endpoint and no RFC 7523 JWT-bearer grant;
requests carry no \`access_token\`.

## API usage

Call the tools directly, with no \`Authorization\` header:

- MCP: connect an MCP client to ${origin}/mcp
- JSON: \`GET ${origin}/experiments/<tool>/api\`

Access is anonymous and rate-limited per IP.

## Revocation

Not applicable — no credentials or registrations exist to revoke.
`
}
app.get('/auth.md', (c) => c.text(authMd(c), 200, { 'Content-Type': 'text/markdown; charset=utf-8' }))
app.get('/AUTH.md', (c) => c.text(authMd(c), 200, { 'Content-Type': 'text/markdown; charset=utf-8' }))
app.get('/.well-known/auth.md', (c) => c.text(authMd(c), 200, { 'Content-Type': 'text/markdown; charset=utf-8' }))
app.get('/sitemap.xml', (c) => {
  const origin = new URL(c.req.url).origin
  const urls = ['/', '/platform', '/experiments', '/skills', ...posts.map((p) => `/posts/${p.slug}`), ...tools.map((t) => `/experiments/${t.slug}`)]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
  return c.text(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

app.get('/', (c) => {
  // Markdown content negotiation on the home page (agents that send Accept: text/markdown)
  if ((c.req.header('accept') ?? '').includes('text/markdown')) {
    return c.text(llmsTxt(new URL(c.req.url).origin), 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
  }
  return c.html(
    <Layout title="mikepage.nl — Building on the Cloudflare Developer Platform">
      <h1>Night-owl experiments on the edge</h1>
      <p class="lede">
        Learning the Cloudflare Developer Platform after dark — fun, hands-on examples for
        Workers, Durable Objects, D1, R2 and friends. Every post ships with working code, and the
        demos run live on this very Worker.
      </p>
      <ul class="posts">
        {posts.map((post) => (
          <li>
            <a href={`/posts/${post.slug}`}>{post.title}</a>
            <div class="meta">{post.date}</div>
            <p class="summary">{post.summary}</p>
          </li>
        ))}
      </ul>
    </Layout>
  )
})

app.get('/posts/:file', (c) => {
  const { id, format } = negotiate(c.req.param('file'), c.req.header('accept'))
  const post = findPost(id)
  if (!post) return c.notFound()
  if (format === 'markdown') return c.text(post.markdown, 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
  const related = skills.filter((s) => s.post === post.slug)
  return c.html(
    <Layout title={`${post.title} — mikepage.nl`}>
      <article>
        <h1>{post.title}</h1>
        <time datetime={post.date}>{post.date}</time>
        {related.length > 0 && (
          <aside class="notice">
            <strong>📦 Skill{related.length > 1 ? 's' : ''}</strong> — this post ships as{' '}
            {related.length > 1 ? 'installable Claude Code skills' : 'an installable Claude Code skill'}:{' '}
            {related.map((s, i) => (
              <>
                {i > 0 && ', '}
                <a href={`/skills#${s.id}`}>
                  <code>{s.id}</code>
                </a>
              </>
            ))}
            .
          </aside>
        )}
        <post.Body />
      </article>
    </Layout>
  )
})

app.get('/experiments', (c) =>
  c.html(
    <Layout title="Experiments — mikepage.nl">
      <h1>Experiments</h1>
      <p class="lede">
        Small network and email utilities, each one a live example of a Cloudflare Workers pattern — running on this very
        Worker.
      </p>
      <ul class="posts">
        {tools.map((tool) => (
          <li>
            <a href={`/experiments/${tool.slug}`}>{tool.title}</a>
            <div class="meta">⚡ {tool.pattern}</div>
            <p class="summary">{tool.summary}</p>
          </li>
        ))}
      </ul>
    </Layout>
  )
)

app.get('/platform', (c) =>
  c.html(
    <Layout title="Platform — mikepage.nl">
      <h1>The Cloudflare Developer Platform</h1>
      <p class="lede">The key building blocks, explained for whoever you are — pick your lens.</p>
      <div class="explain">
        <div class="pills">
          <input type="radio" name="aud" id="aud-eli5" checked />
          <label for="aud-eli5">Explain like I'm five</label>
          <input type="radio" name="aud" id="aud-laravel" />
          <label for="aud-laravel">I'm a Laravel developer</label>
          <input type="radio" name="aud" id="aud-symfony" />
          <label for="aud-symfony">I'm a Symfony developer</label>
        </div>
        {components.map((comp) => (
          <div class="component">
            <h2>{comp.name}</h2>
            <p class="tagline">{comp.tagline}</p>
            <div class="aud eli5">{comp.eli5}</div>
            <div class="aud laravel">{comp.laravel}</div>
            <div class="aud symfony">{comp.symfony}</div>
          </div>
        ))}
      </div>
    </Layout>
  )
)

app.get('/skills', (c) =>
  c.html(
    <Layout title="Skills — mikepage.nl">
      <h1>Skills</h1>
      <p class="lede mb-10">
        Installable Claude Code skills distilled from the posts. Each is a <code>SKILL.md</code> —
        drop it in <code>.claude/skills/&lt;name&gt;/SKILL.md</code> and your agent picks it up.
      </p>
      {[...skills]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((skill) => (
          <details class="skill" id={skill.id}>
            <summary>
              <span class="skill-name">{skill.id}</span>
            </summary>
            <p>{skill.description}</p>
            <p class="meta">
              From: <a href={`/posts/${skill.post}`}>{skill.postTitle}</a> · Raw:{' '}
              <a href={`/skills/${skill.id}`}>/skills/{skill.id}</a>{' '}
              <button type="button" class="copy" data-copy>
                Copy SKILL.md
              </button>
            </p>
            <pre>
              <code>{skillMd(skill)}</code>
            </pre>
          </details>
        ))}
      <script
        dangerouslySetInnerHTML={{
          __html: `function openHash(){var h=decodeURIComponent(location.hash.slice(1));if(!h)return;var d=document.getElementById(h);if(d&&d.tagName==='DETAILS'){d.open=true;d.scrollIntoView()}}openHash();addEventListener('hashchange',openHash);document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var c=b.closest('.skill').querySelector('pre code').innerText;navigator.clipboard.writeText(c).then(function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy SKILL.md'},1500)})})})`,
        }}
      />
    </Layout>
  )
)

app.get('/skills/:id', (c) => {
  const skill = findSkill(c.req.param('id').replace(/\.md$/, ''))
  if (!skill) return c.notFound()
  return c.text(skillMd(skill), 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
})

for (const tool of tools) {
  const engine = tool.engine
  if (engine) {
    // Generic JSON API for every tool with an engine — one source of truth with the HTML page.
    tool.router.get('/api', async (c) => {
      const env = c.env as CloudflareBindings
      if (!(await allow(env.API_RL, `api:${clientKey(c.req.raw)}`))) {
        return c.json({ error: 'rate limit exceeded' }, 429)
      }
      const parsed = engine.parse(c.req.query())
      if ('error' in parsed) return c.json({ error: parsed.error }, 400)
      try {
        return c.json(await engine.run(parsed.input))
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : String(e) }, 502)
      }
    })
  }
  app.route(`/experiments/${tool.slug}`, tool.router)
}

for (const post of posts) {
  if (post.demo) app.route(`/demos/${post.slug}`, post.demo)
}

app.notFound((c) =>
  c.html(
    <Layout title="Not found — mikepage.nl">
      <h1>404 — hoo?</h1>
      <p>
        🦉 The owl looked everywhere, but this page isn't perched anywhere.{' '}
        <a href="/">Fly back to the posts</a>.
      </p>
    </Layout>,
    404
  )
)

export { ToolsMcp }

const mcpHandler = ToolsMcp.serve('/mcp', { binding: 'MYMCP' })

export default {
  async fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    const url = new URL(request.url)
    // Canonical host: redirect www → apex (301), preserving path and query.
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      return Response.redirect(url.toString(), 301)
    }
    const { pathname } = url
    if (pathname === '/mcp' || pathname.startsWith('/mcp/')) {
      if (!(await allow(env.API_RL, `mcp:${clientKey(request)}`))) {
        return new Response('rate limit exceeded', { status: 429 })
      }
      return mcpHandler.fetch(request, env, ctx)
    }
    return app.fetch(request, env, ctx)
  },
}
