# Admin catalogue workflows — 25 November 2026

Scope: the staff console. No database migration, no schema change to existing records, no storefront change.

## Findings

| Report | Cause found |
|---|---|
| "Save & next" disappears after a few products | The editor looked for neighbours inside the first 100 products of a stock-sorted list. A product outside that slice (or moved by a stock change) had no neighbours, so the buttons were not drawn. A failed lookup was swallowed with the same effect. Production showed "74 of 100+". The exact "after 4 or 5" path was not reproduced separately; both failure paths are removed. |
| "Publish all approved images" is disabled | Production ran publication in `local` mode. A run saved there waits for `npm run media:review:publish` on an operations computer. Nobody ran it, so the run stayed in Preparing (0 of 0) and the queued run disabled the button. Observed read-only on 25 November: 655 approved, 63 imported. |

## What changed

### Product editor
- "Save & next" is shown for every existing product. The next product is the following one, in catalogue order (`_id`), within the
  list the editor was opened from (view, filter, search, category), kept in the editor address.
- At the end of a list it saves and returns to the list.
- Chosen, dropped or pasted photos upload with Save and Save & next, before the product is published.
- Ctrl/Cmd+Enter saves and opens the next product. "Publish the next hidden ones too" is an opt-in, per browser tab.
- Brand options load with one request instead of up to ten.

### Products (Needs action merged in)
Merged rather than kept standalone: both screens listed the same records, and the work (add a photo, fix a name or type, publish)
needs the table's inline editing and bulk actions. `/admin/needs-action` redirects to the matching filter.

- Views: All, Live, Hidden, Out of stock, On sale, each with a count.
- Filters: Ready to go live, Missing photo, Type not chosen, Name incomplete, Brand or description missing, Prescription, Has photo.
- Category and search; 25/50/100 per page with numbered pages and a total.
- Row picture: click or drop files to add photos; optional "Go live after adding a photo".
- Type is chosen row by row. There is deliberately no bulk classification.
- **Upload many photos**: files named by PD number or barcode (`PD1234.jpg`, `PD1234_2.jpg`) are matched, reviewed and uploaded two at
  a time. Products that already have photos are not ticked. New photos replace a product's gallery; earlier assets stay in media history.
- **Make live / Hide** for selected rows, and **Make all N live** in "Ready to go live".

### Image publication
- The API runs publication unless `IMAGE_REVIEW_HOSTED_PUBLICATION=false`. It is event driven: no timers or database requests while idle.
- The worker processes only runs an administrator **starts or resumes** after this release (`hosted: true`). Deploying does not start
  the run saved on production.
- Selecting **Publish all approved images** adopts that saved run. If nothing was prepared yet it takes in everything approved so far.
- Publication adds photos only. Products do not become live: use Products → Hidden → Ready to go live afterwards.

### Other screens
Catalog import, Search, Wholesale, Website & growth tools, Image review, order detail (action column), categories (picture, product and
photo links), banners (artwork column), store settings, WhatsApp, orders (received time and waiting age), dashboard (ready and hidden
tiles) and quick search shortcuts follow the console design. "Revoke all my sessions" moved to Team & access for administrators.
Fixed: selecting table rows showed two bulk action bars.

## API additions (retained routes, additive)

| Route | Access | Notes |
|---|---|---|
| `GET /api/products/catalogue` | staff | Fixed view/filter names, bounded pages, counts, exact code lookup. |
| `GET /api/products/queue` | admin | Previous/next/position inside the same filters. |
| `POST /api/products/visibility` | admin | At most 50 IDs, idempotent, one audited transaction per product. Going live requires a complete name, General or Pharmacy medicine type, price above zero and an active record. |

The single publish switch keeps its previous behaviour, with one added refusal: a product typed `prescription` can no longer be made
live through it. `GET /api/products/needs-action` is unchanged and no longer used by the web app.

## Release notes

1. Web (Vercel) and API (Render) deploy together. Until both are live the new Products page and dashboard counts fail against the old
   API, and an old web build against the new API keeps working.
2. If Render has `IMAGE_REVIEW_HOSTED_PUBLICATION=false` set explicitly, remove it or the button stays in operations-computer mode.
3. **Before publishing the approved images, check Render outbound bandwidth** (see `RENDER_BANDWIDTH_2026-11-19.md`). The service has
   been suspended once. A 24 November review session coincided with 17–52 MB/hour for 5–17 imports per hour; the destination was never
   identified. The code path for one import is small, but this has not been measured for a 655 image run. Start it, watch the
   `net_usage` log line and the bandwidth graph, and pause if it climbs.
4. Approvals whose product name, brand, pack or photos changed since review return to **Held** instead of publishing.

## Known limits

- The API allows 120 requests per minute per client address, and server-rendered admin pages reach it from the web host's addresses.
  Fast editing can still meet "Too many requests". Uploads and bulk actions wait and continue; page loads do not. Changing the limit is
  a security setting and was left to the owner.
- "Make all N live" and bulk uploads run in the browser tab; closing it stops after the current batch. Repeating is safe.
- Bulk go-live records the current price and stock as checked, as the single switch does. Imported stock estimates should be confirmed.

## Rollback

Revert the merge. New data is limited to `catalog_audit` rows, the optional `hosted` field on publication jobs and normal media
history, all ignored by the previous release. Set `IMAGE_REVIEW_HOSTED_PUBLICATION=false` to stop server publication without a revert.

## Verification

See the pull request for the exact results.
