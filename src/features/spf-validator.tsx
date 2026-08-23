import { Hono } from 'hono'
import { Layout } from '../ui/layout'
import { ExperimentShell } from '../ui/experiment-shell'
import { txtRecords } from '../lib/doh'
import { isDomain, isDnsName } from '../lib/domain'
import type { Engine, Experiment } from './types'

interface SpfNode {
  domain: string
  /** How this node was referenced by its parent. */
  via: 'root' | 'include' | 'redirect'
  record: string | null
  note: string | null
  children: SpfNode[]
}

interface SpfResult {
  node: SpfNode
  lookups: number
  issues: { level: 'ok' | 'warn' | 'err'; text: string }[]
}

const COUNTS_AS_LOOKUP = /^[+\-~?]?(include|a|mx|ptr|exists)(:|\/|$)/i

async function evaluateSpf(domain: string, via: SpfNode['via'], seen: Set<string>, depth: number): Promise<SpfResult> {
  const node: SpfNode = { domain, via, record: null, note: null, children: [] }
  const result: SpfResult = { node, lookups: 0, issues: [] }

  if (seen.has(domain)) {
    node.note = 'already seen — include loop'
    result.issues.push({ level: 'err', text: `Include loop: ${domain} referenced twice.` })
    return result
  }
  seen.add(domain)
  if (depth > 10) {
    node.note = 'too deep — aborted'
    result.issues.push({ level: 'err', text: 'Include chain deeper than 10 — evaluation aborted.' })
    return result
  }

  const spf = (await txtRecords(domain)).filter((r) => /^v=spf1(\s|$)/i.test(r))
  if (spf.length === 0) {
    node.note = 'no SPF record'
    result.issues.push({ level: 'err', text: `No SPF record on ${domain}.` })
    return result
  }
  if (spf.length > 1) result.issues.push({ level: 'err', text: `${domain} has ${spf.length} SPF records — that is a permerror; keep exactly one.` })
  node.record = spf[0]

  for (const term of spf[0].split(/\s+/).slice(1)) {
    if (COUNTS_AS_LOOKUP.test(term)) result.lookups++
    if (/^[+\-~?]?ptr/i.test(term)) result.issues.push({ level: 'warn', text: `${domain}: ptr mechanism is deprecated and slow.` })
    if (/^\+?all$/i.test(term)) result.issues.push({ level: 'err', text: `${domain}: "+all" allows the whole internet to send as you.` })
    if (/^\?all$/i.test(term)) result.issues.push({ level: 'warn', text: `${domain}: "?all" is neutral — SPF effectively does nothing.` })

    const include = term.match(/^[+\-~?]?include:(.+)$/i)
    const redirect = term.match(/^redirect=(.+)$/i)
    const next = include?.[1] ?? redirect?.[1]
    if (redirect) result.lookups++
    if (next && isDnsName(next)) {
      const sub = await evaluateSpf(next.toLowerCase(), redirect ? 'redirect' : 'include', seen, depth + 1)
      result.lookups += sub.lookups
      result.issues.push(...sub.issues)
      node.children.push(sub.node)
    }
  }
  return result
}

const engine: Engine<{ domain: string }, SpfResult> = {
  name: 'spf_check',
  description: 'Resolve a domain’s SPF record, recursively walk every include/redirect, count the 10-lookup budget, and flag issues. Returns the full include tree.',
  inputSchema: {
    type: 'object',
    properties: { domain: { type: 'string', description: 'Domain to check, e.g. example.com' } },
    required: ['domain'],
  },
  parse(q) {
    const domain = (q.domain ?? '').trim().toLowerCase()
    if (!isDomain(domain)) return { error: 'invalid domain' }
    return { input: { domain } }
  },
  run: ({ domain }) => evaluateSpf(domain, 'root', new Set(), 0),
}

const TreeNode = ({ node }: { node: SpfNode }) => (
  <li>
    <span class="tree-label">
      {node.via !== 'root' && <span class="tree-via">{node.via}:</span>}
      <span class="font-mono text-[0.85em]">{node.domain}</span>
      {node.note && <span class="warn"> — {node.note}</span>}
    </span>
    {node.children.length > 0 && (
      <ul>
        {node.children.map((child) => (
          <TreeNode node={child} />
        ))}
      </ul>
    )}
  </li>
)

const router = new Hono()

router.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase()
  let result: SpfResult | null = null
  let error = null
  if (domain) {
    const parsed = engine.parse({ domain })
    if ('error' in parsed) error = 'That does not look like a valid domain name.'
    else {
      try {
        result = await engine.run(parsed.input)
      } catch (e) {
        error = String(e)
      }
    }
  }
  return c.html(
    <Layout title="SPF validator — mikepage.nl">
      <ExperimentShell experiment={spfValidator}>
        <form method="get">
          <input type="text" name="domain" placeholder="example.com" value={domain} required />
          <button type="submit">Validate</button>
        </form>
        {error && <p class="err">{error}</p>}
        {result && (
          <>
            {result.node.record && (
              <pre>
                <code>{result.node.record}</code>
              </pre>
            )}
            <ul class="checks">
              <li class={result.lookups > 10 ? 'err' : result.lookups > 7 ? 'warn' : 'ok'}>
                {result.lookups} of 10 allowed DNS lookups used{result.lookups > 10 && ' — receivers return permerror; flatten your includes'}.
              </li>
              {result.issues.map((issue) => (
                <li class={issue.level}>{issue.text}</li>
              ))}
              {result.node.record && result.issues.every((i) => i.level !== 'err') && <li class="ok">No blocking problems found.</li>}
            </ul>
            {result.node.children.length > 0 && (
              <>
                <h2>Include tree</h2>
                <ul class="tree">
                  <TreeNode node={result.node} />
                </ul>
              </>
            )}
          </>
        )}
      </ExperimentShell>
    </Layout>
  )
})

export const spfValidator: Experiment = {
  slug: 'spf-validator',
  title: 'SPF validator',
  summary: 'Resolve a domain’s SPF record, walk every include, and count the 10-lookup budget.',
  pattern: 'recursive fetch-out — one DoH query per include, fanned out from a single Worker request',
  router,
  engine,
}
