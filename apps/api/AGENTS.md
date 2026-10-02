# Al Mina API — Agent Instructions

These instructions supplement the repository root `AGENTS.md`.

This service handles production-sensitive commerce and administrative behavior.

# Security Boundary

The API is the security boundary.

Never rely on the frontend for:

- authentication
- authorization
- role enforcement
- price correctness
- inventory correctness
- tax correctness
- delivery fee correctness

All privileged actions must be independently authorized here.

---

# Validation

Every external request must be validated before domain logic executes.

Validate:

- params
- query values
- request body
- uploaded files
- webhook payloads where applicable

Reject unknown or unsafe structures where practical.

Never accept arbitrary MongoDB filters/operators from callers.

---

# Authentication and RBAC

Authorization must be server-side.

Roles and permissions must come from trusted server-side identity/session information.

Never accept a caller-provided role as authorization.

Administrative operations require explicit permissions.

Public APIs and administrative APIs should have clearly different access policies.

---

# Order Creation

Order creation is a critical transaction.

The server must calculate:

- unit price
- discount
- sale price
- VAT/tax
- delivery fee
- subtotal
- final amount

Client calculations may be displayed for UX but are never authoritative.

Order line items must snapshot the commercial data required to correctly display historical orders.

---

# Inventory

Never decrement inventory without validating available stock.

Prevent negative stock.

Concurrent checkout must be handled safely.

Prefer atomic/transactional behavior for:

- inventory validation
- stock decrement
- order creation

Checkout requests must support idempotency to prevent duplicate orders caused by retries or repeated clicks.

Tests are required for concurrency-sensitive inventory changes.

---

# Database

Avoid:

- unbounded `find()`
- deep `skip()` pagination for growing datasets
- unindexed frequent queries
- regex queries over large collections without a deliberate search strategy

Use projections where only limited fields are required.

Create indexes based on demonstrated query patterns.

Schema changes must remain compatible with existing production documents until migration is complete.

---

# Money

Use one consistent money representation.

Avoid floating-point arithmetic for authoritative monetary operations where possible.

Never mix strings and numeric money representations without explicit conversion and validation.

---

# Orders

Prefer explicit order states over unrelated booleans.

Order history must remain historically correct even if product data later changes.

Do not populate live product values as the sole source of historical order pricing/name data.

---

# Integrations

External systems such as:

- WhatsApp
- email
- push notifications
- media providers

must be isolated from core order persistence where possible.

A temporary external-provider failure should not corrupt an otherwise valid order transaction.

Prefer asynchronous jobs for non-critical side effects when infrastructure supports them.

---

# Webhooks

Webhook endpoints must implement the authentication/signature/verification mechanism provided by the upstream provider.

Do not treat the existence of a webhook URL as authentication.

Do not log complete production webhook payloads containing sensitive user data unless appropriately redacted.

---

# Uploads

Uploads require:

- authentication when administrative
- file-size limits
- expected MIME validation
- file-signature/content validation where practical
- image dimension/pixel limits
- safe filenames
- controlled storage destination

Avoid unrestricted in-memory uploads.

Prefer direct/signed object-storage uploads for large media workflows.

---

# Logging

Use structured logs.

Do not log:

- passwords
- authentication tokens
- cookies
- secret keys
- full credentials
- unnecessary customer PII

Use request/correlation IDs.

Expected application errors should not produce uncontrolled stack traces in user responses.

---

# API Compatibility

When replacing legacy APIs:

1. document old contract
2. introduce replacement
3. migrate callers
4. verify production behavior
5. remove old route only after no longer required

Do not silently break existing frontend/admin/integration callers.

---

# Testing

Any changes involving:

- auth
- RBAC
- product mutation
- pricing
- inventory
- checkout
- orders
- webhook verification

must include focused automated tests.

Security-sensitive endpoints should include negative tests proving unauthorized callers are rejected.