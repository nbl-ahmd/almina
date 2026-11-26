# SEO action plan — 26 November 2026

Source: full SEO audit of alminapharmacy.com on 26 November 2026 (836 URLs crawled: every sitemap URL plus key pages; agent
access checks; mobile screenshots; Playwright lab performance). Score at audit: **75/100**. No Search Console, analytics, CrUX or
backlink data was available, so rankings, indexing, field Core Web Vitals and links were not measured.

This file is the tracked copy of the plan. The audit's working files (raw crawl data, screenshots, per-category findings) were kept
outside the repository.

Status: **done** = merged · **PR** = open pull request, not merged · **tool** = tooling shipped, data work remains · **open** = not started.

## High

| Item | Status | Where |
|---|---|---|
| Brand sitemap listed 8 of 104 brand pages (`catalogueBrands().slice(0, 8)` reused by the sitemap) | PR | nbl-ahmd/almina#131: brands with ≥3 in-stock products |
| 574 of 784 live products (73%) without a photo | tool | This branch: Catalogue quality ranks them by demand; sourcing sheet with file names for Upload many photos. Photos themselves are manual: [catalogue quality](CATALOGUE_QUALITY_2026-11-26.md) |
| Weak E-E-A-T for a health retailer: thin About page, no licence or pharmacist details, empty guides | open | Content work: licensed entity, licence numbers, pharmacist-in-charge, branches, how advice works |
| Delivery-area sheet opens over every landing page on mobile (intrusive interstitial risk) | open | Show it inline or on add-to-cart instead of on landing |

## Medium

| Item | Status | Where |
|---|---|---|
| Empty or junk categories indexable and in the sitemap | PR | nbl-ahmd/almina#131 (sitemap and noindex). The stray "l" category still needs fixing in the admin |
| Brand missing on 449 and GTIN on 713 live products | tool | This branch: gap filters, bulk confirmed barcode → GTIN, enrichment spreadsheet. Data entry remains |
| Manufacturer not emitted in Product structured data | PR | This branch (only when recorded) |
| No catalogue completeness metric in the admin | PR | This branch: dashboard card and Catalogue quality page |
| Google Merchant readiness unknown at catalogue level | PR | This branch: ready count through the feed's own rules, blockers split into data and review |
| Live products that 404 because a stored value fails validation | PR | This branch: listed on Catalogue quality |
| Arabic content has no crawlable URLs or hreflang | open | Product decision first, then a planned routing change |
| Health guides hub empty but in the main navigation | open | Publish pharmacist-reviewed guides or hide the link |
| Brand pages thin (about 75 words, one product) | open | Brand introductions for brands above the threshold |
| No per-branch LocalBusiness data (address, geo, hours) | open | One Pharmacy node per branch on /ras-al-khaimah |
| Little citable expert content for AI answers | open | Same as the guides item |

## Low

| Item | Status | Where |
|---|---|---|
| Loading fallback added a second H1 and "Loading…" text | PR | nbl-ahmd/almina#131 |
| SearchAction pointed at the robots-blocked /search | PR | nbl-ahmd/almina#131 |
| Sitemaps have no `<lastmod>` | open | |
| Internal links ending in a bare `?` | open | |
| Category intros are boilerplate | open | |
| 56 titles over 60 characters; homepage title repeats the brand | open | |
| Product `og:type` is `website` | open | Next.js metadata has no product type; needs custom tags |
| About 320–340 KB of JavaScript per page | open | |
| One homepage image without dimensions | open | |

## Corrected after code review

- **Shipping schema**: the flat AED 21 country rate is deliberate (`apps/web/src/lib/policies.ts`): a country-wide rate must not
  promise less than checkout charges. Not a defect.
- **Return policy schema**: medicines already get "returns not permitted" by product type. Not a defect.

## Next

1. Merge nbl-ahmd/almina#131 and this branch after review; deploy; check Catalogue quality on production data and record the counts here.
2. Clear unreadable live products, then confirm barcode GTINs in bulk.
3. Start supplier photo requests from the Photo sheet, live products first.
4. E-E-A-T content (About, pharmacist, licences) and the mobile delivery sheet.
5. Configure Search Console and CrUX access and re-run the audit with field data.
