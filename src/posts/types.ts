import type { Hono } from 'hono'

export interface Post {
  slug: string
  title: string
  date: string
  summary: string
  /** Raw markdown source, for content negotiation and /posts/<slug>.md */
  markdown: string
  Body: () => unknown
  /** Optional live-demo routes mounted at /demos/<slug> */
  demo?: Hono
}
