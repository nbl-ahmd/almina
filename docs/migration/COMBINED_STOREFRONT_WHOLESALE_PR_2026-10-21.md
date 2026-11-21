# Combined storefront, customer account and wholesale release

The two local branch names (`codex/arabic-phase-four` and `codex/wholesale-portal`) originally pointed at the same production base, `0afd821`. Their pending work shared one checkout rather than forming two divergent commit histories. The combined application changes are committed on `codex/wholesale-portal` for one PR to `master`; the older branch reference is preserved.

## Included scope

- Responsive coral/neutral storefront redesign, shared Radix-based controls, header shopping menu/search suggestions, footer, catalogue/product/cart/checkout polish and restored shopping shelves.
- Remaining Arabic storefront controls and canonical address/commerce values.
- Verified Google/email customer sign-in, account UI and configuration examples; guest retail shopping remains available.
- Campaign preview/review/placement administration and home merchandising support.
- Invitation-only business portal with admin-approved business profiles, assigned catalogues, explicit trade prices and configurable case quantities. Shared stock and existing transactional, idempotent order handling remain authoritative.
- Privacy page, optimized local Geist font with its licence, design documentation, regression tests and rollout notes.

## Review and rollout

No production database, product price, stock, customer, order or credential was changed by preparing these commits. The PR does not merge or deploy itself. Deploy compatible web/API versions together, review/apply additive indexes through the existing controlled process, and configure Google OAuth/email authentication privately. Staff must configure wholesale business verification, assignments and actual prices/quantities; no business is approved automatically. Existing email DNS records need separate restoration after the owner's nameserver migration.

Verification now accepts an optional restricted `AL_MINA_VERIFICATION_TAG` with `AL_MINA_ISOLATED_BUILD=1`. Build and browser-server processes use the same named directory, preserving an immutable artifact while other local previews/builds continue. For this PR the tag is `combined-pr`. Default deployment/CI build paths are unchanged.

See `ARABIC_PHASE_FOUR_2026-10-20.md`, `CUSTOMER_ACCOUNT_2026-10-20.md`, `CAMPAIGN_MERCHANDISING_2026-10-20.md` and `WHOLESALE_PORTAL_2026-10-21.md` for domain-specific decisions and rollback constraints.

## Verification results

- Repository/workspace typecheck and repository lint passed.
- All 171 unit tests and 54 selected disposable replica-set integration tests passed. Integration coverage includes existing commerce, growth/campaigns, rewards, customer identity and wholesale authorization/concurrency.
- API bundle build and isolated web production build passed. Browser verification used the named immutable production artifact, with no application database or external provider access.
- The full 125-case browser run completed: 120 passed and five failed. Four failures exposed a missing live announcement of empty search suggestions; the UI now announces loading, results, empty and unavailable states in English/Arabic. The fifth was a test selector matching both correctly named mobile cart links; the test now explicitly targets the header cart and verifies both navigation labels reset when the cart empties.
- After those corrections, all 16 navigation/search/Arabic cases and all nine storefront cases passed against the rebuilt artifact. The five failures are resolved by these focused reruns; the full 125-case run was not repeated after the corrections. The remaining 120 cases passed in the complete run, including existing checkout, admin, campaigns, account and seven wholesale scenarios.
- Staged diff whitespace checks and a credential-pattern scan passed. The local third-party skill update, generated build references and scratch captures are excluded.

These results supersede the earlier global-lint/build-collision limitations recorded in the wholesale handoff. No production deployment or database migration was performed. Google-owned authentication and real email delivery still require the pharmacy's configured providers; synthetic tests do not establish provider-account readiness.

## Dependency gate follow-up

GitHub run 39585965663 passed API and browser verification but failed quality on two high advisories reached through the development-only MCP SDK. The scoped SDK override is now 1.32.1; root and backend audits report zero advisories locally. The audit prints affected packages and advisory links directly, and the required `verify` summary names failed, skipped or cancelled jobs instead of emitting an unexplained shell exit code.

Keep the three parallel jobs and the lightweight `verify` aggregation: branch protection requires `verify`, and the production deployment workflow requires a successful verification run on the exact master commit. Removing post-merge verification would require redesigning that deployment evidence chain. These are separate code-quality, server regression and browser/production-build checks; the summary does not rerun tests. The gate was checked against success, failure, cancellation and skipped outcomes. No security check was disabled.
