import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import { dohQuery, RECORD_TYPES, unquoteTxt, type DohAnswer } from '../lib/doh'
import { isDomain } from '../lib/domain'
import type { Tool } from './types'

const router = new Hono()

const Results = ({ answers, type }: { answers: DohAnswer[]; type: string }) => (
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>TTL</th>
        <th>Data</th>
      </tr>
    </thead>
    <tbody>
      {answers.map((a) => (
        <tr>
          <td>{a.name}</td>
          <td>{a.TTL}</td>
          <td class="mono">{type === 'TXT' ? unquoteTxt(a.data) : a.data}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

router.get('/', async (c) => {
  const name = (c.req.query('name') ?? '').trim()
  const type = (c.req.query('type') ?? 'A').toUpperCase()
  let result = null
  let error = null
  if (name) {
    if (!isDomain(name)) error = 'That does not look like a valid domain name.'
    else if (!(RECORD_TYPES as readonly string[]).includes(type)) error = 'Unsupported record type.'
    else {
      try {
        result = await dohQuery(name, type)
      } catch (e) {
        error = String(e)
      }
    }
  }
  return c.html(
    <Layout title="DNS lookup — mikepage.nl">
      <ToolShell tool={dnsLookup}>
        <form method="get">
          <input type="text" name="name" placeholder="example.com" value={name} required />
          <select name="type">
            {RECORD_TYPES.map((t) => (
              <option value={t} selected={t === type}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit">Look up</button>
        </form>
        {error && <p class="err">{error}</p>}
        {result &&
          ((result.Answer?.length ?? 0) > 0 ? (
            <Results answers={result.Answer!} type={type} />
          ) : (
            <p class="warn">
              No {type} records for <strong>{name}</strong> (status {result.Status}).
            </p>
          ))}
        {name && !error && (
          <p class="meta">
            JSON: <a href={`/tools/dns-lookup/api?name=${name}&type=${type}`}>/tools/dns-lookup/api?name={name}&type={type}</a>
          </p>
        )}
      </ToolShell>
    </Layout>
  )
})

router.get('/api', async (c) => {
  const name = (c.req.query('name') ?? '').trim()
  const type = (c.req.query('type') ?? 'A').toUpperCase()
  if (!isDomain(name)) return c.json({ error: 'invalid domain' }, 400)
  if (!(RECORD_TYPES as readonly string[]).includes(type)) return c.json({ error: 'unsupported type' }, 400)
  return c.json(await dohQuery(name, type))
})

export const dnsLookup: Tool = {
  slug: 'dns-lookup',
  title: 'DNS lookup',
  summary: 'Query any DNS record type over Cloudflare DNS-over-HTTPS, straight from the edge.',
  pattern: 'stateless fetch-out to cloudflare-dns.com/dns-query, plus a JSON API on the same router',
  router,
}
