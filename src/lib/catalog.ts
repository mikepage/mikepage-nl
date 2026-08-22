import { posts } from '../posts'
import { tools } from '../tools'

/** llms.txt — the map agents look for first. https://llmstxt.org */
export function llmsTxt(origin: string): string {
  const lines: string[] = [
    '# mikepage.nl',
    '',
    '> Night-owl experiments on the edge — learning the Cloudflare Developer Platform after dark, with fun examples that run live on the site\'s own Worker.',
    '',
    '## Posts',
  ]
  for (const post of posts) lines.push(`- [${post.title}](${origin}/posts/${post.slug}): ${post.summary}`)

  lines.push('', '## Tools')
  for (const tool of tools) {
    const api = tool.engine ? ` JSON API: ${origin}/tools/${tool.slug}/api` : ''
    const mcp = tool.engine ? ` MCP tool: \`${tool.engine.name}\`.` : ''
    lines.push(`- [${tool.title}](${origin}/tools/${tool.slug}): ${tool.summary}${api}${mcp}`)
  }

  lines.push(
    '',
    '## Machine access',
    `- MCP server (authless, Streamable HTTP): ${origin}/mcp`,
    `- OpenAPI for the JSON tools: ${origin}/openapi.json`,
    ''
  )
  return lines.join('\n')
}

/** llms-full.txt — the site map plus every post's full markdown, inline. */
export function llmsFull(origin: string): string {
  const parts = [llmsTxt(origin), '', '---', '']
  for (const post of posts) parts.push(post.markdown, '', '---', '')
  return parts.join('\n')
}

/** robots.txt with explicit AI-bot allowances and a Cloudflare content-signal. */
export function robotsTxt(origin: string): string {
  const aiBots = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Bytespider']
  const lines = [
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    'Allow: /',
    '',
    '# Read-only public tools — AI agents welcome to read and query.',
  ]
  for (const bot of aiBots) lines.push(`User-agent: ${bot}`, 'Allow: /', '')
  lines.push(`Sitemap: ${origin}/sitemap.xml`, '')
  return lines.join('\n')
}

/** RFC 9727 API catalog (application/linkset+json) pointing at the OpenAPI doc. */
export function apiCatalog(origin: string): object {
  return {
    linkset: [
      {
        anchor: origin,
        'service-desc': [{ href: `${origin}/openapi.json`, type: 'application/json' }],
        'service-doc': [{ href: `${origin}/llms.txt`, type: 'text/plain' }],
      },
    ],
  }
}

/** MCP server discovery card. */
export function mcpCard(origin: string): object {
  return {
    name: 'mikepage-tools',
    version: '1.0.0',
    description: 'Read-only edge tools for DNS, email authentication, and domain data.',
    endpoint: `${origin}/mcp`,
    transport: 'streamable-http',
    authentication: 'none',
    tools: tools
      .filter((t) => t.engine)
      .map((t) => ({ name: t.engine!.name, description: t.engine!.description })),
  }
}

/** Minimal OpenAPI 3.1 doc for the tools' JSON endpoints. */
export function openApi(origin: string): object {
  const paths: Record<string, unknown> = {}
  for (const tool of tools) {
    const engine = tool.engine
    if (!engine) continue
    const props = (engine.inputSchema.properties ?? {}) as Record<string, { type?: string; description?: string; enum?: unknown[] }>
    const required = new Set((engine.inputSchema.required as string[]) ?? [])
    paths[`/tools/${tool.slug}/api`] = {
      get: {
        operationId: engine.name,
        summary: tool.title,
        description: engine.description,
        parameters: Object.entries(props).map(([name, def]) => ({
          name,
          in: 'query',
          required: required.has(name),
          description: def.description,
          schema: { type: def.type ?? 'string', ...(def.enum ? { enum: def.enum } : {}) },
        })),
        responses: {
          '200': { description: 'Result', content: { 'application/json': {} } },
          '400': { description: 'Invalid input' },
          '502': { description: 'Upstream lookup failed' },
        },
      },
    }
  }
  return {
    openapi: '3.1.0',
    info: { title: 'mikepage.nl tools', version: '1.0.0', description: 'Read-only edge tools for DNS, email auth, and domain data.' },
    servers: [{ url: origin }],
    paths,
  }
}
