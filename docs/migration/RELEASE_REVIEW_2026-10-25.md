# Combined release review — 25 October 2026

Pending work from the admin redesign and storefront discovery/mobile tasks is consolidated into the existing admin-redesign pull request. Other local branches are merged history or stale predecessors of work already in master; their old snapshots must not overwrite the maintained implementation. In particular, the branded-CDN branch's media implementation is already present in master through the later CDN release.

## Release fixes

- Extracted exact wholesale-price draft conversion into a plain TypeScript module so root tests can compile it without importing a React component. UI imports/re-exports retain existing interfaces. Added dashboard/price regression files to the standard unit command.
- Pinned application Zod to 4.6.7, body-parser to 2.4.0, development-tool Undici to 7.30.1 and backend Multer to 2.5.0. Root/backend lockfiles are updated; no uncontrolled dependency upgrade or Next version change.
- Backend dependency audit has zero high/critical findings after patches. Root runtime Zod and body-parser findings are fixed.

## Development-tool security blocker resolved

The upstream Next DevTools 0.4.0 Zod 3 pin is overridden to patched Zod 4.6.7. A project-local install hook replaces only the old private-internals JSON-schema converter with Zod's public `toJSONSchema` API, using input-mode conversion so transformed port inputs remain correctly described. The override retains the current tool version rather than silently removing or downgrading it.

The hook accepts only the known original or patched distribution hashes, is idempotent, skips installs that omit the development dependency and refuses unexpected versions/source. It performs no network, application configuration or database work. Remove the compatibility patch when a reviewed upstream release supports patched Zod natively.

Fresh `npm ci`, idempotent installation, 202 unit tests, full lint/typecheck and all-dependency root/backend audits passed. The protocol regression checks structured schemas and nested argument forwarding to an isolated local SSE endpoint. The actual connector also discovered routes and returned empty compilation issues from the running Next.js 16.4.2 app. The unchanged security gate now reports zero high/critical findings in both dependency roots. Moderate advisories remain outside its existing high/critical threshold.

Reference: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

## CDN branch ancestry

The old `codex/branded-image-cdn` commit was reproduced in master as `c9f04e6` and then corrected in the later CDN release. Its image-delivery, media-response, product-image and media-route implementation matches the current code. Newer retained legacy-media paths, proxy handling, tests and documentation must not be rolled back. The old branch is recorded as merged with the current tree preserved, eliminating misleading ahead-only ancestry without reapplying its superseded patch.

## Exclusions

Finder .DS_Store changes and the Next-generated machine-specific next-env.d.ts route paths are not release source changes. Ignored operator outputs (ERP exports, full before-state backups, credentials and private execution files) remain untracked. Reviewed synthetic UI screenshots are included as design evidence.
