# Branch-owned store accounts — 7 November 2026

## Result

Branches now own their store login. The normal workflow is **Branches → Create branch → Branch & login → Delivery area**. Creating a branch provisions its credentials and assigns them to the branch automatically. An optional first polygon is created in the same transaction. There is no separate Add User, role selection, city input or account-assignment step for a new store.

A branch needs only a name, login and password to be created. The username is suggested from its name and can be edited. Address/contact fields are optional; warehouses, email, hours and numeric coordinates remain available under More branch details. The delivery step accepts an actual location pin, drawn or keyboard-entered polygon, fee and estimate, or an explicit Set up delivery later choice. Deferral creates a working login with zone delivery paused, without inventing a location or coverage. Automatic zone names and branch assignment remove redundant inputs; overlap priorities remain available in advanced/global zone editing.

The branch workspace separates **Branch & login**, **Delivery area** and **Stock**. The Users page handles administrators and existing person accounts; it no longer asks administrators to create store users. Existing staff/accounts, order identifiers and history are preserved. Existing named-area receiving rules are retained in a collapsed compatibility section in Branches.

## Authentication and data integrity

The branch is the business account. Its credential record reuses the existing secure authentication/session system internally (`users`, fixed `role: user`, `accountType: branch`, immutable branch binding). It does not introduce another password or authentication stack. Passwords follow the existing 12-character/72-byte limits and bcrypt cost 12. No plaintext password is returned, audited or persisted in browser storage.

Creation, credentials, policy, optional zone, receipts and audits commit together through the shared staff/configuration transaction fence. Username collisions or failed audits roll everything back; retrying the same creation ID cannot provision a duplicate or replace credentials. Global routing/zone activation remains explicit and does not occur merely because a branch was created.

Store logins use existing branch order authorization and notification scoping. Their role cannot be supplied or elevated by the create form. The generic staff reassignment/deactivation endpoints reject managed branch credentials, so the login cannot be detached from its branch accidentally. Login management appears inside that branch instead.

Administrators can add a store login to an existing branch without altering its existing staff identities or passwords. Resetting a login requires the current identity/revision and an operation key, rejects conflicting usernames/stale edits, replaces the password hash, revokes all of that login's sessions, disconnects its old push registration and records an audit. The last receiving login for an active branch cannot be paused without another operator. Branch deletion retains the credential record disabled, revokes its sessions and preserves historical references; existing stock, coverage, order and legacy-staff guards remain.

## Contracts and rollout

New retained admin-only routes, protected by the existing authentication, RBAC and mutation/CSRF boundaries:

- `GET /api/auth/branches` — bounded branch workspace, credential metadata only.
- `POST /api/auth/branches` — atomic branch/account/optional-zone creation.
- `POST /api/auth/branch-login` — establish or reset a branch-owned login.

New DTO/input contracts are in `packages/contracts/src/branch-management.ts`. The additive `branch_login_identity` partial unique index covers only `accountType: branch`, so legacy staff sharing a branch are unaffected. Apply the existing reviewed `npm run db:indexes:plan` / `npm run db:indexes:apply` workflow on release. Creation also serializes identity writes, so callers cannot race the normal provisioning paths into duplicate branch logins.

There is no required environment variable, paid integration or bulk credential migration. No production account, password, branch, zone or stock was created/changed during implementation. Release API and frontend together. Existing branches get a Create store login form; no person account is silently converted or disabled. Existing unassigned staff may need their one-time branch assignment before activating legacy branch routing. New branch logins already have that assignment.

The [delivery zone activation guide](DELIVERY_ZONES_2026-11-06.md) still governs real locations, boundaries, physical stock counts, index application, feature activation and rollback. Stock is allocated deliberately; creating a branch does not duplicate global inventory. Operating hours are descriptive, and zone delivery availability remains a separate switch from sign-in access, allowing closed stores to finish existing orders.

Rollback must preserve the compatible delivery reservation/restoration implementation while zone orders remain open. Managed credentials remain ordinary compatible branch-scoped users in the database, but older UI versions may display them as staff; retain their branch binding and credential history. No collections or historical accounts should be removed for rollback.

## Verification and UI evidence

Local checks passed: 266 unit tests, 154 API/security tests, the full 198-case disposable MongoDB integration run followed by the expanded branch-account/native-HTTP/routing checks, typecheck, lint, isolated production build and seven release checks. Dependency audit reported zero high/critical findings. Next.js 16.4.2 version-matched docs were used; development compilation and browser runtime diagnostics reported no issues.

Fifteen browser cases passed across the branch/routing and administrator regression batches, including the real create → location/area → stock → activation → store sign-in → order confirmation flow. They also exercise deferred delivery, clear duplicate-login errors with no partial records, credential reset and old-session rejection, legacy named-area/fallback receiving, Arabic pin controls, administrator creation/deactivation, inventory and existing order/media operations. The final two branch flows and their captures were repeated against the finished UI. These tests use disposable data, synthetic map tiles and synthetic credentials; they do not create production accounts or establish real delivery boundaries.

The branch creation form was checked at 360/390/768/1280px with document-overflow assertions. Phone/desktop captures are under `.verification-results/branch-create-login-{390,1280}.png`, `branch-create-coverage-{390,1280}.png` and `branch-workspace-{390,1280}.png`. Manual inspection drove shorter actions, persistent field labels, a single map task at a time, collapsed optional/technical inputs, removal of repeated setup panels and side-by-side desktop branch/login panels. Zone geometry is retained correctly even if map imports finish after keyboard entry.

GitHub CI and its final commit status are recorded on the pull request; local results above are not a deployment record.
