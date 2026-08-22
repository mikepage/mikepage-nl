import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import { isDomain } from '../lib/domain'
import type { Engine, Tool } from './types'

interface RdapEvent {
  eventAction: string
  eventDate: string
}
interface RdapEntity {
  roles?: string[]
  vcardArray?: [string, [string, unknown, string, unknown][]]
}
interface RdapDomain {
  ldhName?: string
  status?: string[]
  events?: RdapEvent[]
  nameservers?: { ldhName: string }[]
  entities?: RdapEntity[]
}

interface RdapSummary {
  domain: string
  registrar: string | null
  status: string[]
  events: { action: string; date: string }[]
  nameservers: string[]
}

function registrarName(entities: RdapEntity[] = []): string | null {
  const registrar = entities.find((e) => e.roles?.includes('registrar'))
  const fn = registrar?.vcardArray?.[1]?.find((row) => row[0] === 'fn')
  return typeof fn?.[3] === 'string' ? fn[3] : null
}

const UA = 'mikepage.nl rdap-lookup'

const engine: Engine<{ domain: string }, RdapSummary> = {
  name: 'rdap_lookup',
  description: 'Look up registration data (RDAP, the structured successor to WHOIS) for a domain: registrar, status, key dates, nameservers.',
  inputSchema: {
    type: 'object',
    properties: { domain: { type: 'string', description: 'Domain to look up, e.g. example.com' } },
    required: ['domain'],
  },
  parse(q) {
    const domain = (q.domain ?? '').trim().toLowerCase()
    if (!isDomain(domain)) return { error: 'invalid domain' }
    return { input: { domain } }
  },
  async run({ domain }) {
    let res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { accept: 'application/rdap+json', 'user-agent': UA },
      redirect: 'follow',
    })
    // rdap.org bootstraps via 302 to the registry's RDAP server; follow one hop manually if needed
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      res = await fetch(res.headers.get('location')!, { headers: { accept: 'application/rdap+json', 'user-agent': UA } })
    }
    if (res.status === 404) throw new Error(`No RDAP data for ${domain} — unregistered, or its TLD has no RDAP server.`)
    if (!res.ok) throw new Error(`RDAP server answered ${res.status}.`)
    const data = await res.json<RdapDomain>()
    return {
      domain: data.ldhName ?? domain,
      registrar: registrarName(data.entities),
      status: data.status ?? [],
      events: (data.events ?? []).map((ev) => ({ action: ev.eventAction, date: ev.eventDate })),
      nameservers: (data.nameservers ?? []).map((ns) => ns.ldhName.toLowerCase()),
    }
  },
}

const router = new Hono()

router.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase()
  let data: RdapSummary | null = null
  let error: string | null = null
  if (domain) {
    const parsed = engine.parse({ domain })
    if ('error' in parsed) error = 'That does not look like a valid domain name.'
    else {
      try {
        data = await engine.run(parsed.input)
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }
    }
  }
  return c.html(
    <Layout title="RDAP lookup — mikepage.nl">
      <ToolShell tool={rdapLookup}>
        <form method="get">
          <input type="text" name="domain" placeholder="example.com" value={domain} required />
          <button type="submit">Look up</button>
        </form>
        {error && <p class="err">{error}</p>}
        {data && (
          <dl class="facts">
            <dt>Domain</dt>
            <dd>{data.domain}</dd>
            <dt>Registrar</dt>
            <dd>{data.registrar ?? 'unknown'}</dd>
            <dt>Status</dt>
            <dd>{data.status.length ? data.status.join(', ') : '—'}</dd>
            {data.events.map((ev) => (
              <>
                <dt>{ev.action}</dt>
                <dd>{ev.date}</dd>
              </>
            ))}
            <dt>Nameservers</dt>
            <dd>{data.nameservers.length ? data.nameservers.join(', ') : '—'}</dd>
          </dl>
        )}
      </ToolShell>
    </Layout>
  )
})

export const rdapLookup: Tool = {
  slug: 'rdap-lookup',
  title: 'RDAP lookup',
  summary: 'Registration data for any domain — the structured successor to WHOIS.',
  pattern: 'fetch-out with redirects — rdap.org bootstraps to the right registry server, the Worker just follows',
  router,
  engine,
}
