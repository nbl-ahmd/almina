# Remaining repository migration plan

Updated 2026-10-04. Production acceptance remains incomplete.

PR #2 merged at `d912a269247a63ffbd3bc55e3d9f9c20ae8d9cf2`. All twelve source branches are ancestors. Protected `verify` passed on master in runs `37151757878` and `37151752130`. This plan was missing from the integration commit; this document records the owner's ordered continuation.

1. Inventory retained routes, effects, fallback consumers and dependencies; extract small maintained domains behind existing authenticated adapters. Record owners and parity tests before changing callers.
2. Expose recovery through authenticated bounded CSV/JSON preview and hash-bound commit, preserving IDs/barcodes/money and inserting only disabled zero-stock drafts into a closed bootstrapped store. Replace recovery batch UI, block old importer in recovery, and add spreadsheet templates.
3. Record immutable stock-adjustment ledger in the transaction with conditional product updates. Require reason/actor and stale-form expectations; validate sale/invoice money on every writer. Preserve checkout/cancellation/retry guarantees.
4. Add retained readiness/draining and provider outage/duplicate tests; signed Cloudinary uploads with content verification and reference-preserving replacement/archive. No automatic asset deletion.
5. Convert pharmacy components to the existing Tailwind/token system in focused changes; verify four viewport widths, keyboard and states. The owner-authorized old frontend source retirement is a held draft; preserve the rollback source/artifact until hosted retirement acceptance.
6. Verify SEO using representative recovered data, add consent-aware PII-free analytics and operational metrics/alerts/performance budgets. Keep private/search variants excluded.

Every focused PR carries relevant tests and exact evidence. Final candidate requires lint/typecheck/build, security/money/auth/inventory regressions, mandatory disposable replica-set/browser suites, release-gate tests and both remaining lockfile audits. Keep required fail-closed `verify`.

Push working branches only. Do not merge/deploy production while hosting acceptance is incomplete. Integration commits possibly reaching master must include `[skip render]`; verify Render skipped events/controls separately. Never dispatch staging to the known production service. [Completion flow](COMPLETION_FLOW_2026-10-04.md), [cutover procedure](PRODUCTION_CUTOVER_2026-10-03.md), and [commerce constraints](COMMERCE_INTEGRITY_2026-10-03.md) govern hosted acceptance/backups/recovery/rollback.
