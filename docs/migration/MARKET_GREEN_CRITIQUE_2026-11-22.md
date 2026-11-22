# Storefront critique and refinement — 22 November 2026

Method: two independent reviewers. Assessment A reviewed the live shopping experience and all five supplied references before Assessment B's detector evidence was released. The approved Market Green / Coral identity and latest reference-alignment correction remain authoritative.

## Initial assessment

The corrected storefront has a coherent neighbourhood-pharmacy identity: white shelves, lime campaign, forest supporting type, coral purchase controls, circular category media and connected product details. Preserve it. Generic campaign language is a future content opportunity, not evidence for replacing the visual direction.

| Nielsen heuristic | Initial score / 4 | Evidence |
| --- | ---: | --- |
| Visibility of system status | 3 | Loading, cart updates and checkout stages are clear |
| Match with real world | 3 | Pending checkout total wording was imprecise |
| User control and freedom | 3 | Filters, quantities and exits are available |
| Consistency and standards | 3 | Equivalent checkout transitions had different labels |
| Error prevention | 3 | Stock bounds and required-field validation retained |
| Recognition rather than recall | 2 | Mobile language choice was buried in footer |
| Flexibility and efficiency | 3 | Search, filters, sorting and direct cart editing |
| Aesthetic and minimalist design | 3 | Cart and empty search repeated information |
| Error recognition and recovery | 3 | Linked checkout errors retain and focus fields |
| Help and documentation | 3 | Relevant contact and policy access |
| **Total** | **29 / 40** | Initial assessment, not a post-change rescore |

Search before merchandising, connected product identity/availability/quantity/action, and retained checkout fields are strengths. Cognitive load is low to moderate; the five familiar navigation destinations form a manageable group. Empty search, unavailable preview account capabilities and waiting for delivery details before a quote are the emotional low points.

## Priorities and changes

| Priority | Finding | Implemented response |
| --- | --- | --- |
| P1 | Mobile language access required a long scroll | Named header toggle to the other language, reusing the existing locale cookie and refresh; 44px minimum target, language and direction attributes |
| P2 | Too much cart introduction before editable items | One title/count opening and secondary shopping exit; removed decorative readiness sentence and repeated visible item heading; preserved loading/empty titles and checkout heading ownership |
| P2 | Mobile “Continue to payment” and desktop “Review order” described the same action | Consistent Review order label; pending total explicitly says Calculated after delivery details; quote, payment and placement handlers unchanged |
| P2 | Empty search repeated the diagnosis and promised absent suggestions | One truthful recovery state, retained query and real category links; no empty first-page pagination; actual suggestions, alternatives and unavailable-service feedback preserved |

Additional evidence-backed refinements: complete compact default delivery prompt; actual PDP prose capped at 65ch without framing the purchase column; locale-aware recently viewed prices and image fallbacks; unambiguous Product count label. No new colors, fonts, libraries, fabricated product photos or medical claims. No API, auth, pricing, stock, checkout arithmetic or order behavior changes.

Casey benefits from immediate language access and earlier cart rows. Jordan gets explicit pending-total and product-count labels. Riley gets consistent checkout wording and recovery links that actually exist. Optional preferences were asked; after no response, the stated defaults were the one-tap language toggle and concise cart opening.

## Detector evidence and interpretation

One successful static scan covered 101 explicitly scoped storefront files, excluding admin/wholesale: exit 0, JSON `[]`, zero findings. It was not rerun. No ignore list exists.

Actual browser detector injection on home, listing, PDP and Arabic cart painted overlays and reported **23 repeated element findings**, not 23 unique bugs: cramped-padding, text-overflow, heading-rhythm and line-length. Wrapper padding and media-caption heading rhythm were false positives; padding belongs to child containers and captions belong to imagery above. Filter-heading rhythm was weak evidence, not a material defect. Duplicate delivery truncation was one readability issue; PDP prose measured roughly 88–91 characters per line. Those two useful findings informed the changes. A later dark-glow reading caused by the detector's own amber overlay was excluded.

Native in-app browser creation was unavailable to reviewer B; it used a fresh native Chrome tab with verified mutable script injection. Screenshots confirmed painted overlays; no visibility API proved that the user was watching. The detector server was stopped, its temporary runtime and owned directories removed, and the existing isolated preview on port 4890 kept running. Review evidence is retained locally under `.impeccable/review/critique-b/`.

## Verification and limits

- Production foundation build, root lint and root typecheck pass.
- The 66-case browser run passed 63 cases and found three undersized language-toggle targets. After correcting selector specificity, all nine focused language, cart, search and navigation checks passed, including 320/390/768px language switching, reload persistence and overflow. The other 63 checks covered search, Arabic, account, checkout and navigation regressions.
- English/Arabic desktop and phone captures cover home, listing, PDP, cart, checkout, account and empty search. Final captures are under `.impeccable/review/critique-improvements-final/`; selected durable evidence is under `screenshots/critique-2026-11-22/`.
- Initial critique snapshot: `.impeccable/critique/2026-11-22T00-14-31Z__apps-web-src-app-storefront-page-tsx.md`, slug `apps-web-src-app-storefront-page-tsx`. First recorded score is 29/40; no trend or post-fix score is claimed.
- Independent scoped follow-up confirmed all four priority issues resolved in the live preview: language target 45.9 × 44px, cart item starts around 216px, matching checkout labels and truthful empty-search recovery. No blocking regression observed. The processed snapshot backlog is closed. Final capture reports no uncaught page errors; Next.js reports no compilation or session errors.
- Preview fixture product photos are genuinely absent. Production media, physical-device PWA/keyboard checks, manual assistive-technology verification and user visual acceptance remain release checks. Guest-action prominence and some secondary Arabic copy remain minor future review items. An aggregate cart estimate requires server-owned data; no client arithmetic was added.

PRs remain open and unmerged. This is storefront refinement only; admin, production data and deployment remain outside scope.
