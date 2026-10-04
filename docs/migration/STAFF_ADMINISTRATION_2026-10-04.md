# Retained staff administration ownership

The retained `/api/auth/signup`, `/users` and `DELETE /users/:id` adapters now delegate to maintained TypeScript `auth/administration.ts`. The existing server authentication, administrator authorization, cookie/CSRF boundary, array projections and generic provisioning response remain. Both Next and Vite describe removal as deactivation.

## Additive behavior

Provisioning validates bounded usernames, roles, unique city assignments and 12–72 character passwords with bcrypt's 72-byte limit before database/password work. The actual actor must still be an active database administrator before hashing and inside the transaction. A shared control revision serializes staff mutations across instances. Concurrent equal usernames create one account and one actor audit without requiring a new unique index over unknown historical data. Existing usernames, including disabled accounts, are never overwritten, upgraded, assigned new passwords or re-enabled by retries.

Deactivation retains the account identifier, password hash, cities and historical references. The disabled flag, actor/timestamp, immutable audit and session revocation commit together. Self-deactivation is forbidden. Serialized active-administrator checks prevent reciprocal concurrent removals from leaving no administrator. Authentication rechecks disabled status on every request. Repeated removal is a no-op; active staff lists retain bounded pagination and never return password hashes. No production index or backfill was applied.

## Evidence and limitations

Disposable replica-set regressions exercise concurrent provisioning, conflicting retries, bcrypt verification, revoked/staff actors, real sessions, retained inventory references, repeated deactivation, audit-failure rollback and reciprocal administrator races. A separate real Mongoose/driver-5 HTTP test verifies existing responses and persistence; malformed provisioning requests fail before database calls. Browser verification covers keyboard provisioning, cleared password input, deactivation, revoked access, reload and no overflow at 360/390/768/1280 px.

Local checks passed: 100 API/security, 36 real disposable database/load, 64 unit, 7 release-gate and 29 Chromium regressions; lint/typecheck, all three lockfile audits with zero high/critical findings, Next/Vite builds and raw SEO/storefront smoke. Running Turbopack diagnostics report no compilation/config/session errors; React inspection retains server `AdminPage` and client `AdminForm`; the admin main region has zero axe violations/incomplete checks. Compiled browser verification must use the same `AL_MINA_ISOLATED_BUILD=1` at build and test time. A run against the old non-isolated artifact was rejected; it is not acceptance evidence.

The browser suite also exposed a pre-hydration upload click: no upload request was sent, and the native form navigated instead. Cloudinary controls now remain disabled through server rendering/hydration and enable after the client handler attaches, using [React's server snapshot contract](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering). The existing upload regression now holds JavaScript delivery to verify the disabled initial controls before releasing scripts and completing replacement/archive. No provider or reference contract changes.

Historical duplicate usernames remain an owner-reviewed data inventory gate; provisioning does not merge or delete them. Deactivation reserves the username. There is no automatic reactivation or password-reset workflow. Audit records retain administrative identifiers/city scope and require appropriate access and retention controls. The audit is append-only through these application writers, not a claim of database-level immutability against privileged operators.

## Rollback and hosted gate

Keep added fields, control revisions and audits. Both maintained authentication stacks already honor `disabled`; any rollback release must preserve this check and deactivation behavior. Rolling back to physical account deletion is not an acceptable fallback. Recheck hosted login, expiry/logout, city RBAC, session revocation and administrator availability before promotion. Production acceptance, credential rotation and database backup/restore evidence remain unverified. No production deployment or legacy contraction occurred.
