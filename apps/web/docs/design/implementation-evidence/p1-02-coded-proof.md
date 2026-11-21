# P1-02 — isolated coded storefront proof

> Historical comparison evidence. The live proof routes and launch commands were retired in [P6-01](p6-01-retirement.md). Captures and the recorded screen decisions remain available.

Historical P1-02 capture checkpoint. [P1-03](p1-03-density.md) supersedes its provisional density/hover/control-boundary measurements; no final design acceptance inferred.

17 November 2026. Starting source `33f248e`, branch `codex/storefront-pharmacy-app-reference`; clean tree at entry. Implements [PC01–PC08](../prototype-contract.md) for coded exploration only. **P1-02 verified; supporting visuals remain candidates.** P1-03 density/stress, P1-04 complete interaction/mode proof and P1-05 owner screen decision remain outstanding. No final DESIGN.md/token replacement, production data/provider access or deployment.

## Reviewable views

Local development preview, while the owned process is running:

- [Home A — shallow full campaign](http://127.0.0.1:4870/design-proof?lead=full).
- [Home B — campaign beside discovery](http://127.0.0.1:4870/design-proof?lead=split).
- [Listing](http://127.0.0.1:4870/design-proof/products).
- [PDP](http://127.0.0.1:4870/design-proof/products/cerave-blemish-control-cleanser-236-ml--PD1186).
- [Cart continuation](http://127.0.0.1:4870/design-proof/cart), explicitly stops before checkout/order/payment.

A/B use the same six records/order/prices/stock, copy/art, typography, colours and controls. Only desktop lead topology differs; the same phone sequence is intentional, not two independent mobile directions. Use the visible language button for Arabic/English. This sets the existing language cookie; actual product identities remain factual Latin text. Interface/layout mirror in RTL; the dirham symbol remains unmirrored.

The [16-slot capture manifest](phase-1-proof/capture-manifest.json) retains settled home A/B, listing and PDP in EN/AR at 390×844 and 1440×900. All 16 full-page images plus [Arabic tablet](phase-1-proof/tablet-ar-900.png) are retained alongside it. Product photos/fonts settled, captures from top, each opened/inspected. Only the Next development-tool portal was hidden for these captures; no product UI was hidden. Fixed docks appear at the emulated viewport's bottom within full-page captures. Screenshot overlap there is not proof of content being permanently unreachable; scrolling and last-content clearance require their separate checks.

Representative views: [phone home](phase-1-proof/home-a-en-390.png), [desktop A](phase-1-proof/home-a-en-1440.png), [desktop B](phase-1-proof/home-b-en-1440.png), [listing AR](phase-1-proof/listing-ar-1440.png), [phone PDP AR](phase-1-proof/pdp-ar-390.png).

## What was built, and what is provisional

New owned compositions: grouped actual logo/location/cart, prominent rectangular search, bounded photographic campaign, six-category discovery, factual cards with dirham/add/save/stock, desktop filter rail and phone disclosure, real GET sort/filter/search URLs, empty/unavailable-search feedback, large-image PDP, facts/help before related items, phone purchase dock replacing bottom destinations, desktop buying column, truthful footer, cart continuation and bilingual retry boundary.

Card price/action baselines align despite variable full name lengths. New geometry/states are locally owned CSS Modules, not a recoloured incumbent shell or an appended storefront override sheet. Small client boundaries handle interactions; catalogue pages remain server-rendered.

Provisional proof roles live only on the proof root: exact confirmed accent `#FF5A5F`, candidate ink `#202A30`, muted `#58636B`, line `#DCE1E3`, ground `#FAFBFB`, positive `#26604D`; campaign ground `#FFE5E2`. Dark text on coral avoids the incumbent white-foreground alias trap. Figtree/Alexandria remain existing licensed candidates, not owner-selected final typography. These values and measurements are **an experiment**, not a replacement token system or styling authority. P1-03 must test them together on hard cases before P1-05 selection.

Nonvisual reuse: existing catalogue model/read/search/locale/price helpers; ProductImage; CurrencyAmount; browser cart/saved/area persistence; existing `checkAddition` and `loadCart` server actions. No price/tax/stock/order/auth algorithm changed. Addition checks the server before saving; device state stores only existing identifier/quantity contracts. A storage-race check prevents overwriting an intervening cart update. Existing checkout/provider features stay disabled in the launcher.

## Isolation, launch and stop

`/design-proof` is outside `(storefront)` and never imports storefront.css or uses `.storefront-shell`. Every data page and layout/metadata entry requires the pure gate before its reads. Gate requires NODE_ENV=development, APP_ENV=development, ALMINA_DIRECTION_PROOF=1 and explicit credential-free, path/query/fragment-free HTTP loopback API_ORIGIN and LEGACY_API_ORIGIN. A production build always rejects the proof even with its flag on. Inherited proof metadata is noindex/nofollow; no public nav/sitemap/feed links added.

From the repository root:

```sh
node scripts/tooling/storefront-direction-proof.mjs
```

The launcher refuses occupied 4870/4871 before spawning either child. It passes a clean environment containing only PATH/HOME/TMPDIR and explicit local development settings: DATABASE_MODE=disabled, WEB_ORIGIN=http://127.0.0.1:4870, both API origins=http://127.0.0.1:4871, disabled checkout/Stripe/telemetry, proof flag, AL_MINA_ISOLATED_BUILD=1 and AL_MINA_VERIFICATION_TAG=p1-proof. AL_MINA_ISOLATED_DEV/ALMINA_LOCAL_DEMO are not inherited. Existing mechanism selects `.next-verification-p1-proof`; original 4860/4861 and `.next-admin-dev` stay untouched.

Stop with Ctrl-C in its owning terminal (or SIGTERM its recorded launcher PID); it stops only its two children. A deliberate stop/restart was verified during fixture-sort work. On re-entry inspect listeners and process ownership before stopping anything; never kill all Node processes. The current owned 4870/4871 preview is left running for screen review. The temporary production-gate process on 4880 was stopped after verification. Generated output can be removed **after** its owning server stops; do not delete another session's output. `next-env.d.ts` build-path noise was restored to its tracked original.

Capture reproduction (requires installed agent-browser, own named session, running preview):

```sh
PROOF_BROWSER_SESSION=$(agent-browser session id --scope worktree --prefix p1-proof-review)
export PROOF_BROWSER_SESSION
node scripts/tooling/verify-storefront-direction-proof.mjs
agent-browser --session "$PROOF_BROWSER_SESSION" close
```

The capture script clears only its owned browser context's sample cart/saved/area/proof-history keys, switches the existing locale cookie, checks image completion/noindex/no overflow and records measurements. Do not point it at a user browser/session. Raw output is ignored `.verification-results/storefront-replacement/phase-1/`; selected final evidence is retained here.

## Fixture and asset provenance

Reuse `scripts/tooling/storefront-reference-fixture.mjs`, six reviewed exact-pack photos and product associations from `docs/design/storefront/previews/assets/provenance.json`. Sample prices are 68, 79, 82.50, 64, 95 and 58; first five stock 8, PD1237 stock 0. These are explicitly labelled synthetic, not live commercial facts. Added read-only sorting to this existing fixture so the proof's catalogue sort control respects the existing sort contract; no record/price/stock association changed. Existing already-running 4861 process was not restarted.

Actual `/logo.png`, decorative `/design/campaigns/almina-care-courier.png` and category atlas `/design/categories/pharmacy-categories.png` are reused with their existing provenance under repository-root docs/design/storefront. No new generated asset, reference screenshot, watermark, unrelated brand UI or substitute saleable pack was shipped. PD0826's handheld photo remains honestly imperfect. Fixture descriptions/variants are absent: PDP explains the sample limitation and shows no invented medical content, ratings, variants or gallery dots. The fixture's suggestion href can use a generic readable slug prefix; public-ID resolution still opens the correct exact product. Do not generalise fixture limitations to production.

## Verification

- Installed Next **16.4.2** and matching bundled CSS/notFound/route guidance consulted. Separate Turbopack dev and production outputs; no framework/package upgrade. Formatter was an ephemeral tool invocation; no dependency/lockfile change.
- Gate unit test passes, exercising explicit local success and 23 rejected configurations (missing fields, production/test/staging, remote/malformed/credential/path/query/fragment/HTTPS origins).
- [HTTP gate evidence](phase-1-proof/http-gates.json): all four proof paths return 404 on flag-disabled 4860 and on a compiled production server 4880 with proof flag on. Enabled development paths return useful 200/noindex content. Occupied-port launch refuses before child startup.
- Web typecheck, repository lint and fresh isolated production build passed. **50 selected tests passed:** 45 across storefront/location/search/product-family/styles/i18n/proof gate; five fixture/retained ownership tests. Existing commerce helpers unchanged; no transaction/provider test or production readiness claim inferred.
- Next `/_next/mcp`: tool discovery, routes, get_compilation_issues and get_errors checked; no compilation/config/session errors. Browser errors empty. No broken main images or page overflow in the 16 captures. Fast Refresh full-reload advisory occurred during source edits; no settled-route runtime failure observed.
- Basic working proof: server-checked add → actual quantity/header count → cart continuation; save and cart survive reload; manual area save/reload; search suggestions + ArrowDown/Enter open correct product; empty query results; sort price ascending 58/64/68/79/82.5/95. Direct routes and locale changes settle in this context. No order/payment created.
- Same-page listing resize 1440 →360 →900 verifies width and desktop-open/phone-closed category disclosure. 900 Arabic home captured. This is desktop viewport emulation, not native keyboard/device certification.
- Scoped listing-main axe 4.12.1: 28 passes, **0 violations**, 0 incomplete. Not a whole-app accessibility sign-off. Search form/keyboard/dock/large-text/focus hard cases remain P1-03/P1-04 work.
- Network log contains four 404 responses for existing `/api/customer/me` and `/api/customer/options` after visiting existing-site surfaces; this read-only reference fixture does not supply those customer-session contracts. No main image failures observed. This is not verification of production authentication/integrations.
- Proof → existing contact via client navigation removes proof root/roles; admin staff-login form and wholesale guest gate render. Existing storefront/admin/wholesale/root-404 styling source unchanged. This is shared-consumer smoke verification, not authenticated admin workflow coverage.
- [Detector](phase-1-proof/detector.json) run once on changed proof targets without loading incumbent design authority returned `[]` before the review correction batch. It is static evidence, not design approval.
- Independent Impeccable finish review requested four material fixes: expose desktop rail; align card buy rows; remove redundant eyebrows; replace Unicode arrow. One correction batch and same-matrix recapture followed. Verdict: **ship for the four scored fixes, all resolved**. No final storefront/quality-ceiling approval; no approved comp/seed/QUALITY BAR card supplied for this bounded prototype. No documenter rewrote DESIGN.md because the phase contract expressly prohibits final-system documentation before owner screen selection.
- Diff/paths/ownership and unchanged three source-review SHA256s checked. No secrets, production operations or deployment.

## Measurements and next-task obligations

At 390×844 both languages: first card Y563, first add Y798.28, card width174, media image element height114 (object-fit contain; actual photographed object occupancy varies and was not inferred from its box). Baseline first-home purchase Y841/844 improves only modestly, and the fixed navigation still occupies Y780–844 at initial scroll. **P1-03 must improve complete first-view purchase access**, not treat a partly covered initial row as a density success. Long names remain complete and scroll access remains available.

At 1440×900: A first card Y731 EN/Y738.19 AR; add Y1006/Y1013.19. B first card Y617 and add Y892 both languages. Desktop card width286, image element height158; candidate four columns. Full row rectangle/reading widths, image boxes and exact measurements are in the manifest. No universal fold/conversion/performance claim. P1-03 must compare four vs five columns and image/information grouping; initial topology proof is not a density decision.

Remaining: 320/360 hard data/zoom/large-text/landscape, 44px target/focus/state/contrast inventory (the proof-only language switch is presently a compact 32px review control and needs a larger hit area), complete/missing/multiple-image/variant/unknown-price fixtures, sparse/error/campaign cases, true return/query/scroll continuity, keyboard/safe-area/device behaviour, focused search and full cart/account/checkout mode contract, and any unproved accessibility/locale states. Search suggestions currently demonstrate product matches and recents; category/brand/collection/related suggestions remain P1-04 parity work. The footer deliberately has only truthful proof links and an explicitly existing-site contact exit; full public destination coverage belongs to P3. No prototype login or actual checkout is implied.

NEW-001–003 shared consumers remain P2 isolation work; NEW-004–005 full continuity/translation proof remains assigned; NEW-006 did not recur in these settled proof captures but is **not resolved** for incumbent long-session navigation. Source guide/instruction/runtime authority alignment remains P2 after P1-05. Do not silently close review/coverage obligations from this proof.

## Ownership and eventual removal

Added: `src/app/design-proof/{layout,page,error,cart/page,products/page,products/[slug]/page}.tsx`; `src/components/design-proof/{shared,controls}.tsx` and `proof.module.css`; `src/lib/design-proof-gate.ts`; gate test; launch/capture scripts; this evidence and retained captures. Existing fixture has only the five-line catalogue-sort addition.

Provisional roles, the strictly proof-mounted body dock-padding adapter, comparison UI and proof flag are owned by these paths. No new public asset or API/action endpoint, dependency, production token or production route replacement. On acceptance migrate chosen consumers in assigned stages; P6 removes the experiment/routes/flag/scripts/test/adapter after checking references, archives captures as historical and retains useful fixture sorting. Do not delete reused shared fonts, currency/image/cart helpers or assets. Rejected alternatives have no active restoring authority. Retain evidence as historical, never styling instructions.
