import { Hono } from 'hono'
import { Layout } from './components/layout'
import { posts, findPost } from './posts'
import { tools } from './tools'
import { llmsTxt, openApi } from './lib/catalog'
import { ToolsMcp } from './mcp'
import css from './styles.generated.css'

const app = new Hono()

app.get('/styles.css', (c) =>
  c.text(css, 200, { 'Content-Type': 'text/css; charset=utf-8' })
)

// Agent-friendly discovery
app.get('/llms.txt', (c) => c.text(llmsTxt(new URL(c.req.url).origin)))
app.get('/openapi.json', (c) => c.json(openApi(new URL(c.req.url).origin)))
app.get('/robots.txt', (c) =>
  c.text(`User-agent: *\nAllow: /\nSitemap: ${new URL(c.req.url).origin}/sitemap.xml\n`)
)
app.get('/sitemap.xml', (c) => {
  const origin = new URL(c.req.url).origin
  const urls = ['/', '/tools', ...posts.map((p) => `/posts/${p.slug}`), ...tools.map((t) => `/tools/${t.slug}`)]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
  return c.text(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

app.get('/', (c) =>
  c.html(
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
)

app.get('/posts/:slug', (c) => {
  const post = findPost(c.req.param('slug'))
  if (!post) return c.notFound()
  return c.html(
    <Layout title={`${post.title} — mikepage.nl`}>
      <article>
        <h1>{post.title}</h1>
        <time datetime={post.date}>{post.date}</time>
        <post.Body />
      </article>
    </Layout>
  )
})

app.get('/tools', (c) =>
  c.html(
    <Layout title="Tools — mikepage.nl">
      <h1>Tools</h1>
      <p class="lede">
        Small network and email utilities, each one a live example of a Cloudflare Workers pattern — running on this very
        Worker.
      </p>
      <ul class="posts">
        {tools.map((tool) => (
          <li>
            <a href={`/tools/${tool.slug}`}>{tool.title}</a>
            <div class="meta">⚡ {tool.pattern}</div>
            <p class="summary">{tool.summary}</p>
          </li>
        ))}
      </ul>
    </Layout>
  )
)

for (const tool of tools) {
  const engine = tool.engine
  if (engine) {
    // Generic JSON API for every tool with an engine — one source of truth with the HTML page.
    tool.router.get('/api', async (c) => {
      const parsed = engine.parse(c.req.query())
      if ('error' in parsed) return c.json({ error: parsed.error }, 400)
      try {
        return c.json(await engine.run(parsed.input))
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : String(e) }, 502)
      }
    })
  }
  app.route(`/tools/${tool.slug}`, tool.router)
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
  fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url)
    if (pathname === '/mcp' || pathname.startsWith('/mcp/')) {
      return mcpHandler.fetch(request, env, ctx)
    }
    return app.fetch(request, env, ctx)
  },
}
