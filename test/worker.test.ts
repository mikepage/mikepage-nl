import { SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'

const H = 'https://mikepage.nl'

describe('pages', () => {
  it('serves the home page', async () => {
    const res = await SELF.fetch(`${H}/`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Night-owl experiments on the edge')
  })

  it('negotiates markdown on the home page', async () => {
    const res = await SELF.fetch(`${H}/`, { headers: { accept: 'text/markdown' } })
    expect(res.headers.get('content-type')).toContain('text/markdown')
  })

  it('serves experiments and skills indexes', async () => {
    expect((await SELF.fetch(`${H}/experiments`)).status).toBe(200)
    expect((await SELF.fetch(`${H}/skills`)).status).toBe(200)
  })

  it('serves the platform explainer with audience pills', async () => {
    const res = await SELF.fetch(`${H}/platform`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('aud-laravel')
    expect(body).toContain('aud-symfony')
    expect(body).toContain('Durable Objects')
  })

  it('404s unknown routes', async () => {
    expect((await SELF.fetch(`${H}/nope`)).status).toBe(404)
  })
})

describe('posts', () => {
  it('renders a post with its skill notice', async () => {
    const res = await SELF.fetch(`${H}/posts/rate-limit-binding`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="notice"')
    expect(body).toContain('cloudflare-workers-rate-limit')
  })

  it('serves a post as markdown via .md and via Accept', async () => {
    const suffix = await SELF.fetch(`${H}/posts/agent-friendly-mcp.md`)
    expect(suffix.headers.get('content-type')).toContain('text/markdown')
    const accept = await SELF.fetch(`${H}/posts/agent-friendly-mcp`, { headers: { accept: 'text/markdown' } })
    expect(accept.headers.get('content-type')).toContain('text/markdown')
  })
})

describe('skills', () => {
  it('serves an installable SKILL.md', async () => {
    const res = await SELF.fetch(`${H}/skills/cloudflare-hono-worker`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    const body = await res.text()
    expect(body.startsWith('---')).toBe(true)
    expect(body).toContain('name: cloudflare-hono-worker')
  })
})

describe('tool JSON API', () => {
  it('rejects invalid input with 400', async () => {
    const res = await SELF.fetch(`${H}/experiments/dns-lookup/api?name=notadomain`)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.any(String) })
  })
})

describe('agent-readiness surface', () => {
  it('serves llms.txt with the MCP endpoint', async () => {
    const body = await (await SELF.fetch(`${H}/llms.txt`)).text()
    expect(body).toContain('/mcp')
  })
  it('robots.txt has a content signal', async () => {
    const body = await (await SELF.fetch(`${H}/robots.txt`)).text()
    expect(body).toContain('Content-Signal')
  })
  it('serves the MCP discovery card', async () => {
    const res = await SELF.fetch(`${H}/.well-known/mcp.json`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ endpoint: expect.stringContaining('/mcp') })
  })
  it('advertises resources via Link headers', async () => {
    const link = (await SELF.fetch(`${H}/`)).headers.get('link') ?? ''
    expect(link).toContain('llms.txt')
    expect(link).toContain('service-desc')
  })
})

describe('canonical host', () => {
  it('redirects www to the apex domain', async () => {
    const res = await SELF.fetch('https://www.mikepage.nl/experiments', { redirect: 'manual' })
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://mikepage.nl/experiments')
  })
})
