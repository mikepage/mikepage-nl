import type { Hono } from 'hono'

export interface Post {
  slug: string
  title: string
  date: string
  summary: string
  Body: () => unknown
  /** Optional live-demo routes mounted at /demos/<slug> */
  demo?: Hono
}
