const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i

/** Hostname validation: dot-separated labels, at least two, no trailing dot required. */
export function isDomain(input: string): boolean {
  if (input.length > 253) return false
  const labels = input.replace(/\.$/, '').split('.')
  return labels.length >= 2 && labels.every((l) => LABEL.test(l))
}
