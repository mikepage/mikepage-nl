import type { Hono } from 'hono'

export interface Tool {
  slug: string
  title: string
  summary: string
  /** The Cloudflare platform pattern this tool demonstrates. */
  pattern: string
  router: Hono
}
