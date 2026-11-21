> SUPERSEDED 2026-11-15: historical critique, excluded from current design guidance. Do not restore old visual rules from these findings.

---
target: Is my design good? Current Al Mina homepage
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/Users/administrator/Nabeel/dev/almina/apps/web/src/components/homepage.tsx"
target_fingerprint: "sha256:75a555b57b450810d5c8e1e1d06f477db8afd373f9d7bc5261863eae7c283381"
target_path: apps/web/src/components/homepage.tsx
timestamp: 2026-10-20T17-54-51Z
slug: apps-web-src-components-homepage-tsx
---
Method: dual-agent (A: /root/design_assessment · B: /root/design_evidence)

**Yes—a good visual foundation, but not yet a convincing finished pharmacy storefront.** The current homepage scores **28/40** in this heuristic review. This is a design judgment, not a measured conversion score.

Scope: current homepage, navigation, merchandising cards and footer, inspected at desktop and 390px mobile using the current local production build and public catalogue. Checkout/account flows were not retested for this critique. No implementation changes were made.

## Design specificity

The visual system is coherent but only moderately distinctive: it could serve a beauty retailer with few changes. Al Mina's logo and real products ground it; the actual Ras Al Khaimah pharmacy service is less prominent than generic skincare imagery. Keep the cobalt identity and consistent controls. The next improvement should be stronger product evidence and a clearer shopping hierarchy, rather than another wholesale theme change.

## Design health

| Heuristic | /4 | Main observation |
|---|---:|---|
| System status | 3 | Stock, loading and carousel states are explicit |
| Real-world language | 3 | Familiar shopping patterns; ERP abbreviations remain |
| User control | 3 | Manual carousel and dismissible location prompt |
| Consistency | 3 | Coherent type, controls and colour |
| Error prevention | 3 | Availability/options distinguished; checkout outside scope |
| Recognition | 2 | Missing package photography weakens identification |
| Efficiency | 3 | Strong search; repeated shelves add browsing effort |
| Visual simplicity | 3 | Attractive composition, with redundant modules |
| Error recovery | 3 | Honest placeholders and source-level retry/contact fallback |
| Help | 2 | Contact accessible; practical local service details arrive late |
| **Total** | **28/40** | **Good foundation** |

## What works

- The illustrated category atlas is the strongest visual section: readable labels, useful grouping and appealing colour variation.
- The cobalt/white palette, typography and shared controls feel coherent. Large product prices and purchase actions scan well on mobile.
- Search is prominent; motion is restrained and the carousel remains under the shopper's control.

## Priority issues

1. **[P1] Product evidence is missing where it matters most.** The hero companion and four leading product cards display “Photo coming soon”; compact cards show bag icons. Decorative artwork loads. The browser found no exact-product photo elements, so this is a missing-media/fallback condition in the preview, not evidence of slow or broken product-image requests. Verify catalogue/media mapping, then lead with available, photo-ready products and retain honest fallbacks elsewhere. Suggested: **Impeccable harden**.
2. **[P2] Shelves repeat products instead of revealing the range.** “Your everyday essentials” leads with four CeraVe skincare items priced AED 110–163.80. GUM items repeat between personal-care and budget shelves. Give each shelf a distinct job, deduplicate neighbouring sections and name curated sets accurately. Suggested: **Impeccable distill**.
3. **[P2] Mobile delivery selection is duplicated.** A truncated header label (“Choose your a…”) sits above another delivery prompt taking about 75px. Keep the compact header selector, use a complete short label and show onboarding guidance only when useful. Recover space for products without compressing every section. Suggested: **Impeccable adapt**.
4. **[P2] The pharmacy identity is too quiet.** “Good skin days start here” and repeated skincare editorial content make beauty the dominant story. Bring concise, verified local-service information and pharmacist/product help nearer the first buying decision. Do not invent ETA, licensing or medical claims. Suggested: **Impeccable clarify**.
5. **[P3] Brand cards use too much space for text-only content.** Tall empty cards do little to aid recognition. Use compact brand links until suitable logos/product imagery are available, with a balanced wrap for the actual number of brands. Suggested: **Impeccable layout**.

## Shopper impact

A first-time visitor gets an attractive opening, then an emotional dip when real products have no package photos. A returning customer benefits more from reliable search, recognisable packs and clear delivery information than from another editorial banner. A low-vision shopper must work harder with 10–11px metadata and names such as “GUM T/B Sunstar581.” Use readable display names while preserving the original ERP data separately.

Cognitive load is moderate. Eight categories or seven desktop navigation links are not inherently excessive for ecommerce; duplicated choices and repeated products are the more material problem. The closing neighbourhood-pharmacy support restores warmth, but some of that reassurance should arrive earlier.

Minor observations: Skincare and Cosmetics reuse the same category artwork; generic “View all” links depend on surrounding headings; floating contact should be checked against shelf content on narrow viewports. These do not justify a site-wide redesign by themselves.

## Mechanical evidence and limitations

One source scan across 17 relevant files returned **10 findings: one font warning and nine size advisories**, no errors. The font warning is the Arabic Arial/Tahoma fallback not documented in DESIGN.md, not proof that the English page renders incorrectly. Size advisories cover homepage benefits, announcement, mobile navigation, product metadata and cart badges; some are unused or conditional, so there are not ten visible defects. Review the Arabic font choice/documentation and raise functional small text selectively.

Both independent browser passes inspected desktop/mobile. The evidence pass observed no console warnings/errors in its captured logs and no page-level horizontal overflow. Carousel switching worked. No overlay was injected because the browser evaluation API is read-only. This is not a full accessibility, performance or production-operations audit. Missing media is verified in this current-build/public-catalogue preview; production media rendering was not independently established.

## Direction to choose next

1. Which opening should lead: **warm local pharmacy**, **beauty/wellness discovery**, or **a balanced mix**?
2. Should the next pass cover **the top three issues**, **all five issues**, or **product photography/readiness only**?
