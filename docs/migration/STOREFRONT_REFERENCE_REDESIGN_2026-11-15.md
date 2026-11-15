# Reference-led customer storefront — 15 November 2026

Branch: `codex/storefront-reference-redesign`, based on the separately committed
cleanup `c788f41`. Local work only; no deployment or production data change.

## Confirmed direction and staged work

The owner explicitly combined the three new screenshots: product cards from
image 1; gallery-first PDP from image 2; homepage and sticky purchase dock from
image 3. Colours follow the actual Al Mina logo, with a complementary type pair,
app-like mobile navigation and a wide-screen desktop adaptation. Search/address/
account/cart belong in an integrated header. Use existing managed campaign and
banner contracts. Review through working code, not generated mockups.

1. Init: refreshed the existing PRODUCT.md without inventing product facts.
   Preserved/annotated the owner references and recorded the confirmed composite.
2. Foundation: one customer-scoped semantic token source, locally served Manrope
   and Noto Sans Arabic, shared-control compatibility and complete RTL scope.
   Admin and wholesale retain their own tokens/fonts; no global reset was added.
3. Home and cards: integrated search/address/cart header, compact category strip,
   manual campaign carousel, useful shelves and reference-1 card hierarchy.
   Stock/savings are factual; save/quick-add controls keep their existing logic.
4. Listing and PDP: server-rendered listing and GET filters keep URL semantics;
   galleries lead on phones and share a two-column layout on desktop. The
   purchase dock preserves quantity, stock checks, status, safe areas and cart
   navigation. Footer remains useful without the old editorial panel structure.
5. Remaining customer surfaces: route intro, cart empty state, account/help and
   checkout controls consume the same theme. Checkout field geometry and native
   controls remain; their colours now resolve to the scoped semantic source.
6. Verification and independent finish review completed before recording the
   implemented DESIGN.md and scoped token metadata. Final results appear below.

The old guide/sidecar/briefs remain retired. The new surface contract records
selection and boundaries; the general engine’s unrelated random challengers
never override the owner’s explicit reference composite.

## Assets and fonts

No screenshot crops or reference product imagery were put in customer bundles.
The logo remains `/logo.png`; histogram reading found the prominent colours
`#ff6363`, `#66bfbf` and `#62a2c2`. Coral actions use dark readable labels; aqua
supports grouping and navigation. No unsupported rating, medical claim,
certification, bestseller badge, discount or delivery deadline was introduced.
Fallback campaigns use real product media and actual catalogue destinations.
Configured campaigns/banners continue through existing handlers/components.

Manrope and Noto Sans Arabic are self-hosted OFL variable faces, obtained from
the official Google Fonts repository; licences are retained beside the fonts.
Sources: [Manrope metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/METADATA.pb),
[Noto Sans Arabic metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/METADATA.pb).
Latin/script coverage was subset and encoded as WOFF2 using temporary fonttools;
no application dependency was installed for this. Manrope is ~28 KiB, Arabic
~335 KiB; only the active script face is selected. No Core Web Vitals improvement
is claimed from a synthetic local fixture.

The local reference fixture uses six owner-reviewed catalogue images recorded
in `docs/design/storefront/previews/assets/provenance.json`. Prices, stock and
descriptions are synthetic and explicitly marked as such in the fixture. The
fixture is loopback-only, has no DB, rejects non-GET writes and uses existing
compatibility responses; it never publishes associations or changes products.
Those media files are verification assets, not public storefront imports.

For development-only loopback legacy product images, ProductImage requests the
raster in the browser rather than enabling a private-network exception in the
Next optimizer. The guard requires NODE_ENV=development and an exact loopback
catalogue image URL. Production’s existing trusted-host/optimizer behavior is
unchanged. No `dangerouslyAllowLocalIP` setting was introduced.

## Compatibility and safeguards

No backend/API/model/auth/checkout arithmetic, pricing, stock reservation,
idempotency, order, notification or payment logic changed. Shared root baseline
CSS remains because admin/wholesale still consume it. The footer’s root-404
fallback palette was removed only after global not-found was put inside the
customer shell with the selected locale/font/theme. Shared campaign-artwork’s
admin editor remains untouched. Legacy authored home artwork and shared Geist/
PT Sans/Outfit files remain until their broader retirement can be verified;
none constrains this design. No old aesthetic authority was restored.

## Verification

Final evidence is under `.verification-results/reference-redesign/`:

- Installed Next.js 16.4.2 and its bundled styling/font/image documentation read.
  No framework or application dependency upgrade. Self-hosted font preparation
  used isolated temporary tooling, outside the npm dependency graph.
- `npm run typecheck`, `npm run lint`, isolated `npm run build:foundation` and
  32 focused unit tests passed. Commerce compatibility build also passed.
- All 57 selected existing production-build browser tests passed: storefront,
  responsive surfaces, filters, shared controls, navigation/menu/search, checkout
  and admin. Includes quantity/stock limits, authoritative prices, changed-price
  review, idempotent uncertain-response retries, forged totals/cross-origin
  rejection, address/GPS recovery and synthetic order confirmation. All mutations
  used disposable local fixtures, never a production database or real charge.
- 42 direct development route/locale/viewport cases passed at 360/390/768/1440px
  English and 390/1440px Arabic across home/listing/PDP/cart/checkout/account/404.
  No horizontal overflow, broken loaded images or page errors. Six axe audits
  of home/listing/PDP at 390/1440px found zero violations.
- Targeted checks passed: desktop filter visibility, mobile disclosure, reversed
  bounds validation, compact save/add, cart reload/persistence, 200% text without
  overflow, Arabic labels and sample notice. First product imagery begins at
  675.28px at both 360/390px English, 667.39px at 390px Arabic.
- Next dev MCP compilation/config/session diagnostics were empty. Browser and
  server logs reviewed; expected signed-out/unavailable fixture responses were
  separated from runtime errors. No production diagnostics were enabled.
- Independent Impeccable finish review scored eight material fixes resolved,
  followed by a resolved category-label wrap regression and **ship** at that
  scored-fix scope. This is not universal accessibility/production certification.
  No QUALITY BAR image was supplied; the owner screenshots are the code-led
  critique references, not approved exact-pixel comps.

The first checks caught a narrow routine shelf, insufficient text contrast,
a desktop-filter capture/visibility problem and untranslated UI copy. The finish
batch consolidated repeated skincare blocks, enlarged real pack imagery,
compacted the first viewport, flattened PDP facts and labelled synthetic data.
A checkout contrast regression exposed a cyclic inherited CSS variable during
theme migration; the local palette override was removed so checkout consumes
one scoped token system. All 57 browser cases passed after that correction.
The final label-width/copy-only adjustments were checked directly and rebuilt.

The installed concept tool emits an eight-character key, not the format of newer
skill versions; its authentic output is preserved under the reference directory
and never fabricated. The owner-selected composite supersedes random aesthetics.
The mechanical detector ran once and returned `[]`; this is a bounded source
check, not proof of every state or performance metric.

Physical-device testing, live provider/real-payment acceptance, full live-catalogue
media parity and production release acceptance remain outside this local design
work. The preview uses reviewed exact-pack photographs with synthetic stock and
prices and a visible bilingual notice; that notice is development-only. No
production catalogue data, credentials, integrations or deployment were changed.

## Working preview

See `docs/design/storefront/previews/README.md` for the two-terminal loopback
startup and routes. The server-authoritative production data source is unchanged.
Future refinements should use the current `apps/web/DESIGN.md`, its scoped
metadata, and the owner references; do not revive retired visual rules.
