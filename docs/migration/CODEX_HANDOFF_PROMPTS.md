# Codex continuation prompts

Use the existing `nbl-ahmd/almina` repository. Do not create another repository. Integration branch: `codex/complete-production-migration`, cumulative PR #2. Check its actual merged state before choosing a base. These prompts describe remaining work, not completed production acceptance.

## 1. Finish the application and recovery UI

```text
Continue the Al Mina production migration in nbl-ahmd/almina. Start from current master after confirming PR #2 and all twelve codex/* and modernization/* source branches are ancestors; if it is unmerged, continue its integration branch. Read AGENTS.md, scoped instructions, MIGRATION_PLAN.md, MIGRATION_STATUS.md, COMPLETION_FLOW_2026-10-04.md and the release gate/runbooks. Inspect actual code and current CI before acting. Work in focused PRs; do not trigger production auto-deploys while hosting acceptance is incomplete.

Complete remaining repository work in this order:
1. Inventory every retained legacy API write, media/provider operation, admin route and fallback dependency. Move ownership incrementally into tested maintained modules. Preserve identifiers, URLs, server authorization, notification/outbox contracts and existing compatibility adapters until replacement parity is proven.
2. Build an authenticated recovery import workflow using recovery-catalog.ts domain guarantees: spreadsheet/CSV template and conversion, bounded input, stable product IDs, barcode strings, decimal money, configured Cloudinary raster URLs, preview with row errors, hash-bound commit, transaction/ledger idempotency, no overwrite, disabled drafts and zero stock. Keep the store closed. Block the unsafe legacy batch importer from recovery. Do not infer prices, stock or product identity from image filenames. Never fabricate lost orders/customers.
3. Add immutable admin inventory adjustments with actor, reason, delta and conditional concurrency control; retain the implemented stale-form protection. Verify two-decimal money and sale/invoice rules on every write. Preserve atomic checkout/cancellation and uncertain-response retries.
4. Add retained API readiness and bounded graceful shutdown, drain notification/outbox workers safely, and test provider retry/duplicate/outage behavior. Complete signed Cloudinary upload and reference-aware media replacement/archive; never delete surviving images automatically. Prefer archive to destructive product removal where historical references require it.
5. Finish the pharmacy design system and Tailwind adoption one component at a time: restrained white/teal surfaces, consistent type/spacing, prominent search, compact categories, clean product cards and image galleries, clear AED prices/stock/delivery information, accessible mobile navigation and forms. Verify real browser behavior at 360/390/768/1280px, keyboard operation, errors, loading/empty states and contrast. Use frontend-design and React/Next performance guidance when available. Do not invent ratings, medicine claims or stock availability.
6. Complete SEO redirects/canonicals/sitemaps/robots/schema, PII-free consent-aware commerce analytics, operational dashboards/alerts and performance budgets using representative recovered products. Keep admin/cart/checkout/search variants out of indexing where intended.

Run meaningful security, money, inventory, auth/RBAC, real disposable MongoDB, browser and release-gate regressions, lint/typecheck/build and all lockfile audits. Keep the required verify gate. Commit focused changes, open/attach PRs, update exact evidence and remaining gates in migration docs. Do not claim production complete without hosted acceptance. Retain frontend/ (now Vite, not CRA) until the separate retirement conditions pass.
```

## 2. Configure hosting, recover data and cut over

Sign in to GitHub, Render, MongoDB Atlas and Cloudinary in the available browser before using this prompt. Enter secrets only through provider secret settings or a protected local secret file, never through chat.

```text
Complete the hosted Al Mina migration for nbl-ahmd/almina using its current verified release. Read repository instructions and completion/release/rollback runbooks. Inspect PR #2/master and the actual green CI commit. The backend production service is https://dashboard.render.com/web/srv-cv1dn5lds78s73doqjm0. Master currently auto-deploys. A replacement MongoDB cluster exists under https://cloud.mongodb.com/v2#/org/6ac14ae9c7f8947f390927c7/projects. Cloudinary images survive; the former production products/orders/customer history do not. The Next website project is not yet identified: inspect existing hosting and request that specific choice if unavailable; do not assume an old Vercel/Netlify/Cloudflare project is current.

Using my signed-in provider sessions, first inspect production deployment state and pause auto-deploy while completing acceptance. Verify the Render skip event for any integration merge containing [skip render]. Remove repository-only obsolete Cloudflare Pages, Netlify and Vercel connections/webhooks/check requirements; do not uninstall organization-wide apps used by other repositories. Preserve required quality/api/browser/audit verify checks. Record active service names, exact commit, build/start commands, origins, health paths and rollback target without printing secrets.

Provision isolated staging with least-privilege credentials and a transaction-capable Atlas database. Use the modular API, retained API/outbox worker and Next web services described in COMPLETION_FLOW_2026-10-04.md until ownership transfer is proven. Use the same staging database for both APIs and exact allowed website origins. Rotate previously exposed credentials, configure backups/retention and prove a restore into a separate database. Configure the protected GitHub staging environment and exact-commit deployment workflow; prevent auto-deploy races. Never route staging to production collections or real customer messaging destinations.

Rehearse empty-database bootstrap and recovery import in staging. Default commands must remain plans; apply requires explicit database matching and maintenance gates. Create one administrator through a protected password file, choose the order-number floor from independent records, keep the store closed, import reviewed products as disabled zero-stock drafts, match Cloudinary assets, physically verify inventory and publish only reviewed items. Find independent exports before declaring historical records unrecoverable; never invent them.

Verify hosted auth/RBAC/session expiry, media/catalog/admin CRUD, inventory races, changed prices, uncertain checkout retries, taxes/delivery/order numbering, order lifecycle, email/WhatsApp/push/outbox delivery and outages, realtime reconnect, SEO/crawler routes, mobile UI, cache invalidation, analytics/privacy, load budgets, health/alerts and restoration/rollback. Tie evidence to the exact release SHA. Fail closed on missing release gates and produce a concrete remediation, not an invented pass.

After staging acceptance and recoverable rollback evidence, prepare the production traffic/writer switch and execute within the already authorized migration scope. Change DNS/routing only after confirming actual domain/provider ownership. Deploy the verified candidate, verify deployed SHA from each provider, and enable checkout/store availability only after data and business acceptance. Observe using the documented window and rollback triggers; preserve new orders/receipts/stock/outbox records during rollback. Configure the final production pipeline so only intended services deploy after valid CI, with backups/migrations separately controlled. Record exact evidence; distinguish deployed, accepted and fully observed completion.
```

## 3. Retire the fallback after observation

```text
In nbl-ahmd/almina, verify from exact-release evidence that all storefront/admin/provider routes have hosted replacement parity, production cutover and observation passed, rollback no longer needs the frontend/ Vite compatibility client, and the release gate permits contraction. If any evidence is missing, implement the missing work and retain the fallback.

If all conditions pass, remove frontend/ and its unused dependencies, fixtures, scripts and CI/hosting paths in a focused PR. Preserve shared assets, externally used URLs/redirects and required integration contracts. Search the entire repository for consumers before deletion. Do not remove the retained backend until its separate ownership/integration gates also pass. Run the full replacement browser/API/transaction/auth/media/SEO suite, lint/typecheck/build/audits and release gate. Attach the PR and update migration status with truthful completion evidence.
```
