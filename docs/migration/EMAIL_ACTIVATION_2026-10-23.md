# Production email activation and release — 23 October 2026

This checkpoint supersedes the pre-release email status in
`EMAIL_MEDIA_STATUS_2026-10-22.md`, `RESEND_EMAIL_2026-10-22.md` and
`PUBLIC_LAUNCH_REMAINING_2026-10-22.md`.

## Verified API and email activation

PR #59 merged as `60fe39cbbe296e0cb7ef6c7dbb9bd503310770f4` after all required
checks passed. Both its PR and exact-master verification passed: 130 browser,
115 MongoDB integration, 116 API and 179 unit tests, plus builds, lint, typecheck,
release and crawler smoke checks. Next.js is patched to 16.4.2; the dependency
audits report no high or critical findings.

Render deployed that exact commit. `/health/ready` reports ready with its SHA.
Both the API and public storefront customer-options endpoints report
`emailEnabled: true`. Existing private provider configuration was sufficient;
no credentials were exposed or replaced.

A signed Resend delivery-event replay returned HTTP 204 at 18:11 UTC on
22 October. The public storefront email-code request returned HTTP 200 and
issued a challenge. Resend reports that controlled provider test-address email
delivered; its template contained no unresolved placeholders. The live account
page renders both Google and email sign-in. No production order or stock
mutation was used. This verifies the application/provider path, not real mailbox
placement or full production order fulfilment.

Requested reminders remain subject to the existing admin policy and customer
consent. No campaign, contact import, new discount or loyalty rule was activated.
Email startup prepares its documented additive TTL/index storage idempotently.
The separate wholesale-history index remains an operator rollout item.

## Frontend deployment and owner identity

The exact-master Vercel workflow passed verification and built the frontend,
but Vercel blocked deployment `B6C6h34ssEDWkLhCk6pXwiRoTmt6`: the merge author
did not have contributing access on the pharmacy project's current Hobby plan.
The stuck publishing workflow was cancelled after the provider confirmed that
block. The existing live storefront continued to serve successfully.

The documented owner-merge route in `VERCEL_SINGLE_REPOSITORY_2026-10-18.md`
previously succeeded. The pharmacy owner's existing browser session is signed
in as `alminadev`. This documentation-only follow-up records the evidence and
allows that actual owner to merge through GitHub after required checks pass.
Contributor authorship is preserved; no identity substitution, permission
expansion, plan upgrade or verification bypass is part of the release.

Verify the resulting owner-authored merge SHA, its complete foundation checks,
the ordinary Vercel workflow and public routes before marking the frontend
release complete. A successful owner merge does not establish plan suitability
for commercial use; the existing documented hosting-plan decision remains.

## Remaining public-launch acceptance

The broader launch checklist still requires a reviewed launch assortment and
photos, approved operational/policy content, production backup/restore and
credential-rotation evidence, real inbox/order/fulfilment acceptance and the
documented observation period. Configure approved wholesale businesses, terms
and audience rules before inviting buyers. Product image uploader consolidation
and retirement of the personal-account CDN upstream remain separate media work.
