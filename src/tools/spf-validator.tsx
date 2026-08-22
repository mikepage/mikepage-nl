import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import { txtRecords } from '../lib/doh'
import { isDomain } from '../lib/domain'
import type { Tool } from './types'

interface SpfResult {
  domain: string
  record: string | null
  lookups: number
  issues: { level: 'ok' | 'warn' | 'err'; text: string }[]
  chain: string[]
}

const COUNTS_AS_LOOKUP = /^[+\-~?]?(include|a|mx|ptr|exists)(:|\/|$)/i

async function evaluateSpf(domain: string, seen: Set<string>, depth: number): Promise<SpfResult> {
  const result: SpfResult = { domain, record: null, lookups: 0, issues: [], chain: [] }
  if (seen.has(domain)) {
    result.issues.push({ level: 'err', text: `Include loop: ${domain} referenced twice.` })
    return result
  }
  seen.add(domain)
  if (depth > 10) {
    result.issues.push({ level: 'err', text: 'Include chain deeper than 10 — evaluation aborted.' })
    return result
  }

  const spf = (await txtRecords(domain)).filter((r) => /^v=spf1(\s|$)/i.test(r))
  if (spf.length === 0) {
    result.issues.push({ level: 'err', text: `No SPF record on ${domain}.` })
    return result
  }
  if (spf.length > 1) result.issues.push({ level: 'err', text: `${domain} has ${spf.length} SPF records — that is a permerror; keep exactly one.` })
  result.record = spf[0]

  for (const term of spf[0].split(/\s+/).slice(1)) {
    if (COUNTS_AS_LOOKUP.test(term)) result.lookups++
    if (/^[+\-~?]?ptr/i.test(term)) result.issues.push({ level: 'warn', text: `${domain}: ptr mechanism is deprecated and slow.` })
    if (/^\+?all$/i.test(term)) result.issues.push({ level: 'err', text: `${domain}: "+all" allows the whole internet to send as you.` })
    if (/^\?all$/i.test(term)) result.issues.push({ level: 'warn', text: `${domain}: "?all" is neutral — SPF effectively does nothing.` })

    const include = term.match(/^[+\-~?]?include:(.+)$/i)
    const redirect = term.match(/^redirect=(.+)$/i)
    const next = include?.[1] ?? redirect?.[1]
    if (redirect) result.lookups++
    if (next && isDomain(next)) {
      const sub = await evaluateSpf(next.toLowerCase(), seen, depth + 1)
      result.lookups += sub.lookups
      result.issues.push(...sub.issues)
      result.chain.push(`${next} (${sub.record ?? 'no SPF'})`, ...sub.chain.map((l) => `  ${l}`))
    }
  }
  return result
}

const router = new Hono()

router.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase()
  let result: SpfResult | null = null
  let error = null
  if (domain) {
    if (!isDomain(domain)) error = 'That does not look like a valid domain name.'
    else {
      try {
        result = await evaluateSpf(domain, new Set(), 0)
      } catch (e) {
        error = String(e)
      }
    }
  }
  return c.html(
    <Layout title="SPF validator — mikepage.nl">
      <ToolShell tool={spfValidator}>
        <form method="get">
          <input type="text" name="domain" placeholder="example.com" value={domain} required />
          <button type="submit">Validate</button>
        </form>
        {error && <p class="err">{error}</p>}
        {result && (
          <>
            {result.record && (
              <pre>
                <code>{result.record}</code>
              </pre>
            )}
            <ul class="checks">
              <li class={result.lookups > 10 ? 'err' : result.lookups > 7 ? 'warn' : 'ok'}>
                {result.lookups} of 10 allowed DNS lookups used{result.lookups > 10 && ' — receivers return permerror; flatten your includes'}.
              </li>
              {result.issues.map((issue) => (
                <li class={issue.level}>{issue.text}</li>
              ))}
              {result.record && result.issues.every((i) => i.level !== 'err') && <li class="ok">No blocking problems found.</li>}
            </ul>
            {result.chain.length > 0 && (
              <>
                <h2>Include chain</h2>
                <pre>
                  <code>{result.chain.join('\n')}</code>
                </pre>
              </>
            )}
          </>
        )}
      </ToolShell>
    </Layout>
  )
})

export const spfValidator: Tool = {
  slug: 'spf-validator',
  title: 'SPF validator',
  summary: 'Resolve a domain’s SPF record, walk every include, and count the 10-lookup budget.',
  pattern: 'recursive fetch-out — one DoH query per include, fanned out from a single Worker request',
  router,
}
