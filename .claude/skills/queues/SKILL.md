---
name: queues
description: Cloudflare Queues — configuring producers/consumers in wrangler.jsonc, how to inspect queues with wrangler, where backlog and throughput metrics actually live (not in wrangler), the platform hard limits, and how to read a "Queue is overloaded (10250)" backpressure error. Use when adding a queue to a Worker, inspecting or listing queues, diagnosing a stuck or slow queue consumer, tuning max_batch_size / max_concurrency / max_retries, investigating a message that never arrived, or when a producer's send() throws.
---

# Cloudflare Queues

A queue sits between a producer binding (`QUEUE.send()` / `sendBatch()`) and a consumer Worker exporting a `queue()` handler. Both sides are declared in `wrangler.jsonc`:

```jsonc
{
  "queues": {
    "producers": [{ "binding": "MY_QUEUE", "queue": "my-queue" }],
    "consumers": [{ "queue": "my-queue", "max_retries": 3, "max_batch_size": 10, "max_concurrency": 5 }]
  }
}
```

Local development (`wrangler dev`) simulates queues in-process; production behavior (concurrency, retries under load) only shows remotely.

## Consumer tuning

- `max_batch_size: 1` + higher `max_concurrency` is the right shape when each message is an independent slow job (e.g. one fetch per message): a burst runs in parallel instead of waiting for a batch to fill.
- Keep `max_concurrency` low when messages fan out to third parties you shouldn't hammer.
- A consumer that records a failure durably (e.g. writes a "failed" row) should **ack** rather than retry — otherwise a retry produces a second recorded failure for one outage. Let only unexpected crashes retry.
- **Without a `dead_letter_queue`, a message that exhausts `max_retries` is dropped silently.** When diagnosing "the job never ran", suspect this first — there is no evidence left behind, only the consumer's `console.error` in the logs. Add a DLQ so exhausted messages are inspectable.

## Inspecting

```sh
npx wrangler queues list       # all queues, ids, producer/consumer counts
npx wrangler queues info <name> # one queue's metadata
```

**Neither reports backlog, throughput, or message age.** `queues info` returns name, id, timestamps, and producer/consumer counts — nothing about depth. Do not read "1 consumer" as "healthy".

Backlog and throughput come from one of two places:

1. **Dashboard** — Cloudflare → Workers & Pages → Queues → *queue* → Metrics. Backlog size, messages in/out, and consumer errors over time.
2. **GraphQL Analytics API** — the `queueBacklogAdaptiveGroups` and `queueMessageOperationsAdaptiveGroups` datasets. Needs an API token with Account Analytics read.

To watch a consumer live: `npx wrangler tail <worker> --format pretty`. Have consumers log one line per message — it's the fastest way to tell "not consuming" from "consuming and failing".

## Platform hard limits

From the [Queues limits docs](https://developers.cloudflare.com/queues/platform/limits/) — check there before relying on a number, they move:

| Limit | Value |
|---|---|
| Throughput per queue | 5,000 messages/sec |
| Backlog per queue | 25 GB |
| Message size | 128 KB |
| `sendBatch` per call | 100 messages, or 256 KB total |
| Consumer batch size | 100 messages |
| Batch wait time | 60 seconds |
| Concurrent consumer invocations | 250 (push-based) |
| Consumer wall clock / CPU | 15 min / 5 min (default 30 s) |
| Message retries | 100 |
| Retention | up to 14 days |
| Queues per account | 10,000 |

`max_concurrency` is capped at 250 and `max_batch_size` at 100 — a config above either is rejected at deploy.

## Backpressure: "Queue is overloaded. Please back off. (10250)"

Rather than let a backlog grow unbounded, Cloudflare refuses new writes so the pressure propagates back to the producer — `send()` / `sendBatch()` **throws** instead of accepting the message.

It is a signal, not a crash. Reading one:

- **It is about the queue being written to, not the code that threw.** A `send()` that fails with 10250 means *that* queue is backed up — trace the binding, not the caller.
- **Do the arithmetic before blaming a burst.** Against 5,000 messages/sec, a few dozen sends is nothing. A 10250 on small volume means a standing backlog or a consumer that stopped draining, not the burst in front of you.
- **A `send()` in a success path can invert an outcome.** If the enqueue is inside the same `try` that already recorded success, a throw lands in the catch and rewrites a good result as failed. Keep post-success fan-out out of the path that decides the outcome, or wrap it.

Relief, cheapest first:

1. **Batch** — replace a per-item `send()` loop with one `sendBatch()` (≤100 messages / 256 KB).
2. **Drain faster** — add or raise `max_concurrency` on the consumer.
3. **Back off** — wrap the producer in retry-with-backoff so a refusal delays rather than fails.
4. **Add a `dead_letter_queue`** so exhausted messages are inspectable instead of dropped.
