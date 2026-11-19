# Phase 6 — Storefront finish and owner review

Runtime verification for the phase began at `07099be` on `codex/storefront-pharmacy-app-reference`. P6-01 retired the prototype and competing homepage brief. P6-02 verified the full local viewport and interaction matrix. P6-03 applied a bounded finish batch. P6-04 reconciles the built system with its documents. P6-05 records the owner's final visual decision separately from release readiness.

## P6-03 independent review

The first reviewer pass returned **recapture** because preliminary home and listing images showed loading states, some pack photographs were still blank, and the development badge obscured controls. That pass made no visual judgment. The fresh full review used the compiled storefront, settled product counts, decoded photos and no development badge. The reviewer returned **fix** with six findings. The review considered the owner's selected coded screens and N01–N07 interpretation.

### Direction provenance

The owner approved the code-led storefront through the recorded [A/five-column selection](p1-05-selection.md), [image-first phone PDP revision](p1-05-image.md) and [screen directions](../screen-directions.md). Together those records specify the implemented direction. No originating formal five-block seed or concept-roll record could be corroborated for that selected P1 direction. The tracked `docs/design/storefront/identity-overhaul/direction-roll.txt` and `docs/design/storefront/reference-direction-roll.txt` describe earlier superseded explorations. The original seed provenance remains unverified. It does not change the recorded owner choices or act as visual authority.

### Fix batch

| Finding | Change and local evidence |
| --- | --- |
| Phone home at 390px | Reduced vertical space around the campaign and discovery groups and widened the locally scrollable category tiles. Full category words fit the reviewed case. The first complete price and action row ends at 762.7px and the dock begins at 780.2px in both languages at 390×844. |
| Privacy notice link | Persistent underline separates it from surrounding text at rest and hover. Keyboard focus shows a solid outline. The four post-fix Chromium axe scans at 390px and 1440px report zero violations. |
| Directional controls | Account Back and forward arrows mirror in RTL. Breadcrumbs use hidden decorative chevrons with logical flex spacing and continue to isolate mixed-script labels. |
| Arabic product detail | Numeric measurements such as `236 ml` stay together. The normal Arabic phone Add to cart label fits a single line at 390px. It can wrap on narrower screens or with larger text. Pending and added states retain their icons. |
| Capture truth | Every final capture table is labelled as isolated sample prices and stock with reviewed pack photos. |
| Original seed | Separate provenance limitation recorded above. |

The fixture photos were loaded through the capture browser from the specific owned loopback fixture. Production server image restrictions stayed active. The latest review uses the compiled app and the same measured 390×844 and 1440×900 viewport grid. The earlier [P6-02 matrix](p6-02-verification.md) remains the wider route and interaction evidence. Its preliminary screenshots are superseded by the settled evidence below.

### Reviewer verdict and regression scope

The independent verdict scored **five findings resolved and one partial**. The partial finding is the original seed provenance. The reviewer retained the disposition **fix** because the seed could not be corroborated. This verdict covers the six listed items. The older P6-02 technical results and the scoped P6-03 regressions supply separate evidence.

The finish changes are in commit `b1756c7`. The isolated Next.js 16.4.2 build `p6-finish`, root/workspace typecheck, lint and raw HTML SEO smoke passed. All 67 Chromium cases passed across home, listing, product detail/information/return, responsive layout, customer account/information and wholesale. The two new bilingual keyboard privacy-link cases also passed in WebKit and Firefox. The existing loopback developer preview had five rendered home products and no page overflow at the checked desktop viewport. Next diagnostics reported no compilation, configuration or session errors. The mechanical design scan returned zero findings on the changed targets.

The final capture run recorded 16 first viewports, no page exceptions and no horizontal overflow. The [measurements](p6-03-final/measurements.json) record home dock clearance and the account checks. [Before phone home](p6-03-final/before-en-home-390.png) and [before Arabic phone product](p6-03-final/before-ar-product-390.png) show the original geometry.

## P6-04 design authority

