---
name: r2
description: Cloudflare R2 object storage — wiring bucket bindings (including the jurisdiction gotcha), public access via custom domains vs r2.dev, the S3-compatible API endpoint scheme for local analysis (aws cli / rclone), object key design, and wrangler r2 commands. Use when adding an R2 bucket to a Worker, inspecting or copying objects, debugging why a public object URL 404s, connecting to R2 from a local machine, or designing object key prefixes.
---

# R2 object storage

## Bindings

Declare the bucket in `wrangler.jsonc`; the Worker reads/writes through the binding, never through credentials:

```jsonc
{ "r2_buckets": [{ "binding": "MEDIA", "bucket_name": "my-bucket" }] }
```

```ts
await c.env.MEDIA.put(key, body)
const obj = await c.env.MEDIA.get(key) // null if missing
```

**Jurisdiction gotcha:** a bucket created with a jurisdiction (e.g. EU) must declare it in the binding too — `"jurisdiction": "eu"` — or the binding resolves to a non-existent default-jurisdiction bucket of the same name and every `get` returns null. The same applies to the S3 endpoint (below) and to `wrangler r2 object` commands (`--jurisdiction eu`).

Prefer one bucket **per environment** (`my-bucket`, `my-bucket-staging`, `my-bucket-development`) over shared buckets with environment prefixes — bindings stay identical across env blocks and a staging experiment can never touch production bytes.

## Public access

- **Custom domain (recommended):** attach a domain to the bucket (dashboard → R2 → bucket → Settings → Public access, or `wrangler r2 bucket domain add`). Public URLs become `https://files.example.com/{key}`. Store the key, compute the URL from the environment's host — never persist absolute URLs across environments.
- **`r2.dev` managed URL:** fine for experiments; rate-limited and not for production. Disable it when a custom domain is attached.
- A public-URL 404 with the object present usually means: wrong host for this environment, jurisdiction mismatch, or the key was stored URL-encoded.

## Object key design

- Namespace by owner first: `users/{id}/…` or `organizations/{uuid}/…` — isolation and bulk operations (list, delete, GC) become prefix operations.
- Make keys immutable and unique (append a timestamp/uniqid segment); overwrite-in-place fights caching on public domains.
- R2 has no directories — "folders" are just key prefixes; `list({ prefix, delimiter: '/' })` simulates them.

## Connecting locally (analysis, bulk copy)

- **S3-compatible API — recommended for listing / analysis / bulk copy.** Create an R2 API token (Object Read, add Write for copies), then:
  ```sh
  export AWS_ACCESS_KEY_ID=<r2-access-key>
  export AWS_SECRET_ACCESS_KEY=<r2-secret>
  ENDPOINT=https://<account-id>.r2.cloudflarestorage.com   # jurisdiction buckets: <account-id>.eu.r2.cloudflarestorage.com

  # inventory a prefix (count + total size)
  aws s3 --endpoint-url "$ENDPOINT" ls s3://my-bucket/some-prefix/ --recursive --summarize --human-readable

  # server-side copy (no download)
  aws s3 --endpoint-url "$ENDPOINT" cp s3://my-bucket/a/key s3://other-bucket/a/key
  ```
  `rclone` works too (`type = s3`, `provider = Cloudflare`, same endpoint) and is convenient for large mirrors.

- **wrangler** (no S3 keys — uses your `wrangler login`). Bucket-admin commands are reliable; object get/put has been flaky against jurisdiction namespaces, so prefer the S3 API for object work:
  ```sh
  wrangler r2 bucket list
  wrangler r2 bucket domain list my-bucket
  wrangler r2 object get my-bucket/<key> --file out
  ```

- **Public read** (no auth) for a single object you know the key of: `curl -I https://files.example.com/<key>`.

## Lifecycle and cleanup

- Nothing reclaims orphaned objects automatically — deleting a database row does not delete its object. Either delete the object on the same write path that deletes the row, or run a periodic GC (cron trigger) that lists a prefix and deletes unreferenced keys.
- A GC should never delete on one observation: require an object to be unreferenced on two consecutive runs and older than a grace period, so in-flight uploads and freshly written references survive.
