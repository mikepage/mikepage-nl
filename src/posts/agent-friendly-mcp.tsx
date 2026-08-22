import type { Post } from './types'

export const agentFriendlyMcp: Post = {
  slug: 'agent-friendly-mcp',
  title: 'Making the site agent-friendly, and giving the tools an MCP server',
  date: '2026-08-22',
  summary:
    'One engine per tool, reused by the HTML page, a JSON API, and an authless MCP server on a Durable Object. Plus why MCP over WebMCP, and where state actually lives.',
  Body: () => (
    <>
      <p>
        The <a href="/tools">tools</a> on this site already ran on the edge and rendered results as
        shareable URLs. The next question was: how do you let an <em>agent</em> use them — not just a
        human with a browser? This post is how I made the whole site agent-friendly and put the tools
        behind an authless <abbr title="Model Context Protocol">MCP</abbr> server, all on the same
        Worker.
      </p>

      <h2>One engine per tool</h2>
      <p>
        The key move was refactoring each tool to a single source of truth. Every tool now exports an{' '}
        <code>Engine</code>: a name, a JSON Schema for its input, a <code>parse()</code> that
        validates raw params, and a <code>run()</code> that does the work and returns structured data.
      </p>
      <pre>
        <code>{`interface Engine<I, R> {
  name: string            // MCP tool name, e.g. "spf_check"
  description: string
  inputSchema: JsonSchema  // feeds OpenAPI *and* MCP
  parse(q): { input: I } | { error: string }
  run(input: I): Promise<R>
}`}</code>
      </pre>
      <p>
        The HTML page, the JSON API, and the MCP tool all call the same <code>parse()</code> +{' '}
        <code>run()</code>. No logic is written twice, so the SSRF guard on the SMTP probe — resolve
        the host, reject private ranges — protects every entry point at once, not just the web form.
      </p>

      <h2>The agent-friendly layer</h2>
      <p>Four things make the site legible to an agent that arrives cold:</p>
      <ul class="checks">
        <li class="ok">
          <a href="/llms.txt">/llms.txt</a> — the map agents look for first: what the site is, the
          posts, and every tool with its JSON endpoint and MCP tool name.
        </li>
        <li class="ok">
          <a href="/openapi.json">/openapi.json</a> — generated from the same engine schemas, so the
          docs can never drift from the code.
        </li>
        <li class="ok">
          A JSON API on every tool — append <code>/api</code> to any tool URL, e.g.{' '}
          <code>/tools/dns-lookup/api?name=example.com</code>.
        </li>
        <li class="ok">
          <code>/robots.txt</code> and <code>/sitemap.xml</code>, both built from the live registry.
        </li>
      </ul>

      <h2>The MCP server: authless, on the same Worker</h2>
      <p>
        The tools are read-only lookups over public data — DNS, SPF, DMARC, RDAP, an SMTP banner
        probe — so an <strong>authless</strong> MCP server is safe and, frankly, more fun: point any
        MCP client at <code>{'https://mikepage.nl/mcp'}</code> and the six tools show up ready to call.
      </p>
      <p>
        It uses Cloudflare's <code>McpAgent</code> from the <code>agents</code> SDK. The tools register
        themselves by iterating the engines — the JSON Schema is converted to a zod shape, and each
        call routes straight back through <code>parse()</code> and <code>run()</code>:
      </p>
      <pre>
        <code>{`export class ToolsMcp extends McpAgent<CloudflareBindings> {
  server = new McpServer({ name: 'mikepage-tools', version: '1.0.0' })
  async init() {
    for (const engine of engines) {
      this.server.registerTool(engine.name,
        { description: engine.description, inputSchema: toZodShape(engine.inputSchema) },
        async (args) => {
          const parsed = engine.parse(stringify(args))
          if ('error' in parsed) return errorContent(parsed.error)
          return jsonContent(await engine.run(parsed.input))
        })
    }
  }
}`}</code>
      </pre>
      <p>
        One entry point splits traffic: <code>/mcp</code> goes to the agent, everything else to the
        Hono app.
      </p>

      <h2>Do you still need state?</h2>
      <p>
        Worth being precise, because it tripped me up. There are two kinds of "state":
      </p>
      <ul class="checks">
        <li class="plain">
          <strong>Application state</strong> (<code>setState</code>, <code>initialState</code>): none.
          These tools are pure request → response, so the agent stores nothing.
        </li>
        <li class="plain">
          <strong>The Durable Object</strong>: still required. <code>McpAgent</code> is DO-backed for
          the transport — the <code>mcp-session-id</code> a client gets is a per-connection session the
          DO holds, independent of whether you store any data. So the DO binding and{' '}
          <code>new_sqlite_classes</code> migration stay, even for a stateless tool server.
        </li>
      </ul>
      <p>
        You could drop the DO by hand-rolling the MCP SDK's streamable-HTTP transport in stateless
        mode — but that transport is written for Node's request/response objects, and adapting it to
        the Workers Fetch API is exactly the friction <code>McpAgent</code> removes. Not worth it.
      </p>

      <h2>Why MCP and not WebMCP</h2>
      <p>
        WebMCP — a page exposing tools to an in-browser agent — is a fun idea and on-theme for a site
        of edge experiments. But it only reaches browsers that support it today, while a remote MCP
        server works with every MCP client right now. So the remote server is the real surface;
        WebMCP is a future demo, not the main path.
      </p>

      <h2>Try it</h2>
      <p>
        Add <code>{'https://mikepage.nl/mcp'}</code> as a remote MCP server in your client of choice, or
        just hit a JSON endpoint: <a href="/tools/dns-lookup/api?name=cloudflare.com">
          /tools/dns-lookup/api?name=cloudflare.com
        </a>
        . Same engine, three front doors.
      </p>
    </>
  ),
}
