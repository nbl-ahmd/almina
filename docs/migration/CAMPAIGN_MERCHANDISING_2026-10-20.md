# Campaign merchandising — 20 October 2026

## Scope and remaining work

This is the next bounded development slice after the Arabic interface continuation.
Native Arabic/pharmacy approval cannot be supplied by implementation and remains pending.
This slice completes the structured campaign CMS gap identified in
`COMMERCE_PLAN_IMPLEMENTATION_2026-10-19.md`; it does not declare the wider competitor
growth programme complete.

No production database, index, content publication, provider configuration, price,
stock, discount, order or deployment changed. All test publications use synthetic
products in disposable databases. No customer messages were sent.

## Staff workflow

In `/admin/growth`, choose **Campaign / offer**, create or edit a campaign, then:

1. Add the existing title, description, landing-page body and canonical URL name.
2. Select saved desktop/mobile artwork, or paste an approved image URL. Uploads use
   the existing `/admin/banners` workflow; save the draft before leaving and reload
   the editor to select newly uploaded artwork. The new editor does not add a second
   upload integration.
3. Choose no homepage placement, hero carousel, or supporting section; set priority.
   Higher priority sorts first, then slug for stable ties. Existing content defaults
   to **none**, preventing surprise homepage activation.
4. Pin up to 40 products for homepage campaigns and move them up/down. Their real
   IDs, prices and stock remain authoritative. Other existing page types retain their
   previous 80-pin limit.
5. Add the CTA label, useful alt text, schedule and pharmacy-approved terms including
   eligibility/exclusions. Dates use UTC. Preview desktop/mobile and run readiness.
6. Explicitly publish and save. Revision checks reject stale edits.

The shared artwork component renders both the unsaved preview and the real homepage,
including responsive desktop/mobile sources, reserved image geometry, useful alt text
and canonical landing-page links. Admin preview uses storefront colours/font without
changing the admin theme. Mobile copy stacks above its CTA rather than squeezing into
one row. Arabic artwork retains its intended direction; copy and arrows support RTL.

Readiness is advisory: missing/invalid artwork, missing mobile art/alt/CTA/terms,
upcoming/expired schedule, no pins, unavailable products, stock and missing-photo
warnings. Editing invalidates old results. It does not approve medical claims,
image rights or discounts. Publication validation requires artwork, alt, CTA, terms
and existing useful landing content for homepage placements; reviewed health content
still requires its named reviewer. Missing photos do not invent replacement packshots.

## Public delivery and compatibility

- New `GET /api/v1/growth/campaigns?locale=en|ar` returns at most eight hero and four
  supporting campaigns. Queries filter published state, locale, schedule and placement;
  selected-product campaigns disappear when none of their selected products are visible
  and in stock. Missing/unavailable categories are excluded. No outbound image crawling.
- Homepage still supports existing uploaded image banners and the generated product
  hero fallback. Managed hero campaigns precede legacy banners; generated hero remains
  the fallback if neither exists. Supporting campaigns render in their own section.
- `POST /api/v1/admin/growth/campaign-review` requires main-admin identity and browser
  mutation protection; branch users are denied. The same-origin web gateway allowlists
  only the required new endpoints. Artwork uses the configured Cloudinary account or
  the existing bounded pharmacy CDN policy for both save and preview.
- Existing page/list endpoints keep their old response shape unless the caller opts
  in with `merchandising=1`. Updated web reads/writes opt in. Old admin payloads retain
  existing merchandising fields, with the same revision conflict protection.
- Deploy the compatible API/contracts **before** the new frontend. An old API rejects
  the new query parameter and cannot support new saves. The homepage safely falls back
  when its new campaign endpoint is unavailable, but this is not a substitute for the
  deployment order.
- Additive `growth_homepage_campaigns` index is registered in the existing index plan;
  it has not been applied to production. No backfill is necessary.

## Serviceability correction

Inspection corrected an earlier documentation assumption: legacy and v1 quote/create
already share the same commerce service and therefore both enforce configured delivery
restrictions. The legacy HTTP serializer now retains `ADDRESS_NOT_SERVICEABLE`, and
checkout maps it to useful English/Arabic delivery-area copy. Regression tests exercise
all four quote/create endpoints, inactive-policy compatibility and no stock/order
mutation on rejected requests. No delivery area or policy was enabled or changed.

## Verification evidence

All final checks passed against this source:

- Repository/workspace typecheck and lint.
- 167 unit tests; all 191 pre-existing English dictionary values remain byte-identical.
- API build and 31 focused disposable-replica integration cases covering campaign
  delivery, old-client compatibility, admin permissions and both checkout surfaces.
- Isolated foundation production build with database access disabled.
- `AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke` — 100 passed. Includes campaign
  draft → readiness → product selection → publication → homepage → landing product
  workflow at 390/1280 px, direct reload and overflow checks.
- Seven release tests and foundation/storefront/SEO smoke checks.
- Live Next.js Turbopack dev endpoint: no compilation issues, no configuration or
  browser-session errors after navigation. Browser navigation and route discovery
  verified; the authenticated campaign workflow is covered by the isolated E2E run.
- Bounded visual review at 390/1280 px; corrected squeezed mobile copy and preview
  inheriting the admin theme. Generated build-only `next-env.d.ts` changes restored.

Screenshots in `outputs/campaign-merchandising-2026-10-20/` use synthetic artwork and
products, with image requests stubbed deliberately. They validate composition and
responsive behaviour, not production artwork, CDN delivery or image rights.

## Rollback and next work

Keep the compatible API when rolling back just the frontend. Older strict API/contracts
cannot parse persisted merchandising fields; rolling back those versions requires an
explicit backed-up, revision-guarded removal of only the four new presentation fields
(`mobileImage`, `homepagePlacement`, `priority`, `ctaLabel`) first. No rollback script or
production data operation was run. Do not blindly roll back the API after staff saves.

Still pending: pharmacy/native Arabic review and approved plural forms; reviewed
clinical/editorial translation; staff campaign artwork/copy/offer approval and deployment;
code-managed collection definitions becoming fully configurable where needed; richer
catalogue attributes/routines/recommendations; operational SEO/ad account verification,
provider activation, attribution and pharmacy-owned commercial policies. These remain
separate from this completed campaign slice.
