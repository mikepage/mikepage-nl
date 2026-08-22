export type Format = 'html' | 'markdown' | 'json'

const BY_EXT: Record<string, Format> = { md: 'markdown', json: 'json', html: 'html' }

/**
 * Resolve which representation a request wants: a trailing `.md`/`.json`/`.html`
 * on the identifier wins, otherwise the Accept header decides, else HTML.
 * Returns the identifier with any extension stripped.
 */
export function negotiate(id: string, accept = ''): { id: string; format: Format } {
  const dot = id.lastIndexOf('.')
  const ext = dot > -1 ? id.slice(dot + 1).toLowerCase() : ''
  if (ext in BY_EXT) return { id: id.slice(0, dot), format: BY_EXT[ext] }
  if (accept.includes('text/markdown')) return { id, format: 'markdown' }
  if (accept.includes('application/json') && !accept.includes('text/html')) return { id, format: 'json' }
  return { id, format: 'html' }
}
