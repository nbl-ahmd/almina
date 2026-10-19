# GitHub check cleanup — 19 October 2026

The PR previously showed the same five foundation jobs twice because every branch push and every pull-request update triggered verification. Old Netlify and Cloudflare Pages installations also posted checks for hosting that Al Mina no longer uses.

## Active verification

- `quality`: lint, TypeScript, unit/release tests and dependency security audit.
- `api`: API authorization and disposable MongoDB commerce/inventory regression tests.
- `browser`: production build, crawler/route checks and Chromium customer/admin workflows.
- `verify`: the existing required branch-protection result, successful only when all three jobs pass.

Foundation verification runs for PRs targeting `master`, pushes to `master`, and explicit manual runs. Feature-branch pushes no longer create a second identical suite. Dependency auditing was folded into `quality`; high/critical findings still block promotion. The required `verify` check and the verified-master Vercel deployment gate are unchanged. Manual staging deployment remains available and adds no automatic PR checks.

Cloudflare Workers and Pages and Netlify installations were suspended in GitHub settings. Both installations were scoped only to `nbl-ahmd/almina`. This stops future external checks without deleting hosting projects, media, DNS or deployment history, and can be reversed in GitHub settings. Render and Vercel access remains intact.

The homepage smoke assertion was updated from the removed “Featured products” heading to the current “Your everyday essentials” heading. The compiled storefront smoke and six deployment-gate tests pass locally. YAML parsing confirms the intended four jobs and trigger branches. Historical checks remain attached to their original commits; the new PR commit gets the cleaned-up check set.