[DESIGN.md](../../../DESIGN.md) and the [Impeccable sidecar](../../../.impeccable/design.json) describe the built storefront and derive values from the scoped CSS. [PRODUCT.md](../../../PRODUCT.md) preserves the business facts, [DESIGN-BRIEF.md](../../../DESIGN-BRIEF.md) describes the implemented scope and [web instructions](../../../AGENTS.md) identify the current authority and compatibility boundaries.

The documentation handoff was unavailable, so the guide and sidecar were refreshed directly against the built CSS and captures. All five authority and token checks passed. [Requirement reconciliation](p6-04-coverage.md) covers C01–C63 and NEW-001–NEW-007. The [decisions](../decisions.md) and [progress ledger](../implementation-progress.md) own dated decisions and task status. To undo the finish batch locally, revert `b1756c7` and refresh this packet and the design documentation from the result. No database migration or provider change was made.

## Review the storefront

The owner retained the layout and requested lighter controls and clearer typography. See the [latest mobile and desktop revision](p6-05-controls.md#latest-screens). The table below preserves the earlier finish-review checkpoint.

**Local review data.** All captures show reviewed pack photographs and synthetic prices and stock from an isolated fixture. The account form uses simulated signed-out responses. The interactive [storefront preview](http://127.0.0.1:4880/) uses the local reference catalogue. Its ordering mode depends on local fixture configuration.

| Surface | English mobile | English desktop | Arabic mobile | Arabic desktop |
| --- | --- | --- | --- | --- |
| Home | [390px](p6-03-final/en-home-390.png) | [1440px](p6-03-final/en-home-1440.png) | [390px](p6-03-final/ar-home-390.png) | [1440px](p6-03-final/ar-home-1440.png) |
| Product listing | [390px](p6-03-final/en-listing-390.png) | [1440px](p6-03-final/en-listing-1440.png) | [390px](p6-03-final/ar-listing-390.png) | [1440px](p6-03-final/ar-listing-1440.png) |
| Product detail | [390px](p6-03-final/en-product-390.png) | [1440px](p6-03-final/en-product-1440.png) | [390px](p6-03-final/ar-product-390.png) | [1440px](p6-03-final/ar-product-1440.png) |
| Account | [390px](p6-03-final/en-account-390.png) | [1440px](p6-03-final/en-account-1440.png) | [390px](p6-03-final/ar-account-390.png) | [1440px](p6-03-final/ar-account-1440.png) |

### P6-05 visual acceptance

Status **awaiting owner review**. The owner chose “Request specific visual fixes” after reviewing the packet for `b1756c7`. The requested refinements are implemented in the [control and type revision](p6-05-controls.md). After the follow-up control pass at `2c4dcb1`, the owner requested another visual fix. The screen, control and requested change are pending. Earlier approval of the direction covers the selected concept. This gate records acceptance of the implemented screens. Release authorization is a separate decision. Deployment remains excluded.

### Remaining release work

| Owner | Outstanding evidence |
| --- | --- |
| Catalogue and merchandising | Confirm production image rights, exact-pack association, completeness and photo quality. The reviewed local set includes the handheld PD0826 image. Verify published campaigns, offers, stock labels and merchandising against the actual records. |
| Arabic content and pharmacy review | Review both interface copy and managed content with native and pharmacy reviewers. Confirm descriptions, claims, policy translations and approved contact or delivery language. |
| Search maintainer | Evaluate English and Arabic relevance on representative production queries and catalogue data. The isolated search and recovery fixtures cover behavior. |
| Release QA | Verify physical iOS/Android, Safari, assistive technologies, hardware safe areas, longer sessions, software keyboards and device input. The automated accessibility report covers the tested views. Production performance remains unmeasured. |
| Commerce and integrations | Confirm region coverage, fees, hours, payment enablement, account/contact integration readiness, operational messaging and release rollback against the actual deployment environment. |
| Business owner | Record visual acceptance from this packet. Any production release requires its own authorization and operational evidence. |
