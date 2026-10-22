# Wholesale store, account and product audiences — 22 October 2026

## Delivered

Product create/edit now has **All — retail and wholesale**, **Retail only**, and
**Wholesale only** visibility. Wholesale visibility can include all business types
or selected configured types (Salon, Pharmacy, etc.). Selecting no types with
“Selected” grants no wholesale visibility. Paused types remain visible to staff
for configuration; their accounts still cannot access the portal.

These are additional restrictions, never grants of business membership or trade
prices. Approval, accepted invitation, active profile, product/category assignments,
review/publication rules, medicine eligibility and enabled explicit profile prices
remain mandatory. Business types are managed in Admin → Wholesale.

The API applies audience rules to retail lists, details, family variants, related
products, sitemap, suggestions, advertising exports, saved-product mutations,
reminders, campaign checks, delivery previews and retail quote/checkout. Private
catalogue and wholesale quote/checkout enforce the business type. Admin trade
product selectors use a separate authenticated read so wholesale-only products
can still be priced and assigned. Product creation/updates validate referenced
business types within their existing transaction. Existing cache invalidation
expires catalogue tags after successful admin mutations.

Wholesale store now has store/account navigation, minimum-case quick add, maximum
quantities, cart removal and append-style catalogue pagination. Business account
shows verified details and paginated order history with original line/tax/delivery
totals. Business delivery details can prefill the order form; the buyer must review
them, and totals/stock are still recalculated server-side. Saved uncertain checkout
submissions retain the existing idempotent recovery behaviour.

Admin business records gain optional contact name, phone, trade licence, UAE tax
registration number, delivery address, city and emirate. A non-empty TRN must be
15 digits. These details are administrative records, not automatic verification,
a dispensing authorization, credit terms or changes to VAT calculation. New trade
orders snapshot the recorded details; staff order detail shows that historical
snapshot. Existing orders are not backfilled. Retail account history labels trade
orders and excludes its retail Buy again action on those orders.

## Compatibility and rollout

Additive product fields: `audience`, `wholesaleAudience`, `wholesaleTypeIds`.
Missing fields preserve legacy access. Invalid audience values fail closed.
Missing account detail fields remain supported. No backfill is required; no price,
stock, product identifier, URL or existing order total is migrated.

New private reads: `/api/v1/wholesale/account`, `/api/v1/wholesale/orders` and
`/api/v1/admin/wholesale/products`, with corresponding Next gateway allowlists.
Business history requires current approved membership, authenticated customer ID
and matching wholesale account ID. It returns 20 orders per cursor page and never
returns another buyer's orders. Admin product options require admin permission.
Private responses remain no-store/noindex.

The index plan adds `wholesale_customer_history` on channel, customer ID, business
account ID and descending order ID. Apply through the existing reviewed additive
index workflow before production traffic; no production index was applied here.
Deploy API and web together and test configured business types/terms before
assigning audiences. The UI does not seed or approve any live business.

Before rolling back application code, disable/unpublish products that depend on
audience restrictions, or retain the enforcing API version. Older code does not
enforce these fields. Reset a rule to `all` only after deliberately approving that
product for public retail visibility. Roll back a compatible API/web pair and keep
business collections, order snapshots and the additive index. Code rollback alone
must not expose products that are meant to remain private.

## Verification

- Typecheck, repository lint and all 179 unit tests passed.
- API commerce bundle and isolated Turbopack production build passed.
- Disposable replica-set batch: 24 wholesale/commerce tests passed, including
  audience edits, visibility changes after quote review, no stock/order effects
  on denial, shared-stock concurrency and immutable business snapshots.
- Follow-up disposable batch: 20 wholesale/growth/catalog-media tests passed,
  including unauthorized private reads, staff denial, buyer scoping, cursor
  pagination and preservation of old order details after business edits.
- Browser coverage includes invitation acceptance, uncertain checkout recovery,
  360/390/768/1280px layouts, business history and prefill, real admin product save
  and reload, defaults on product creation, business-registration controls, retail
  account sign-in and checkout regressions. All 43 browser cases passed; an
  additional focused retail-history test passed, proving wholesale purchases
  cannot use retail Buy again.
- Final disposable wholesale/growth/catalogue regression batch: 25 passed.
- Running isolated Next dev at port 4790 reports no compilation issues or runtime
  errors through `/_next/mcp`; this preview intentionally has no application API
  or database configured. Successful buying/admin behaviour is verified against
  disposable or synthetic browser fixtures, not this disconnected preview.
- Rendered mobile business account/store and desktop admin visibility captures
  were reviewed. A test initially used an exact label locator that included select
  option text; using the accessible combobox name resolved it. Explicit label
  associations and a full-width visibility section then improved the admin form.

No production database, live product visibility, stock, price, invitation,
external email or deployment was changed. Pre-existing email/tooling work remains
in the working tree and was preserved; this task does not claim those changes.
