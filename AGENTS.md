# Al Mina E-Commerce Modernization — Agent Instructions

## Project Context

This repository contains the production Al Mina Pharmacy e-commerce application.

The legacy production application includes:

- React / Create React App storefront and admin UI
- Express backend
- MongoDB / Mongoose
- product and category management
- inventory
- checkout and order management
- admin users and roles
- WhatsApp integration
- email notifications
- push/realtime notifications
- product and banner media
- production customer and order data

The application is already used by real users.

Treat every migration task as production work.

---

# Primary Goal

Modernize the application incrementally into a scalable production architecture centered on:

- Next.js 16.x App Router
- latest stable patched Next.js 16.x release
- TypeScript for new production code
- Server Components by default
- persistent Node.js API service where appropriate
- MongoDB Atlas
- proper authentication and RBAC
- server-authoritative commerce logic
- safe inventory handling
- optimized SEO and performance
- modern responsive UI
- backward compatibility with existing production data and URLs

Do not perform a one-shot rewrite.

---

# Production Safety

The existing application is production software.

Never:

- delete production data
- reset a production database
- drop collections
- perform destructive schema migrations without an explicit migration and rollback strategy
- silently change product prices or stock
- silently invalidate existing orders
- silently change production URLs
- expose secrets
- commit credentials
- print secret values
- replace production integrations without preserving compatibility
- push directly to production unless explicitly instructed
- assume development data represents production data

Prefer additive migrations:

1. expand
2. migrate/backfill
3. verify
4. switch reads/writes
5. contract/remove legacy structures later

Every data migration must be idempotent or clearly document why it cannot be.

---

# Security Rules

Security issues take priority over refactoring and UI work.

Never trust client-supplied:

- product prices
- sale prices
- discounts
- tax amounts
- VAT amounts
- delivery fees
- final totals
- inventory availability
- authentication roles
- authorization decisions

The server must independently validate and calculate these values.

All privileged operations must enforce authentication and authorization on the server.

Client-side route protection is UX only and is never a security boundary.

Do not introduce secrets into:

- source files
- browser bundles
- NEXT_PUBLIC_* variables
- logs
- tests
- fixtures
- Git history

When encountering an exposed credential:
- do not repeat its value
- identify the credential type
- document that rotation/revocation is required

Use least privilege for credentials and service accounts.

---

# Commerce Integrity

Order creation and inventory changes are high-risk operations.

Required properties:

- server-authoritative pricing
- server-authoritative tax
- server-authoritative delivery fees
- server-authoritative final totals
- stock validation
- prevention of negative stock
- concurrency-safe stock updates
- atomic order/inventory behavior where practical
- idempotent checkout
- immutable order line snapshots

Do not change these systems casually.

Any modification to checkout, pricing, inventory, payment, tax, order creation, cancellation, or order numbering requires tests.

---

# Backward Compatibility

Preserve existing:

- MongoDB data
- product identifiers
- order identifiers
- customer/order history
- externally shared product URLs
- category URLs where practical
- admin workflows until replacements are verified
- integration contracts required by production systems

When replacing routes, use explicit redirects rather than breaking existing URLs.

Do not remove legacy fields immediately after introducing replacements.

---

# Migration Strategy

Prefer incremental migration over rewriting.

Typical sequence:

1. audit current behavior
2. document architecture
3. secure critical vulnerabilities
4. establish new application foundation
5. migrate storefront routes incrementally
6. harden backend and data access
7. rebuild checkout/inventory integrity
8. migrate admin
9. migrate integrations/media
10. optimize SEO and performance
11. run production verification
12. cut over carefully

Do not skip directly to UI redesign when security or commerce integrity issues remain unresolved.

---

# Architecture Direction

Target structure:

apps/
  web/
  api/

packages/
  contracts/
  ui/
  config/

scripts/
  migrations/
  backfill/
  media/

docs/
  migration/

The exact structure may evolve when justified by the audit.

Avoid premature microservices.

Use clear modules within the API before splitting services.

---

# Next.js Rules

The target frontend uses Next.js 16 App Router.

Use the latest stable security-patched Next.js 16.x release available at execution time.

Before implementing framework-specific behavior:

1. inspect the installed Next.js version
2. use documentation matching that version
3. do not rely on remembered behavior from older Next.js releases

For this workspace, run `npm run docs:next` from the root to print the installed
Next.js version and resolve `next/dist/docs` from `apps/web`. Read the relevant
bundled documentation before framework edits; it is matched to the installed
version and updates with the dependency. Use `rg --files` in that directory to
find the appropriate App Router guide/API reference. Do not assume `next` is
physically installed in `apps/web/node_modules` (npm may hoist it).

If bundled docs are unavailable, install from the committed lockfile first.
Any framework upgrade must recheck stable patched 16.x releases, React/Node
compatibility, migration notes and bundled docs, then update the lockfile and
`docs/migration/FOUNDATION_2026-10-02.md`. Verify the running Turbopack application
through `/_next/mcp` and browser checks; `.mcp.json` configures the pinned local
Next.js DevTools MCP. Never expose development diagnostics on production hosts.

