import { describe, it, expect } from 'vitest'
import { isDomain, isDnsName } from '../src/lib/domain'
import { negotiate } from '../src/lib/negotiate'
import { unquoteTxt } from '../src/lib/doh'

describe('isDomain', () => {
  it('accepts real domains', () => {
    expect(isDomain('example.com')).toBe(true)
    expect(isDomain('sub.example.co.uk')).toBe(true)
  })
  it('rejects junk, single labels, and IP literals via underscore/labels', () => {
    expect(isDomain('notadomain')).toBe(false)
    expect(isDomain('')).toBe(false)
    expect(isDomain('_spf.example.com')).toBe(false) // underscore not allowed for user input
  })
})

describe('isDnsName', () => {
  it('allows underscore labels used in SPF/DKIM/DMARC', () => {
    expect(isDnsName('_spf.example.com')).toBe(true)
    expect(isDnsName('selector1._domainkey.example.com')).toBe(true)
  })
})

describe('negotiate', () => {
  it('picks markdown from a .md suffix and strips it', () => {
    expect(negotiate('post.md')).toEqual({ id: 'post', format: 'markdown' })
  })
  it('picks markdown from the Accept header', () => {
    expect(negotiate('post', 'text/markdown')).toEqual({ id: 'post', format: 'markdown' })
  })
  it('defaults to html', () => {
    expect(negotiate('post', 'text/html')).toEqual({ id: 'post', format: 'html' })
    expect(negotiate('post')).toEqual({ id: 'post', format: 'html' })
  })
})

describe('unquoteTxt', () => {
  it('joins multi-string TXT records and strips quotes', () => {
    expect(unquoteTxt('"v=spf1 " "include:_spf.example.com ~all"')).toBe('v=spf1 include:_spf.example.com ~all')
    expect(unquoteTxt('"single"')).toBe('single')
  })
})
