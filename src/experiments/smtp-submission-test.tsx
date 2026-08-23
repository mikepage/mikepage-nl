import { Hono } from 'hono'
import { connect } from 'cloudflare:sockets'
import { Layout } from '../components/layout'
import { ExperimentShell } from '../components/experiment-shell'
import { assertPublicHost } from '../lib/doh'
import { isDomain } from '../lib/domain'
import type { Engine, Experiment } from './types'

const PORTS = [587, 465, 2525] as const

interface SmtpProbe {
  banner: string
  ehlo: string
  capabilities: string[]
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms))])
}

/** Read SMTP reply lines until the final "NNN " (space, not dash) line arrives. */
async function readReply(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return buf
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\r\n').filter(Boolean)
    const last = lines[lines.length - 1]
    if (last && /^\d{3} /.test(last) && buf.endsWith('\r\n')) return buf.trimEnd()
  }
}

async function probe(host: string, port: number): Promise<SmtpProbe> {
  const socket = connect({ hostname: host, port }, { secureTransport: port === 465 ? 'on' : 'off' })
  const reader = socket.readable.getReader()
  const writer = socket.writable.getWriter()
  const encoder = new TextEncoder()
  try {
    const banner = await withTimeout(readReply(reader), 8000, 'banner')
    await writer.write(encoder.encode('EHLO mikepage.nl\r\n'))
    const ehlo = await withTimeout(readReply(reader), 8000, 'EHLO reply')
    await writer.write(encoder.encode('QUIT\r\n'))
    const capabilities = ehlo
      .split('\r\n')
      .slice(1)
      .map((l) => l.replace(/^250[- ]/, ''))
    return { banner, ehlo, capabilities }
  } finally {
    await socket.close().catch(() => {})
  }
}

const engine: Engine<{ host: string; port: number }, SmtpProbe> = {
  name: 'smtp_probe',
  description: 'Open a raw TCP connection to a mail server’s submission port (587/465/2525) and return its banner and EHLO capabilities. Only public hostnames are allowed.',
  inputSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', description: 'Mail server hostname, e.g. smtp.example.com' },
      port: { type: 'integer', enum: [...PORTS], default: 587, description: 'Submission port (25 is blocked from Workers)' },
    },
    required: ['host'],
  },
  parse(q) {
    const host = (q.host ?? '').trim().toLowerCase()
    const port = Number(q.port ?? 587)
    if (!isDomain(host)) return { error: 'invalid hostname' }
    if (!(PORTS as readonly number[]).includes(port)) return { error: 'port must be 587, 465, or 2525' }
    return { input: { host, port } }
  },
  async run({ host, port }) {
    // SSRF guard: only connect to hostnames that resolve to public addresses.
    const blocked = await assertPublicHost(host)
    if (blocked) throw new Error(blocked)
    return probe(host, port)
  },
}

const router = new Hono()

router.get('/', async (c) => {
  const host = (c.req.query('host') ?? '').trim().toLowerCase()
  const port = Number(c.req.query('port') ?? 587)
  let result: SmtpProbe | null = null
  let error: string | null = null
  if (host) {
    const parsed = engine.parse({ host, port: String(port) })
    if ('error' in parsed) {
      error = parsed.error === 'invalid hostname' ? 'That does not look like a valid hostname.' : 'Port must be 587, 465, or 2525. (Port 25 is blocked from Workers — by design.)'
    } else {
      try {
        result = await engine.run(parsed.input)
      } catch (e) {
        error = `Could not probe ${host}:${port} — ${e instanceof Error ? e.message : String(e)}`
      }
    }
  }
  return c.html(
    <Layout title="SMTP submission test — mikepage.nl">
      <ExperimentShell experiment={smtpSubmissionTest}>
        <form method="get">
          <input type="text" name="host" placeholder="smtp.example.com" value={host} required />
          <select name="port">
            {PORTS.map((p) => (
              <option value={String(p)} selected={p === port}>
                {p}
                {p === 465 ? ' (implicit TLS)' : ''}
              </option>
            ))}
          </select>
          <button type="submit">Probe</button>
        </form>
        {error && <p class="err">{error}</p>}
        {result && (
          <>
            <h2>Banner</h2>
            <pre>
              <code>{result.banner}</code>
            </pre>
            <h2>EHLO capabilities</h2>
            <ul class="checks">
              {result.capabilities.map((cap) => (
                <li class={cap.startsWith('STARTTLS') ? 'ok' : 'plain'}>{cap}</li>
              ))}
              {port === 587 && !result.capabilities.some((x) => x.startsWith('STARTTLS')) && (
                <li class="err">No STARTTLS on the submission port — credentials would cross the wire in the clear.</li>
              )}
            </ul>
          </>
        )}
        <p class="mt-1.5 text-[0.85rem] text-muted">
          Runs over a raw TCP socket from this Worker via <code>cloudflare:sockets</code>. Outbound port 25 is blocked on the
          platform, which is exactly why this tests <em>submission</em> (587/465), not relay.
        </p>
      </ExperimentShell>
    </Layout>
  )
})

export const smtpSubmissionTest: Experiment = {
  slug: 'smtp-submission-test',
  title: 'SMTP submission test',
  summary: 'Open a raw TCP connection to a mail server’s submission port and read its banner and EHLO capabilities.',
  pattern: 'raw TCP from a Worker — cloudflare:sockets connect(); port 25 blocked, 587/465 allowed',
  router,
  engine,
}