The additive foundation uses npm workspaces (`apps/*`, `packages/*`), Node 24 LTS
from `.nvmrc`, and `npm run build:foundation`. The root `build`/`start` commands
remain legacy deployment contracts pending verification of production hosting.
Do not import legacy startup, inherit `backend/.env`, or connect a database during
install/build/tests. See the foundation document for configuration and isolation.

Use:

- App Router
- Server Components by default
- Client Components only when browser APIs, local interactive state, or event handlers are required
- `next/image`
- `next/font`
- Next.js Metadata APIs
- route `loading`, `error`, and `not-found` conventions
- server-side data access where appropriate

Avoid unnecessary global client providers.

Do not automatically add `"use client"` to resolve errors without understanding the component boundary.

Keep inventory-sensitive and user-specific data dynamic unless a deliberate caching design says otherwise.

---

# API Rules

The API should:

- validate every external request
- expose explicit query parameters rather than raw database filters
- enforce RBAC
- use consistent response/error structures
- avoid returning unnecessary PII
- paginate collection endpoints
- use database indexes matching query patterns
- use structured logging with PII/secrets redacted

Never directly pass user-provided MongoDB query objects into database operations.

---

# Database Rules

Before changing MongoDB models:

1. inspect existing production-compatible schemas
2. identify old documents that may not contain newer fields
3. design backward-compatible reads
4. create migration/backfill scripts when needed
5. verify indexes
6. document rollback implications

Do not assume every existing document matches the current Mongoose schema.

Money values should have an explicit and consistent representation.

Avoid floating-point calculations for critical monetary arithmetic where possible.

---

# Media Rules

The repository contains legacy and newer media mechanisms.

Do not delete legacy media until:

1. all references have been inventoried
2. migration has completed
3. migrated assets have been validated
4. production rendering has been verified

Prefer CDN/object-storage delivery rather than proxying every image through the application server.

---

# Code Quality

For new code:

- prefer TypeScript
- use explicit domain types
- avoid `any` unless justified
- keep business logic separate from controllers/components
- prefer small focused modules
- avoid duplicated business logic
- avoid unnecessary abstractions
- remove dead code when safe
- do not retain commented-out implementations after replacement is verified

Follow existing conventions while a module is still legacy unless that module is intentionally being migrated.

---

# Dependency Rules

Do not run an uncontrolled upgrade of every dependency.

For each major dependency change:

1. identify why it exists
2. determine whether it should be upgraded, replaced, or removed
3. inspect migration notes for breaking changes
4. update code
5. verify runtime behavior
6. run tests and build

Do not maintain multiple libraries that solve the same concern without a demonstrated requirement.

---

# Testing Expectations

Changes are not complete merely because they compile.

Depending on the affected area, run:

- typecheck
- lint
- unit tests
- integration tests
- production build
- runtime/browser verification

Changes to checkout, pricing, inventory, auth, RBAC, or orders require corresponding regression tests.

When tests do not exist, add focused tests around the behavior being changed.

---

# Verification

After changing Next.js application behavior, verify the running application rather than relying only on static inspection.

Check:

- terminal/server errors
- browser console errors
- network failures
- correct rendering
- responsive behavior
- direct route navigation
- reload behavior

Never claim something is fixed solely because code was modified.

---

# Agent Behavior

Before large changes:

1. inspect relevant code
2. inspect existing documentation
3. understand current behavior
4. identify affected interfaces
5. make the smallest coherent change

Do not refactor unrelated code during a focused task.

Do not introduce speculative infrastructure.

When encountering ambiguity that can be resolved from the repository, investigate instead of asking the user.

For high-risk assumptions that cannot be safely inferred, document the assumption prominently.

---

# Git Workflow

Work in focused branches/commits.

Prefer one logical migration concern per commit.

Before finishing a task:

- inspect `git diff`
- ensure no credentials were added
- ensure unrelated files were not modified
- run required checks
- summarize changes and remaining risks

Do not rewrite unrelated history.

---

# Documentation

For the replacement storefront, resume from
`apps/web/docs/design/implementation-progress.md`, then read
`implementation-phases.md` and `implementation-coverage.md` in the same directory.
Update the task/evidence/decision/next-action checkpoint after each work batch.
These tracking files preserve review scope; their creation is not final visual
approval and does not authorise deployment.

Migration discoveries should be preserved under:

`docs/migration/`

Important architectural decisions should be written down rather than remaining only in chat context.

Maintain `docs/migration/MIGRATION_STATUS.md` as the migration progresses.

Do not duplicate large documentation inside this AGENTS.md.

This file contains persistent guardrails only.

---

# Priorities

When priorities conflict, use this order:

1. production data integrity
2. security
3. order/inventory correctness
4. backward compatibility
5. reliability
6. maintainability
7. performance
8. SEO
9. UI polish

A prettier interface is never justification for weakening the first five priorities.
