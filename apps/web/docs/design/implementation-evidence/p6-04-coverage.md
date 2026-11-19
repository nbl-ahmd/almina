# P6-04 — Requirement reconciliation

This register reconciles the 63 original requirements and all numbered findings against the implemented storefront. The requirement text and task assignments remain in the [coverage register](../implementation-coverage.md). The construction and browser evidence establishes local behavior on the documented fixtures.

## Original requirements

| IDs | Disposition | Evidence |
| --- | --- | --- |
| C01, C02, C14, C15, C25, C27, C48 | Verified locally. The selected direction, density, type and exact coral are represented in the storefront. | [Screen choice](p1-05-selection.md), [states and type](p2-04-refinement.md), [public home](p3-03-home.md), [final review](phase-6.md). |
| C03, C13, C55 | Verified locally. Existing destination, redirect, SEO, portal and route-boundary checks passed. | [Route inventory](p0-03-routes-states-tests.md), [shell](p3-04-shell-home.md), [customer/shared navigation](phase-5.md), [compiled checks](p6-02-verification.md). |
| C04, C36, C37, C39 | Verified on isolated commerce fixtures. Prices and amounts retain their contract and the server governs writes and totals. | [Cart](p5-01-cart.md), [checkout](p5-02-checkout.md), [commerce](p5-03-commerce.md), [compiled checks](p6-02-verification.md). |
| C05 | Verified within the staged scope. Production data, providers and deployment stayed outside execution. | [Product constraints](../../../PRODUCT.md), [phase 6 scope](phase-6.md). |
| C06 | Verified for fixture tasks, locale routing, keyboard and checked control states. Native pharmacy copy and assistive-technology review remain open. | [Customer routes](p5-04-information.md), [locale and device matrix](p6-02-verification.md), [remaining work](phase-6.md). |
| C07, C08, C09, C10, C11, C12, C16, C17, C18, C60 | Verified locally with explicit wholesale and root-recovery compatibility. Remaining shared fonts, media and geometry have consumers or unverified public references. | [Consumer map](p0-02-style-ownership.md), [tokens](p2-01-system.md), [cascade](p2-02-cascade.md), [states](p2-04-refinement.md), [checkout](p5-02-checkout.md), [retirement](p6-01-retirement.md). |
| C19, C20, C21, C24, C26 | Verified locally on public routes. Layout adapts to available data and configured content. | [Mobile shell](p3-01-mobile-shell.md), [desktop shell](p3-02-chrome.md), [home](p3-03-home.md), [listing](p4-01-listing.md), [matrix](p6-02-verification.md). |
| C22, C56, C57 | Verified locally for known fixtures, contextual return, options and missing information. | [Product facts](p4-04-information.md), [return](phase-4.md), [customer routes](phase-5.md), [matrix](p6-02-verification.md). |
| C23, C51 | Verified for emulated viewport resize, enlarged rendering and reduced visual viewport. Native safe areas, browser/OS keyboard behavior and physical device sessions remain open for release verification. | [Shell](p3-04-shell-home.md), [detail](p4-03-detail.md), [checkout](p5-02-checkout.md), [matrix](p6-02-verification.md). |
| C28, C29, C31, C33, C34, C35 | Verified for catalogue fixtures, mixed-script and sparse stock/media, related items and actual family options. | [Listing](p4-01-listing.md), [cards](p4-02-cards.md), [detail](p4-03-detail.md), [product information](p4-04-information.md). |
| C30 | Partially verified. Fixture search and contextual return passed. The catalogue owner and search maintainer still need representative English and Arabic relevance evidence before release claims. | [Phase 4](phase-4.md), [open input O06](../implementation-progress.md#open-inputs-and-risks). |
| C32, C49 | Local asset provenance and exact fixture associations are recorded. Release use of catalogue images still requires the catalogue owner to verify rights, pack correspondence and quality. | [Baseline media](p0-04-baseline.md), [cards and fallback](p4-02-cards.md), [retained media audit](p6-01-retirement.md), [reference registry](../../../../../docs/design/storefront/references/manifest.json). |
| C38, C40 | Verified within current routes and demo service states. Customer information, preference and order tools retain existing integration and feature boundaries. | [Cart](p5-01-cart.md), [checkout](p5-02-checkout.md), [information](p5-04-information.md), [cross-route regressions](phase-5.md). |
| C41, C42, C43, C44, C45, C46, C47 | N01–N07 interpretations checked against the selected direction and rendered implementation. Reference concepts supply composition and control placement. Existing capability and asset rules govern the content shown. | [Annotations](../reference-review-2026-11-17.md), [screen directions](../screen-directions.md), [finish evidence](phase-6.md). |
| C50, C52 | Verified against local behavior and feature-state fixtures. Native device, provider and production-data gaps remain recorded. | [State baseline](p0-03-routes-states-tests.md), [matrix](p6-02-verification.md). |
| C53 | Local automated and keyboard evidence is bounded to the documented pages and interactions. Assistive-technology and physical touch review remain open. | [Matrix and issue discovery](p6-02-verification.md), [finish evidence](phase-6.md). |
| C54 | Runtime diagnostics, HTML/SEO and fixture media delivery verified. Production image performance, real-user performance and conversion remain unmeasured. | [P4 exit](phase-4.md), [three-engine and SEO checks](p6-02-verification.md). |
| C58, C61, C63 | Independent review, fix dispositions, design authority and execution context recorded. Detector output is supporting evidence. | [Finish evidence](phase-6.md), [progress](../implementation-progress.md), [design authority](../../../DESIGN.md). |
| C59, C62 | Local evidence is available. Final visual acceptance belongs to the owner. Catalogue, Arabic copy, operations and provider decisions remain open for release. | [Remaining needs and decision](phase-6.md), [decisions](../decisions.md). |

## Numbered findings

| ID | Disposition |
| --- | --- |
| NEW-001 | Scoped legacy wholesale palette retained with explicit compatibility. Wholesale and cross-surface regressions passed. [Retirement](p6-01-retirement.md) and [matrix](p6-02-verification.md). |
| NEW-002 | Root missing-page compatibility remains outside the retail token scope. Localized direct 404s passed. [Retirement](p6-01-retirement.md) and [matrix](p6-02-verification.md). |
| NEW-003 | Shared artwork and Outfit remain available to the independent staff preview. Confirmed the published campaign placement and isolated campaign/editor flows. [Home](p3-03-home.md) and [matrix](p6-02-verification.md). |
| NEW-004 | Contextual return restores the original URL, selected refinements, position and focused link. Direct/reloaded PDP has a category fallback. [Return evidence](phase-4.md) and [matrix](p6-02-verification.md). |
| NEW-005 | Localized customer visible errors, missing routes and saved recovery verified. Authored English policies retain their source language with an Arabic notice. [Information](p5-04-information.md) and [matrix](p6-02-verification.md). |
| NEW-006 | The development loading-shell stall did not reproduce in the documented bounded loops. Release QA still owns longer native-session observation. Rapid WebKit dev request cancellations are recorded separately. [Matrix](p6-02-verification.md). |
| NEW-007 | Bilingual account inline privacy link. See [finish verification](phase-6.md) for the fix and measured disposition. |
