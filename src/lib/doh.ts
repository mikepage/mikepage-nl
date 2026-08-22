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
