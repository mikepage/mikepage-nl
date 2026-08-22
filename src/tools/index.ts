import type { Tool } from './types'
import { dnsLookup } from './dns-lookup'
import { dmarcValidator } from './dmarc-validator'
import { spfValidator } from './spf-validator'
import { dnsDiscovery } from './dns-discovery'
import { rdapLookup } from './rdap-lookup'
import { smtpSubmissionTest } from './smtp-submission-test'
import { browserinfo } from './browserinfo'

export const tools: Tool[] = [dnsLookup, dnsDiscovery, dmarcValidator, spfValidator, rdapLookup, smtpSubmissionTest, browserinfo].sort(
  (a, b) => a.title.localeCompare(b.title)
)
