---
name: custom-domains
description: Putting a Worker (or a site served by one) on a real domain — Workers custom domains vs routes, the DNS records involved, why the zone should live on Cloudflare, apex CNAME flattening, DNS-only vs proxied, and the Universal SSL / ACME-delegation conflict that silently stalls certificates on SaaS-style custom hostnames. Use when attaching a domain to a Worker, when a domain stalls before the hostname goes active or the certificate issues, or when someone proposes running DNS on another provider or a registrar's forwarding/redirect service.
---

# Custom domains

## Workers custom domains (the simple case)

For a Worker on a zone you control on Cloudflare, use a **custom domain** — Cloudflare creates the DNS record and certificate for you:

```jsonc
// wrangler.jsonc
{
  "routes": [
    { "pattern": "example.nl", "custom_domain": true },
    { "pattern": "www.example.nl", "custom_domain": true }
  ]
}
```

Deploy, and the hostname + cert provision automatically (also available in the dashboard: Workers → *worker* → Settings → Domains & Routes). Use a **route** (`"pattern": "example.nl/api/*", "zone_name": "example.nl"`) instead when the Worker should handle only part of a site's traffic; a custom domain claims the whole hostname.

The Worker keeps serving on its `workers.dev` host throughout, so the domain can be attached before anyone switches over — cutover is seamless. To hide the old host afterwards, disable the `workers.dev` route (`"workers_dev": false`).

## Host DNS on Cloudflare

**Keep the domain's DNS on Cloudflare.** Where the domain is *registered* does not matter — only its nameservers move. Cloudflare handles the two things a bare domain needs that generic DNS panels fight you on:

- A pointer at the **zone apex**, where a plain CNAME is illegal — Cloudflare flattens apex CNAMEs.
- **ACME delegation records** that resolvers follow instead of answering, letting certificates renew for years without touching DNS.

**Never a forwarding/redirect service** in place of an apex pointer: those answer HTTP only, and browsers reach for HTTPS first, so the bare domain lands on nobody.

## SaaS-style custom hostnames (hosting other people's domains)

When a Worker serves sites on domains in *other* zones (Cloudflare for SaaS custom hostnames), the customer's DNS publishes three things: where traffic goes, proof of ownership, and permission for the certificate to issue. For `example.nl` pointing at your fallback origin:

| Purpose | Name | Type | Value |
|---------|------|------|-------|
| Traffic, root | `example.nl` | CNAME (flattened) | your fallback origin host |
| Traffic, www | `www.example.nl` | CNAME | your fallback origin host |
| Ownership | `_cf-custom-hostname.example.nl` | TXT | per-hostname value |
| Certificate | `_acme-challenge.example.nl` | CNAME | `example.nl.<your-dcv-id>.dcv.cloudflare.com` |

(Ownership + certificate rows repeat for `www`.) Every record set to **DNS only** — a proxied record is answered by Cloudflare instead of being followed, and both the pointer and the delegation need to be followed. The certificate records are *delegations*, not one-off tokens — that's what makes renewal touch-free.

### The Universal SSL conflict

If the customer's zone is itself on Cloudflare with **Universal SSL enabled**, that zone validates its own certificate at exactly the `_acme-challenge` name the delegation needs — and a DNS name holds either a TXT or a CNAME, never both. Those TXT values are Cloudflare-managed and **invisible in the DNS panel**, so the panel shows a correct delegation while resolvers answer with certificate tokens. Fix: switch **Universal SSL off** on that zone (SSL/TLS → Edge Certificates).

Order matters, because the zone certificate may be the one actually serving the site:

| That zone's certificate says | Do this |
|---|---|
| Active | Publish the delegation, wait until the custom hostname reports secure, then switch Universal SSL off. Nothing is interrupted. |
| Pending validation | Switch Universal SSL off first — it is holding the name and serving nobody. |

Leaving it on indefinitely costs most: an active zone certificate republishes its validation record at every renewal, taking the name back and stalling the real certificate a quarter later.

## Diagnosing a stalled domain

Two `dig` answers tell you where it stands:

- The apex/www pointer resolving to your host → traffic is arriving.
- The `_acme-challenge` name answering with a **delegation** (CNAME) → the CA can complete its check. Answering with a plain TXT value instead means something else owns that name — on a Cloudflare zone, that's Universal SSL.
