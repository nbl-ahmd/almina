# Production performance assessment — 2026-10-03

## Scope and outcome

Measured before editing application code on `codex/production-performance`, from source baseline `codex/storefront-seo`. This pass improves the retained CRA storefront and the additive Next.js preview. It does **not** deploy either application, change production data/indexes/media, enable Next checkout, or replace production integrations.

The public production homepage was sampled at the owner-confirmed `https://www.alminapharmacy.com/`. Its deployed artifact differs from the local source: production serves `main.da5ef101.js` and still includes Google Tag Manager, a Font Awesome kit, Bootstrap JavaScript and Cloudflare Rocket Loader. The current local HTML has no analytics/widget script. Consequently, local before/after results must not be presented as deployed improvements or as the effect of this change on production users.

Key measured changes:

- CRA initial JavaScript: **291,142 → 180,206 bytes gzip, 38.1% lower**. Other routes load their own chunks when visited.
- Next catalog JavaScript: **234,597 → 143,243 transferred body bytes, 38.9% lower** on home/list pages. Cart storage validation loads on the first cart action.
- Next font body transfer: **234,160 → 132,192 bytes, 43.5% lower**. This is lossless WOFF2 encoding with all 720 glyphs / 717 mapped characters retained, rather than language subsetting.
- Warm category-page server response: **85.6 → 4.1 ms** with presentation-only data-cache reuse and the same synthetic 80 ms upstream delay.
- Disposable MongoDB featured query: **20.84 → 1.72 ms** when the already-planned index is applied to synthetic data. No production index was applied.

## Measurement method and limitations

Raw samples, chunk attribution and query scans are checked in under [`performance/`](performance/). There are five cold-browser samples per local route, three initial public-production samples, twenty sequential HTTP samples per server route, and twenty query samples per database case. Single-sample supplementary transfer captures include preloaded and cross-origin images/scripts through CDP. Timing claims use the five-sample local runs, not these supplementary captures.

Browser configuration: Chromium driven by installed agent-browser 0.38.2; fresh incognito context for every sample; 390 × 844 viewport, DPR 1, requested 4× CPU slowdown and network settings of 150 ms latency / 200,000 bytes/s download. Capture window is twelve seconds, followed by a read-only search focus/type interaction. **Chromium loopback requests do not exhibit the configured WAN latency**: local HTML TTFB is often below 10 ms. These results are local lab comparisons, not a claim of measured mobile-network or real-device performance. First samples can also include server/cache initialization. Medians are descriptive, not a statistical significance test.

The local fixture has one synthetic product, one category, no banners, and fixed 80 ms API latency. It contains no credentials, customer data, DB connection, or production writes. Its small catalog is useful for code-transfer and cache-regression comparisons, but not catalog-scale rendering/load claims. In particular, CRA's ten-item loading skeleton is replaced by one item: its large list CLS is partly fixture-specific. Synthetic SVGs do not represent production catalog image sizes. No Core Web Vitals pass for the production site is claimed.

TTFB is navigation start to response start. `serverWaitMs` and the HTTP repetition script are end-to-end response proxies, including HTTP overhead; neither is pure production server CPU time. API request logging now preserves hundredths of a millisecond, and catalog query logging records actual awaited Mongo operations separately. There was no access to production DB/APM measurements.

