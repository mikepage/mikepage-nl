export interface Component {
  name: string
  tagline: string
  eli5: string
  laravel: string
  symfony: string
}

export const components: Component[] = [
  {
    name: 'Workers',
    tagline: 'Serverless functions that run at the edge, close to your users.',
    eli5: 'Tiny programs that live in hundreds of cities around the world. When someone visits, the nearest one wakes up, does the work, and answers — so it feels fast for everyone.',
    laravel:
      'Your route + controller layer, but deployed to every edge location instead of one box. No Nginx or PHP-FPM to manage — you export a fetch handler and it runs globally, with near-zero cold starts. Think routes/web.php running in every city at once.',
    symfony:
      'Your HttpKernel turning a Request into a Response, but running on V8 isolates at the edge rather than PHP-FPM behind Nginx. Nothing to provision: deploy a fetch handler and it runs in every PoP.',
  },
  {
    name: 'D1',
    tagline: 'A serverless SQLite database.',
    eli5: 'A place to keep rows and tables, like a spreadsheet the computer can search through very quickly.',
    laravel:
      'SQLite you talk to with SQL. Like your default database connection, but serverless — you bind it and run db.prepare(sql).bind(...).all(). Migrations still apply, as D1 migrations.',
    symfony:
      'A serverless SQLite database. Point Doctrine DBAL at it, or use the native binding with prepared statements. Your migrations map onto D1 migrations.',
  },
  {
    name: 'KV',
    tagline: 'A low-latency, read-optimized, eventually-consistent key-value store.',
    eli5: 'A giant set of labeled boxes copied to every city. Reading the same box anywhere is super fast, but a change takes a moment to reach every city.',
    laravel:
      'Like the Cache facade with global reach — ideal for config, feature flags, and lookups. It is eventually consistent, so do not use it for read-your-own-write critical data.',
    symfony:
      'A distributed cache pool (PSR-6/16 in spirit) optimized for edge reads. Great for cacheable config and flags; not a source of truth when you need immediate consistency.',
  },
  {
    name: 'R2',
    tagline: 'S3-compatible object storage with no egress fees.',
    eli5: 'A huge closet for files — images, videos, backups — reachable from anywhere, and cheap to take things back out.',
    laravel:
      'Your S3 Storage disk, minus the egress bill. Point Flysystem’s S3 adapter at the R2 endpoint, or skip it and use the native binding: MEDIA.put(key, body) / MEDIA.get(key).',
    symfony:
      'Flysystem or the AWS S3 client against an S3-compatible endpoint, without egress costs — or call the Worker binding’s put/get directly.',
  },
  {
    name: 'Durable Objects',
    tagline: 'Single-instance stateful actors with built-in storage, for coordination.',
    eli5: 'A special helper that remembers things and is guaranteed to be the only one of its name — perfect when everyone has to agree, like a shared whiteboard or a game room.',
    laravel:
      'A singleton that is globally unique per key and keeps its own transactional SQLite storage — for websockets, locks, counters, rooms. No clean Laravel equivalent: closest is a cache lock plus a dedicated model, but a DO gives you real single-writer consistency.',
    symfony:
      'A stateful service instance addressed by id, single-threaded, with transactional SQLite storage — an actor. You would normally combine Redis locks with a websocket server (Mercure/Ratchet); a Durable Object replaces both.',
  },
  {
    name: 'Queues',
    tagline: 'Managed message queues with batching, retries, and dead-letter support.',
    eli5: 'A to-do list the computer works through in the background, so slow jobs don’t keep visitors waiting.',
    laravel:
      'Practically Laravel Queues. A producer’s QUEUE.send() is dispatch(); the consumer’s queue() handler is your job’s handle(). Batching, retries, and a dead-letter queue are built in.',
    symfony:
      'Symfony Messenger with a managed transport. send() dispatches a message; the consumer handler is your message handler. Batch size and retries are config, like Messenger’s retry strategy.',
  },
  {
    name: 'Workers AI',
    tagline: 'Run open models — LLMs, embeddings, vision — on Cloudflare’s GPUs via a binding.',
    eli5: 'A robot brain you can ask questions or show pictures to, without owning a giant expensive computer.',
    laravel:
      'Like calling an AI SDK, but as a first-class binding: AI.run("@cf/meta/llama-…", input), billed per use with no API keys to manage. Pair it with Vectorize for retrieval-augmented answers.',
    symfony:
      'An inference service exposed as a binding — call AI.run(model, input) from your handler. Comparable to wiring an HTTP AI client, minus the credentials and egress.',
  },
]
