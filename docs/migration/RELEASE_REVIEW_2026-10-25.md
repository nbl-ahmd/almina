# Combined release review — 25 October 2026

Pending work from the admin redesign and storefront discovery/mobile tasks is consolidated into the existing admin-redesign pull request. Other local branches are merged history or stale predecessors of work already in master; their old snapshots must not overwrite the maintained implementation. In particular, the branded-CDN branch's media implementation is already present in master through the later CDN release.

## Release fixes

- Extracted exact wholesale-price draft conversion into a plain TypeScript module so root tests can compile it without importing a React component. UI imports/re-exports retain existing interfaces. Added dashboard/price regression files to the standard unit command.
- Pinned application Zod to 4.6.7, body-parser to 2.4.0, development-tool Undici to 7.30.1 and backend Multer to 2.5.0. Root/backend lockfiles are updated; no uncontrolled dependency upgrade or Next version change.
- Backend dependency audit has zero high/critical findings after patches. Root runtime Zod and body-parser findings are fixed.

## Remaining merge blocker

The current latest next-devtools-mcp 0.4.0 pins Zod 3.25.76. The npm advisory GHSA-mrhx-c7xc-m3w5 affects versions below 4.6.6, and its aggregate makes npm report next-devtools-mcp as high severity as well. Thus the root audit still reports two high entries for this one development-tool dependency chain. No compatible patched 3.x release is available in the registry checked today. The tool's schema converter depends on Zod 3 internals; forcing Zod 4 would break it. The public app dependencies are patched; this does not make the unpatched development tool acceptable or clear the repository's all-dependency gate.

The security gate remains unchanged and will reject this release until the development tool is safely patched/replaced or an upstream compatible release is available. No audit suppression, blind downgrade, dependency removal or vulnerable-code public exposure was introduced. Do not merge/deploy while required verification is red.

Reference: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

## Exclusions

Finder .DS_Store changes and the Next-generated machine-specific next-env.d.ts route paths are not release source changes. Ignored operator outputs (ERP exports, full before-state backups, credentials and private execution files) remain untracked. Reviewed synthetic UI screenshots are included as design evidence.
