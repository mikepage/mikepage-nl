import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z, type ZodRawShape, type ZodTypeAny } from 'zod'
import { experiments } from '../features'
import type { Engine, JsonSchema } from '../features/types'

const engines = experiments.map((x) => x.engine).filter((e): e is Engine => Boolean(e))

/** Convert an engine's JSON Schema (object) into a zod raw shape for MCP tool registration. */
function toZodShape(schema: JsonSchema): ZodRawShape {
  const props = (schema.properties ?? {}) as Record<string, { type?: string; description?: string }>
  const required = new Set((schema.required as string[]) ?? [])
  const shape: ZodRawShape = {}
  for (const [key, def] of Object.entries(props)) {
    let field: ZodTypeAny = def.type === 'integer' || def.type === 'number' ? z.coerce.number() : z.string()
    if (def.description) field = field.describe(def.description)
    if (!required.has(key)) field = field.optional()
    shape[key] = field
  }
  return shape
}

/**
 * Authless MCP server exposing the site's read-only edge tools. One MCP tool per
 * engine; validation and logic are reused from the engine — the same code the HTML
 * pages and JSON API run.
 */
export class ToolsMcp extends McpAgent<CloudflareBindings> {
  server = new McpServer({ name: 'mikepage-tools', version: '1.0.0' })

  async init() {
    for (const engine of engines) {
      this.server.registerTool(
        engine.name,
        { description: engine.description, inputSchema: toZodShape(engine.inputSchema) },
        async (args: Record<string, unknown>) => {
          const q = Object.fromEntries(
            Object.entries(args ?? {}).map(([k, v]) => [k, v == null ? undefined : String(v)])
          )
          const parsed = engine.parse(q)
          if ('error' in parsed) {
            return { content: [{ type: 'text' as const, text: `Error: ${parsed.error}` }], isError: true }
          }
          try {
            const result = await engine.run(parsed.input)
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
          } catch (e) {
            return {
              content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
              isError: true,
            }
          }
        }
      )
    }
  }
}
