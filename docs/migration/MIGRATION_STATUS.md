## 2026-11-21 — Storefront reference-alignment correction

The user rejected the first implementation’s blocky geometry and excessive underlines. Corrected the current storefront against the five supplied images: compact circular category discovery, shorter campaigns, connected product details, exposed totals and restrained action styling. Palette, fonts and commerce owners remain unchanged. See the [correction and validation record](MARKET_GREEN_REFERENCE_CORRECTION_2026-11-21.md). The previous visual verdict does not constitute user acceptance; PRs remain open.

## 2026-11-21 — Market Green / Coral storefront implementation

Implemented the approved customer storefront direction on `feat/market-green-coral-storefront`: scoped tokens and utilities, local fonts, shared shopping components, responsive discovery, product/cart/checkout composition and account presentation. Existing commerce and admin owners remain unchanged. Browser, accessibility and regression evidence is recorded in the [implementation report](MARKET_GREEN_STOREFRONT_2026-11-21.md). This is review work on top of the open design-reset PR; deployment and physical-device release checks remain pending.

## 2026-11-21 — Design documentation reset

Removed the root design specification, design/reference/review folders, archived visual guidance and project-local design skills, including token templates. Runtime components, application styles required for controls and media, catalogue data, commerce, authentication and integrations are retained. Future design decisions are open.

## 2026-11-19 — Reduce Render background traffic

