import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ExperimentShell } from '../components/experiment-shell'
import { dohQuery, unquoteTxt, type DohAnswer } from '../lib/doh'
import { isDomain } from '../lib/domain'
import type { Engine, Experiment } from './types'

// Names probed relative to the apex, plus the special-use prefixes worth surfacing.
const SUBDOMAINS = ['www', 'mail', 'smtp', 'imap', 'pop', 'webmail', 'autodiscover', 'autoconfig', 'ftp', 'vpn', 'remote', 'api', 'cdn', 'blog', 'shop', 'dev', 'staging', 'test', 'ns1', 'ns2', 'm', 'app']
const DKIM_SELECTORS = ['default', 'google', 'selector1', 'selector2', 'k1', 'dkim', 's1', 's2', 'mail']
const APEX_TYPES = ['A', 'AAAA', 'NS', 'MX', 'SOA', 'TXT', 'CAA'] as const

interface Row {
  name: string
  type: string
  data: string
  ttl: number
}

async function collect(name: string, type: string): Promise<Row[]> {
  try {
    const res = await dohQuery(name, type)
    return (res.Answer ?? [])
      .filter((a: DohAnswer) => typeName(a.type) === type || type === 'ANY')
      .map((a: DohAnswer) => ({ name: a.name.replace(/\.$/, ''), type: typeName(a.type), data: a.type === 16 ? unquoteTxt(a.data) : a.data, ttl: a.TTL }))
  } catch {
    return []
  }
}

const TYPE_NAMES: Record<number, string> = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA' }
function typeName(n: number): string {
  return TYPE_NAMES[n] ?? String(n)
}

interface Discovery {
  apex: Row[]
  email: Row[]
  subdomains: Row[]
}

async function discover(domain: string): Promise<Discovery> {
  // Fan out: every apex type, email-auth names, DKIM selectors, and common subdomains — all concurrent.
  const apexJobs = APEX_TYPES.map((t) => collect(domain, t))
  const emailJobs = [
    collect(`_dmarc.${domain}`, 'TXT'),
    collect(`_domainkey.${domain}`, 'TXT'),
    ...DKIM_SELECTORS.map((s) => collect(`${s}._domainkey.${domain}`, 'TXT')),
    collect(`_mta-sts.${domain}`, 'TXT'),
    collect(`_smtp._tls.${domain}`, 'TXT'),
    collect(`_autodiscover._tcp.${domain}`, 'SRV'),
  ]
  const subJobs = SUBDOMAINS.map(async (s) => {
    const host = `${s}.${domain}`
    const [a, aaaa, cname] = await Promise.all([collect(host, 'A'), collect(host, 'AAAA'), collect(host, 'CNAME')])
    return [...cname, ...a, ...aaaa]
  })

  const [apex, email, subs] = await Promise.all([Promise.all(apexJobs), Promise.all(emailJobs), Promise.all(subJobs)])
  return {
    apex: apex.flat(),
    email: email.flat(),
    subdomains: subs.flat(),
  }
}

const engine: Engine<{ domain: string }, Discovery> = {
  name: 'dns_discovery',
  description: 'Scan a domain for its apex records, email-authentication setup (SPF/DMARC/DKIM/MTA-STS), and common subdomains in one shot via ~50 concurrent DoH probes. Discovery snapshot, not a monitor.',
  inputSchema: {
    type: 'object',
    properties: { domain: { type: 'string', description: 'Domain to scan, e.g. example.com' } },
    required: ['domain'],
  },
  parse(q) {
    const domain = (q.domain ?? '').trim().toLowerCase().replace(/\.$/, '')
    if (!isDomain(domain)) return { error: 'invalid domain' }
    return { input: { domain } }
  },
  run: ({ domain }) => discover(domain),
}

const Section = ({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) =>
  rows.length === 0 ? (
    <>
      <h2>{title}</h2>
      <p class="warn">{empty}</p>
    </>
  ) : (
    <>
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>TTL</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr>
              <td class="mono">{r.name}</td>
              <td>{r.type}</td>
              <td>{r.ttl}</td>
              <td class="mono">{r.data}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )

const router = new Hono()

router.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase().replace(/\.$/, '')
  let result: Discovery | null = null
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
  const total = result ? result.apex.length + result.email.length + result.subdomains.length : 0
  return c.html(
    <Layout title="DNS discovery — mikepage.nl">
      <ExperimentShell experiment={dnsDiscovery}>
        <form method="get">
          <input type="text" name="domain" placeholder="example.com" value={domain} required />
          <button type="submit">Discover</button>
        </form>
        {error && <p class="err">{error}</p>}
        {result && (
          <>
            <p class="meta">
              Probed {APEX_TYPES.length} apex record types, {DKIM_SELECTORS.length + 5} email-auth names, and{' '}
              {SUBDOMAINS.length} common subdomains — {total} records found.
            </p>
            <Section title="Apex records" rows={result.apex} empty="No apex records resolved." />
            <Section title="Email authentication" rows={result.email} empty="No SPF/DMARC/DKIM/MTA-STS records found." />
            <Section title="Discovered subdomains" rows={result.subdomains} empty="None of the probed subdomains resolved." />
          </>
        )}
        <p class="meta">
          Discovery-only, like dnsspy’s initial scan — a snapshot, not a monitor. Subdomains are found by probing a
          curated wordlist over DNS-over-HTTPS (no zone transfer), so this shows the common names, not every record that
          exists.
        </p>
      </ExperimentShell>
    </Layout>
  )
})

export const dnsDiscovery: Experiment = {
  slug: 'dns-discovery',
  title: 'DNS discovery',
  summary: 'Scan a domain for its apex records, email-auth setup, and common subdomains in one shot.',
  pattern: 'fetch-out fan-out — ~50 concurrent DoH queries per request, gathered with Promise.all at the edge',
  router,
  engine,
}
