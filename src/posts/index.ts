import type { Post } from './types'
import { agentFriendlyMcp } from './agent-friendly-mcp'
import { cloudflareSetup } from './cloudflare-setup'

// Newest first
export const posts: Post[] = [agentFriendlyMcp, cloudflareSetup]

export const findPost = (slug: string): Post | undefined =>
  posts.find((p) => p.slug === slug)