The order-alert queue keeps its five-second check. Empty checks use two reads, and catalogue and payment reconciliation now run once per minute. Bulk image publication defaults to an on-demand operations computer command with the existing server-authorized job, progress and import checks. The image-review browser stops polling when idle or running in local mode. See [staff-alert timing](STAFF_ALERTS_2026-11-08.md#runtime-configuration-and-storage) and [local image publication](IMAGE_REVIEW_2026-10-26.md#local-bulk-publication--2026-11-19). Production deployment and bandwidth measurement are pending.

## 2026-11-19 — Render outbound bandwidth suspension

Render suspended the Hobby workspace after 6.9 GB against a 5 GB monthly allowance. The `almina` backend accounted for the displayed total, including 6.34 GB of service-initiated traffic. The Nov 14 staff-alert release is a likely contributor to the higher baseline. The larger Nov 18–19 spikes remain unattributed. See the [incident findings and optimization plan](RENDER_BANDWIDTH_2026-11-19.md).

## 2026-11-18 — Optional image review fields may be blank

Product name and brand are required for image approval. Strength, form and
other attributes may be blank when absent from both the image and the selected
catalogue record. Reviewers can mark an incorrect extraction as **Not
applicable** when the catalogue has no corresponding value. A blank optional
input never writes to the catalogue. Populated identity values still receive
comparison checks. Release the API before the updated review interface.

## 2026-11-18 — Image review uses one input per field

Administrators can edit the prefilled product field or correct the extraction
in the same row. The approval action records the reviewer’s confirmation
without separate field attestations or typed evidence. An incorrect extraction
can be ignored when the attribute is absent from the catalogue and optional
for the product. Net content edits preserve other pack details, such as count.

Flagged and rejected images can start an unpublished product draft. Flagged
images remain held with their original evidence, and approval remains blocked.
Older approval records still use their saved evidence. Release the API before
the web interface so the server can accept dismissed extractions.

## 2026-11-18 — Admin image review supports catalogue edits and drafts

The review workspace shows the original beside prefilled identity fields and
puts conflicts first. Administrators can correct supported catalogue fields
and approve in a single transaction. Staff can still correct extraction
evidence and review associations. Search accepts product name, barcode or ID.
Draft creation reuses catalogue ID allocation, category validation and the
opening stock ledger. It selects the draft for review and leaves the image
pending approval.

Image review receipts retain the original extraction, field evidence and the
prior product identity for catalogue edits. Existing publication checks still
validate the approved identity revision. No backfill is needed. Deploy the
updated API before exposing the updated review page so catalogue edits use
the new server contract.

Disposable catalogue tests and browser checks covered editing and approving a
matched item, selecting a search result, and creating a draft. The production
build runs on Next.js 16.4.6. [Foundation](FOUNDATION_2026-10-02.md) ·
[Retained API](RETAINED_API_INVENTORY_2026-10-04.md)

## 2026-11-08 — Production alerts active; branch login collision fix (candidate)

Verified the owner-deployed PR #90 merge in production. Enabled the existing Render notification worker with the supplied contact, preserved its keys, and verified one registered administrator receiving device. The real `almina` branch (`almina-admin` login) and all four pending orders remain unchanged. A new candidate adds early login availability/suggestions and race recovery without overwriting retained accounts or losing delivery drafts. See [activation evidence, fix and compatibility](BRANCH_LOGIN_AVAILABILITY_2026-11-08.md).

## 2026-11-07 — Operational account and receiving consolidation (candidate)

Audited live branches and deployment; removed the one paused branch through the protected API at the owner's request, retaining its audit/account history and all four pending orders. Prepared Render notification keys with delivery explicitly off. The candidate separates store permissions from legacy staff, consolidates delivery navigation, links public listings to branch IDs, adds persistent readiness/next steps, fixes paused-area routing, and supports per-device order alerts. Real branch configuration, device opt-in and candidate deployment remain required. See [audit, production actions, rollout and limitations](OPERATIONS_CONSOLE_2026-11-07.md).

## 2026-11-07 — Branch-owned store login and unified setup

Branch creation now commits its store login, automatic branch assignment and optional first delivery area together. Replaced separate store staff provisioning with a two-step branch flow and a Branch & login / Delivery area / Stock workspace. Optional details and technical controls are disclosed progressively. Existing person accounts remain compatible; managed login resets revoke sessions and branch removal disables its credentials. No production configuration or data changed. See [branch account setup and safeguards](BRANCH_STORE_ACCOUNTS_2026-11-07.md).

## 2026-11-06 — Polygon delivery zones and branch stock (release preparation)

Added administrator-managed branch details, Leaflet/Geoman delivery polygons, optional Geoapify lookup, customer pins/saved coordinates and server-authoritative priority-then-distance routing with whole-order branch stock. Shared and branch reservations, cancellation/card expiry restoration and audited reassignment are atomic. Existing city/fallback receiving remains for legacy orders; polygon assignments stay visible after configuration changes. Mode defaults off; administrators must enter real boundaries, locations and counted allocations. No production activation or data migration performed. See [setup, safety and rollback](DELIVERY_ZONES_2026-11-06.md).

## 2026-11-06 — Pharmacy receiving and configurable branch routing (release preparation)

Replaced the optional activated city-text model with administrator-configured, exclusive area ownership and a staffed fallback branch. Added an attributed offline OSM RAK reference, branch-based staff provisioning/assignment, shared order/push access rules, address review/audit, safe historical reads and an additive backfill. Incoming counts, optional sound and direct confirmation/packing use the existing protected commerce lifecycle. Business configuration remains for administrators; no production data, staff assignments or activation changed. Verification and release checklist: [order routing](ORDER_ROUTING_2026-11-06.md).

## 2026-11-06 — Vercel compute efficiency (verified; deployment paused)

Disabled speculative storefront route prefetch, added request-local read deduplication, isolated JSON/XML security work, bounded successful sitemap CDN caching and prevented unchanged order-stream reconnects from refreshing the whole admin page. HTML CSP and fresh commerce reads remain protected. The controlled catalogue visit/scroll went from 56 speculative route requests to zero; navigation still works. Verification passed: 256 unit, 137 API/security and 65 browser cases, typecheck/lint/build and clean Next runtime diagnostics. The existing Vercel allowance pause prevents release activation. See [incident, verification and rollback](VERCEL_COMPUTE_2026-11-06.md).

## 2026-10-30 — Responsive checkout UX (locally verified)

Checkout uses a guided mobile flow, native payment controls and server contract validation. Browser regressions cover keyboard focus, Arabic checkout and order confirmation.

## 2026-10-27 — Catalogue filter bounds validation

The filter form detects reversed price bounds while preserving the server query and URL contract.

## 2026-10-27 — Retained embedding worker adapter correction

The first semantic flag-on deployment failed before serving requests because the retained database getter returns a Db synchronously. The worker now accepts both synchronous and asynchronous getters through a contained promise boundary. Twenty focused search tests, typecheck/lint and maintained build checks pass; the rebuilt retained bundle also completed an actual Atlas worker batch with state ready. The previous live backend was retained during the failed deploy. See [activation record](SEARCH_2026-10-27.md) and the correction PR for the final deployment result.

## 2026-10-27 — Semantic embedding refresh prepared

Owner supplied the offline Gemini key; the 768-dimension provider probe passed and 753 reviewed-product and ten curated query embeddings are prepared. Added an opt-in leased persistent API worker for bounded product changes, approved query preparation and pre-expiry curated-seed refresh, with five-minute failure backoff and no shopper-request provider calls. Live source-service checks confirmed moisturizer/cleansing/dental semantic results and caught/fixed a glucose-vs-BP device substitution. Original-phrase synonym expansion and approved product-kind constraints now fail closed for unpublished/unreviewed glucose monitors. Separate worker and semantic flags remain disabled until the updated CI and deployment pass. See [semantic activation and verification](SEARCH_2026-10-27.md).

## 2026-10-27 — Atlas search production activation (lexical)

PR #71 passed required CI and merged. Production Atlas `products_search` and `products_vector` are READY/queryable, nine synonyms seeded, ordinary/TTL indexes created and all 7,136 products backfilled with additive search metadata. Thirteen live read-only query/autocomplete/filter checks passed. Render deploy `dep-dbg7mkbbc2fs739uqmvg` is live with SEARCH_PROVIDER=atlas; public API and storefront typo/Arabic/autocomplete checks passed. Temporary local network access was removed. Semantic retrieval and query-retaining analytics remain off; semantic requires an offline embedding key, reviewed vectors and refresh jobs. Vercel blocked the initial frontend publish because the CLI merger differs from its existing Hobby contributor; the release-record PR must be merged by the already authenticated `alminadev` owner in Spmb. See [activation evidence and rollback](SEARCH_2026-10-27.md) and the release PR workflow for frontend status.

## 2026-10-27 — Intelligent search (implementation; Atlas activation pending)

Added an isolated Atlas lexical/autocomplete/vector provider, bilingual normalization and intent, directional vocabulary, reviewed enrichment/offline embeddings, hybrid ranking, current-document safety checks, bounded facets, family grouping, retained API adapters, administrator search tools and separately consented anonymous search-to-purchase attribution. Existing search UI, URLs, retail policy and commerce authority remain. The legacy engine stays available for rollout/rollback; SEARCH_PROVIDER defaults to legacy, semantic retrieval and analytics default off. Local verification: 232 unit, 137 API/security and 34 disposable integration tests, 21 final search/navigation/consent browser cases, lint/typechecks/build and clean Next.js runtime diagnostics. Atlas integration deliberately skipped without an explicit staging connection; no live M0 verification, production indexing/data change or deployment. See [architecture, activation, rollback and complete deliverables](SEARCH_2026-10-27.md).

## 2026-10-27 — Pharmacist review speed

Replaced the long confirmation form with an individual-image workbench: compact comparisons, one-action attested approvals for matching values, explicit evidence controls for exceptions, preset holds, non-saving skips, keyboard shortcuts, last-decision access and one-item prefetch. Phone actions clear fixed navigation. Data/roles and the server validation contract are unchanged. Verification: 215 unit, 137 API and 144 disposable integration tests passed; typechecks/lint/build and browser review checks passed. No production reviews, imports or deployment performed. See [image review workflow](IMAGE_REVIEW_2026-10-26.md).

## 2026-10-26 — Image review CI route inventory correction

The API security regression maintained a positional list of retained router mounts. Adding Image review shifted that list, causing the allowlist coverage assertion to compare the first router against the wrong prefix. Updated the inventory and added an explicit router-count assertion; authorization requirements remain intact. The default disposable integration runner now includes image-review regressions. Full local verification: 137 API tests and 143 integration tests passed; focused lint and diff checks passed. No production mutation or deployment performed.

## 2026-10-26 — Durable background image publication

Bulk publication now runs on the persistent API and resumes after browser closure or API restart. Administrator progress, pause/resume and per-product issues are shared across browsers. Leased, bounded worker steps reuse immutable manifests/import receipts. Invalid captured approvals return to Held with appended history while valid products continue; service failures and revoked administrator privileges pause the run. The previous browser-only progress queue is superseded. Verification: 212 unit and 16 disposable integration tests passed, with typechecks, lint, commerce integrity and isolated production build. Browser closure/reopen confirmed background completion; no runtime/accessibility errors or overflow at checked mobile/tablet/desktop sizes. No production/provider changes or deployment performed. See [image review guide](IMAGE_REVIEW_2026-10-26.md).

## 2026-10-26 — Bulk image publication

Image review now offers **Publish all approved images** across every approved queue page, automatically grouped by product (up to eight gallery associations per request). Browser progress plus server receipts support safe resuming; keep the tab open. Failures stop without reversing completed products. No production data/provider changes or deployment performed. See [image review guide](IMAGE_REVIEW_2026-10-26.md) for enablement and recovery.

# Migration status

## 2026-10-26 — Temporary pharmacist image review module (local)

One-click follow-up: the Approved queue now has **Publish approved images** for a selected batch of up to five. The server automatically saves preflight and links existing assets through the established import transaction. Immutable publication-request records make failed-response retries and simultaneous first clicks safe; source validation, roles and withdrawal checks remain enforced. Optional preview and JSON export are retained. Six contract/routing checks, seven image-review integration cases, full typecheck/lint/domain build and the isolated production web build passed. The complete browser path (approve → select → one Publish click → linked) passed in the disposable database, with no runtime or accessibility errors. Not deployed; no production write occurred.

Added **Catalogue → Image review** at `/admin/image-review`: saved pipeline packages, persistent and resumable server upload checkpoints, original-image inspection, live product search/selection including none, field-level verification and explained OCR correction, reviewer history, holds/rejections, current approved exports, and administrator preview/import. Imports recheck immutable image SHA-256, ObjectID/business identity, media revisions and withdrawal barriers, append existing Cloudinary URLs through the current CDN architecture, preserve galleries and commercial/publication fields, and retain transaction/history/replay receipts. No AI API key, asset upload/rename or production access is required for map preparation. The module defaults off behind `IMAGE_REVIEW_ENABLED` on the API service.

Prepared 1,951 saved maps with two withdrawal barriers; the package contains no full catalogue, prices, stock, secrets or local source paths. The complete file was loaded through the browser into a disposable replica set and resumed after a request-limit interruption; the demo has one additional seeded source version. A sample approval and import completed in the disposable environment. Existing 206 unit tests, 20 focused review/admin/gateway tests (overlapping suites), 10 disposable integration tests, complete typecheck/lint, maintained-domain build and isolated Next.js production build passed. Runtime compilation/errors checks were empty; tested layouts had no horizontal overflow at 360/390/768/1440 px, with no accessibility violations in reviewed/queue states. No production data, provider assets or deployment changed. See [workflow, activation and verification](IMAGE_REVIEW_2026-10-26.md). Current package pointer: `outputs/image-review-module-2026-10-26/LATEST.json`.

2026-10-24 external uptime ping: added public `GET /api/ping` (also supports HEAD) to the retained Render backend and standalone API. Returns HTTP 200 with plain-text `pong` and `Cache-Control: no-store`, without authentication, database checks or provider calls. Existing Render health checks are unchanged. After deployment, configure UptimeRobot HTTP(s) monitoring for `https://almina-of4b.onrender.com/api/ping` every five minutes. This is process reachability only, not commerce/database readiness. No deployment or production data changes.

2026-10-23 admin redesign on `opencode/admin-redesign`: refreshed the staff shell, sign-in, dashboard, grouped forms, upload controls and responsive record tables; added a mobile navigation sheet with focus restoration and bottom navigation. Retained the email-marketing route and its scoped editor styles. Removed unsupported VAT/featured fields and kept barcode entry limited to product creation, preserving the existing product mutation contract. Typecheck, lint, production build and 26 focused admin/marketing/wholesale browser cases passed, with additional mobile-menu navigation/focus checks at 360/390 px. No production data or deployment changes.

2026-10-23 email marketing implementation on `codex/email-marketing`: added an admin GrapesJS/MJML editor, saved and server-validated templates, reviewed catalogue/product and artwork insertion, consented contacts, administrator-approved campaign queue, allowlisted tests, Resend and Microsoft 365 Graph sender adapters, mandatory unsubscribe, conservative shared attempt budgets and no-retry uncertain state. Sending remains off until Render provider/consent settings and a real test are verified. See [design, activation, safety and limits](EMAIL_MARKETING_DESIGNER_2026-10-23.md).

2026-10-22 Google authentication activation: owner-configured client ID is live; corrected the approved apex-domain origin in Vercel/Render, published Google sign-in and successfully redeployed verified master. Initialized the missing empty customer/session collections with the existing planned unique identity and session expiry/owner indexes. Real Google sign-in, reload, logout and retail denial of wholesale access passed. Google data-access verification is unnecessary for basic identity scopes; branding review and email-code provider setup remain separate. Focused UI/error/session cleanup and canonical-origin deployment validation are prepared in a separate PR. See [activation, business onboarding and verification](GOOGLE_AUTH_ACTIVATION_2026-10-22.md).

2026-10-21 DNS/media audit: retained Vercel DNS/direct storefront delivery and existing direct Cloudinary product-image optimization. Restored twelve missing email/service-verification DNS records in the pharmacy Vercel account and verified authoritative responses. Legacy `cdn` hostname remains disconnected; added and locally verified a bounded raster-only compatibility handler, pending release/domain attachment. Its upstream temporarily remains the personal-account Worker; source export/asset mapping and full reference inventory are required before retirement. No old Worker/zone/assets were deleted. See [Cloudflare retirement and remaining cutover](CLOUDFLARE_RETIREMENT_2026-10-21.md).

2026-10-20 customer accounts: completed the Google/email sign-in interface and header account entry, single-use email code/resend/change-address UX, script failure/remount handling, session loading/logout and account privacy notice. Hardened disabled-account handling and Google subject binding; planned the additive unique Google identity index. Google OAuth is not configured (owner confirmed); live provider setup and acceptance remain pending. No production account/data/index or deployment changed. See [customer account setup and verification](CUSTOMER_ACCOUNT_2026-10-20.md).

2026-10-20 campaign merchandising: implemented staff-managed desktop/mobile campaign artwork, preview, ordered product pins, homepage placements/priorities and readiness checks. Public delivery filters locale, schedule and selected-product availability; old clients retain their response shape and old admin saves preserve new settings. Corrected the historical serviceability boundary note and legacy error serialization, with regression tests. No production data/index, offer, stock/price or deployment changes. See [campaign checkpoint](CAMPAIGN_MERCHANDISING_2026-10-20.md).

2026-10-20 Phase 4 Arabic continuation: completed the four documented code slices, preserving the existing English dictionary and canonical commerce values. Added Arabic cart-adjacent panels, delivery/search/cart chrome, catalogue/PDP/homepage controls, server cart/stock messages, emirate display labels and cart/checkout titles; corrected Arabic hero text/artwork overlap and directional controls. Native/pharmacy review, Arabic grammar/plural approval and staff content translation remain. Verification and the surface-by-surface build/browser results are recorded in [Arabic continuation audit](ARABIC_PHASE_FOUR_2026-10-20.md). No production data, provider, publication or deployment changes.

20 October repository cleanup: local release history is synchronized with GitHub and only `master` plus the active PR #54 development branch remain. Obsolete branches were verified and backed up; the unique local documentation checkpoint has a remote archive tag. Automatic merged-branch deletion is enabled. See [branch workflow and recovery record](BRANCH_WORKFLOW_2026-10-20.md). No release merge or production data change occurred.

2026-10-18 owner-merge deployment: GitHub confirms `alminadev` authored PR #49's merge `f5f4994c6ca8b8567a4b4bb60953414a8999f80b`; all foundation checks passed and the manually triggered Vercel deployment succeeded (run 39108416558). The live alias and linked product-photo attribution were verified in the browser. Automatic deployment after successful same-repository master push verification is prepared in a separate PR, retaining exact-SHA, ancestry and verification gates, rejecting fork/PR events and skipping stale automatic candidates. It is not active until merged. See `VERCEL_SINGLE_REPOSITORY_2026-10-18.md`.

2026-10-18 image follow-up: [media access and required configuration](MEDIA_ACCESS_2026-10-18.md) records the authenticated upload HTTP 503 and missing Cloudinary upload variables on Render. Three more exact-pack images are prepared locally; no new product image attachments or asset deletions occurred. Provider credentials and pharmacy review are pending. The existing Render tab revealed current Atlas/WhatsApp credentials in its initial UI snapshot; both require private rotation, which remains unperformed. No secret values are recorded.

2026-10-17 catalogue recovery: [import execution and safeguards](CATALOGUE_IMPORT_2026-10-17.md) supersede the empty-database state in the hosted-release record below. The main administrator is created, with OD5050 reserved; 7,136 positive-stock ERP products and 25 mapped categories are imported as disabled drafts. Full row-by-row verification confirms gross prices, VAT, capped stock, unique IDs and held VITKID exclusion; zero orders exist and the store remains closed. Five verified product images are attached: the surviving Vichy image and four exact-size CeraVe manufacturer packshots whose uploaded CDN files match the reviewed originals. Browser permission subsequently declined the final four-image visual check; linkage and CDN verification passed. Product content, physical stock and media/channel approval remain pending. No historical accounts/orders were recreated.

2026-10-17 hosted release: [Render deployment and Atlas observations](RENDER_RELEASE_2026-10-17.md) supersede historical no-deployment statements below. PR #44 merged as `09e6163` with protected CI green and all 88 browser tests passing. Both the existing API and new free Next preview now deploy that release successfully after the owner privately configured the replacement Singapore cluster credentials; API readiness returns HTTP 200 with the exact SHA, and public products returns an empty array. Seven storefront/admin routes return HTTP 200 without the failure boundary; homepage mobile verification passes at 390px without horizontal overflow. The preview remains noindex with checkout/feeds off, and original custom-domain routing is unchanged. Both approved restricted Render network ranges are Active in Atlas. The new database is empty: administrator/bootstrap, policies, catalogue import and hosted commerce/provider acceptance remain pending; no ERP import, real order or historical-data recovery occurred. The old Bahrain credential requires rotation/revocation after its earlier exposure; no credential value is recorded in documentation.

Product family follow-up: [SKU options and variant SEO](PRODUCT_FAMILIES_2026-10-16.md) adds verified size/flavour/pack families while keeping medicine strengths separate. Existing SKU IDs, URLs, price/stock authority and old orders are preserved. Public lists group before pagination; server-rendered option links, selected metadata, ProductGroup relationships and immutable option snapshots cover cards, PDP, cart, checkout and staff order views. Admin create/edit accepts reviewed family profiles and returns scoped family conflict guidance. Typecheck/lint/build, 132 unit regressions plus final focused checks, 22 disposable database cases, 37 broad browser passes and the final eight-case family/admin regression run pass; the linked note records scope and evidence precisely. The additive family index is planned, not applied to production. ERP files/catalog data remain unimported; reviewed family mapping, missing barcode/VAT handling and an idempotent pilot/full import workflow remain separate gates. No production data change or deployment occurred.

Last updated: 2026-10-14.

Checkout location follow-up: [complete OpenStreetMap address autofill](CHECKOUT_LOCATION_2026-10-14.md) supersedes the pin-only follow-up. GPS lookup now prefills address, canonical UAE emirate and city/area together with the delivery link; all fields persist in the order snapshot. A same-origin private gateway calls the Render API; distributed MongoDB leases, cache expiry, daily budgets and provider backoff control upstream use. Manual edits invalidate review and clear stale pins; failures preserve manual checkout and uncertain submission retries. Unit/API/contract checks, real-Mongo integration checks, compiled checkout/commerce browser regressions, lint/typecheck/build and a real public-landmark geocoder smoke passed. Public Nominatim has no SLA and a strict application-wide one-request/second limit; larger traffic needs a managed/self-hosted endpoint. Additive geocoding TTL indexes are in the API migration plan; no production deployment/index/data changes occurred.

Development styling follow-up: [overlay CSP and CSS cascade correction](CSS_CSP_2026-10-14.md) restores the real Next dev logo/menu by permitting nonce-free injected style elements only for APP_ENV=development plus NODE_ENV=development. Staging/production/compiled previews retain strict nonce styles and all script protections. Live development verification passes 32 public/login route cases across 360/390/768/1280 px with no stylesheet CSP violations, page errors or horizontal overflow; all 59 compiled browser/accessibility cases, typecheck/lint/build and production CSP/SEO smokes pass. Final sequential source verification passes 235 tests with 35 database-gated skips (covered by the preceding dedicated database suite). An earlier concurrent fixture-ownership timeout is rejected evidence; sequential rerun passed without waiving the guard. Continued demo cancellation through the Next gateway returned 200 on both initial/repeated requests, restored stock 10 → 12 exactly once and preserved the original receipt/total. Browser confirmation shows cancelled; the status selector now follows loaded status and refreshes after transitions, with an immediate/reload dispatch regression. No production/provider operation occurred.

The owner confirmed Vercel Next frontend, Render persistent API/workers and MongoDB Atlas. [Deployment ownership, environment setup and persistent local demo](VERCEL_RENDER_ATLAS_2026-10-14.md) supersede the earlier shared-production-database development decision. Root development now requires an explicit development-labelled `backend/.env.local`, with no production env fallback. `npm run dev:demo` seeds and preserves a dedicated loopback replica set, two categories, four products and synthetic admin/staff accounts without provider credentials or reset endpoints. The Vercel app has explicit monorepo build settings; the protected exact-SHA staging workflow targets one combined Render API and Vercel staging. Git deployment holds remain in place; no hosted deployment or production data/provider operation occurred.

Authorized category/banner/bulk/recovery mutations now invalidate Next presentation tags after successful writes; admin payloads and file selection fit Vercel function limits, and short admin streams declare a 30-second Node duration. Manual browser checkout created synthetic OD5001 for AED 61 (two sale items at AED 20 plus Dubai delivery AED 21), deducted stock 12 → 10, saved one receipt and appeared in the admin dashboard after login/reload. That journey found and corrected the admin sale-line display to recorded charged unit prices and AED line totals without rewriting snapshots or reconstructing unavailable historical totals. Dedicated demo caches avoid reuse of earlier fixture catalog data. Local confirmation-dialog automation timed out while attempting cancellation; no cancellation is claimed from that manual step. Automated cancellation/restock regressions remain independently required.

Fresh lint/typecheck, isolated production build, 53 real disposable MongoDB tests and both zero-high/critical lockfile audits pass. The final broad source suite passed 234 tests, with 35 database-gated cases skipped there and verified through the dedicated real database run. All 59 final compiled browser cases passed, including warmed category-cache refresh, upload rejection and recorded sale-line AED display; a focused admin dispatch/cancellation-protection case also passed and saved `.verification-results/admin-order-price.jpg`. Foundation/storefront/raw crawler SEO smokes pass. Restarting the persistent demo after the manual browser order preserved OD5001, its AED 61 total, stock 10 and one retry receipt. Next runtime diagnostics show no config/session/compilation errors, and React inspection confirms server catalog/navigation with client cart islands. Actual Vercel/Render/Atlas configuration, credential rotations, provider delivery, representative data/media/load, backups/restore, hosted exact-SHA tests and monitored stock/order reconciliation remain release gates. [Readiness review](READINESS_REVIEW_2026-10-14.md) records the earlier assessment and is superseded where this entry changes implementation.

Development startup follow-up on `codex/fix-local-dev-catalog`: root dev and dev:api use the full compatibility runtime rather than directing storefront reads to the versioned-only foundation API. Backend runtime env loading preserves the owner's explicitly requested shared database URI, keeps development HTTP settings local and reports catalog connection/contract failures before Next starts. [Configuration, root cause and disposable runtime verification](DEV_CATALOG_STARTUP_2026-10-10.md). The real production URI is absent from this checkout, so production database connectivity remains unverified; no production operation or deployment occurred.

The owner now explicitly requests repository integration into protected master, while continuing to own hosting. [Cumulative integration plan and historical-branch resolutions](MASTER_INTEGRATION_2026-10-05.md) preserve all source ancestry, the verified maintained tree and the required verify gate. Integration uses a [skip render] merge commit; hosted acceptance remains separate. The following historical “held draft/no merge” notes record the earlier authorization and do not override this renewed repository-integration request.

Local completion scope: the owner will handle hosting and requested local verification only. The remaining consent-aware telemetry is implemented on `codex/consented-commerce-telemetry`, default off with bounded anonymous events, withdrawal/privacy controls and partial operational coverage. [Implementation and evidence](CONSENTED_TELEMETRY_2026-10-05.md), [local setup and verification](LOCAL_VERIFICATION_2026-10-05.md). Lint/typecheck/build, 109 unit, 110 API/security, 52 real disposable MongoDB, seven release-gate, all 58 full compiled browser cases (including eight telemetry cases), raw SEO/foundation/storefront smoke, budgets and both zero-high/critical lockfile audits pass. Parent #41's original CI failure was the unstyled-h1 smoke assertion; `767c7fc` preserves semantic raw-HTML checks and required verify now passes in `37268703183` / `37268707490`. Functional candidate #42 at `1737833` passed required verify in `37269338774` / `37269362509`; Vercel/Cloudflare preview checks fail and belong to the owner hosting handoff. No repository implementation gap remains in the ordered local scope; production/operator acceptance and observed contraction remain separate, unverified gates. No master merge/deployment occurred.

Batch recovery guard follow-up on `codex/retained-batch-recovery-guard` moves the last retained-router database lookup into bounded maintained catalog ownership while retaining both pre-upload and transaction recovery checks. [Scope and meaningful regressions](RETAINED_BATCH_GUARD_2026-10-05.md). Local lint/typecheck, 103 unit, 108 API/security, 52 mandatory database/load, seven release-gate tests and both audits pass. Parent #38 at `64cde47` passed required verify in `37261602953` / `37261617312`. Cutover notes now distinguish the held modern candidate from historical baseline; hosted/configuration/backup/rotation/provider/SEO/security/traffic/reconciliation evidence remains incomplete.

Staff subscription follow-up on `codex/staff-push-subscriptions` moves the remaining push preference writes into maintained TypeScript with current active staff atomic ownership, bounded inputs and repeat-safe self-only updates. [Parity, revocation regression and operator gates](STAFF_PUSH_SUBSCRIPTIONS_2026-10-05.md). Local lint/typecheck, 102 unit, 108 API/security, 52 mandatory database/load, seven release-gate tests and both audits pass. Parent #37 at `39ef022` passed required verify in `37252719609` / `37252732911`, including all 50 compiled browser cases. Component/consent telemetry and all hosted acceptance remain incomplete.

Current continuation: staff push is implemented as a disabled-by-default held candidate on `codex/staff-push-delivery`, deriving durable generic notifications from committed jobs with scoped subscribers, conditional expiry and uncertain-response quarantine. [Contracts, exact test evidence and operator gates](STAFF_PUSH_DELIVERY_2026-10-04.md). Persistent API PR #24 passed required verify in `37215975924` / `37215995553`; Vercel/Cloudflare previews fail. Remaining bounded retained readers/adapters, component adoption, consent telemetry and all hosted acceptance remain incomplete.

WhatsApp read follow-up on `codex/whatsapp-read-ownership` moves all five retained reads to bounded maintained projections and adds chronological Older/Newer history pages without deleting stored messages or archived poster references. [Exact validation and compatibility limits](WHATSAPP_READ_OWNERSHIP_2026-10-04.md). Push PR #25 first required verify failed due to SDK test placement; `eb1cbfa` fixes the test job without waiving the gate and passed required verify in `37217448705` / `37217451502`. Remaining retained order/banner/media readers, design adoption, consent telemetry and hosted acceptance remain incomplete.

Order read follow-up on `codex/order-read-ownership` moves retained list/detail into maintained bounded queries with current server city scope, immutable version 2 snapshot rendering, legacy reference compatibility and unchanged historical totals. [Exact evidence, lookup limits and deployment hold](ORDER_READ_OWNERSHIP_2026-10-04.md). WhatsApp PR #26 at `91f43d3` passed required verify in `37217830376` / `37217854409`. Remaining banner/media readers, design adoption, consent telemetry and all hosted acceptance remain incomplete.

Catalog/media read follow-up on `codex/catalog-media-read-ownership` completes maintained product/category/banner reference reads and upload target prechecks, then removes the unused remaining model source files. [Parity evidence, preserved historical assets and connection hold](CATALOG_MEDIA_READ_OWNERSHIP_2026-10-04.md). Order PR #27 at `7041dcf` passed required verify in `37218379661` / `37218397635`. Mongoose still owns the retained pool; native connection/adapter cleanup, design adoption, consent telemetry and hosted acceptance remain incomplete.

Native database follow-up on `codex/native-persistent-database` removes the retained ODM dependency after maintained query/write parity. One explicit native pool supplies both HTTP contracts, sessions, signed inbox and workers; URI-selected database and all stored compatibility structures remain. [Scope, regression findings and hosting hold](NATIVE_PERSISTENT_DATABASE_2026-10-04.md). Catalog/media PR #28 at `900fd8b` passed required verify in `37218952876` / `37219078851`. Local lint/typecheck, 88 unit, 108 API/security, 50 mandatory database/load, seven release-gate and 46 compiled Chromium cases, build and both audits pass; remaining adapter/design/consent telemetry work and all hosted acceptance remain incomplete.

Session follow-up on `codex/session-ownership` moves cookie-v2 auth, current-user validation, revocation, distributed quotas and browser-cookie/CSRF policy into maintained TypeScript with a retained import adapter. [Compatibility and validation](SESSION_OWNERSHIP_2026-10-04.md). Local lint/typecheck, 91 unit, 108 API/security, 50 mandatory database/load, seven release-gate and 46 compiled Chromium cases, build and both audits pass. Native-pool PR #29 at `0491a88` passed verify in `37220066652` / `37220069763`; adapter/design/consent telemetry and all hosted acceptance remain incomplete.

Retained authorization follow-up on `codex/retained-auth-boundary` gives maintained TypeScript ownership to the default-deny route allowlist and administrator-only realtime facade; current authorization, exact URLs, per-recipient revocation and bus contracts remain. [Scope and parity](RETAINED_AUTH_BOUNDARY_2026-10-04.md). Local lint/typecheck, 93 unit, 108 API/security, 50 mandatory database/load, seven release-gate and 46 compiled Chromium cases, build and both audits pass. Session PR #30 at `31383de` passed verify in `37220407828` / `37220412536`; design/consent telemetry and hosted acceptance remain incomplete.

Browser verification ownership follow-up on `codex/browser-fixture-ownership` rejects occupied loopback ports before children/database creation, binds synthetic health to this run and fails verification on unexpected owned-child exit. [Agent lifecycle correction, safeguards and regression evidence](BROWSER_FIXTURE_OWNERSHIP_2026-10-04.md). Navigation #32 at `0f292c3` passed verify in `37221288222` / `37221291755`; hosting previews still fail. Local lint/typecheck, 97 unit, seven release-gate, all 50 compiled Chromium cases and both audits pass; other component/consent telemetry/hosted gates remain incomplete.

Unused validation follow-up on `codex/retire-unused-security-validators` removes three dead validators and an unimported database configuration stub after administrator regressions move to maintained production validators. [Scope and integrity assertions](UNUSED_VALIDATOR_RETIREMENT_2026-10-04.md). Local lint/typecheck, 108 API/security, 97 unit, seven release-gate tests and both audits pass. Parent #33 at `12ad15e` passed verify in `37221753316`, with second run `37221757025` pending; component/consent telemetry and hosted gates remain incomplete.

Bounded CSV follow-up on `codex/bounded-catalog-csv` replaces retained CSV conversion with the maintained scanner, removes csvtojson, preserves legacy scalar/money/barcode/allocation behavior and keeps recovery blocked before multipart. [Scope, stricter unsafe-input bounds and meaningful HTTP/recovery evidence](BOUNDED_CATALOG_CSV_2026-10-04.md). Local lint/typecheck, 100 unit, 108 API/security, 51 mandatory database/load, seven release-gate and 50 compiled Chromium cases, build and both audits pass. Parent #34 at `ad43fc6` passed verify in `37221980903` / `37221983676`; component/consent telemetry and hosted acceptance remain incomplete.

## Continuation from integrated master — 2026-10-04

PR #2 merged at `d912a269247a63ffbd3bc55e3d9f9c20ae8d9cf2`; all twelve requested source branches are ancestors. Master foundation runs `37151757878` and `37151752130` passed, including required `verify`. Hosting acceptance remains incomplete. Older sections below are historical evidence: the retained frontend now uses Vite, all three current lockfile installs report zero vulnerabilities, and Next checkout exists behind explicit activation. No production deployment/credential/database operation is claimed.

First focused extraction on `codex/retained-api-ownership`: [complete retained route/effect/fallback inventory](RETAINED_API_INVENTORY_2026-10-04.md), the previously missing [remaining migration plan](MIGRATION_PLAN.md), and maintained TypeScript store domain behind existing authenticated legacy adapters. Default-deny authorization and URL/response contracts remain. Inventory tests cover every mounted route/policy. Fresh lockfile installation, lint/typecheck, 50 unit, 95 API/security and 23 mandatory disposable database/load tests passed. No legacy fields/assets or frontend directory removed.

Second focused recovery change on `codex/recovery-import-workflow` adds authenticated CSV/JSON preview and hash-bound, transaction/ledger-idempotent commits, spreadsheet/CSV templates, row errors and interrupted-response retries. Recovery remains closed with disabled unpublished zero-stock products; the old batch route is blocked before upload. [Workflow and evidence](RECOVERY_IMPORT_2026-10-04.md). PR #3 required hosted `verify` passed; recovery CI is pending until its branch is pushed. Production/hosted acceptance remains incomplete.

Third focused inventory change on `codex/admin-inventory-ledger` adds transaction-bound actor/reason/delta receipts and exact stock-edit retries while preserving stale-form protection, plus sale/invoice precision validation and both admin callers. [Scope, evidence and retained creation/batch gates](INVENTORY_LEDGER_2026-10-04.md). Recovery PR #4 hosted foundation runs `37178900854` and `37178870184` passed including `verify`. Hosted acceptance remains incomplete.

Retained lifecycle follow-up on `codex/retained-api-lifecycle` adds transaction-capable readiness, bounded drain and maintained notification leases/retry/deadline behavior. [Operational contract and evidence](RETAINED_LIFECYCLE_2026-10-04.md). Inventory PR #5 hosted runs `37179300779` and `37179264768` passed `verify`. Signed media/references, remaining retained writers and hosted provider/drain acceptance remain gates.

Media follow-up on `codex/media-retention-cloudinary` adds signed raster uploads with provider reconciliation, reference history, revision-bound replacement and archive instead of destructive product/category/banner/poster removal. [Scope/evidence and live-provider gates](MEDIA_RETENTION_2026-10-04.md). Lifecycle PR #6 runs `37179603482` and `37179568676` and media PR #7 runs `37180455355` and `37180493841` passed hosted `verify`; production acceptance remains incomplete.

Catalog creation follow-up on `codex/catalog-creation-ownership` moves single creation and the retained non-recovery batch writer into a maintained transaction: concurrency-safe compatible IDs, whole-input validation, category/product/counter/initial-stock ledger atomicity and recovery blocking. [Scope, driver compatibility, retry limitations and rollback](CATALOG_CREATION_2026-10-04.md). All 29 real disposable-database/load, 59 unit, 99 API/security and 7 release-gate tests passed with lint/typecheck. Pharmacy PR #8 runs `37181025216` and `37181044215` passed required hosted `verify`. No hosted cutover or legacy contraction occurred.

Metadata follow-up on `codex/media-metadata-ownership` moves category/banner/poster persistence and product/category visibility into maintained validation, transactions and reference/actor audits, preserving legacy adapters. [Scope, MIME corrections and provider gates](MEDIA_METADATA_2026-10-04.md). 60 unit, 99 API/security, 30 mandatory real database/load tests, lint/typecheck and foundation build passed. Catalog PR #9 runs `37181458767` and `37181481009` passed hosted `verify`. Provider, staff/notification ownership and hosting acceptance remain incomplete.

Inbox follow-up on `codex/whatsapp-inbox-ownership` replaces receipt-before-write processing with pending, digest-bound normalized receipts and transactional conversation/report effects. [Retry, consent, legacy-index and rollback constraints](WHATSAPP_INBOX_2026-10-04.md). 61 unit, 99 API/security and 31 real database/load regressions, lint/typecheck and foundation build passed. Metadata PR #10 runs `37181918620` and `37181999829` passed hosted `verify`. Outbound provider/push/Drive ownership, operational telemetry/analytics, remaining component migration and hosted acceptance remain gates.

Operations follow-up on `codex/operations-dashboard` adds bounded process-local request histograms, read-only database integrity/queue candidates, explicit threshold alerts and an administrator-only server-rendered dashboard. [Coverage, limitations and evidence](OPERATIONS_DASHBOARD_2026-10-04.md). 62 unit, 100 API/security, 32 real database/load, 7 release-gate and 27 Chromium scenarios passed with lint/typecheck/build and three clean lockfile audits. Inbox PR #11 runs `37182534545` and `37182578245` passed required hosted `verify`. Hosted collection/alert destinations, client JavaScript telemetry, independent inventory reconciliation and release acceptance remain gates.

Recovered catalog follow-up on `codex/recovered-product-compatibility` fixes stable-ID/slug namespaces, anonymous draft leakage in retained reads, unpublished/inactive sitemap filtering, active/zero sale presentation and configured-origin redirects. Maintained bounded compatibility reads preserve staff editors; the Vite category caller now pages explicitly. [Scope, raw HTML/budget and browser evidence](RECOVERED_CATALOG_COMPATIBILITY_2026-10-04.md). 64 unit, 100 API/security, 34 real database/load, 7 release-gate and 28 Chromium scenarios pass with lint/typecheck, Next/Vite builds and three clean audits. Operations PR #12 runs `37183771015` and `37183774007` passed required hosted `verify`. Staff/provider ownership, component adoption, consent analytics and all hosted acceptance remain incomplete.

Staff follow-up on `codex/staff-administration-ownership` moves retained provisioning/list/removal into maintained validation, serialized transactions and actor audits. Account removal now deactivates and revokes sessions without deleting identifiers/history; concurrent removals preserve an active administrator. [Scope, retry/rollback and evidence](STAFF_ADMINISTRATION_2026-10-04.md). Recovered catalog PR #13 runs `37197847921` and `37197851759` passed required hosted `verify`. Provider ownership, remaining component adoption, consent analytics and hosted acceptance remain incomplete.

SMTP follow-up on `codex/smtp-provider-ownership` moves confirmation/admin content validation, fixed TLS/SMTP policy, acceptance, deadlines/cancellation and redacted failures into maintained code. A real Nodemailer loopback test verifies stalled sends close their owned socket. [Contracts and delivery/retry limits](SMTP_PROVIDER_2026-10-04.md). Staff PR #14 runs `37199092832` and `37199082663` passed required hosted `verify`. Outbound WhatsApp/push/Drive, remaining component adoption, consent analytics and hosted acceptance remain incomplete.

The owner renewed the target as a complete Next.js frontend and maintained Express backend, removing obsolete dependencies/code after parity. Express follow-up on `codex/express5-backend` upgrades the retained service to 5.2.1, removes unused packages/private-stack async wrapping and replaces uuid with Node crypto. [Scope, migration notes and acceptance](EXPRESS5_2026-10-04.md). SMTP PR #15 required runs `37199820986` and `37199818863` passed at `056dd0f`. Complete frontend route/test/asset parity and backend consolidation remain repository work; production acceptance remains incomplete.

Database-library follow-up on `codex/mongoose9-backend` pins Mongoose 9.10.4 with MongoDB driver 7 after reviewing both intervening major migration guides. No collection, schema, identifier, index or legacy field changes. [Compatibility and evidence](MONGOOSE9_2026-10-04.md). Express PR #16 runs `37205388662` and `37205420781` passed required hosted `verify`. Full frontend retirement and backend provider ownership remain repository work; hosted acceptance remains incomplete.

Next route parity on `codex/next-public-route-parity` completes public about/contact pages, an explicit map-to-delivery-enquiries redirect, static icons/manifest and generic compatibility worker, plus all retained admin alias browser checks. [Scope and verified limits](NEXT_ROUTE_PARITY_2026-10-04.md). Mongoose PR #17 runs `37205816268` and `37205845454` passed hosted `verify`. Frontend consumer retirement, remaining backend provider ownership and hosted acceptance remain incomplete.

Next browser ownership on `codex/next-browser-ownership` moves every active customer browser scenario and CI build to compiled Next, retaining API compatibility/database guarantees and real error retry coverage. [Scope and evidence](NEXT_BROWSER_OWNERSHIP_2026-10-04.md). Route PR #18 runs `37206259542` and `37206284843` passed required hosted `verify`. The retained directory remains pending separate reviewed source retirement; hosted acceptance remains incomplete.

Held source-retirement candidate on `codex/retire-compatibility-frontend` removes the old frontend package/code after all active CI/browser/route consumers moved to Next, retaining public paths and byte-verified brand assets. [Scope, owner-renewed instructions and mandatory hosting hold](NEXT_FRONTEND_RETIREMENT_2026-10-04.md). Rollback source/artifact remains at `871bf4f`; production retirement, backend provider ownership and hosted acceptance remain incomplete.

Express runtime follow-up on `codex/express-runtime-configuration` adds maintained bounded startup validation, Node-native optional environment loading, explicit-index policy and a real disposable production-mode process/drain regression. [Scope and supported dependency exceptions](EXPRESS_RUNTIME_2026-10-04.md). Browser ownership PR #19 runs `37206830043` and `37206843362` passed verify. Retirement PR #20 remains a held draft; the diagnostic timing assertion has been corrected at `5713d0d` after recording failed run `37207298372`. Remaining provider ownership/consolidation and all hosted acceptance remain incomplete.

## Production migration readiness — blocked

Persistent Express follow-up on `codex/persistent-express-api` mounts both API contracts on the retained listener/pool/worker, shares origin/session/drain behavior and avoids double-counted metrics. [Scope, single-process database/browser evidence and hosting configuration](PERSISTENT_EXPRESS_API_2026-10-04.md). Lint/typecheck, 78 unit, 104 API/security, 41 mandatory disposable MongoDB/load, seven release-gate and 42 compiled Chromium cases, foundation build and both remaining audits pass. WhatsApp draft PR #23 at `5275bb5` runs `37215230481`/`37215266837` passed verify. Push, retained reader/adapter ownership, remaining component/consent telemetry work and hosted acceptance remain incomplete. No production promotion occurred.

Outbound WhatsApp follow-up on `codex/whatsapp-outbound-ownership` removes Axios/hard-coded provider version, adds explicit bounded server configuration, actor/digest retry receipts, accepted-message transactions and reload-safe Next single/bulk retry keys. [Contracts, private receipt storage, uncertainty and provider gates](WHATSAPP_OUTBOUND_2026-10-04.md). Draft Drive PR #22 at `e016f24` passed required verify in runs `37209273845` and `37209310026`; Vercel/Cloudflare preview acceptance still fails. No master merge/deployment, real message, credential operation or legacy database contraction occurred.

Drive follow-up on `codex/drive-provider-ownership` consolidates all four retained providers into bounded maintained TypeScript, preserving folders/IDs/URLs and historical/archive delivery. [Scope, tested uncertainty and acceptance assumptions](DRIVE_PROVIDER_2026-10-04.md). Lint/typecheck, 73 unit, 104 API/security, 38 mandatory disposable MongoDB/load, seven release-gate and 34 compiled Chromium scenarios, isolated foundation build and both remaining lockfile audits pass. Corrected retirement PR #20 at `5713d0d` runs `37207813476`/`37207815880` and runtime PR #21 at `e712095` runs `37208031430`/`37208087358` passed required verify. Runtime's Cloudflare Pages and Vercel preview checks still fail; required repository verification does not establish hosting acceptance. Outbound WhatsApp/push ownership, persistent API consolidation, remaining component adoption, consent telemetry and hosted acceptance remain work. No master merge or production deployment occurred.

Prepared on `codex/production-migration-readiness`: [Render cutover/recovery runbook](PRODUCTION_CUTOVER_2026-10-03.md), three-phase fail-closed release evidence validator (`npm run release:gate`), and CI regression coverage for missing/skipped evidence, exact SHAs, deployment readbacks, post-cutover timestamps, 24-hour observation and retained legacy fields. Includes all twelve staging/production journeys, environment/provider/media/SEO gates, reconciliation, explicit monitoring thresholds and safe rollback. The validator checks attestations, not provider truth; production deployment controls and telemetry are not configured by it.

Owner confirmed backend `https://almina-of4b.onrender.com`, storefront `https://www.alminapharmacy.com/`, and Render deployment from `master` (correcting initial `main`). Read-only GitHub verification confirms `master` protection requires up-to-date `verify`; source branches remain unmerged. Current live Render SHA and new deployed SHA remain unverified. No deployment, provider send, database migration, credential rotation or legacy field removal occurred.

Fresh local verification: 7 release-gate regressions, 59 focused security, 20 disposable real-database/load and 12 Chromium smoke tests passed; lint and workspace typecheck passed. CLI template parsing and the pending release's nonzero preflight exit were verified. Strict audit still fails: root 19 high/2 critical, backend 13 high/0 critical, frontend 64 high/1 critical dependency entries. These are release blockers, not waived findings.

Anonymous read-only production probes returned homepage 200, robots.txt 200 text/plain, sitemap.xml 200 XML and backend root 500. Homepage raw HTML contained the CRA root with no canonical link detected. These probes do not prove catalog, checkout, notification or admin health and did not inspect customer data. No production order was created. Backup/restoration, secret revocation, exact Render artifacts/config, staging/provider acceptance, production journeys/SEO/security and monitored order/stock reconciliation remain pending. **Do not merge to trigger production yet; migration is not complete.**


## Production verification suite review

Expanded on `codex/production-verification-review`, 2026-10-03. Retained `.github/workflows/foundation.yml` and its `verify` check, removed path-filter gaps, installed backend dependencies/build adapters in the correct order, and added mandatory disposable MongoDB integration/load tests and pinned Chromium E2E against compiled Next/CRA applications. Coverage includes commercial policy edges, lifecycle transitions, real catalog mutations, stock/checkout races, retry idempotency, customer/mobile checkout, Next admin auth/order updates, webhook validation and decoded upload abuse. The review fixed image format spoofing before media effects and made the WhatsApp verification challenge strictly validated plain text.

Local verification: 43 unit, 95 API, 59 overlapping focused security, 20 real database/load and 12 Chromium tests passed, together with clean installation, lint/typecheck, production foundation build and compiled smoke. No production database/provider/migration/deployment operation occurred. Full-lockfile high/critical audits deliberately fail on existing dependency debt and block the final gate; see [review evidence, commands, budgets, CI, deployment prerequisites and rollback](PRODUCTION_VERIFICATION_2026-10-03.md).

GitHub `master` now requires up-to-date GitHub Actions `verify`, including administrators, with force pushes/deletion disabled; readback confirmed the rule. Code has not been pushed, so the expanded workflow is pending merge. Provider-side direct production deployment controls and new hosted preview/staging deployments remain pending confirmed provider/project access, sanitized staging configuration and successful audits. Next customer checkout remains disabled; the current legacy checkout owner is covered by real browser/database tests.


## Measured performance work

Implemented locally on `codex/production-performance`, 2026-10-03, after capturing public production and isolated compiled-build baselines. Deferred 33 legacy route screens and Next cart validation, converted the self-hosted font losslessly to WOFF2, reserved legacy card image space/removed a redundant preload, cached only category/banner presentation with authenticated tagged invalidation, and added redacted catalog query timing. Removed three confirmed-unused direct dependency declarations. Local initial CRA JavaScript falls 38.1%; Next catalog JavaScript 38.9%; Next font transfer 43.5%. Full metrics, bundle attribution, scripts, tradeoffs and rollout gates are in [the performance assessment](PERFORMANCE_2026-10-03.md).

No production deployment, DB/index/media change or Next checkout activation occurred. Live deployed assets differ from local source; real-user INP/percentiles, production server/Atlas latency and hosted CDN/load behavior remain unmeasured. Next LCP did not improve in the fixture; legacy list CLS still needs representative catalog validation. The versioned cursor/index plan was measured in disposable MongoDB, while the web compatibility adapter still retains legacy offset pagination. Admin writers do not yet invoke tag invalidation, and multi-instance cache behavior remains a rollout gate.

## Current state

Repository audit complete for audit baseline `3d27241`. An additive modernization foundation is implemented on `modernization/foundation`: Next.js 16.3.8/React 19.3/Node 24 LTS, npm workspaces, TypeScript/ESLint, shared validation/client contracts, isolated environment configuration, persistent API health/error/logging conventions and a lazy database boundary. The legacy frontend/backend and their lockfiles remain intact. No production data, deployed services or credentials were changed; no route cutover occurred. See [foundation decisions, dependencies/conflicts and verification](FOUNDATION_2026-10-02.md). Audit deliverables A–O and rollout/rollback gates remain recorded in [the production audit](PRODUCTION_AUDIT_2026-10-02.md).

## Blocking findings

- P0: committed credential material, unauthenticated privileged operations and staff provisioning, public password hashes and customer/message PII, unprotected realtime broadcasts, client-authoritative totals and unsafe stock/order creation.
- P1: unrestricted messaging/uploads/query predicates/regex, unsigned/replayed webhook processing, insecure SMTP certificate handling, session weaknesses and reachable dependency vulnerabilities.
- Integrity prerequisites: define approved VAT/delivery/cancellation policies, transactions/idempotency/numbering, immutable new order snapshots, legacy schema/media compatibility and safe reconciliation.

The audit baseline remains historical; authentication/authorization findings are remediated in local source by the hardening work below, pending production rollout. Critical checkout findings are remediated in local source by the commerce work below, pending staged verification and production rollout. Credential validity and prior revocations are unknown; required rotation/revocation is documented in audit section F and has not been performed.

Foundation follow-up conflicts: retained legacy PM2 tree has 23 advisory entries including two critical; compatible ESLint 9 stack is deprecated pending plugin ESLint 10 support. Root build/start remain legacy deployment contracts, while root installation now requires Node 24/npm 11. These do not authorize a deployment or replace the blocking remediation work.

## Verification performed

- Static review of eight mounted API routers/49 handlers, nine models, 44 active frontend route definitions/consumers, commerce/auth/media/integrations and deployment/test configuration.
- Tracked credential-file presence and a redacted pattern scan of 616 reachable historical text blobs across 179 commits; no credential values recorded in artifacts. Six distinct hardcoded bearer literals were found in WhatsApp helper history; revocation status is unknown.
- Read-only lockfile advisory audits: root 38, backend 52, frontend 102 vulnerable package entries, including tooling/transitive trees; not unique exploit counts.
- Audit-time official Next.js documentation/security review identified 16.3.8 without installing it. Foundation implementation rechecked registry/security sources and installed that patched stable 16.x release with matching bundled documentation.

Foundation verification completed locally: install and clean `npm ci`, full typecheck, lint, 30 unit/integration tests, web Turbopack production build, API bundle and compiled production smoke. Next DevTools MCP configured and connected; runtime compilation/error diagnostics clear. Browser navigation/reload, server rendering, console/network, React server boundaries, 375/1280 px layouts verified. The preview remains noindex and database-disabled; smoke verifies upstream failure, health, real 404s and absent production MCP.

Not performed: database/provider/deployment access, production probing/index verification, real customer/staff/commerce workflows, legacy Node 24 runtime validation, hosted CI execution, or production-route performance measurement. A post-change CRA bundle measurement is recorded in the dependency report; no pre-change artifact was available for comparison. These remain rollout gates.

## Dependency modernization assessment

Completed a controlled dependency inventory and cleanup on 2026-10-02. Removed confirmed-unused CRA/backend packages, replaced Express `body-parser` middleware with Express built-ins, consolidated UUID usage, and regenerated both legacy lockfiles. Kept active production dependencies until their routes/workflows migrate. Root and legacy audit findings remain; the full decision table, direct inventory, test/build results, and package-specific decisions are in [the dependency modernization report](DEPENDENCY_MODERNIZATION_2026-10-02.md). CRA builds with warnings at 507.6 kB gzipped main JS. Its Jest run is blocked by the existing Swiper ESM import, and the backend test script is a placeholder; upload/parser major upgrades remain separately unverified.

## Next ordered work

1. Confirm actual production deployment, owners, credential status, backups/recovery and read-only data/media/URL inventory.
2. Roll out the locally verified auth boundary with rotated credentials, reviewed accounts, same-origin routing and static-host headers; verify sanitized staging first.
3. Repair commerce integrity in the shared API before moving checkout.
4. Use the independently verified foundation to migrate low-risk storefront routes incrementally after security/integrity gates; confirm deployment commands and isolate sanitized staging first.
5. Migrate cart/checkout/admin/integrations through verified compatibility adapters; cut over progressively with safe rollback.
6. Remove legacy structures only after usage/retention and recovery verification.

## Media canonicalization

Recorded the existing CDN filename URL contract as canonical for new storefront reads and configured Next Image to use it. The CDN's backing provider is not verifiable from repository configuration. Drive-backed product/category/banner/poster writes and compatibility fields remain active pending a production data inventory, provider confirmation, per-file copy/decode/CDN/render validation, additive backfill and observation window. No live URL was changed, no media or DB reference was migrated/deleted, and Drive credentials/dependency were not retired. See [media inventory, provider decision and staged migration gates](MEDIA_CANONICALIZATION_2026-10-03.md).

Future implementation must update this file with completed gates and evidence, not merely planned changes.

## Modular API service migration

Implemented an additive modular Express 5.2.1/TypeScript service on `codex/modular-api`: public catalog, staff login/session/logout, server-enforced admin/city-scoped order reads, explicit DTOs/projections, strict request schemas/body limits, indexed text-search predicates, scoped cursor pagination, secure headers, exact-origin CORS, rate limits, request deadlines, redacted structured logs/request IDs and graceful draining/database lifecycle. Indexes have an explicit additive/idempotent plan/apply script; no index was applied and no database was contacted. See [route/auth, schema/index inventories, performance queries and compatibility changes](MODULAR_API_2026-10-02.md).

This does not remediate the retained legacy backend or constitute a production cutover. Legacy callers/deployment/media/provider integrations and all commerce/admin mutation workflows remain legacy-owned. Checkout integrity, account inventory/credential rotation, legacy authentication rollout, database/index explain checks and distributed ingress quotas remain required gates. New staff sessions intentionally reject the legacy compromised JWT contract and enforce current server-side city assignments; unassigned staff have no order access.

Local verification: full typecheck/lint, 52 automated tests with synthetic query doubles/loopback HTTP, API bundle, full foundation production build, compiled-process/foundation smoke and connection-free index plan. No production/customer data, provider integrations or database index plans were exercised against a live database. Planner/load behavior remains unverified.

## Storefront preview route migration

Implemented the requested storefront route structure in the isolated Next.js preview on `codex/storefront-routes`. Public catalog pages now fetch/render on the server through a guarded read-only legacy adapter; client islands handle only gallery/cart interactions and browser storage. Existing product IDs and category MongoDB IDs remain the route identity, with readable slug prefixes. Legacy product/category links are supported and query parameters retained. Permanent redirects are gated by `STOREFRONT_REDIRECTS_VERIFIED` (false by default), pending real staging/production target and URL inventory verification. No production cutover occurred.

Cart imports legacy IDs/quantities, ignores stored prices and rechecks current catalog/store status through server actions. The checkout URL provides saved-cart review, with ordering disabled: live checkout migration is **incomplete** until the audited pricing, policy, atomic inventory and idempotency prerequisites are remediated. No order, inventory, customer, integration or database writes were introduced. Unmigrated legacy routes remain owned by the legacy deployment.

Local verification: full typecheck/lint, 34 unit/integration tests, Turbopack production build, compiled storefront smoke and foundation smoke passed; running Next.js 16.3.8 Turbopack route/compilation/error diagnostics clear after intentional outage recovery. Browser direct navigation and refresh passed for all nine expected routes, dynamic details/categories, old shared URLs and 404s. Verified legacy cart import with forged prices, persistence, quantity/stock limits, removal, store closure, 375/1280 px layouts/mobile links and error-boundary retry. React inspection confirms server pages/navigation with small interactive islands. Verification used only a synthetic loopback API; production visual/data parity and real checkout remain unverified. See [route contracts, gates, limitations and reproducible verification](STOREFRONT_ROUTES_2026-10-02.md).


## Authentication and authorization hardening

Implemented on `codex/auth-hardening`, 2026-10-02, across both legacy and versioned APIs. Replaced JWT/localStorage auth with shared digest-backed, expiring HTTP-only cookies; enforced current-role/city RBAC and default-deny authorization before legacy handlers/uploads; made staff provisioning admin-only; protected user/catalog/category/banner/store/batch/order/WhatsApp/push operations; added server invalidation, distributed login quotas, exact Origin/custom-header CSRF checks, signed/replay-checked webhooks, realtime reauthorization and stricter security headers/CSP. The legacy client now verifies server sessions and uses cookies, with confirmed browser login/refresh/logout. Public published media contracts are preserved. Source credentials were removed; rotation is still required. No production data/deployment/provider/credential action occurred.

See the [53-handler route authorization matrix](AUTHORIZATION_MATRIX_2026-10-02.md) and [hardening decisions, tests, compatibility and rollout gates](AUTH_HARDENING_2026-10-02.md). Local verification includes 107 passing automated tests with security regressions, typecheck/lint, foundation and CRA builds, compiled API/storefront smoke, Next MCP and browser workflows, and connection-free index planning. Static-host headers are supplied but require operator application to the actual deployment. Compromised legacy JWT/bearer sessions are deliberately rejected, requiring staff re-login and account inventory review.

Guest checkout pricing/inventory/atomicity/idempotency findings are addressed by the shared commerce service below, pending production rollout. Dependency advisories, provider recovery/durable jobs, real index/load checks and production integration/template/media parity remain gates. This work must not be described as a fully secure production commerce cutover.


## Commerce integrity

Implemented locally on `codex/commerce-integrity`, 2026-10-03. Both checkout APIs now share a strict TypeScript transaction service: current DB products and approved server policy determine prices, discounts, inclusive VAT, delivery, AED 10 minimum, availability, stock and final totals. Atomic conditional decrements, order persistence, counter numbering, durable retry receipts and notification jobs commit together. New orders save immutable commercial line snapshots and explicit lifecycle history; pre-dispatch cancellation restores new-order stock exactly once. Legacy routes/screens retain adapters and historical totals; unsafe commercial edits are rejected. Browser checkout sends intent only and preserves retry keys through uncertain results.

The owner approved inclusive VAT, current emirate fees and once-only pre-dispatch restocking. The connection-free plan and gated, idempotent additive migration preserve legacy fields, flag contradictory historical states and mark unavailable snapshot provenance; they never guess historical product prices or stock effects. Real local replica-set regressions cover concurrency, rollback, tampering, duplicate submission, lifecycle races, RBAC, migration reruns and both driver/HTTP stacks. See [implementation, verification, rollout and rollback](COMMERCE_INTEGRITY_2026-10-03.md). No production migration or deployment occurred. Staged business-flow acceptance, production backups/index/data inventory and a coordinated writer maintenance window remain prerequisites to activation. Next storefront checkout remains gated pending its separate migration.


## Storefront SEO

Implemented locally on `codex/storefront-seo`, 2026-10-03: request-time metadataBase/title template, route/product/category metadata, canonicals, Open Graph/Twitter, production-only public indexing, robots, database-backed cursor-sharded sitemaps, nonce-safe Organization/Product/Breadcrumb JSON-LD, real 404s, default permanent legacy/renamed-slug redirects and explicitly reviewed deleted-product replacements. Product structured offers reflect displayed AED catalog prices; availability stays omitted pending Next checkout/store-open integration. Preview/staging remains excluded; filtered/paginated/search/private routes remain noindex. No deployment, production data access or database write occurred.

Verification includes typecheck/lint, automated tests, a disposable real MongoDB pagination/visibility regression, Turbopack build, compiled API/foundation/storefront/SEO smoke and Next MCP/browser checks. Raw production HTML includes meaningful product content without JavaScript and metadata in head for browser/Googlebot/Facebook/Twitter user agents. Actual URL/data/media inventory, matching legacy/modular API catalog databases, large-catalog sitemap latency/quota/query plans and hosted crawler verification remain deployment gates. See [SEO contracts, configuration, verification and rollback](STOREFRONT_SEO_2026-10-03.md).


## Dedicated Next.js administration

Implemented locally on `codex/next-admin`, 2026-10-03: separate `(admin)` route group/layout and storefront layout, cookie login, server-verified page/data access, independently authorized default-deny gateway and retained backend RBAC/city scoping. Migrated dashboard, inventory/search/sale/stock/disabled views, product/category/banner management, transaction-backed order actions, WhatsApp conversations/templates/broadcasts/posters/reports, staff management, notifications, store settings and CSV product import. Admin metadata/headers exclude indexing; semantic forms/tables, responsive navigation, loading and retry/error states are included. Legacy admin links have reversible explicit redirects.

Order updates use authenticated PII-free SSE invalidations from committed authorized orders, with initial/reconnect reconciliation and a recovery poll. Socket.IO keeps connection/delivery authorization and gains a tested shared-bus interface; a deployment bus is not configured. Push subscriptions remain staff-owned; optional public VAPID configuration and real provider delivery remain staging gates. No production data/provider/deployment/credential operation or schema migration occurred. Existing commercial policies, order snapshots and API mutation ownership are retained. See [implementation, verification, compatibility, limits and rollout](NEXT_ADMIN_2026-10-03.md).

Local verification passed: typecheck/lint, 131 automated tests (two database suites skipped in the ordinary run), 11 disposable replica-set integration checks, isolated production build, compiled admin/storefront smoke, 15 browser routes with 60 viewport/accessibility checks, functional login/forms/role-denial/order-arrival/outage recovery and admin-scoped worker registration. Final live Turbopack compilation and browser/runtime diagnostics are clear. Real provider/media parity, ingress quota/load/streaming acceptance and legacy Socket.IO shared-bus configuration remain staging gates.


## Completion work — 2026-10-04

The cumulative `codex/complete-production-migration` branch includes all twelve modernization branches. It adds functional, explicitly gated Next checkout with server-verified reviewed totals and saved retry intent; Tailwind 4/PostCSS; account-scoped recovered Cloudinary images; closed-store/first-admin recovery bootstrap and atomic draft catalog imports; patched backend dependencies and deterministic platform-supervised startup; hidden CI evidence uploads; and an exact-commit, verification-gated staging deployment workflow. Unused legacy email code/dependencies were removed. CRA is deliberately retained because compatibility tests and the unverified fallback still depend on it.

Local lint/typecheck/build and 47 unit, 7 release, 95 API, 22 disposable database and 19 Chromium tests pass. Dependency auditing still fails with root 5 high and CRA frontend 59 high findings; backend has none high/critical and all critical findings were removed. Protected master requires green `verify` and auto-deploys on merge. No protected merge, production DB write, credential change, provider call or deployment occurred. The replacement Atlas cluster exists, but hosting/configuration and hosted business/provider acceptance are not verified. Migration completion and CRA retirement remain blocked by these gates. See [the complete recovery, hosting, merge and retirement flow](COMPLETION_FLOW_2026-10-04.md).


### Merge-blocker remediation — 2026-10-04

Supersedes the dependency counts in the earlier completion record: root, backend and frontend now have zero high/critical audit findings. CRA build tooling is replaced by maintained Vite while preserving the compatibility UI. Next lint glob discovery uses a scoped maintained adapter with regression coverage. Obsolete Vercel configs and dead CRA test/web-vitals scaffolding are removed. Product stock edits now compare loaded stock atomically, reject stale forms, accept zero stock, and validate price precision; old Drive assets survive replacement failures. Repository integration must use a Render skip phrase until hosted acceptance is complete. This does not claim phase 14 production completion, complete backend ownership transfer, full Tailwind adoption, or fallback retirement. See COMPLETION_FLOW_2026-10-04.md and CODEX_HANDOFF_PROMPTS.md.

## Pre-import catalog foundation — 2026-10-16

Added an admin-only preview/resume/report/rollback importer with stable source mappings, category mapping, gross VAT validation, approved opening-stock estimates, hidden drafts and explicit publication/channel review. Added verified product metadata, Google XML/Meta CSV feeds (off by default), enriched Product/Offer/Pharmacy JSON-LD and consistent pagination indexing. Prepared 7,136 source records separately from the one missing-VAT VITKID record; the owner confirmed it must remain pending. No real catalog import, deployment or external account upload occurred. See [contracts, safeguards, files and remaining data/channel reviews](CATALOG_IMPORT_FOUNDATION_2026-10-16.md). This supersedes the earlier statement that all paginated listings are noindex: valid listing pages now have self-canonicals; filtered/search/private pages remain excluded.

18 October media follow-up: owner-configured signed uploads verified working; three exact manufacturer packshots attached (8 verified products total, 7,128 pending), with unchanged prices/stock and unpublished draft state. Console origin still denied; provider inventory/legacy reference audit and cleanup remain pending. See `MEDIA_ACCESS_2026-10-18.md`.

18 October catalogue publication/content: owner approved all 7,136 opening-stock estimates. The checked metadata batch preserved commercial values, repaired five category ObjectId references, and reconciled an idempotent dry run. Thirteen image-matched skincare/deodorant products are published and verified through the hosted public API; fifteen products have manufacturer-based structured details (two Bepanthen cream drafts remain held). 7,123 products still lack exact images/classification, and the rest are not claimed richly enriched. Product details now have semantic overview/benefits/suitability, native detail disclosures and visible specifications; SEO site suffix duplication is corrected. See `CATALOGUE_CONTENT_2026-10-18.md` for counts, sources, checks and remaining scope.

### Catalogue needs-action review — 2026-10-18

- Added administrator-only `/admin/needs-action` backed by a bounded read-only draft endpoint, action filters and direct product-editor links.
- Incomplete ERP identity markers, unconfirmed medicine classifications and prescription products remain held as drafts. Publication checks reject obvious incomplete names; no Rx classification is guessed and no dispensing workflow is introduced.
- Read-only production check: 7,123 drafts, eight incomplete-name markers, zero unsafe live listings. No catalogue data, prices or inventory changed in this release. See `CATALOGUE_CONTENT_2026-10-18.md` for the enrichment checkpoint and limits.

18 October follow-up, prepared release: split store publication checks from image/brand merchandising and advertising-feed checks; add published/draft/all missing-photo admin filters, explicit placeholders and responsive Cloudinary CDN product delivery. A reviewed 665-record non-medicine publication manifest passed a read-only preflight; application is tracked separately, not claimed complete here. The operator helper has atomic, replay and stale-edit integration coverage and full before-state receipts. See `CATALOGUE_PUBLICATION_MEDIA_2026-10-18.md`.

18 October hosting: the Render frontend production/check-out settings deployment reached Live. Created the pharmacy's empty Vercel storefront project and prepared an exact-verified-commit GitHub Actions/official CLI route from the original repository, avoiding a fork. No Vercel deployment or canonical cutover has occurred; private deployment-token setup remains a human credential handoff. See `VERCEL_SINGLE_REPOSITORY_2026-10-18.md` for prerequisites and Free/Hobby hosting constraints.

18 October follow-up: PR #47 is merged as `aa936532a242544727ed1b6cf228543f12faece0`; both Render services are Live with the missing-photo queue and CDN image delivery. The reviewed retail batch has not written data: this computer's network address changed, and the newly required temporary Atlas rule is awaiting owner approval. The first Vercel workflow authenticated successfully but found omitted build dependencies under production installs; explicit dev-tool installation is prepared. A further twelve GTIN lookups produced five photo candidates; inspected exact 200 ml cleanser photos have a provider-specific attribution UI prepared. See `LICENSED_PRODUCT_PHOTOS_2026-10-18.md`; neither candidate discovery nor a prepared credit component is recorded as image upload.


## Dense homepage and commerce discovery — 2026-10-19

Compact inline location + floating contact, denser merchandising, budget/brand/routine modules, safe saved banner destinations and server-rendered collection pages implemented locally. Full plan coverage/dependencies: [implementation checklist](COMMERCE_PLAN_IMPLEMENTATION_2026-10-19.md). No production data/deployment changes.

## 2026-10-19 — customer/growth and points-voucher foundation (local)

Added staff-managed editorial/local SEO content, indexed search suggestions, separate customer identity, owned order history/reorder, saved/recent products, moderated purchase reviews, configurable delivery thresholds and admin-controlled points/referral vouchers. Voucher redemption/checkout/reversal preserves server authority and transaction boundaries. No production activation or data backfill performed. New provider credentials/index application/approved rules remain activation requirements; broader retention/Arabic/analytics work is still open. Implementation/rollback details: `GROWTH_FOUNDATION_2026-10-19.md`.

### Growth-plan completion work — 2026-10-19

Added a private customer address book (10-address limit, default handling, add/edit/remove) and optional checkout prefill; admin 7/30/90-day order-value/count reporting with no customer PII; and active product/category selectors for growth CMS instead of raw IDs. No production DB, external provider or deployment was touched. Root/workspace typecheck and lint, nine disposable replica-set integration cases, API build and isolated web production build pass. Matching-API browser preview loaded demo metrics, found and selected a product, and rendered the signed-out account/guest-checkout path. The full 90-day acquisition/retention programme still has code and pharmacy-operations gates; see `COMMERCE_PLAN_IMPLEMENTATION_2026-10-19.md` and `GROWTH_FOUNDATION_2026-10-19.md` for the exact remaining scope.

### Storefront discovery facets — 2026-10-19

Added server-validated in-stock, current-price range and sort filters across listings, categories, search and offers. Active sale price drives range and price ordering. Inputs are bounded and pagination retains chosen facets. Regression tests cover validation and disposable-database query behavior. Local only; deploy the compatible API and web together. Remaining growth work and pharmacy/external prerequisites are itemized in the implementation checklist.

### GitHub check cleanup — 2026-10-19

PR verification now runs once per update with quality/security, API, browser and the existing required `verify` gate. Master pushes still verify before Vercel deployment. The unused Al Mina-only Netlify and Cloudflare GitHub installations are suspended; hosting projects and Render/Vercel access are preserved. Updated the stale homepage heading assertion; compiled storefront smoke and deployment-gate tests pass. See `CI_CLEANUP_2026-10-19.md`.

### Growth programme completion pass — 2026-10-19

Closed three of the five remaining growth-foundation items and started the fourth. Requested reminders (abandoned-cart recovery, restock/price-drop/buy-again) are now covered by a disposable-replica integration suite proving owner scoping, consent, the active limit, one-shot delivery and that an ambiguous send is never auto-resent. Added staff-curated complementary bundles (editorial CMS collection kind gains a bundle marker and rationale; the API validates live visible products across two or more categories; the storefront offers add-all with no invented discount). Added a verified admin branch directory and an inactive-by-default serviceability rule enforced by the API in the single quote/checkout funnel (`ADDRESS_NOT_SERVICEABLE`); existing emirate delivery is unchanged while inactive, and `/ras-al-khaimah` keeps the existing branch fallback until the directory is verified. Started Arabic shopping/checkout: a locale cookie, RTL storefront shell, `t()`/`tf()` dictionary and header/footer language switcher cover the navigation chrome; follow-up slices localized the cart surface and the full checkout form (labels, GPS/validation messages, confirmation, locale-aware currency) plus the checkout page shell. Catalogue/PDP copy, delivery-progress/reminder panels, the first-visit delivery-area prompt and a few header labels remain English. No production data, index or deployment was touched and no new collection was needed. Local verification: typecheck, lint, 162 unit tests, 87 disposable-replica integration tests, 7 release tests, dependency audit (0 high/critical), foundation build, three compiled smokes and 91 browser tests pass. Arabic cart/checkout was also checked live end to end (`lang="ar"`, `dir="rtl"`, Arabic cart, review and confirmation, zero page errors). Full continuation notes and the remaining checklist: `GROWTH_COMPLETION_2026-10-19.md`.

## Private wholesale commerce — 2026-10-21 (local)

Added an invitation-only `/wholesale` portal and admin-only `/admin/wholesale` configuration on `codex/wholesale-portal`. Admins create business profiles, verify businesses, assign products/categories and configure explicit unit prices, minimum quantities, case multiples and maxima. Verified email-bound invitations grant access only after acceptance. Shared stock, authoritative VAT/delivery and the existing transactional/idempotent order lifecycle are retained; trade orders carry a business snapshot and do not earn retail rewards. Public catalogue DTOs and retail account enrollment do not expose wholesale access or rates. No production data, prices, inventory, invitations or deployment changed. Setup, boundaries, rollout/rollback and verification: [WHOLESALE_PORTAL_2026-10-21.md](WHOLESALE_PORTAL_2026-10-21.md).

## Combined storefront/account/wholesale PR — 2026-10-21

Consolidated the two same-base local branch workstreams into `codex/wholesale-portal`, retaining unrelated local tooling/captures outside application commits. Added isolated verification tags, aligned stale navigation assertions, restored live announcements of search results/empty/error states, and scoped the mobile header-cart test independently of the bottom navigation. Lint, typecheck, 171 unit and 54 disposable integration tests pass; the full 125-browser run's five failures were fixed and verified by 16 navigation/Arabic plus nine storefront reruns. No production changes or merge. Detailed evidence and deployment prerequisites: `COMBINED_STOREFRONT_WHOLESALE_PR_2026-10-21.md`.

## Wholesale store/account and product audiences — 2026-10-22 (local)

Added product create/edit audience controls (all, retail, wholesale), optional wholesale business-type selection, and server enforcement across catalogue/discovery/feeds and both checkout channels. Completed business account details/history, delivery prefill, catalogue pagination and case/cart controls; added admin contact, licence, TRN and delivery fields plus immutable order snapshots. Retail history identifies trade purchases and avoids retail reordering of them. Existing records remain compatible without backfill; production data and deployment are unchanged. Rollout, index plan, rollback implications and verification: [WHOLESALE_COMPLETION_2026-10-22.md](WHOLESALE_COMPLETION_2026-10-22.md).
# Production email activation — 23 October 2026

PR #59 is merged; Render serves its verified commit. Email sign-in is enabled on
both public API gateways, a signed delivery webhook returned 204 and the public
sign-in flow delivered to the provider's controlled test recipient. Vercel blocked
the merge author's deployment on its current plan; the documented actual-owner
merge route is being used without changing contributor identity or permissions.
See [activation evidence and remaining launch acceptance](EMAIL_ACTIVATION_2026-10-23.md).

## CI optimization — 23 October 2026

Replaced the migration-named workflow with `CI`: fast required quality/API/build
checks on PRs, docs-only skips, manual full browser regression and no duplicate
post-merge suite. The deployment gate reuses successful PR checks only for identical
merged file trees and adds read-only public-host checks after deployment. Strict
branch protection and the existing `verify` check remain. See [CI and deployment
checks](CI_2026-10-23.md).

### Five-area development pass — 2026-10-23

Implemented unified product photo preparation/editing, Arabic account and wholesale controls, cost-aware growth reporting and consented aggregate activity, bounded reviewed general-sale recommendations, and additive legacy media copy/verification/mapping tooling. Original media, commerce snapshots and inventory remain retained. Production indexes, reviewed Arabic copy, actual costs and verified media cutover remain operational acceptance gates. See [implementation, validation and rollback](DEVELOPMENT_COMPLETION_2026-10-23.md).

## Branded product media — recovered PR #57

Reintroduced the branded responsive image handler and product metadata/feed URLs on the current release base. See `BRANDED_MEDIA_2026-10-21.md`; deployment cache-hit verification is still required.

### 24 October 2026 — Nexadash / Dub admin redesign

Replaced the admin's warm-paper presentation with a scoped neutral system:
white panels, fine gray borders, compact grouped navigation, dark actions and
blue chart ink. Added header inventory search, search-preserving inventory view
tabs, compact product row actions, and product-section shortcuts that reveal
secondary content without discarding mounted inputs. Basic details and pricing
share a desktop row; classification, review and visibility remain explicit.
The dashboard now puts its chart beside the attention queue; confirmed and
packed queue links have separate exact counts, review totals make no draft-only
claim, and an unavailable store-status read displays Unknown.

Existing routes, permissions, mutation contracts, stock receipts and customer
storefront styling remain intact. No production data change or deployment.
Verification: isolated production foundation build, web typecheck, targeted ESLint,
Next.js compilation diagnostics, desktop/phone captures of dashboard, products,
editor, orders and operations, and a tablet editor capture. Focused browser
regressions pass for inventory search/filter persistence, row-menu Escape/focus,
unsaved product-section navigation at 390/768/1440px, session/RBAC behavior,
stock conflict/receipt handling, and photo replacement/archive stock preservation.

### 24 October 2026 — Admin composition and editor hierarchy follow-up

Rebuilt the overview around the owner's new bento layout references: compact
2×2 KPI group, dominant interactive daily chart, fulfilment breakdown, then
recent orders and ranked products. The overview now reads the existing
admin-only growth metrics API on the server, with no-store, timeout and schema
validation; seven/thirty/ninety-day periods and comparisons use that aggregate
contract. Daily charts include zero days and support pointer/keyboard inspection,
value/order metrics, bar/line views and a daily CSV export. Gross placed-order
semantics, cancellation/refund inclusion, current-system coverage and UTC dates
remain explicit. Recent orders remain independent of the selected period.
System diagnostics remain on Operations rather than displacing commerce data.

The owner selected essentials on one screen with advanced details collapsed.
Product basics, creation category, price, stock and adjustment reason now form
one open section, with Save immediately after it and photos alongside on desktop.
Classification, care, channel publishing, variants and wholesale visibility are
collapsed native disclosures; all inputs and stock receipt fields remain mounted
and submitted. Invalid controls open their enclosing disclosure for recovery.
Removed hover underlines and prioritized Orders/Products in navigation. Existing
photo and product saves remain independent; new products must still be created
before photos can be attached.

Verification: isolated foundation production build, web typecheck and targeted
ESLint; fourteen focused source/presentation tests and nine browser regressions
pass. Browser checks cover actual reporting/top products, date selection, chart
keyboard inspection, export, filters, disclosure edit preservation at
360/390/768/1440px, auth, stock conflicts, photo replacement and archive retention.
No backend, production data or deployment changes were made by this follow-up.

Final rendered checks: zero horizontal overflow at 360/390/768/1440px, no browser
page errors, and zero axe WCAG 2 A/AA and 2.1 AA violations on the dashboard and
product editor. Count axes omit fractional/duplicate one-order midpoint labels;
primary bars meet graphical contrast. A local read-only reporting fault verified
that Reload requests a fresh report while retaining recent orders. Empty reporting
was inspected without inserting illustrative sales or changing stored data.

### 24 October 2026 — Channel-first product editing and admin task hierarchy

Latest owner feedback replaces collapsed product sections with persistent task
tabs. Retail/Wholesale switches now lead the editor and determine visible price
inputs. Explicit per-business-type wholesale rates and case quantities save from
the product screen; disabled channels retain persisted rates. Product and trade
APIs remain separate, with explicit pricing-only recovery after a partial save.
Stock reason is required only for stock changes, and hidden expected-stock and
receipt controls remain intact. The product-create response envelope now survives
recursive gateway projection so creation can open the saved product and attach
its wholesale terms.

Growth settings are split into task tabs; list creation, maintenance tools and
order contribution costs no longer displace primary work. Wholesale pricing
links to the unified editor. See `ADMIN_HIERARCHY_2026-10-24.md` for the audit,
compatibility details and recovery limitations. Build, targeted lint, 26 focused
tests and 19 unique browser scenarios pass across the verification runs. Axe
checks pass in 24 page/tab states, with no observed browser page errors or tested
viewport overflow. No production data migration or deployment was performed.


### 2026-10-25 — Reviewed product images applied
Applied 318 image links to 315 products with before-state, revision checks and transactional media history/receipts.22 affected public products verified;293 draft/disabled statuses retained. Temporary Atlas access removed. See `REVIEWED_IMAGE_ASSOCIATIONS_2026-10-25.md`.


### 2026-10-25 — Image-linked draft publication reviewed
Reviewed293 records; published75 retail products with descriptions, categories, pack details and SEO.218 held with per-SKU reasons. All75 public API checks passed,293 DB records verified, price/stock/VAT unchanged. Withdrew two image links for pack/style uncertainty; temporary Atlas access removed. See `REVIEWED_RETAIL_PUBLICATION_2026-10-25.md`.

## 2026-10-25 — Category-first discovery and deterministic listing ranking (local)

Promoted categories/collections rather than the undifferentiated catalogue, retained /products as a secondary route, exposed sorting and removable filters, and replaced public stock-quantity sorting with intent/availability/merchandising ordering. No commerce calculations or production data changed. Isolated web build, API TypeScript, seven catalogue integration tests and ten browser tests passed. See [CATALOG_DISCOVERY_2026-10-25.md](CATALOG_DISCOVERY_2026-10-25.md) for audit, sources, ranking order and limitations. Not deployed.


## 2026-10-25 — PR65 security gate and CDN ancestry

Patched the Next DevTools Zod chain through a scoped 4.6.7 override and hash-guarded, idempotent install-time JSON-schema compatibility bridge. Fresh installation, 202 unit tests, full lint/typecheck, stdio argument/schema regression and real Next route/compilation probes pass. Root/backend audits report zero high/critical findings; the audit gate is unchanged. The superseded branded-CDN branch is recorded as merged while retaining the already-integrated implementation and subsequent fixes. See [RELEASE_REVIEW_2026-10-25.md](RELEASE_REVIEW_2026-10-25.md).

## 2026-10-25 — SEO, policy pages and Merchant Center readiness (local)

Added public `/returns`, `/shipping`, `/terms` and a full `/privacy` policy, linked from the footer and product page and included in the static sitemap. Product JSON-LD now emits absolute images (with the visible placeholder when no approved photo exists), stock-derived availability, a 7-day in-store return policy for general-sale products (not permitted for medicines/prescriptions/unclassified items) and live `shippingDetails` from a new read-only `/api/v1/growth/shipping` endpoint; ratings/reviews appear only for real approved reviews. Product metadata enables large image previews, translated growth pages add `x-default`, and the Google feed includes the lowest live delivery fee. All dates, fees and policy terms are shared through `apps/web/src/lib/policies.ts` and remain subject to pharmacy/legal confirmation. The feed stays dark behind its existing gates, and real product photography is still required for Merchant listings. Typecheck, full lint, 204 unit tests, isolated production build and SEO smoke pass. No production data, deployment or channel account change. See [SEO and Merchant Center readiness](SEO_MERCHANT_2026-10-25.md).

## 2026-10-25 — Render proxy-aware API rate limits

Added one shared, Render-only address allowlist fallback to the retained and maintained runtime configuration loaders. Explicit operator IP lists retain precedence; direct/local defaults remain disabled. Multi-hop/spoof-prefix HTTP and both API limiter regressions pass without disabling validation. See [RENDER_PROXY_TRUST_2026-10-25.md](RENDER_PROXY_TRUST_2026-10-25.md) for trust boundaries and post-deployment verification. No production configuration or deployment was performed by this change.

## 27 October 2026 — additive Stripe test payments

Stripe-hosted Checkout is an extra, opt-in **test-only** retail payment path. Cash/card on delivery are preserved. Test orders reserve stock transactionally, verify signed webhooks and canonical provider state, reconcile expiry/full refunds once, and cannot send notifications or enter fulfilment. Production activation is blocked. Isolated local sandbox and private listener setup: [Stripe test payments](STRIPE_TEST_PAYMENTS_2026-10-27.md). Live payments need a separate reviewed rollout.

## 28 October 2026 — live Stripe rollout

Added account-bound live-mode support alongside delivery payments. Production availability is controlled by Render, with new payments paused until live credentials/account readiness are verified. Fulfilment and notifications require canonical full capture; paid cancellations queue idempotent refunds and fence dispatch. Partial refunds, failed refunds and disputes stop fulfilment; post-dispatch/Dashboard refunds never invent returned stock. The owner approved creating the live webhook and will enter credentials directly in Render after deployment. [Production rollout and rollback](STRIPE_LIVE_PAYMENTS_2026-10-28.md).

## 2026-10-28 — Google Merchant and Search Console activation

Audited Merchant Center account 5884188879 and the production domain property in
Search Console. Corrected Merchant shipping/return settings to the published site,
selected and named one existing UAE API source for free listings, and started
validation of resolved server-error and return/shipping markup reports. Healthy
sitemaps, intentional search noindex and truthful review metadata were preserved.
Added an opt-in, leased Merchant API worker with publication/photo/identifier
review gates, owned-raster validation, stable-ID retries and source-scoped
withdrawals; it cannot alter commerce data. Corrected placeholder Product images
and national shipping-fee markup/feed output. Catalogue preparation reports zero
ready products and 90 close candidates out of 753. With owner approval, enabled Merchant API, registered Cloud project 181730454094,
created the dedicated service account, reduced it to Standard-only access and
saved the protected credential/configuration in Render for release deployment.
An API source read succeeded after the downgrade. No products were submitted
or marked approved; the production worker must be verified after deployment. See [Google Merchant and Search Console](GOOGLE_MERCHANT_SEARCH_2026-10-28.md).

Production acceptance completed for runtime release `27aead53d2cfc90465207c5b24cccfe125bf1ba9`
([PR #78](https://github.com/nbl-ahmd/almina/pull/78)): all CI/deployment checks passed,
Render readiness and the first successful Merchant job were verified. With explicit
owner approval, set only Vichy `PD6615` to new/Google-approved through the production
admin workflow; price, stock, GTIN, sale state and Meta approval were verified
unchanged. The worker uploaded it successfully, and Merchant API confirmed the
correct AED 75.60/in-stock record with AE free listings pending Google's initial
review and image crawl. Search Console's live test finds the page indexable with
valid Merchant/Product/Breadcrumb markup. Customer-service details now match the
public website. Full photo audit: 88 of the 90 initial close candidates pass the
500px check; the two Bioderma candidates need larger originals. Other products were
not approved automatically. Final external Google approval remains pending.

### 29 October 2026 — shopping interaction refinement

Added input-aware storefront motion, larger campaign controls, native shelf
scrolling, local press/success feedback and a delivery-sheet transition. Keyboard
navigation remains immediate and reduced-motion preferences retain their global
opt-out. Checkout now focuses and aligns its response rather than leaving mobile
shoppers at the bottom of the form. Commerce calculations, quote acceptance,
idempotency and payment providers are unchanged.

Validation: isolated production foundation build; scoped ESLint; 24 relevant unit
tests; browser checks at 360/390/768/1440px and Arabic RTL; slow stock-check feedback,
cart count/quantity persistence, keyboard sheets/carousels, changed-price rejection
(no order, stock unchanged), and a successful synthetic checkout (one order,
expected stock deduction and receipt). Next runtime/compilation diagnostics were
empty. Added focus regression assertions to the existing checkout browser suite.
No production data or hosting configuration was changed.

### 29 October 2026 — Merchant reviews and discovery integration

Added default-off Google Customer Reviews on accepted/verified live confirmations,
minimal survey payloads, original server timestamps and the current Merchant store
widget with route-scoped CSP and privacy disclosure. Owner confirmed Google
eligibility. Merchant automations/protection were enabled, the Oral-B identifier
was corrected through admin, and Search Console validation started. Added
Merchant-tag canonical regression coverage and independent homepage hero
streaming with first-image priority and readable captions. See
[activation and audit details](GOOGLE_CUSTOMER_REVIEWS_2026-10-29.md).
Owner approved customer-data transmission and activation; five Production settings are saved.
Backend is deployed. Frontend release must use the authenticated Vercel-linked
owner identity; live activation verification follows that release.

### 30 October 2026 — production payment labels

Live Stripe acceptance was enabled in Render after owner-entered credentials
passed account readiness. Production availability reports ready/available true,
testMode false; verified the selectable card option without creating an order or
charge. New checkout choices now use provider-neutral English/Arabic copy:
Credit or debit card and Cash on delivery. Removed the separate card-on-delivery
choice for new submissions while preserving original pending legacy methods and
backend contracts. Updated payment-return copy and browser regression expectations.
Pricing, reservations, payment processing and existing orders are unchanged.

### Shared main stock and full-screen delivery editor — 2026-11-08

Owner-requested simplification: branches share main catalogue stock; no separate
allocation step. Existing reservations remain backwards-compatible, with main-only
new-order markers and legacy restoration guards. Map editing adds full-screen
focus/scroll handling, retained drafts and fitted saved coverage. See
[shared-stock delivery notes](SHARED_STOCK_DELIVERY_2026-11-08.md) for deployment,
verification and rollback constraints. This change requires release review.

### PR #92 CI race correction — 2026-11-08

The automatic CI reduction from 23 October remains intact. Its first hosted run
exposed a concurrent image-import replay race, not a restored browser suite.
Recognize only an exact atomically completed import receipt after expected
conflicts; deterministic overtaking tests preserve stale-review rejection and
single-write history. See [CI notes](CI_2026-10-23.md).

### Staff notifications — 2026-11-08 (review candidate)

Replaced the repeating pending-order chime with one-shot, account-deduplicated foreground events. Added a persistent personal inbox, order/stock/payment alert episodes, category preferences, revisioned stock thresholds, self-only rate-limited test pushes, installable admin manifest and privacy-preserving service-worker window reuse. Reuses standard Web Push and existing credentials; workers remain on the persistent service. No production commerce data or deployment changed. See [staff notification operations and rollback](STAFF_ALERTS_2026-11-08.md).
### Branch polygons unify delivery and receiving — 2026-11-08

Replaced separate city-allocation/receiving activation screens with a single
transactional save-and-enable action on the branch polygon. New branch creation
can enable its login, location, zone and receiving together. Pausing is branch
scoped; no separate fallback or named-city setup is required. Legacy data and
orders remain compatible. Optional explicit place search shares the existing
geocoder's cache, global quota and rate limit. See
[branch-zone workflow](BRANCH_ZONE_WORKFLOW_2026-11-08.md) for cutover, provider
policy, rollback and verification. Production changes require release review.

PR #94 compatibility follow-up: integrated the merged PR #93 polygon workflow into the notification candidate. Shared API exports and authorization lists retain both place search and notification routes. Browser receiving coverage follows the current polygon assignment workflow, alongside the notification inbox and sound regression checks.

### PR #95 CI dependency security — 17 November 2026

Repaired the new picomatch audit failure with a hash-verified, expiring local
repeated-extglob mitigation and focused regression tests; raw audit reports and
unrelated high/critical failures remain intact. Updated Next.js and matching
ESLint packages to stable 16.4.6 after a local framework security build stop.
Local lint/types, 279 unit tests, release tests, security gate, production build,
SEO smoke and synthetic storefront browser/MCP checks pass. Hosted CI verification
on the repair commit remains required. No production data or deployment changed.
See [PR #95 notes](PR95_SECURITY_2026-11-17.md); review the temporary mitigation
before its 17 December 2026 UTC expiry.

### WhatsApp inquiry message — 17 November 2026

The floating WhatsApp link now URL-encodes the owner-approved prefilled message:
“Hi Al Mina Pharmacy! I'd like to make an inquiry about your products.”
Verified the decoded destination text on desktop and mobile after reload, no
horizontal overflow, no browser errors, and no Turbopack compilation issues.
Component lint passes. Follow-up PR review/merge remains pending; no deployment
or WhatsApp message was sent by verification.