LCP and CLS use buffered Performance Observers; CLS uses the maximum session window and excludes recent input. `inp` is the maximum recorded event duration for the scripted interaction, with a 16 ms observation threshold. A null value means no qualifying event was recorded; it is **not zero**. The lab has no real-user interaction distribution, so production INP p75 remains unavailable. [INP depends on the interactions exercised in the lab](https://web.dev/articles/inp).

`jsTransferredBytes` uses observable Resource Timing compressed body sizes, which may omit cross-origin responses without Timing-Allow-Origin. `jsNetworkBytes` and `imageNetworkBytes` use CDP loading events and include header bytes, preload requests and cross-origin resources. Do not compare these two accounting methods as if they were identical. Next supplementary captures have canceled speculative requests (`net::ERR_ABORTED`), with zero HTTP errors and runtime exceptions.

JavaScript execution is measured as CDP `ScriptDuration`. `coveredJsCodeUnits` is best-effort V8 coverage in UTF-16 code units, collected after timing. It is an execution **proxy**, not exact executed bytes/instructions. Garbage collection and compilation affect best-effort coverage, and the CRA count can increase after splitting despite lower execution time. No executed-byte reduction is inferred from it. Precise coverage instrumentation was deliberately excluded from the timing path because it changes V8 optimization. See the [CDP Profiler](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/) and [Performance](https://chromedevtools.github.io/devtools-protocol/tot/Performance/) references.

## Production baseline — deployed homepage

| Metric | Observed baseline | Production after |
| --- | ---: | --- |
| TTFB, median of 3 | 198 ms | Pending deployment/measurement |
| LCP, median of 3 | 7,832 ms | Pending |
| CLS, median of 3 | 0.02371 | Pending |
| INP lab proxy, recorded median | 16 ms; range 16–80 ms | Real-user p75 unavailable |
| Same-origin/observable JS body | 664,704 bytes | Pending |
| All script network bytes, supplementary run | 882,450 bytes including headers | Pending |
| JS execution time, median | 906.6 ms | Pending |
| Best-effort covered JS | 391,775 UTF-16 code units | Pending |
| All image network bytes, supplementary run | 128,393 bytes including headers | Pending |
| Origin server response / DB query latency | No production APM/DB access | Pending |

Production evidence is in `production-baseline.json` and `production-transfer-baseline.json`. No checkout, cart, login or order operation was performed against production. Production image/provider inventory and backend responsiveness cannot be inferred from this homepage sample.

## Local Next.js before / after

| Metric | Home before → after | Products before → after | Product detail before → after |
| --- | ---: | ---: | ---: |
| TTFB median, ms | 94.6 → 94.4 | 9.2 → 8.2 | 174.0 → 173.0 |
| LCP median, ms | 668 → 720 | 688 → 700 | 472 → 524 |
| CLS median | 0.000038 → 0.000038 | 0.000097 → 0.000097 | 0.000326 → 0.000326 |
| INP lab proxy | Mostly no qualifying event | No qualifying event | No qualifying event |
| JS body bytes | 234,597 → 143,243 | 234,597 → 143,243 | 235,212 → 143,795 |
| JS execution median, ms | 422.4 → 61.2 | 391.9 → 63.2 | 388.4 → 59.9 |
| Best-effort covered JS code units | 301,053 → 267,947 | 305,182 → 272,442 | 301,409 → 268,604 |
| Font body bytes | 234,160 → 132,192 | 234,160 → 132,192 | 234,160 → 132,192 |
| All image network bytes, supplementary | 21,308 → 21,308 | 20,134 → 20,134 | 20,134 → 20,134 |

Next LCP did **not** improve in this fixture. Do not advertise an LCP gain from its bundle/font changes. Image transfer is unchanged; Next Image/CDN delivery was already implemented before this task. The first banner remains eager, other banners/cards/thumbnails remain lazy, and the detail hero now has high fetch priority. Raster/CDN cold and warm optimization behavior still needs a representative staging media inventory.

The supplementary baseline was rebuilt from the original source under an ignored temporary directory, with the same Next/React and **workspace-local Zod 4.6.5** resolution. Resolving hoisted root Zod instead would select 3.25.76 and invalidate the comparison. Original five-sample timing captures remain preserved.

Warm HTTP response medians (`http-before.json` / `http-after.json`): home 88.1 → 90.6 ms; products 4.5 → 4.7 ms; categories 85.6 → 4.1 ms; detail 168.8 → 168.6 ms. Product-list HTML streams its loading boundary before catalog work completes, so its low TTFB does not mean its data query completes in 4 ms. Live product operations intentionally retain their upstream latency.

## Local CRA before / after

| Metric | Home before → after | Products before → after |
| --- | ---: | ---: |
| TTFB median, ms | 1.6 → 1.6 | 1.6 → 1.4 |
| LCP median, ms | 3,476 → 2,564 | 3,116 → 2,384 |
| CLS median | 0.14718 → 0.18744 | 0.58526 → 0.57376 |
| INP recorded-event median, ms | 16 → 16 | 16 → 16 |
| JS body bytes | 291,142 → 180,206 | 291,142 → 184,925 |
| JS execution median, ms | 360.4 → 164.5 | 315.8 → 129.3 |
| Best-effort covered JS code units | 266,780 → 331,236 | 207,727 → 264,738 |
| Observable image body bytes | 121,439 → 121,439 | 73,987 → 73,987 |

No CLS or INP improvement is claimed: home CLS worsens in this small fixture, list CLS remains high, and one post-change home interaction records 216 ms despite the 16 ms median. Image-size savings are not claimed. The reserved card box repairs the image/skeleton stacking mechanism, but does not solve asynchronous catalog/font/carousel shifts. A representative delayed-media/catalog run and production field monitoring are required before declaring CLS resolved. The raw `/login` samples are a not-found-route control, **not** the actual login page (`/admin/login`); actual login rendering and protected navigation were verified separately.

## Bundle reductions and tradeoffs

### Retained CRA application

33 non-home screens now use React lazy imports, with an accessible loading fallback and recoverable chunk-error boundary. Homepage/navigation/cart provider/session guards stay eager. The boundary preserves provider identity across checkout-to-cart navigation; it resets only a failed boundary on route changes. [React loads lazy component code when it is rendered](https://react.dev/reference/react/lazy).

Source-map minified-span estimates show the initial `@mui/material` contribution falling from 191,178 to approximately 56,195 code units; application route code from 229,079 to approximately 48,354. The realtime Socket.IO/Engine.IO family and PapaParse disappear from the initial chunk and load with their admin consumers. MUI needed by navigation remains. These are **raw minified span estimates**, not independently additive gzip savings. `cra-bundle-before.json` / `cra-bundle-after.json` contain each chunk's actual raw and gzip size and attributed spans.

Total gzip size across *all* CRA chunks rises from 292,901 to 356,711 bytes (about 21.8%). Splitting adds wrappers and can duplicate shared code. This is not a reduction in total installed/downloadable code: the benefit is avoiding unrelated screens on a storefront visit. Atomic deployments must retain old hashed chunks through the release overlap so existing clients can finish lazy navigation. The error boundary offers reload recovery if a stale chunk becomes unavailable.

Confirmed-unused direct declarations removed: `react-image-crop`, `react-image-file-resizer`, `@react-email/render`. The render package remains transitively required by retained email components. These removals have **no claimed initial JS saving**, since the packages were not in the initial graph. The unreferenced Leaflet prototype and retained email artifact still have declared consumers, so their dependencies were not forcibly removed during this pass.

CRA product cards reserve a square media box before decode and overlay their skeleton rather than stacking it above the image. Width/height and async decode prevent intrinsic-image shifts. The redundant `new Image()` effect was removed: it requested a CDN default even when the displayed legacy fallback came from the API. Existing product/media URLs and lazy loading remain intact. Production image aspect-ratio parity still requires the staged media review.

### Next.js preview

Catalog pages/navigation remain Server Components; there is no new global client provider. `AddToCart` dynamically imports browser cart parsing/validation after an explicit action. The roughly 91.7 kB compressed validation/model chunk therefore leaves the initial catalog graph. Server action validation, server stock/store reads, duplicate/storage checks and schema behavior are unchanged. Cart/review screens still load the code they need. First cart use incurs an extra chunk request; pending feedback appears immediately and browser regressions verify the behavior.

PT Sans is encoded to WOFF2 with FontTools 4.66.1 / Brotli 1.2.0, using `fonttools ttLib.woff2 compress`. The original TTF and OFL remain in source. Character map and glyph order were compared after conversion. Raw font bytes fall from 442,960 to 132,192; the measured wire-body improvement is smaller because the old TTF was already HTTP-compressed. `next/font/local` continues to self-host it with swap/fallback metrics.

The built-in Turbopack analyzer ran before and after (`next experimental-analyze --output`); it uses the installed version-matched docs and produces no application build. Generated analysis is intentionally kept in ignored `.next/diagnostics/analyze`, since it embeds paths and generated build material. The checked-in request/chunk reports provide the compact transferable evidence.

## Cache contract and invalidation

Only exact `/api/category` and `/api/banners` presentation reads use persistent caching: 60-second revalidation, with tags `catalog:categories` / `catalog:banners`. Root request-time `connection()`, fresh CSP nonce and `private, no-store` HTML remain. Redundant route-level `force-dynamic` was removed on home/category-index pages because it disables their deliberate fetch cache; the root still keeps rendering dynamic.

Product list/details, prices, stock, store status, category identity/visibility, cart checks, checkout, customer/auth/admin data and mutations remain no-store. Category detail routes and cart product normalization use a separate fresh category read. A cached category label cannot authorize stock availability or expose a newly disabled category detail.

`POST /api/catalog/revalidate` accepts only `{ "kind": "categories" }` or `{ "kind": "banners" }`, a maximum 1 KiB streamed JSON body, exact configured Origin and `X-CSRF-Protection: 1`. It forwards the session cookie only to the configured versioned API's no-store `/auth/me` lookup and requires its current `admin` identity. Malformed/anonymous/staff/outage requests cannot purge. The route expires the matching tag with `revalidateTag(tag, { expire: 0 })`.

Legacy writers do **not** yet call this route. TTL refresh is the default until admin writer integration/shared API-session deployment is verified. On revalidation failure Next can continue serving stale category/banner presentation beyond sixty seconds; this is not a strict maximum-staleness guarantee. Pricing, visibility decisions and commerce remain live. Multi-instance hosting must provide shared cache/invalidation semantics or purge each instance; do not assume a local purge reaches a fleet.

## Query latency and pagination

The disposable standalone MongoDB 8.0.17 run uses 50,000 synthetic products and 50 categories. The existing additive index plan is applied **only** inside a new loopback process/new temporary data directory. Measurements include query transport, public category visibility join and DTO normalization. Explain scan counts are for the matching/sorting find, not the complete joined aggregate.

| Query | Median before / after, ms | Keys examined before / after | Docs examined before / after |
| --- | ---: | ---: | ---: |
| Featured, planned index absent / present | 20.84 / 1.72 | 31,000 / 31 | 31,000 / 31 |
| Category, planned index absent / present | 2.66 / 1.62 | 1,550 / 31 | 1,550 / 31 |
| Deep offset / equivalent cursor | 13.66 / 0.45 | 45,030 / 30 | 30 / 30 |

This verifies why the versioned API already uses scoped `_id` cursors, bounded projections and filter/sort indexes. Production index existence, selectivity, query plans, pool/Atlas/network latency and concurrent load remain unverified. Index application is still an operator-gated rollout, with backups/data checks and the existing additive migration procedure.

The Next public compatibility adapter **still uses legacy offset pagination**. Switching it to the versioned cursor API requires verified matching datasets, public category/media DTO parity, search semantics and compatibility for existing `?page=` links. This pass deliberately does not silently switch that contract. No claim that all legacy collection reads are now cursor-paginated is made.

Production-safe observability added to the versioned service: `catalog_query` events with an allowlisted operation name, elapsed milliseconds and success/failure classification; no filters, arguments, IDs, documents, connection strings or PII. Request elapsed time uses the existing `http_request` event separately. Monitoring callback failures cannot alter query results. Aggregate these in staging/production logging/APM to establish actual p50/p95/p99 rather than substituting the local table.

## Library and third-party audit

| Area | Finding / decision |
| --- | --- |
| MUI / Emotion | Active legacy admin/navigation consumers retained. Admin UI moves out of initial graph; remaining navigation Dialog stays eager. Neither is introduced into Next. |
| Maps | Leaflet/react-leaflet appear only in an unreferenced prototype; current checkout uses geocoding/address requests. No map renderer is present in measured initial chunks. `/map` is an Overpass suburb-list tool, now route-loaded. Preserve providers/workflows. |
| Icons | Legacy MUI icons, Lucide WhatsApp icon, Remix admin font and remote icon styles remain distinct migration consumers. Deployed site additionally loads a Font Awesome kit. No new icon library added; next storefront needs no icon package. |
| Analytics | No active analytics script in local source. Live production still loads Google Tag Manager. Delayed/consent strategy and analytics parity must be reviewed against the actual deployed version; this change cannot demonstrate a production analytics delay. |
| Chat / WhatsApp | Local widget is a link/button with a tree-shaken icon, not an embedded SDK. Messaging/admin Socket.IO and forms are deferred with their routes. No provider integration replaced. |
| Fonts | Next local TTF converted losslessly to WOFF2. Legacy HTML still requests several remote font families/weights; route styling uses multiple families, so broad removal without parity review was avoided. |
| Images | Next Image, responsive sizes, explicit trusted hosts and CDN paths pre-exist. Legacy card layout/preload repaired. Crop/resizer declarations unused and removed. No origin/provider or filename migration. |
| Large client features | CRA admin/forms/CSV/realtime/checkout deferred; Swiper remains about 178 kB of minified initial code because the homepage renders its carousels. Next cart validation deferred, gallery/cart islands retained. Swiper redesign is a separate measured/parity task. |
| CDN | Existing catalog CDN retained. Cloudflare is visible in production response headers; that does not identify the catalog storage origin or approve transforms/cache rules. Immutable media keys/provider delivery/cache validation remain media migration gates. |

## Verification and rollout

Passed: root typecheck/lint; 120 unit/HTTP tests (two DB-gated suites skipped in that command); 12 tests against a disposable real Mongo replica including commerce concurrency/rollback/idempotency and SEO pagination; focused CRA provider-continuity regression; Turbopack production web build and API bundle; compiled API/foundation/storefront/SEO/cache smoke suites.

Runtime: Next 16.3.8 Turbopack MCP tools/routes/compilation/errors checked; server pages/navigation and small client islands verified; route navigation/reload, real 404s, outage/retry, cart forged-price import, live stock/store checks and deferred code loading passed. Next and CRA layout checks cover 360/390/768/1280 widths; mobile rendering visually inspected. Legacy checkout verifies server-confirmed totals, intent-only payload, duplicate-click lock, saved retry after reload, and success display. CRA builds retain existing lint warnings; the old full App Jest import still has Swiper/toolchain limitations, so the added regression runs independently.

Rollout gates: coordinated security/commerce release prerequisites; production field monitoring and API/Atlas query plans; legacy pagination transition; actual catalog/media/URL parity; admin invalidation integration and shared cache semantics; hashed-chunk retention and staging cold/warm/load acceptance. No production release or data change occurred.

Rollback: revert the application/cache/font/lazy-import changes and redeploy complete matching assets; preserve old chunks during overlap. No data or stock rollback is required. Category/banner cache entries can be purged with authorized tags or discarded with the deployment's cache mechanism. Original media, font and dependency/legacy contracts remain recoverable in Git.

## Reproduce

```sh
# Build only the isolated foundation; never import backend/.env.
APP_ENV=development npm run build:foundation
node scripts/tooling/performance-fixture.mjs
# In another shell: compiled web, minimal development origins, production code.
APP_ENV=development API_ORIGIN=http://127.0.0.1:4200 LEGACY_API_ORIGIN=http://127.0.0.1:4200 WEB_ORIGIN=http://127.0.0.1:3200 npm run start:web -- --port 3200
node scripts/tooling/measure-browser.mjs http://127.0.0.1:3200 /tmp/next-measurement.json / /products /products/daily-care--PD0001
node scripts/tooling/measure-http.mjs http://127.0.0.1:3200 /tmp/http-measurement.json
node scripts/tooling/measure-browser.mjs http://127.0.0.1:4200 /tmp/cra-measurement.json / /products
npm run analyze:legacy -- /tmp/cra-chunks.json
npx tsx scripts/tooling/measure-database.ts /path/to/disposable/mongod /tmp/query-measurement.json
npm run smoke:catalog-cache
APP_ENV=development npm exec --workspace @almina/web -- next experimental-analyze --output
```

Build CRA from a credential-free environment with maintenance mode off before starting its fixture: `env -i PATH="$PATH" HOME="$HOME" CI=true npm --prefix frontend run build`. Run timing captures sequentially without concurrent builds/load tests, and preserve the raw files for comparison. Do not move/delete an active development server's `.next`; isolate production/baseline outputs or stop dev for its build. These scripts do not create a production load test, publish changes, or apply production indexes.
