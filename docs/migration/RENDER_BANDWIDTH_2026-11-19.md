# Render outbound bandwidth suspension on November 19, 2026

The [Render billing dashboard](https://dashboard.render.com/billing#included-usage) showed that the Hobby workspace was suspended with no card on file. It recorded 6.9 GB against 5 GB of included outbound bandwidth, 346.93 of 750 free instance hours, and 34 of 500 build minutes. The [almina backend metrics](https://dashboard.render.com/web/srv-cv1dn5lds78s73doqjm0/metrics?t=7d) matched the workspace's displayed bandwidth total and breakdown. The backend initiated 6.34 GB of outgoing traffic and served 574 MB in HTTP responses. WebSocket and private-link usage were zero. Public server-to-service requests count toward outbound bandwidth. [Render bandwidth documentation](https://render.com/docs/outbound-bandwidth)

## Likely contributors

- The hourly baseline rose around the Nov 14 deploy of `5a8d4e6`. That release starts staff alert maintenance on the retained API. Every five seconds it scans up to 100 products, sends their IDs back to Atlas in a stock-state lookup, and runs order, payment and lease operations. At a catalogue size of roughly 7,000 products, the worker can revisit the catalogue about every six minutes while the service is awake. This recurring database traffic is a likely contributor to the baseline increase. [Notification center release](https://github.com/nbl-ahmd/almina/pull/94)
- The graph shows larger Nov 18–19 spikes approaching 200 MB per hour around image-review releases. Image-review import and publication can issue repeated Atlas operations. Standard media uploads also send image bytes to Cloudinary from Render. Image-review publication of existing assets downloads originals for integrity checks and does not upload them again. The chart groups external destinations together. Render logs were unavailable while suspended and the Atlas dashboard required sign-in, so the destination and job responsible for the spikes remain unverified.

## Prevention and verification

1. Compare Atlas `bytesIn`, request rate, and write operations with the Render hourly spikes in the same timezone. Atlas totals can include clients outside Render. Add aggregate counters for worker runs, rows processed, and encoded upload bytes by provider and operation. Exclude request bodies, database values, signed URLs, and customer identifiers. [Atlas metrics](https://www.mongodb.com/docs/atlas/review-available-metrics/)
2. Reduce idle Atlas traffic first. Separate prompt order-alert processing from periodic stock and payment reconciliation. Process changed products in bounded batches and keep a slower sweep as a safety net. Back off empty worker polls and keep active jobs responsive. Verify order, low-stock, payment alerts, and recovery after restarts before rollout.
3. If the spikes align with image-review work, batch repeated Atlas lookups and writes while preserving approval evidence, transactions, and replay checks. If actual Cloudinary uploads dominate, optimize image bytes before transfer and evaluate signed browser-to-Cloudinary uploads with server-side verification before attaching assets.
4. Track hourly service-initiated bandwidth and monthly pace after release. A 5 GB allowance is about 7 MB per hour averaged across a 30-day month. Review at 50% and 80% usage. Render offers pay-as-you-go bandwidth on Hobby with a card if continuity through overages is required. Confirm traffic sources and expected cost before changing deployment or billing settings.

The investigation used read-only dashboard and repository checks. No production settings, deployments, or data were changed.

## Follow-up implementation

The order-alert queue still checks every five seconds. With an empty queue, the fast path issues two reads without write leases or stock and payment scans. The rolling reconciliation now runs once per minute, reducing scheduled catalogue passes from up to 720 to 60 batches per hour for one continuously running backend. Bulk image publication defaults to the [local runner](IMAGE_REVIEW_2026-10-26.md#local-bulk-publication--2026-11-19), while authenticated review and small selected imports stay available in admin.

Passed 147 focused checks and 59 disposable database integration tests, including the idle command count, order alerts, payment alerts, checkout and resuming the same local publication without duplicate imports. The local admin workflow showed the saved run after reload and sent no status polling requests during a 12-second observation. Typecheck, lint, the commerce bundle, the isolated foundation build and Next.js runtime diagnostics passed. The change awaits production deployment and Render bandwidth measurement.

## Follow-up: idle traffic floor, measured (2026-11-23)

**What the numbers said.** Render showed 4.57 GB this month: 405 MB HTTP responses and **4.18 GB service-initiated** (traffic the
API sends out: mostly its requests to Atlas, plus Cloudinary, Google Merchant, Stripe and e-mail providers). Hourly outbound from
the API was 4.4–8 MB overnight with nobody using the system and 18–27 MB/hour during the working day. 5 GB a month is about 7 MB/hour.
The overnight floor alone is about 3.2 GB a month.

**Cause of the floor.** Every background worker asked the database "anything to do?" on a short timer (push 1 s, e-mail and outbox
5 s, alert worker 5 s plus a 60 s product sweep, Merchant check 60 s, embeddings 60 s, retention 30 s, image publication 1.5 s). The
earlier fix moved them to a change-stream wake with a 30 s safety interval, but that only helps while Atlas accepts the stream: Atlas
Free has restrictions on change streams and the production logs gave no sign it was active, and the measured floor matches workers
on their fast timers. Local measurement of the API's idle database commands: ~16 per minute before, ~1.5 per minute now.

**Changes (none depend on change streams):**
- Workers are woken by the API's own database writes: the MongoDB driver's command events (`monitorCommands`) fire a signal when
  this process writes to `orders` or `order_outbox` (transactions only after commit). All order writes go through this one process, so
  new orders alert instantly with no polling. The change stream remains as a second source for writes made elsewhere.
- Safety intervals: 30 s -> 120 s (outbox, push, staff e-mail, alerts); stock/payment sweep 60 s -> 5 min.
- Idle backoff (`idleBackoffLoop`) for image publication (1.5 s -> up to 15 s when idle) and embeddings (15 s -> up to 10 min).
- Google Merchant: due-check every 5 min (was 60 s), runs at most every 30 min (was 15). Retention reminders: 120 s (was 30 s).
- Stripe: settled "paid" orders are re-checked with Stripe every 15 min instead of every minute (10 orders per tick each time).
- MongoDB heartbeat 10 s -> 30 s (each monitoring `hello` is a request to every replica-set member).
- Staff sessions are cached in memory for 15 s (logout and "sign out everywhere" clear it at once), removing two reads from every
  staff request, stream and poll. Deactivated or paused accounts lose access within 15 s.
- API JSON responses over 1 KB are gzip-compressed (event streams excluded): HTTP responses were 405 MB a month.

**Trade-offs.** A write made outside this process (another service, a shell) is noticed by the safety interval (up to 2 min) or the
change stream. Low-stock alerts can lag up to 5 min. Google Merchant follows catalogue edits within about 30 min.

**Still the biggest lever, not done:** product photos (and any image-review uploads) travel browser -> Vercel -> Render ->
Cloudinary, so every uploaded photo is counted as Render outbound. Daytime hours at 18–27 MB/hour line up with staff working in
the admin console. Direct signed browser-to-Cloudinary uploads would remove that traffic; it needs a signing endpoint and a
server-side verification step, so it is scoped separately.

**How to verify after deploy:** overnight Render outbound should fall from 4–8 MB/hour to well under 1 MB/hour. If it does not,
the remaining source is outside the worker loops: check Atlas "Network" per hour and Render logs around the busiest hours.
