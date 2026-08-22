import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import { txtRecords } from '../lib/doh'
import { isDomain } from '../lib/domain'
import type { Engine, Tool } from './types'

interface Check {
  level: 'ok' | 'warn' | 'err'
  text: string
}

interface DmarcResult {
  domain: string
  records: { record: string; checks: Check[] }[]
}

function validateDmarc(record: string): Check[] {
  const checks: Check[] = []
  const tags = new Map<string, string>()
  for (const part of record.split(';')) {
    const [k, ...rest] = part.split('=')
    if (k && rest.length) tags.set(k.trim().toLowerCase(), rest.join('=').trim())
  }

  if (!record.trim().toLowerCase().startsWith('v=dmarc1')) {
    checks.push({ level: 'err', text: 'Record must start with v=DMARC1.' })
  } else {
    checks.push({ level: 'ok', text: 'v=DMARC1 present and first.' })
  }

  const p = tags.get('p')
  if (!p) checks.push({ level: 'err', text: 'Required tag p= is missing.' })
  else if (!['none', 'quarantine', 'reject'].includes(p)) checks.push({ level: 'err', text: `Invalid policy p=${p}.` })
  else if (p === 'none') checks.push({ level: 'warn', text: 'p=none: monitoring only, spoofed mail is still delivered. Move to quarantine or reject once reports look clean.' })
  else checks.push({ level: 'ok', text: `Enforcing policy: p=${p}.` })

  if (!tags.get('rua')) checks.push({ level: 'warn', text: 'No rua= aggregate report address — you are flying blind on who sends as this domain.' })
  else checks.push({ level: 'ok', text: `Aggregate reports to ${tags.get('rua')}.` })

  const pct = tags.get('pct')
  if (pct && pct !== '100') checks.push({ level: 'warn', text: `pct=${pct}: policy applies to only ${pct}% of mail.` })

  const sp = tags.get('sp')
  if (sp && !['none', 'quarantine', 'reject'].includes(sp)) checks.push({ level: 'err', text: `Invalid subdomain policy sp=${sp}.` })
  if (sp === 'none' && p !== 'none') checks.push({ level: 'warn', text: 'sp=none weakens the policy for all subdomains.' })

  for (const t of ['adkim', 'aspf']) {
    const v = tags.get(t)
    if (v && !['r', 's'].includes(v)) checks.push({ level: 'err', text: `Invalid ${t}=${v} (must be r or s).` })
  }
  return checks
}

const engine: Engine<{ domain: string }, DmarcResult> = {
  name: 'dmarc_check',
  description: 'Fetch a domain’s _dmarc TXT record and validate the DMARC policy, returning per-tag findings.',
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
  async run({ domain }) {
    const found = (await txtRecords(`_dmarc.${domain}`)).filter((r) => r.toLowerCase().startsWith('v=dmarc'))
    return { domain, records: found.map((record) => ({ record, checks: validateDmarc(record) })) }
  },
}

const router = new Hono()

router.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase()
  let result: DmarcResult | null = null
  let error: string | null = null
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
    <Layout title="DMARC validator — mikepage.nl">
      <ToolShell tool={dmarcValidator}>
        <form method="get">
          <input type="text" name="domain" placeholder="example.com" value={domain} required />
          <button type="submit">Validate</button>
        </form>
        {error && <p class="err">{error}</p>}
        {result && result.records.length === 0 && (
          <p class="err">
            No DMARC record found at <code>_dmarc.{domain}</code> — anyone can spoof this domain unnoticed.
          </p>
        )}
        {result && result.records.length > 1 && <p class="err">Multiple DMARC records found — receivers must ignore all of them. Keep exactly one.</p>}
        {result?.records.map(({ record, checks }) => (
          <>
            <pre>
              <code>{record}</code>
            </pre>
            <ul class="checks">
              {checks.map((chk) => (
                <li class={chk.level}>{chk.text}</li>
              ))}
            </ul>
          </>
        ))}
      </ToolShell>
    </Layout>
  )
})

export const dmarcValidator: Tool = {
  slug: 'dmarc-validator',
  title: 'DMARC validator',
  summary: 'Fetch a domain’s _dmarc TXT record and check the policy for common mistakes.',
  pattern: 'stateless fetch-out — TXT lookup via DNS-over-HTTPS, pure validation logic at the edge',
  router,
  engine,
}
