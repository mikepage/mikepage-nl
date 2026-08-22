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
