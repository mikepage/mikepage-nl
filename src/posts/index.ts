import type { Post } from './types'
import { cloudflareSetup } from './cloudflare-setup'

// Newest first
export const posts: Post[] = [cloudflareSetup]

export const findPost = (slug: string): Post | undefined =>
  posts.find((p) => p.slug === slug)
