# Email marketing designer and campaigns — 23 October 2026

## Scope and access

`/admin/marketing` contains a lazy-loaded GrapesJS + MJML visual editor. Staff can create, edit, duplicate and preview saved templates, add reviewed in-stock catalogue products, upload validated artwork and send tests to an operator allowlist. Only administrators can import consented contacts or queue an audience campaign. Every write goes through the authenticated Next gateway and the API's session, role, origin, CSRF and mutation quota checks. The editor route alone permits runtime inline styles required by GrapesJS; scripts keep the global nonce policy. The email HTML preview is sandboxed without script permission.

Templates are declarative MJML, validated and compiled on the server. Raw HTML, scripts, forms, includes, external stylesheets, event handlers and CSS imports are rejected. MJML 5.4.1 renders the final email. The current GrapesJS MJML plugin bundles its own older browser preview compiler; the saved server render is authoritative. An unsupported editor element or MJML attribute fails saving rather than silently sending malformed markup. Keep the plugin and server compiler compatibility covered by the browser save/preview test when upgrading either.

The `marketing_templates`, `marketing_contacts`, `marketing_campaigns`, `marketing_jobs`, `marketing_unsubscribes` and `marketing_assets` collections are additive. Planned indexes are in `apps/api/src/database/indexes.ts`; inspect `npm run db:indexes:plan` before any production apply. No legacy product, customer, order or image references are migrated or deleted. Artwork uses the existing bounded image decoder and signed object-storage upload. The uploaded asset remains recorded even if a draft is discarded; a later inventory may identify unreferenced campaign artwork.

## Sending and consent

The audience source is either customer accounts with `marketingEmail: true` or separately imported contacts with a list, timestamp and consent evidence. Account creation, purchases and wholesale approval never imply marketing consent. A suppressed or unsubscribed address cannot be reimported. Every queued job checks consent and suppression again immediately before sending. Test recipients must appear in `MARKETING_TEST_RECIPIENTS` and do not open audience sending to staff.

Campaign creation snapshots the saved subject and HTML with a revision check. A caller-provided UUID prevents duplicate queues; the job key deduplicates each recipient. The worker processes one queued recipient at a time and shares the existing 20-marketing-attempt daily and 500-monthly counters. A timed-out or interrupted provider attempt becomes **uncertain** and is never resent automatically. `accepted` means a provider accepted the request, not inbox delivery. Resend delivery, bounce and complaint events use the existing signed webhook/suppression ledger. Outlook's Graph `202` has no provider message ID in this flow; operators must inspect the Microsoft 365 trace for uncertain or later delivery status. Reports deliberately omit recipient addresses and email HTML.

Each email receives a postal-address footer and a unique HTTPS unsubscribe link plus `List-Unsubscribe` headers. The public GET link displays confirmation and does not mutate consent; the POST action suppresses the address and turns off customer marketing email. This path is independent of the transactional order and sign-in messages.

## Provider activation

The designer can be used with sending disabled. Configure these on the **Render API process** (both maintained and retained startup paths read them):

- `MARKETING_EMAIL_ENABLED=true`, `MARKETING_POSTAL_ADDRESS` (the real public business mailing address), `EMAIL_PUBLIC_API_ORIGIN` (HTTPS API origin serving `/api/v1/marketing/unsubscribe/...`), and comma-separated `MARKETING_TEST_RECIPIENTS`.
- For Resend: verified `EMAIL_MARKETING_DOMAIN`, restricted `RESEND_MARKETING_API_KEY` and `EMAIL_REPLY_TO`. Campaign sending can use Resend independently of the transactional `EMAIL_PROVIDER`. Keep the key/domain separate from transactional mail. Verify the sender, test delivery and signed Resend webhooks before an audience campaign.
- For Outlook: an organizational Microsoft 365 mailbox in `MARKETING_OUTLOOK_MAILBOX`, plus `MARKETING_OUTLOOK_TENANT_ID`, `MARKETING_OUTLOOK_CLIENT_ID` and `MARKETING_OUTLOOK_CLIENT_SECRET`. Grant Graph `Mail.Send` application permission **scoped to that mailbox** with Exchange application RBAC. This is an app-only integration; personal Outlook login is not supported. Verify consent, sender identity, Microsoft throttling and message trace with one allowlisted test first. Microsoft tenant setup and credentials are operator tasks.

All variables remain server-side. The admin status endpoint reports only readiness and sender address. Switch `MARKETING_EMAIL_ENABLED=false` to stop new provider attempts immediately while preserving queued jobs and all records. Disabling one provider credential likewise makes that provider unavailable. Restore settings only after examining `uncertain` jobs and the provider log; never create a replacement campaign blindly. A read-only Resend check on 23 October reported the marketing domain verified and enabled for sending. There is no live campaign send, Microsoft tenant grant, production index apply or deployment established by this code change.

## Verification and limits

Focused tests exercise strict rendering, template revisions, consent import/suppression, atomic queue replay, worker rechecks, footer and unsubscribe behavior, Resend and synthetic Graph outcomes. Compiled browser tests cover the editor/save/preview/reload at 390 and 1280 px and staff access. A provider's acceptance response is not an inbox placement test. Current campaign size is capped at 500 and only a recent summary is shown; introduce a dedicated marketing platform such as listmonk if list management, segmentation or throughput exceeds these limits. Gemini template generation is outside this phase and no API key is placed in the browser.
