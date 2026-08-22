import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import type { Tool } from './types'

const CF_FIELDS = [
  ['colo', 'Cloudflare datacenter serving you'],
  ['country', 'Country'],
  ['city', 'City'],
  ['region', 'Region'],
  ['postalCode', 'Postal code'],
  ['timezone', 'Timezone'],
  ['asn', 'AS number'],
  ['asOrganization', 'AS organization'],
  ['httpProtocol', 'HTTP protocol'],
  ['tlsVersion', 'TLS version'],
  ['tlsCipher', 'TLS cipher'],
] as const

const router = new Hono()

router.get('/', (c) => {
  const cf = (c.req.raw.cf ?? {}) as Record<string, unknown>
  const headers = ['cf-connecting-ip', 'user-agent', 'accept-language', 'accept-encoding', 'sec-ch-ua-platform']
  return c.html(
    <Layout title="Browser info — mikepage.nl">
      <ToolShell tool={browserinfo}>
        <h2>What Cloudflare knows (request.cf)</h2>
        <dl class="facts">
          {CF_FIELDS.filter(([key]) => cf[key] != null).map(([key, label]) => (
            <>
              <dt>{label}</dt>
              <dd class="mono">{String(cf[key])}</dd>
            </>
          ))}
        </dl>
        <h2>What your browser sent</h2>
        <dl class="facts">
          {headers
            .filter((h) => c.req.header(h))
            .map((h) => (
              <>
                <dt>{h}</dt>
                <dd class="mono">{c.req.header(h)}</dd>
              </>
            ))}
        </dl>
        <p class="meta">
          Every field above arrives free on <code>request.cf</code> — no geo-IP database, no client-side JavaScript. (Empty
          fields when running under <code>wrangler dev</code> are normal; the edge fills them in production.)
        </p>
      </ToolShell>
    </Layout>
  )
})

export const browserinfo: Tool = {
  slug: 'browserinfo',
  title: 'Browser info',
  summary: 'Everything this Worker can tell about your connection without a single line of client JavaScript.',
  pattern: 'request introspection — the request.cf object Cloudflare attaches to every request (geo, ASN, TLS, colo)',
  router,
}
