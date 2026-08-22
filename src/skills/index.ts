// Built from src/content/skills/*.mdx by scripts/build-posts.mjs (npm run build:posts)
import { skills as generated } from './generated/index.js'

export interface Skill {
  /** kebab-case skill name = the .claude/skills/<id>/ directory */
  id: string
  description: string
  /** slug of the post this skill accompanies */
  post: string
  postTitle: string
  /** the SKILL.md instruction body (markdown) */
  body: string
}

export const skills = generated as unknown as Skill[]

export const findSkill = (id: string): Skill | undefined => skills.find((s) => s.id === id)

/** The skill(s) that accompany a given post slug. */
export const skillsForPost = (postSlug: string): Skill[] => skills.filter((s) => s.post === postSlug)

/** Render a skill as an installable SKILL.md (frontmatter + body). */
export function skillMd(skill: Skill): string {
  return `---\nname: ${skill.id}\ndescription: ${skill.description}\n---\n\n${skill.body}\n`
}
