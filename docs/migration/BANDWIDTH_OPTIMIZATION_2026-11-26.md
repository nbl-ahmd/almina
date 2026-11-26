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
| Searches the storefront runs itself: collections, brand rows in homepage sections, brand pages, the sitemap's collection check | Up to the same window, same product tag |
| Categories and banners | 60 seconds with tag purge (unchanged) |
| Product page, searches and suggestions from what a shopper types, price-filtered and deep list pages, cart lines, checkout, store status, staff and customer reads | Never |

- The current window number is part of the cache key, so an entry is **never older than the window**. There is no
  stale-while-revalidate: a quiet page cannot show hours-old stock.
- Staff changes saved through the website purge the product or content tag at once. Changes the API makes on its own (orders
  reducing stock, background image publication) appear within the window.
- A shared search is asked for once per distinct term in a render. A degraded answer (`unavailable`) is not reused: the term is
  searched again live. Looking up a brand name from a visitor-typed `/brands/…` address stays live, so addresses cannot fill the cache.
- A browse list (including the cart's suggestion row) or a shared search can therefore show a price or stock up to one window
  old. The product page, cart lines and checkout always read current values, and order creation validates price and stock on the server as before.
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

## Production result and page searches (26 November)

Deployed as `ccb14ee`. The startup line reported `requested: ["zlib"]`, `agreed: []`, `offered: []`: **the production database
offers no compression**, so this setting cannot reduce traffic there. It is left in place because the driver then sends plain
traffic. Whether another Atlas tier compresses is not verified.

Route totals (search is `GET /api/v1/search`):

| Window ending (UTC) | All: sent / received | Search: commands, sent / received |
|---|---|---|
| 05:25 (includes startup and verification requests) | 1.68 / 7.83 MB | 241, 0.49 / 5.01 MB |
| 05:35 | 1.31 / 4.81 MB | 185, 0.38 / 3.70 MB |

Code reading explains a large part: the website searched live for terms it chose itself. One homepage render asked for twelve
collection terms (nine distinct), and collection pages, brand pages, homepage brand rows and the static sitemap did the same.
These searches are now shared as described in the cache policy. How much of the logged search traffic they account for, as
opposed to shoppers' own searches, is not known until the windows after release are read.

Sharing page searches changes only the website: no data or API change. `CATALOG_CACHE_SECONDS=0` switches it off with the other
storefront caching, or revert the change.

### After release of the shared page searches

Deployed as `3d7f756`. The pages checked returned 200 with their products. From one computer on the same morning, the homepage
took a median of about 2.7 s over six loads before the release and about 1.1 s after. Search traffic is **not shown to be
lower**: the first window without a restart or verification requests (06:28 UTC) had 38 search commands (0.07 MB sent), while
the three windows before release had 185, 36 and 523 (0.38, 0.06 and 1.04 MB). Compare whole days.

## Staff order queries

The 06:18 UTC window (it includes the restart) showed `GET /api/orders/receiving`, the admin screens' order check, sending
0.85 MB of 2.51 MB outbound, more than search; the 05:45 window showed 0.42 of 0.84 MB. The cause was the delivery-area filter
for orders saved before area metadata: it repeated the whole name normalisation once for each of 182 areas.

The filter now normalises the typed name once and tests it against the names of the requested areas. A name shared by several
areas still matches none. Bytes one order check sends, measured on a disposable local database (the branch cases use a synthetic
routing setup with ten areas on one branch):

| Who is checking | Before | After |
|---|---|---|
| Administrator | 144.5 KB | 23.2 KB |
| Branch staff, routing off | 145.8 KB | 24.5 KB |
| Branch staff, routing on | 798.8 KB | 35.6 KB |
| Fallback branch staff, routing on | 1449.6 KB | 43.1 KB |

The same filter builds the address-review list, and with branch routing active it also scopes branch staff's order list, order
detail, status changes, card payment actions and notifications. `order-area-scope-integration` checks that it selects exactly the
orders the previous filter and the JavaScript resolver select, for every area and several area sets, inside and outside the set.
No data, index or schema change; reverting the commit restores the previous filter. Whether branch routing is active in
production was not checked.

### After release of the order filter

Deployed as `d23e0dc`. Production `net_usage` windows, six database commands to one administrator order check:

| Window ending (UTC) | Order checks | Sent for `GET /api/orders/receiving` | Per check |
|---|---|---|---|
| 06:38, before | about 18 | 2.54 of 4.91 MB | about 141 KB |
| 07:09, after (includes the restart) | about 4 | 0.09 of 14.31 MB | about 22 KB |
| 07:19, after | about 9 | 0.20 of 4.50 MB | about 22 KB |

Search was still the largest route at 07:19 (798 commands, 1.53 MB sent). Where those searches come from is not known.

## Stock alert recheck

In the 07:09 window background work (`worker`) sent 11.55 of 14.31 MB outbound: about 6,600 each of product, alert-rule and
stock-state reads, stock-state writes and transaction commits. The stock sweep observed every product, one transaction each,
when its last check was over 24 hours old, so a catalogue checked together came due together. On 25 November the 06:53 UTC
window, about a day earlier, sent 32.39 MB to the database against 2.5–5.4 MB in the windows around it. The same recheck is the
likely cause: the restarts at 05:16 and 06:08 UTC on 26 November, less than a day later, ran only about 700–800 `worker` commands,
and the 07:19 window was back to 2,106. The size differs from 25 November and it is not confirmed.

For a product that is not low and has not changed, that observation only moved its check time. The daily recheck now applies to
low stock only, where it extends the open alert's expiry and restores a missing alert. A changed stock value, low state or alert
rule is observed at once, as before. A product with no stock value is no longer seen as changed on every sweep. The sweep still
only reads products; alerts, stock and prices behave as before.

One day-old sweep of 1,000 synthetic products, 100 of them low, on a disposable local database:

| | Before | After |
|---|---|---|
| Sent to the database | 1,910 KB | 339 KB |
| Commands | 5,330 | 830 |
| Transactions | 1,000 | 100 |

The production saving depends on how many products are low and is not measured until this is deployed.

### After release of the stock recheck

Deployed as `1cd5c5e`. The window ending 08:01 UTC (includes the restart): `worker` ran 1,931 commands and sent 1.17 MB, and
about 7 order checks sent 0.16 MB. The recheck saving cannot be seen before about 07:00 UTC on 27 November, when the products
checked on 26 November come due again.

Stock sweeps (about 0.6 MB sent per full pass) appeared in windows with staff activity and not in the quiet windows looked at.
Product or order saves more than 30 seconds apart probably start them; the logs do not record the trigger.

## Crawler traffic on the search page

Website request counts by route (web host observability, UTC):

| Period | `/search` | Homepage | Product pages |
|---|---|---|---|
| 16–22 November | 22,474 | – | – |
| 23 November to 26 November 08:00 | 20,658 | 668 | 3,902 |

About 99% of the second period's search requests carried crawler user agents: GPTBot 8,792, MJ12bot 7,836, EDPCompanyIndex
2,073, Bytespider 987, SERankingBacklinksBot 497, ClaudeBot 226. Each request runs a live API search, and API search database
commands rose with them. From two bursts, one crawler search costs up to about 11–12 KB of API outbound (database commands plus
the compressed response), roughly 60–75 MB a day at that rate. This is an estimate from 10-minute windows that only roughly
align. The route was also about half of the website's transfer (518 of 988 MB) and 44% of its function CPU in the second period.

Many large shops keep crawlers out of their search results. `robots.txt` files read on 26 November that block them for all
crawlers: Life Pharmacy, Aster, Boots, Walmart, Target, eBay, Etsy (keyword searches), iHerb and Gymshark. Amazon has no such
general rule but blocks several AI crawlers entirely. It is not universal: no such rule was found for Best Buy or two Shopify
stores, and [Shopify's current default file](https://help.shopify.com/en/manual/promoting-marketing/seo/editing-robots-txt) is
reported not to disallow `/search`. Our search results are `noindex`, so crawling them gives no search benefit.
Google describes robots.txt blocking for [faceted and low-value URLs](https://developers.google.com/crawling/docs/faceted-navigation).

**Change (owner decision: every automated client off the search page).**

1. `robots.txt` disallows `/search` (and `/api/`) for all crawlers. This reverses, for search results only, the earlier choice to
   let crawlers read excluded pages and see their `noindex`; a blocked address linked from elsewhere can still be listed without
   content. Every other page stays open.
2. The website refuses `/search` with 403, before any search runs, when the user agent names a crawler or script (or is empty).
   Link previews that read one shared page (WhatsApp, Facebook, X, Telegram, Slack, LinkedIn, Discord, Skype) are allowed
   through; those that obey `robots.txt` will still not fetch it. Shoppers' browsers and in-app browsers are unaffected.

A client that copies a browser's user agent is not recognised by either measure. Plain Node requests (`node`) and headless
Chrome are also allowed, because the release and browser checks send them. `/products?q=` and `/offers?q=` still run searches
for any client. Limiting how fast one address may search needs a web-host firewall rule, an account configuration change that
has not been made. The refusal still costs one small proxy run on the
web host. Crawlers may take about a day to re-read `robots.txt`.

## Verify after deploy

1. Compare `net_usage` totals for similar periods before and after, and the `GET /api/v1/search` and
   `GET /api/orders/receiving` routes against the windows above. None of the saving from compression is expected on this database.
   Open the admin order screen and confirm the pending and address-review counts are unchanged.
2. Read the `db` entries to find the largest commands. About a day after the last full recheck, compare the `worker` route and
   count the `staff_stock_state` updates: they should be near the number of low-stock products.
3. Upload one banner, one category picture and one poster, and send one WhatsApp template with the new poster address.
4. After release, check that a browser gets `/search` and a crawler user agent gets 403. After a day, count `/search` requests by
   user agent and status on the web host, look for browser-like clients searching unusually often, and compare a whole day's API
   bandwidth with 301–378 MB.

## Not verified

A whole day's production bandwidth saving, the effect of the lighter stock recheck in production, whether another database tier
compresses, whether crawlers follow the new rule, how much search traffic comes from disguised clients, real Cloudinary uploads for the new artwork kinds, WhatsApp
accepting the new poster address, and web-host cache usage.
