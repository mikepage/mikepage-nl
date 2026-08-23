import { posts } from '../posts'
import { experiments } from '../features'

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

  lines.push('', '## Experiments')
  for (const x of experiments) {
    const api = x.engine ? ` JSON API: ${origin}/experiments/${x.slug}/api` : ''
    const mcp = x.engine ? ` MCP tool: \`${x.engine.name}\`.` : ''
    lines.push(`- [${x.title}](${origin}/experiments/${x.slug}): ${x.summary}${api}${mcp}`)
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

/** robots.txt with explicit AI-bot allowances, a Cloudflare content-signal, and an Agentmap. */
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
  lines.push(`Sitemap: ${origin}/sitemap.xml`, `Agentmap: ${origin}/.well-known/ai-catalog.json`, '')
  return lines.join('\n')
}

function engineExperiments(origin: string) {
  return experiments
    .filter((t) => t.engine)
    .map((t) => ({
      id: t.engine!.name,
      name: t.title,
      description: t.engine!.description,
      endpoint: `${origin}/experiments/${t.slug}/api`,
      inputSchema: t.engine!.inputSchema,
    }))
}

/** Agent Skills index (agent-skills v0.2.0). */
export function agentSkills(origin: string): object {
  return {
    version: '0.2.0',
    name: 'mikepage-tools',
    description: 'Read-only edge tools for DNS, email authentication, and domain data.',
    skills: engineExperiments(origin).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      endpoint: t.endpoint,
      method: 'GET',
      inputSchema: t.inputSchema,
    })),
  }
}

/** A2A Agent Card (/.well-known/agent-card.json). */
export function a2aCard(origin: string): object {
  return {
    protocolVersion: '0.2.0',
    name: 'mikepage-tools',
    description: 'Read-only edge tools for DNS, email authentication, and domain data.',
    url: `${origin}/mcp`,
    preferredTransport: 'streamable-http',
    supportedInterfaces: [{ url: `${origin}/mcp`, transport: 'streamable-http' }],
    version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: engineExperiments(origin).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      tags: ['dns', 'email', 'domains'],
    })),
  }
}

/** ARD / ai-catalog capability manifest (/.well-known/ai-catalog.json). */
export function aiCatalog(origin: string): object {
  return {
    specVersion: '1.0',
    version: '1.0',
    name: 'mikepage.nl',
    description: 'Night-owl experiments on the edge — Cloudflare developer tools.',
    entries: [
      { identifier: 'mcp', displayName: 'MCP server', type: 'mcp', url: `${origin}/mcp`, transport: 'streamable-http' },
      { identifier: 'openapi', displayName: 'OpenAPI', type: 'openapi', url: `${origin}/openapi.json` },
      { identifier: 'llms', displayName: 'llms.txt', type: 'llms', url: `${origin}/llms.txt` },
      { identifier: 'agent-card', displayName: 'A2A Agent Card', type: 'agent-card', url: `${origin}/.well-known/agent-card.json` },
      { identifier: 'agent-skills', displayName: 'Agent Skills', type: 'agent-skills', url: `${origin}/.well-known/agent-skills/index.json` },
      ...engineExperiments(origin).map(({ id, name, description, endpoint }) => ({
        identifier: id,
        displayName: name,
        type: 'tool',
        description,
        url: endpoint,
      })),
    ],
  }
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

/**
 * OAuth Protected Resource Metadata (RFC 9728). Declares an authless resource:
 * empty authorization_servers = no auth. Safe for the authless MCP because clients
 * only start an OAuth flow after a 401 + WWW-Authenticate, which /mcp never returns.
 */
export function protectedResource(origin: string, resource = origin): object {
  return {
    resource,
    authorization_servers: [],
    bearer_methods_supported: [],
    scopes_supported: [],
    resource_documentation: `${origin}/auth.md`,
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
    tools: experiments
      .filter((t) => t.engine)
      .map((t) => ({ name: t.engine!.name, description: t.engine!.description })),
  }
}

/** Minimal OpenAPI 3.1 doc for the tools' JSON endpoints. */
export function openApi(origin: string): object {
  const paths: Record<string, unknown> = {}
  for (const x of experiments) {
    const engine = x.engine
    if (!engine) continue
    const props = (engine.inputSchema.properties ?? {}) as Record<string, { type?: string; description?: string; enum?: unknown[] }>
    const required = new Set((engine.inputSchema.required as string[]) ?? [])
    paths[`/experiments/${x.slug}/api`] = {
      get: {
        operationId: engine.name,
        summary: x.title,
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
