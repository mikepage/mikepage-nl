export interface DohAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

export interface DohResponse {
  Status: number
  Answer?: DohAnswer[]
  Authority?: DohAnswer[]
}

export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA', 'SRV', 'PTR'] as const

export async function dohQuery(name: string, type: string): Promise<DohResponse> {
  const url = new URL('https://cloudflare-dns.com/dns-query')
  url.searchParams.set('name', name)
  url.searchParams.set('type', type)
  const res = await fetch(url, { headers: { accept: 'application/dns-json' } })
  if (!res.ok) throw new Error(`DoH query failed: ${res.status}`)
  return res.json()
}

/** TXT record data arrives as one or more quoted strings: `"part1" "part2"` — unquote and join. */
export function unquoteTxt(data: string): string {
  return data
    .split(/"\s+"/)
    .map((s) => s.replace(/^"|"$/g, ''))
    .join('')
}

export async function txtRecords(name: string): Promise<string[]> {
  const res = await dohQuery(name, 'TXT')
  return (res.Answer ?? []).filter((a) => a.type === 16).map((a) => unquoteTxt(a.data))
}

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  return (
    a === 0 || a === 10 || a === 127 || // this-host, private, loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    a >= 224 // multicast / reserved
  )
}

function isPrivateIPv6(ip: string): boolean {
  const h = ip.toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true // fe80::/10
  if (h.startsWith('fc') || h.startsWith('fd')) return true // fc00::/7 unique-local
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/) // IPv4-mapped
  return mapped ? isPrivateIPv4(mapped[1]) : false
}

/**
 * Resolve a hostname's A/AAAA records and confirm every answer is a public address.
 * Guards raw outbound connections (SSRF): rejects private, loopback, and link-local
 * ranges, and re-resolving here defeats DNS rebinding between check and connect.
 * Returns null when the host is safe, or an error message when it is not.
 */
export async function assertPublicHost(host: string): Promise<string | null> {
  // Reject IP literals outright — this tool takes hostnames, and a literal skips DNS policy.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return 'IP addresses are not accepted — enter a hostname.'
  let addrs: string[] = []
  try {
    const [a, aaaa] = await Promise.all([dohQuery(host, 'A'), dohQuery(host, 'AAAA')])
    addrs = [
      ...(a.Answer ?? []).filter((r) => r.type === 1).map((r) => r.data),
      ...(aaaa.Answer ?? []).filter((r) => r.type === 28).map((r) => r.data),
    ]
  } catch {
    return 'Could not resolve that hostname.'
  }
  if (addrs.length === 0) return 'That hostname does not resolve to any address.'
  for (const ip of addrs) {
    if (ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) return 'That hostname resolves to a private or reserved address.'
  }
  return null
}
