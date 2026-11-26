# API bandwidth: compression, shorter responses, bounded caching and direct artwork uploads — 26 November 2026

## Why

Render bills the API's outbound traffic. In logged `net_usage` windows on 25–26 November (a sample, not a month) it went about 64%
to the database, 36% to web responses and 0.2% to Cloudinary, Google, Stripe, e-mail and push together. Product photos had already
been going straight to Cloudinary since 24 November. Earlier proxied photo uploads may have contributed to the November
suspension; that was never established.

## Changes

1. **Database compression.** The production client (`operations/runtime.ts`) and the standalone client ask for `zlib`, which is
   built into the driver. It compresses traffic in both directions **only if the server agrees. On the production cluster it has not
   reduced traffic** ([observation below](#production-observation-26-november)).
2. **Command meter.** Each `net_usage` line also carries `db`, the commands and collections that moved the most bytes in that
   window, and `routes`, the route patterns that caused the database work (names, counts and totals only; sizes are measured before
   compression). `NET_USAGE_LOG=false` turns off both.
3. **Compact browse records.** Shopper list requests send `x-catalog-view: card`. The API then leaves out description,
   ingredients, usage, warnings, storage, SEO text and internal media/review fields. Product pages, staff reads and clients that do
   not send the header are unchanged; an older API ignores the header. On a 100-product public sample the same fields were 38% of
   the JSON (41% after gzip).
4. **Bounded caching** (below).
5. **Direct artwork uploads** (below).
6. The brands page checks built-in names against the one brand list instead of searching once per name. Sitemaps stay on the edge
   cache for an hour instead of five minutes.

## Cache policy

| Read | Reuse |
|---|---|
| Browse lists: first five pages, no price filter | Up to `CATALOG_CACHE_SECONDS` (default 60) |
| Published storefront content: homepage layout, campaigns, custom and brand pages, pharmacy details, shipping policy, brand list | Up to the same window |
| Public offer popup and coupon list | Up to the same window |
| Categories and banners | 60 seconds with tag purge (unchanged) |
| Product page, search, price-filtered and deep list pages, cart lines, checkout, store status, staff and customer reads | Never |

- The current window number is part of the cache key, so an entry is **never older than the window**. There is no
  stale-while-revalidate: a quiet page cannot show hours-old stock.
- Staff changes saved through the website purge the product or content tag at once. Changes the API makes on its own (orders
  reducing stock, background image publication) appear within the window.
- A browse list (including the cart's suggestion row) can therefore show a price or stock up to one window old. The product page,
  cart lines and checkout always read current values, and order creation validates price and stock on the server as before.
- `CATALOG_CACHE_SECONDS=0` on the web host turns the new caching off (allowed 0–300). Browser tests run with it off;
  `smoke:catalog-cache` covers it on.
- The cache uses the web host's data cache; watch its usage there.

## Image upload and delivery audit

| Picture | Path now |
|---|---|
| Product photos (editor, new product, list quick-add, bulk) | Browser → Cloudinary (since 24 November) |
| Banners, desktop and phone | Browser → Cloudinary (new) |
| Campaign, homepage section, popup and brand artwork; e-mail artwork | Browser → Cloudinary (new) |
| Category pictures | Browser → Cloudinary (new); stored in `categories.cloudinaryImages` |
| WhatsApp posters | Browser → Cloudinary as JPEG (new); the table shows the address to use as the template image |
| Image review | JSON maps only. The API reads originals from Cloudinary to check them; it uploads no image bytes |

`POST /api/media/artwork/sign` returns tickets pinned to a server-chosen public id, one format and no overwrite.
`POST /api/media/artwork/commit` looks each asset up with Cloudinary's authenticated API and records it once (`media_uploads`
receipt). Marketing artwork is staff work; the other kinds require an administrator.

Kept for compatibility and no longer used by the admin screens: multipart pictures on `/api/products`, `/api/categories`,
`/api/banners`, `/api/whatsapp/image`, `/api/media/products/:id` and `/api/media/marketing`.

Pictures saved before this change stay where they are. Older category and poster pictures held in Drive are still read through the
API; newer ones redirect to storage. A template that still uses an old poster address keeps fetching it from the API: replace it with
the new storage address.

## Deploy and rollback

- Deploy the API and website together. While only the website is new, artwork uploads fail with a retry message.
- New optional fields only; no migration or backfill.
- Rolling back: pictures for categories and posters added after this release will not show on the previous release (it looks for a
  legacy file or Drive entry). Re-upload them there. Banners, products and marketing artwork are unaffected.

## Production observation (26 November)

Deployed as `6bbde08`. In the first two `net_usage` windows, bytes on the wire to and from Atlas matched the size of the commands
and replies before compression:

| Window ending (UTC) | Wire out / in | Size before compression, eight busiest commands (sent / received) |
|---|---|---|
| 04:13 (includes startup work) | 1.63 / 10.70 MB | 1.42 / 10.54 MB |
| 04:23 | 1.36 / 4.83 MB | 1.31 / 4.75 MB |

Compressed catalogue data would be several times smaller. A local check over TLS shows the meter counts compressed bytes (2.24 MB
of documents arrived as 0.03 MB), so this is not a measurement error. **The cause is unconfirmed.** The likeliest is that the
production server does not agree to compression; the Atlas tier pages read on 26 November neither promise nor exclude it. Leaving
the setting in place costs nothing, because the driver then sends plain traffic.

The API now logs one `database_compression` line at startup (algorithm names only):

| Field | Meaning | If it shows… |
|---|---|---|
| `requested` | What the connected client asks for, after connection-string settings | no `zlib`: the production configuration overrides it; fix the setting |
| `agreed` | What the server reports as agreed for the connection | empty, with uncompressed windows: nothing was agreed |
| `offered` | What the server answers with when asked about zstd, snappy and zlib | only `snappy` or `zstd`: add that one package to `backend`; empty: this tier does not compress, and only another tier would |

These replies were checked against a local MongoDB server only. If `agreed` lists `zlib` while traffic stays uncompressed,
investigate the path between the server and Atlas.

No bandwidth saving from compression should be assumed until that line and later windows show otherwise. In the second window,
422 product `aggregate` commands sent about 1.15 MB of the 2.07 MB total outbound (about 56%, roughly 2.7 KB each), so the
number and size of those queries is the largest billed item seen so far. Replies are inbound: free on Render, but counted against
the Atlas weekly transfer limit. Which requests drive the queries is not yet known.

## Which pages cause the queries

Each request is labelled with its route pattern (the retained route policy, or the first two words of an `/api/v1` path) and the
database work it triggers is counted against that label; start-up and background jobs count as `worker`. Identifiers, phone
numbers, e-mail addresses and query strings are never recorded.

Read `routes` over a busy and a quiet period before optimising further:

- mostly public product routes → cache those reads in the API, cleared by its own product, category and store writes, and reduce
  the queries per product page;
- mostly staff routes or `worker` → optimise those screens or jobs instead.

A large `worker` share does not by itself mean background jobs are expensive: it also includes anything outside an Express request,
such as realtime (Socket.io) connection checks and the live order feed's reads that a new write triggers.

No API-side cache is built yet, deliberately: the website already shares browse lists, and a second cache needs this evidence and
its own stock-freshness design.

Measured locally, the command itself is billed outbound: a browse list sends about 3.7 KB (the ranking step about 1.0 KB, the
field list about 0.9 KB), and each product-page query 2.0–2.6 KB. Shrinking these, or running fewer, is the next lever once
`routes` shows which pages matter.

Responses need no change: the API compresses when asked (a 30-product list: 38.5 KB to 4.4 KB). Plain Node `fetch` asks for
`gzip`, and the website's server `fetch` is built on it (not observed on the hosted website).

## Verify after deploy

1. Compare `net_usage` totals for similar periods before and after. No saving has been measured yet, and none from compression
   is expected until the server agrees to it. Read the `database_compression` startup line.
2. Read the `db` entries to find the largest commands, including any burst like the unexplained 32 MB window at 06:53 UTC on
   25 November.
3. Upload one banner, one category picture and one poster, and send one WhatsApp template with the new poster address.

## Not verified

Any production saving, the reason compression is not applied, real Cloudinary uploads for the new artwork kinds, WhatsApp accepting the new poster address,
and web-host cache usage.
