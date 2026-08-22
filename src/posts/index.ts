import type { Post } from './types'
// Built from src/content/*.mdx by scripts/build-posts.mjs (npm run build:posts)
import { posts as generated } from './generated/index.js'

export const posts = generated as unknown as Post[]

export const findPost = (slug: string): Post | undefined =>
  posts.find((p) => p.slug === slug)
