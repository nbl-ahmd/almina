# Render release observation — 2026-10-17

The owner authorized commit, protected merge and Render deployment, deferring Vercel. PR [#44](https://github.com/nbl-ahmd/almina/pull/44) merged as `09e6163e1b5e7fbf3b6f5f50d97ad957eaf581fc` after required CI passed, including all 88 browser tests. No ERP catalogue was imported.

## Final observed result

After the owner's private credential correction, API deployment `dep-db9jbnvavr4c73ea0igg` succeeded for the merged release. `/health/ready` returns HTTP 200, `status=ready` and the exact merged SHA. `/api/products` returns HTTP 200 with an empty array, consistent with the new empty database. This supersedes the failed attempts recorded below.

The Render Next preview homepage now renders its normal content and empty catalogue/category states. Direct hosted checks of `/`, `/products`, `/categories`, `/offers`, `/cart`, `/checkout` and `/admin/login` all return HTTP 200 without the pharmacy failure boundary and include noindex. Robots disallows crawling; Google feed stays 404. The mobile homepage at 390 × 844 renders mobile navigation and no error boundary, with document width 375 (no horizontal overflow); the temporary viewport was reset. API and storefront screenshots are retained locally as release evidence.

Both services run the release, but customer-facing domain cutover and commerce activation are not complete. Existing custom-domain routing remains unchanged. Administrator/bootstrap setup, explicit order-number floor, store policy, restricted application database credentials, backups/restore verification, the preview API origin allowlist, catalogue import and hosted authenticated/commerce/provider acceptance remain pending. No real order, ERP import, account bootstrap or historical-data restoration was performed. Checkout and catalogue feeds remain off. The startup database check confirms connectivity and transaction-capable topology, not complete business acceptance.

## Hosting observed

- Existing API `almina` (`srv-cv1dn5lds78s73doqjm0`): root build/start contracts retained. Corrected obsolete `NODE_VERSION=19.4.0` to `24.21.0`, added production environment labels and the existing HTTPS storefront origin to `AUTH_ALLOWED_ORIGINS`. No database URI or provider secret was changed.
- API candidate deployment `dep-db9gaaijnfac73c6tmpg`: build succeeded; startup failed with `API initialization failed`. Render retained the previous live release. The old live `/api/products` also returned HTTP 500; this is not a successful API rollout.
- New free Next Node service `almina-storefront` (`srv-db9gbdqjnfac73c71ivg`) deployed the exact merged SHA at <https://almina-storefront.onrender.com>. Build uses `npm ci --include=dev && npm run build --workspace=@almina/web`; start uses `npm run start:web -- --hostname 0.0.0.0 --port "$PORT"`.
- Preview uses `APP_ENV=staging`, its own `WEB_ORIGIN`, and the existing API origin for both maintained and compatibility requests. Checkout and catalogue feeds remain explicitly disabled. No database/provider credentials are present in the web service.
- Hosted about/contact/cart and admin sign-in render; robots disallows crawling and feed route returns 404. Homepage reaches the upstream failure boundary because catalogue reads fail. A Render Live badge does not establish storefront acceptance.
- Existing static service and `www.alminapharmacy.com` domain remain unchanged. Vercel configuration was not changed. Before authenticated preview acceptance, add the preview's exact origin to the API allowlist through a reviewed configuration change.

## Atlas inspection

The owner's signed-in Chrome account can access the original `Main` organization → `almina` project → `almina-cluster`. Atlas shows AWS Bahrain (`me-south-1`), Free tier, MongoDB 8.0.20, and a persistent “configuring MongoDB” deployment banner. Data Explorer remained connecting during inspection. The existing Atlas support conversation identifies this cluster as affected by the Bahrain incident.

[MongoDB's incident report](https://status.mongodb.com/incidents/7g5qmxgkc2y4), inspected on 2026-10-17, explicitly says the issue remains ongoing despite its Resolved heading. Its guidance says Bahrain workloads cannot operate, be modified or support migration/backup recovery. This is evidence of a regional blocker, not evidence that the data has been permanently lost.

Both `Al Mina Pharmacy` and `almina` organizations in this account show no projects. Earlier recovery notes mention a replacement cluster; its current dashboard/account must be identified before changing Render's database destination. Do not substitute an arbitrary empty database, reset the original cluster, widen network access or infer credentials. Existing production history must remain preserved.

Pending: identify the intended replacement cluster and explicit database, verify access/topology and any retained data, then retry the API release and perform hosted acceptance. Recovery bootstrap, administrator creation, catalogue import and checkout activation remain separate reviewed operations.

## Replacement cluster located

The owner clarified that the replacement is in the pharmacy Chrome account. Project `almina-production` (`6acf3b9c4dcfc84ebc4ac7fe`) contains `almina-prod-01`: ready, Free tier, MongoDB 8.0.34, AWS Singapore (`ap-southeast-1`), three-node replica set. Atlas overview reports 0 B; no catalogue or historical-data recovery is established. Backups are inactive. The existing database user has broad Atlas admin privileges; application credentials should instead be scoped to the intended named application database.

Render's current URI host was verified as the old Bahrain cluster, with no explicit database path. Its MongoDB credential appeared in tool output during UI inspection; treat the old credential as exposed and rotate/revoke it through the owner-controlled credential workflow. No credential value is recorded here and none was changed.

The replacement project's IP list contains only its original setup-computer address. Render lists shared Singapore egress ranges `74.220.52.0/24` and `74.220.60.0/24`. The first proposed restricted entry is prepared but not submitted; action-time confirmation is pending for both entries because they expand network access. Authentication remains required; no unrestricted internet entry is proposed. New connection credentials and an explicit target database still need private configuration before deployment can continue.

The owner subsequently approved both restricted ranges. Both entries were saved and verified **Active** in Atlas; the original setup-computer entry was preserved. Atlas's driver connection template identifies `almina-prod-01.qzuamtq.mongodb.net`. Connection instructions remain open for the owner to privately update Render's `MONGODB_URI` with the new password and an explicit `/almina` database path, then rebuild/deploy. The new password is not available to the agent and no credential was fabricated, reused from the old cluster or changed. API health and hosted acceptance remain pending this owner action.

After the owner reported saving the URI, deployment `dep-db9j7ku1egvs73ffrbp0` built SHA `09e6163` successfully but logged `API initialization failed`. Sanitized inspection verified the new Singapore host and expected username, but found the literal `<db_password>` template still present and no named database path. The secret display was remasked; no real new password was present, printed or changed. Requested owner correction of the placeholder and explicit `/almina` path, with private password entry and rebuild/deploy. Public readiness still returns HTTP 500 from the previous release and the hosted homepage still shows its upstream-failure boundary. No successful API rollout is claimed.

A second owner-triggered deployment, `dep-db9j9v7btjjs73bud5ng`, also built the exact release successfully and failed initialization. Sanitized inspection confirms `/almina` is now present, but the password remains exactly the literal `<db_password>` placeholder. Opened the existing Atlas user's Edit User dialog for owner handoff; no password or privileges were changed. Owner must enter the actual existing password, or privately reset it in Atlas and update the Render URI to match, then rebuild/deploy. No additional network changes or database writes were made.
