# Homepage detector follow-up — 22 November 2026

Applied the user's request to address `.impeccable/review/home-detect-current/report.md`. The input contained 9 desktop and 7 mobile warnings across three rules, with repeated elements and contextual false positives. Those are baseline counts, not a fresh scan after this change.

| Report item | Disposition |
| --- | --- |
| Category heading rhythm | Category names are navigation-link labels rather than section headings. Converted their markup to styled labels while retaining full names, links, keyboard focus and the reference-led 8px image/caption gap. Section headings remain intact |
| Travel Essentials icon tile | Replaced the generic grid fallback with a Phosphor suitcase and removed the fallback's colored tile. Other categories without photos retain an unboxed category glyph. No product photo or category content was fabricated |
| Product title / long-card gap | Removed cross-card subgrid tracks and grouped availability with the product identity. Each card now flows naturally, so a long neighbouring name does not stretch a short card's internal text gaps. Complete names, prices, stock status and purchase controls remain available |
| Utility/header padding | Intentional exception, unchanged: measured utility text is 21px inside a 44px bar; department links have 48px targets in a 49px row. The wrapper detector sees an inset-free child wrapper, not text touching an edge. Adding padding would enlarge a correctly spaced header contrary to the compact direction |

The approved colors, fonts, media treatment and purchase behavior are preserved. No detector ignores or configuration changes were added. The supplied report was reused without another detector run; no claim of zero residual machine warnings is made.

## Validation

Production foundation build, root lint and root typecheck pass. All 25 selected storefront, navigation/accessibility and responsive checks pass, including purchase quantity/stock bounds, saved-cart behavior, filters, direct routes and gallery interaction. English desktop/phone and Arabic phone captures completed without page errors; desktop 1508px and phone 495px report no horizontal overflow. Next.js reports no session/configuration errors.

Evidence is under `screenshots/detector-polish/`. Physical-device and manual assistive-technology checks remain release requirements. The category glyph is an honest missing-photo fallback; a real approved photo can replace it later. PR #103 remains open and unmerged; no production deployment or data change occurred.
