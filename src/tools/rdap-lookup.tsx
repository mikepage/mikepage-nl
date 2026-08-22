import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import { isDomain } from '../lib/domain'
import type { Tool } from './types'

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
  errorCode?: number
  title?: string
}

function registrarName(entities: RdapEntity[] = []): string | null {
  const registrar = entities.find((e) => e.roles?.includes('registrar'))
  const fn = registrar?.vcardArray?.[1]?.find((row) => row[0] === 'fn')
  return typeof fn?.[3] === 'string' ? fn[3] : null
}

const router = new Hono()

router.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase()
  let data: RdapDomain | null = null
  let error = null
  if (domain) {
    if (!isDomain(domain)) error = 'That does not look like a valid domain name.'
    else {
      try {
        let res = await fetch(`https://rdap.org/domain/${domain}`, {
          headers: { accept: 'application/rdap+json', 'user-agent': 'mikepage.nl rdap-lookup' },
          redirect: 'follow',
        })
        // rdap.org bootstraps via 302 to the registry's RDAP server; follow one hop manually if needed
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
          res = await fetch(res.headers.get('location')!, { headers: { accept: 'application/rdap+json', 'user-agent': 'mikepage.nl rdap-lookup' } })
        }
        if (res.status === 404) error = `No RDAP data for ${domain} — unregistered, or its TLD has no RDAP server.`
        else if (!res.ok) error = `RDAP server answered ${res.status}.`
        else data = await res.json<RdapDomain>()
      } catch (e) {
        error = String(e)
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
            <dd>{data.ldhName ?? domain}</dd>
            <dt>Registrar</dt>
            <dd>{registrarName(data.entities) ?? 'unknown'}</dd>
            <dt>Status</dt>
            <dd>{data.status?.join(', ') ?? '—'}</dd>
            {data.events?.map((ev) => (
              <>
                <dt>{ev.eventAction}</dt>
                <dd>{ev.eventDate}</dd>
              </>
            ))}
            <dt>Nameservers</dt>
            <dd>{data.nameservers?.map((ns) => ns.ldhName.toLowerCase()).join(', ') ?? '—'}</dd>
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
}
