import type { Hono } from 'hono'

/** JSON Schema (object) describing an engine's input — feeds both OpenAPI and MCP. */
export type JsonSchema = Record<string, unknown>

/**
 * A tool's machine-callable core: one place that validates input and computes a
 * structured result, shared by the HTML page, the JSON API, and the MCP server.
 */
export interface Engine<I = unknown, R = unknown> {
  /** MCP tool name, snake_case. */
  name: string
  description: string
  inputSchema: JsonSchema
  /** Validate raw query/args into typed input, or return an error message. */
  parse(q: Record<string, string | undefined>): { input: I } | { error: string }
  run(input: I): Promise<R>
}

export interface Tool {
  slug: string
  title: string
  summary: string
  /** The Cloudflare platform pattern this tool demonstrates. */
  pattern: string
  router: Hono
  /** Present when the tool exposes a machine API (JSON + MCP). */
  engine?: Engine
}
