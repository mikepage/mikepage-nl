const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i
// SPF include / DKIM / DMARC targets legitimately use underscore-prefixed labels.
const DNS_LABEL = /^_?[a-z0-9]([a-z0-9-_]{0,61}[a-z0-9])?$/i

/** Hostname validation for user input: dot-separated labels, at least two, no trailing dot required. */
export function isDomain(input: string): boolean {
  if (input.length > 253) return false
  const labels = input.replace(/\.$/, '').split('.')
  return labels.length >= 2 && labels.every((l) => LABEL.test(l))
}

/** Looser check for DNS names encountered while resolving (SPF includes, etc.) — allows underscores. */
export function isDnsName(input: string): boolean {
  if (input.length > 253) return false
  const labels = input.replace(/\.$/, '').split('.')
  return labels.length >= 2 && labels.every((l) => DNS_LABEL.test(l))
}
