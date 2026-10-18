# Vercel deployment without a second repository

The source of truth remains `nbl-ahmd/almina`. Personal private repository imports require the GitHub owner; the pharmacy's collaborator account cannot connect the original repo through Vercel's Git import. A fork/copy adds a synchronization obligation and is unnecessary for the official CLI deployment route.

Created an empty project in the pharmacy Vercel account:

- Team: `pharmacyspmb-1419`
- Project: `almina-storefront`
- Project ID: `prj_PftjAFsj6BSwrZnXgYZBFv0alGhF`
- Framework: Next.js; root `apps/web`; include workspace files outside root; Node 24
- No Git connection, source upload, deployment or domain cutover yet

`.github/workflows/deploy-vercel-web.yml` prepares the supported `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` route. It only accepts an exact SHA merged into master with a successful foundation push verification. It is manual, read-only for GitHub repository access and pinned to the official Vercel CLI version checked on 18 October. It does not deploy the API, change DNS, import data or run on untrusted pull requests. The existing staging deployment workflow is preserved.

Before dispatch:

1. The pharmacy must privately create a deployment token scoped to its Vercel team and store it as GitHub Actions secret `VERCEL_PRODUCTION_TOKEN` in the original repository. Do not put it in chat, source, logs or `NEXT_PUBLIC_*`.
2. Set GitHub variables `VERCEL_ORG_ID` (the pharmacy team ID) and `VERCEL_PROJECT_ID` to the project above, at repository level or the `vercel-production` environment.
3. Configure Vercel production frontend variables: `APP_ENV=production`, `CHECKOUT_ENABLED=true`, canonical `WEB_ORIGIN`, existing Render API origins and the public Cloudinary cloud name. Keep API/database/provider credentials on the persistent backend. Advertising feeds remain separately gated by catalogue approval.
4. Confirm the assigned stable Vercel hostname, add only that exact origin to the API allowlist, then test sign-in, cookie/session forwarding, catalogue, image delivery, cart, checkout review, canonical metadata, robots and sitemap. Do not place a real order as a smoke test.
5. Dispatch the verified master SHA and require a READY deployment and matching release evidence. Keep Render available for rollback; make the canonical/domain transition explicit to avoid duplicate indexed storefronts.

Checkout and app indexing have been enabled on the existing Render frontend and its deployment reached Live. The Render Free host can still sleep and override robots while sleeping; this is not equivalent to reliable SEO hosting.

The pharmacy account currently shows Hobby. Vercel's published fair-use rules restrict Hobby to personal non-commercial use; a pharmacy storefront is not made non-commercial simply by omitting online payments. The official CLI route solves repository ownership/import, not hosting-plan eligibility. No paid plan or trial has been started by this work.

Sources: [GitHub import ownership](https://vercel.com/docs/git/vercel-for-github), [official GitHub Actions deployment](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel), [fair-use rules](https://vercel.com/docs/limits/fair-use-guidelines).

## First deployment verification

The pharmacy saved `VERCEL_PRODUCTION_TOKEN` privately in GitHub; both non-secret project identity variables are set. Production frontend settings are saved with checkout enabled, and the stable alias is `almina-storefront.vercel.app` (the initial generated alias redirects to it). The owner approved this exact API origin; it was appended while preserving both prior origins and became active with the verified Render API release. Vercel function region is set to Singapore beside the existing API; the API itself is also Render Free, so a frontend move alone does not eliminate backend idle wake-up delays.

## Owner merge verification

For the owner-requested deployment test, `alminadev` should review and merge the documentation-only PR using **Create a merge commit**. Keep existing contributor authorship intact. Record the resulting merge SHA and its GitHub author, wait for that exact master commit's foundation checks to pass, then run the existing manual Vercel deployment workflow with that full SHA. Verify the deployment result and live alias before calling the test successful; a merge alone does not establish Vercel eligibility. This test changes no runtime code, credentials, catalogue data or commerce settings.

PR #47 merged as `aa936532a242544727ed1b6cf228543f12faece0` after both push/PR foundation suites passed. Both Render services reached Live on that SHA. The first official CLI workflow authenticated and pulled the correct project successfully, then exposed an install issue: `NODE_ENV=production` caused plain `npm ci` to omit development build tools, including Tailwind's PostCSS plugin. The frontend's Vercel install command now explicitly includes build dependencies with `npm ci --include=dev`; runtime code and commerce settings are unchanged. A successful follow-up deployment must still be verified before calling the Vercel migration complete.
