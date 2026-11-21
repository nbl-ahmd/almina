# Admin task hierarchy — 24 October 2026

The owner's latest direction replaces the earlier product disclosure layout with
channel-first pricing and task tabs. This is an incremental frontend change;
existing production product, wholesale, inventory and order contracts remain.

| Before | After | Why |
| --- | --- | --- |
| Visibility and wholesale rates were managed in different screens. | Retail and Wholesale switches lead the product Overview; applicable prices appear below. | Channel choices determine the next inputs. |
| Wholesale pricing required leaving the product editor. | Explicit per-business-type AED prices and quantity rules share the product Save workflow. | Preserve existing rate tiers without hiding the required price. |
| Specialist product fields created a long scrolling form. | Overview, Care & usage, Organisation, Variants, Photos and Publishing are persistent tabs. | Switching tasks preserves edits and limits the visible form. |
| A reason was required for metadata-only updates. | Stock reason appears and becomes required only when stock changes. | Preserve inventory controls without asking for irrelevant input. |
| Photos and feed-readiness checks competed with essentials. | Photos have their own tab and existing independent save; readiness stays with Publishing. | Keep each action next to its inputs. |
| Growth settings appeared above all selected tasks. | Content, profile, delivery, branches, rewards, retention, reviews and reports have separate tabs. | Selected work starts immediately; maintenance tools are secondary. |
| Category, banner and staff creation forms dominated list pages. | Lists remain visible; creation forms open on request. | Browsing existing records is the default task. |
| Contribution costs preceded fulfillment work. | Actual costs are a secondary disclosure after order work. | Customer service and fulfillment take priority. |
| Wholesale maintained a second product-price form. | Product selection leads to the unified product editor. | One place to configure channel pricing. |
| Product creation's response lost the product envelope in the gateway. | The envelope and its identifier survive recursive projection. | Open the created product and save its wholesale terms without a second creation. |

Additional review covered the existing inventory filters/row actions, dashboard,
needs-action review, import/recovery flows, notifications, store settings,
WhatsApp tools, operations and email marketing. Existing task-specific controls
were retained where the audit did not establish a hierarchy problem. Campaign
and wholesale-business workflows were exercised after shared layout changes.

## Data and recovery behavior

Wholesale retains its existing per-business-type terms, exact integer minor-unit
prices, quantity limits and optimistic revisions. Retail prices are never used
as wholesale fallbacks. Disabling a channel preserves its saved prices; unsaved
inactive wholesale drafts do not overwrite persisted terms. New wholesale-only
products use zero for the required legacy retail storage field, without offering
that field as a wholesale rate. The retail channel remains off.

Both configurations validate before a product write. Existing APIs save product
metadata/inventory and wholesale terms separately, so this is not an atomic
cross-service save. If the second step fails, the editor states that product
changes are saved, locks those inputs and offers pricing-only recovery. Recovery
reads back first to recognize an acknowledged-lost successful write and refuses
a conflicting revision. Product creation and stock writes are not replayed by
that recovery. Photos continue using the existing independent upload workflow.

The gateway addition permits only the `product` envelope. Its children still
pass the existing recursive field allowlist; a regression verifies nested
private fields are removed. API RBAC, price authority, order mutations and stock
concurrency rules are unchanged.

## Verification

- Isolated Next.js 16.4.2 foundation production build and TypeScript checks pass.
- Targeted ESLint and diff whitespace checks pass.
- 26 focused pricing, wholesale, commerce and gateway tests pass.
- 19 unique browser scenarios pass across the relevant runs: four product-tab
  viewport cases, channel pricing/reload, partial pricing recovery, wholesale-only
  creation/invalid-tab focus, growth task isolation, four staff viewport cases,
  order updates, stock conflict handling, photo replacement/archive retention,
  business visibility, two campaign viewport cases and wholesale invitations.
- Axe WCAG 2 A/AA and 2.1 AA checks pass in 24 page/tab states across product,
  growth, wholesale, categories, banners, staff and orders. No page errors were
  observed. Those pages were also checked for overflow at 360/390/768/1440px.
- Product and growth tab changes are immediate, including keyboard navigation;
  existing restrained switch/press feedback and reduced-motion handling remain.

The local preview uses the dedicated persistent demo
runtime. No production database changes or deployment were performed.
