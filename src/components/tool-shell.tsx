import type { Child } from 'hono/jsx'
import type { Tool } from '../tools/types'

export const ToolShell = (props: { tool: Tool; children: Child }) => (
  <>
    <p class="meta">
      <a href="/experiments">← All experiments</a>
    </p>
    <h1>{props.tool.title}</h1>
    <p class="lede">{props.tool.summary}</p>
    <p class="pattern">⚡ Cloudflare pattern: {props.tool.pattern}</p>
    {props.children}
  </>
)
