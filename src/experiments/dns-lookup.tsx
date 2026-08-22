import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ExperimentShell } from '../components/experiment-shell'
import { dohQuery, RECORD_TYPES, unquoteTxt, type DohAnswer, type DohResponse } from '../lib/doh'
import { isDomain } from '../lib/domain'
import type { Engine, Experiment } from './types'

interface Input {
  name: string
  type: string
}

const engine: Engine<Input, DohResponse> = {
  name: 'dns_lookup',
  description: 'Query a DNS record for a domain over Cloudflare DNS-over-HTTPS. Returns the raw DoH JSON response.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Domain name to query, e.g. example.com' },
      type: { type: 'string', enum: [...RECORD_TYPES], default: 'A', description: 'DNS record type' },
    },
    required: ['name'],
  },
  parse(q) {
    const name = (q.name ?? '').trim()
    const type = (q.type ?? 'A').toUpperCase()
    if (!isDomain(name)) return { error: 'invalid domain' }
    if (!(RECORD_TYPES as readonly string[]).includes(type)) return { error: 'unsupported record type' }
    return { input: { name, type } }
  },
  run: ({ name, type }) => dohQuery(name, type),
}

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
  let result: DohResponse | null = null
  let error: string | null = null
  if (name) {
    const parsed = engine.parse({ name, type })
    if ('error' in parsed) error = parsed.error === 'invalid domain' ? 'That does not look like a valid domain name.' : 'Unsupported record type.'
    else {
      try {
        result = await engine.run(parsed.input)
      } catch (e) {
        error = String(e)
      }
    }
  }
  return c.html(
    <Layout title="DNS lookup — mikepage.nl">
      <ExperimentShell experiment={dnsLookup}>
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
            JSON: <a href={`/experiments/dns-lookup/api?name=${name}&type=${type}`}>/experiments/dns-lookup/api?name={name}&type={type}</a>
          </p>
        )}
      </ExperimentShell>
    </Layout>
  )
})

export const dnsLookup: Experiment = {
  slug: 'dns-lookup',
  title: 'DNS lookup',
  summary: 'Query any DNS record type over Cloudflare DNS-over-HTTPS, straight from the edge.',
  pattern: 'stateless fetch-out to cloudflare-dns.com/dns-query, plus a JSON API on the same router',
  router,
  engine,
}
