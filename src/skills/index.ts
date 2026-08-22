export interface Skill {
  id: string
  title: string
  lang: string
  description: string
  code: string
}

// Copy-pasteable recipes — the real building blocks this site runs on.
export const skills: Skill[] = [
  {
    id: 'robots-ai',
    title: 'robots.txt with AI bots + Content-Signal',
    lang: 'txt',
    description: 'Explicitly welcome AI crawlers and declare a Cloudflare content signal.',
    code: `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /

User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /

Sitemap: https://example.com/sitemap.xml
Agentmap: https://example.com/.well-known/ai-catalog.json`,
  },
  {
    id: 'llms-txt',
    title: 'llms.txt route (Hono)',
    lang: 'ts',
    description: 'The map agents look for first — serve a markdown index of your site.',
    code: `app.get('/llms.txt', (c) => {
  const origin = new URL(c.req.url).origin
  return c.text(\`# \${SITE_NAME}

> \${SITE_TAGLINE}

## Pages
\${pages.map((p) => \`- [\${p.title}](\${origin}\${p.path}): \${p.summary}\`).join('\\n')}
\`)
})`,
  },
  {
    id: 'markdown-negotiation',
    title: 'Markdown content negotiation',
    lang: 'ts',
    description: 'Serve markdown when an agent sends Accept: text/markdown, HTML otherwise.',
    code: `app.get('/posts/:file', (c) => {
  const raw = c.req.param('file')
  const wantsMd =
    raw.endsWith('.md') || (c.req.header('accept') ?? '').includes('text/markdown')
  const post = findPost(raw.replace(/\\.md$/, ''))
  if (!post) return c.notFound()
  if (wantsMd)
    return c.text(post.markdown, 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
  return c.html(<PostPage post={post} />)
})`,
  },
  {
    id: 'link-headers',
    title: 'Link headers advertising machine resources',
    lang: 'ts',
    description: 'Point agents at llms.txt, OpenAPI and your catalog on every response.',
    code: `app.use('*', async (c, next) => {
  await next()
  const o = new URL(c.req.url).origin
  c.res.headers.append('Link', \`<\${o}/llms.txt>; rel="alternate"; type="text/plain"\`)
  c.res.headers.append('Link', \`<\${o}/openapi.json>; rel="service-desc"\`)
  c.res.headers.append('Link', \`<\${o}/.well-known/api-catalog>; rel="api-catalog"\`)
})`,
  },
  {
    id: 'mcp-server',
    title: 'Authless MCP server (McpAgent)',
    lang: 'ts',
    description: 'Expose read-only tools over MCP on a Cloudflare Worker — no auth.',
    code: `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'

export class ToolsMcp extends McpAgent {
  server = new McpServer({ name: 'my-tools', version: '1.0.0' })
  async init() {
    this.server.registerTool(
      'dns_lookup',
      { description: 'Look up a DNS record', inputSchema: { name: z.string() } },
      async ({ name }) => ({ content: [{ type: 'text', text: await lookup(name) }] })
    )
  }
}

// wrangler.jsonc: durable_objects binding + { "new_sqlite_classes": ["ToolsMcp"] }
const mcp = ToolsMcp.serve('/mcp', { binding: 'MYMCP' })`,
  },
  {
    id: 'rate-limit',
    title: 'Rate limiting binding',
    lang: 'ts',
    description: 'Guard authless endpoints per-IP with the Workers rate-limit binding.',
    code: `// wrangler.jsonc
// "ratelimits": [
//   { "name": "API_RL", "namespace_id": "1001", "simple": { "limit": 120, "period": 60 } }
// ]

const key = request.headers.get('cf-connecting-ip') ?? 'local'
const { success } = await env.API_RL.limit({ key })
if (!success) return new Response('rate limit exceeded', { status: 429 })`,
  },
  {
    id: 'mcp-card',
    title: 'MCP server discovery card',
    lang: 'ts',
    description: 'A /.well-known/mcp.json so agents can discover your MCP endpoint.',
    code: `app.get('/.well-known/mcp.json', (c) => {
  const origin = new URL(c.req.url).origin
  return c.json({
    name: 'my-tools',
    version: '1.0.0',
    endpoint: \`\${origin}/mcp\`,
    transport: 'streamable-http',
    authentication: 'none',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  })
})`,
  },
]
