import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ToolShell } from '../components/tool-shell'
import type { Tool } from './types'

export function parseIPv6(input: string): bigint | null {
  const parts = input.split('::')
  if (parts.length > 2) return null
  const head = parts[0] ? parts[0].split(':') : []
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : []
  const fill = parts.length === 2 ? 8 - head.length - tail.length : 0
  if (parts.length === 2 && fill < 1) return null
  const hextets = [...head, ...Array(fill).fill('0'), ...tail]
  if (hextets.length !== 8) return null
  let value = 0n
  for (const h of hextets) {
    if (!/^[0-9a-f]{1,4}$/i.test(h)) return null
    value = (value << 16n) | BigInt(parseInt(h, 16))
  }
  return value
}

export function toHextets(value: bigint): string[] {
  const out: string[] = []
  for (let i = 7n; i >= 0n; i--) out.push(((value >> (i * 16n)) & 0xffffn).toString(16))
  return out
}

export function expand(value: bigint): string {
  return toHextets(value)
    .map((h) => h.padStart(4, '0'))
    .join(':')
}

export function compress(value: bigint): string {
  const hextets = toHextets(value)
  // find the longest run of zero hextets (length >= 2) to collapse
  let best = { start: -1, len: 0 }
  let cur = { start: -1, len: 0 }
  hextets.forEach((h, i) => {
    if (h === '0') {
      if (cur.start === -1) cur = { start: i, len: 0 }
      cur.len++
      if (cur.len > best.len) best = { ...cur }
    } else cur = { start: -1, len: 0 }
  })
  if (best.len < 2) return hextets.join(':')
  const left = hextets.slice(0, best.start).join(':')
  const right = hextets.slice(best.start + best.len).join(':')
  return `${left}::${right}`
}

const router = new Hono()

router.get('/', (c) => {
  const input = (c.req.query('address') ?? '').trim()
  let error = null
  let facts: [string, string][] = []
  if (input) {
    const [addrPart, prefixPart] = input.split('/')
    const value = parseIPv6(addrPart)
    const prefix = prefixPart === undefined ? null : Number(prefixPart)
    if (value === null) error = 'Not a valid IPv6 address. (Embedded IPv4 notation is not supported.)'
    else if (prefix !== null && (!Number.isInteger(prefix) || prefix < 0 || prefix > 128)) error = 'Prefix length must be 0–128.'
    else {
      facts = [
        ['Expanded', expand(value)],
        ['Compressed', compress(value)],
        ['As integer', value.toString()],
        ['PTR name', toHextets(value).map((h) => h.padStart(4, '0')).join('').split('').reverse().join('.') + '.ip6.arpa'],
      ]
      if (prefix !== null) {
        const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix)
        const network = value & mask
        const last = network | (~mask & ((1n << 128n) - 1n))
        facts.push(
          ['Network', `${compress(network)}/${prefix}`],
          ['First address', expand(network)],
          ['Last address', expand(last)],
          ['Addresses', prefix === 0 ? '2^128' : `2^${128 - prefix}`]
        )
      }
    }
  }
  return c.html(
    <Layout title="IPv6 utils — mikepage.nl">
      <ToolShell tool={ipv6Utils}>
        <form method="get">
          <input type="text" name="address" placeholder="2606:4700::6810:84e5 or 2001:db8::/48" value={input} required />
          <button type="submit">Analyze</button>
        </form>
        {error && <p class="err">{error}</p>}
        {facts.length > 0 && (
          <dl class="facts">
            {facts.map(([k, v]) => (
              <>
                <dt>{k}</dt>
                <dd class="mono">{v}</dd>
              </>
            ))}
          </dl>
        )}
      </ToolShell>
    </Layout>
  )
})

export const ipv6Utils: Tool = {
  slug: 'ipv6-utils',
  title: 'IPv6 utils',
  summary: 'Expand, compress, and subnet IPv6 addresses; PTR names included.',
  pattern: 'pure compute at the edge — BigInt math, zero I/O, zero latency beyond the network',
  router,
}
