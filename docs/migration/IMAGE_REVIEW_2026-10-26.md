# Temporary pharmacist image review

The administration console has an additive `/admin/image-review` module. It consumes saved pipeline extraction and proposed associations, retains pharmacist decisions in MongoDB, exports current approvals, and lets an administrator publish all approved associations across every queue page in one click. Preview remains optional. It does not run a model or require an AI API key. No production service was changed during implementation.

## Workflow

1. The standalone pipeline reads Cloudinary originals and saves extraction, candidates and review history under its existing agent workflow and allowances.
2. Prepare a portable review package using the commands below. The exporter reads the four worker databases read-only, checks the immutable catalogue checksum, rejects stale report events, verifies original file hashes and extraction-cache ownership, and includes both withdrawal barriers. Only identity, extraction and image references are exported; prices, stock, credentials and local paths are excluded.
3. An administrator loads `image-review-package.json` under **Catalogue → Image review → Load saved pipeline maps**. Incoming agent approvals become pending pharmacist reviews. Loading is bounded, paced to retain existing request limits, idempotent and resumable; completed decisions are preserved. The server checkpoint and chunk receipts are keyed by the package hash, so reopening the same file resumes across browsers and sessions. Rate-limited chunks use the returned wait time with at most two retries. New extraction/matching/review references create separate source versions while earlier evidence remains retained; matcher changes require no fresh image inference.
4. Signed-in staff assigned to pharmacist review inspect each individual original, choose a proposed product or search the live catalogue, and confirm relevant identity attributes. **Confirm matching attributes** requires the loaded original and an inspection attestation. Missing required evidence blocks approval. OCR can be corrected with an explanation while the original extraction remains immutable; known catalogue values must be corrected through the product editor. Extra attributes missed by extraction can be added. Shared identifiers require independent variant confirmation. Flagged, unreadable, promotional or composite sources and withdrawn associations remain blocked. Reviewers can choose none and save on hold.
5. **Approve association**, **Save on hold**, and **Reject association** save server decisions, reviewer IDs, notes, field evidence and the identity/media revision, including MongoDB and business product identifiers. Each item shows its recent review history. Nothing is added to products yet. The next item opens automatically after saving in pending/held queues; its inspection and confirmations reset.
6. **Export approvals** downloads current eligible associations. Changed products and withdrawals are omitted and returned as stale IDs. Queues and decisions survive browser/session changes.
7. An administrator clicks **Publish all approved images** once. The API records a durable publication run, prepares eligible approvals in cursor pages of 100 and automatically publishes one product gallery at a time, with up to eight associations per transaction. There is no total-run image limit. The server automatically creates the immutable preflight manifest and applies the verified associations; no export download, separate preview confirmation or re-upload is required. **Publish selected** and **Preview selected** remain optional. Publication rechecks approvals, withdrawals, identity and media, and downloads existing versioned Cloudinary originals only to verify SHA-256. A transaction appends existing URLs, retains galleries, records `media_history`, increments `mediaRevision`, marks items imported and writes an idempotent receipt. A saved publication request binds retries to the same manifest, including after a lost response. Product publication status, pricing, stock, VAT, identity and legacy media are preserved: publishing images does not publish hidden products. Multiple images for a product share one gallery revision. The eight-association request bound and eight-Cloudinary-image gallery contract remain enforced. All photos for a product stay together, preventing the first batch from making another batch of that product stale. A product with more than eight approvals is returned to Held without blocking valid products; existing gallery capacity is also rechecked by the server.

Existing staff/admin roles apply. Administrators control loading and imports; staff accounts assigned to pharmacist review can review and export. The module does not certify qualifications or grant product-edit privileges. The API checks account status; account disablement revokes access through the existing session system.

## Bulk progress and interruptions

Publication now runs on the persistent API service. Close the page or change browser freely; the administrator sees the latest saved progress on return. No model, AI API key, additional hosting service or Cloudinary write access is required. The browser polls only progress; a failed progress request never starts another run.

A shared control document serializes concurrent starts. Every start request has an immutable receipt, so a lost response cannot create a second run. Preparation freezes a review-time cutoff and maximum item ID, then records each captured approval and its product group in bounded transactions. Later approvals wait for the next run; items withdrawn or re-reviewed during preparation can be omitted. There is no total-run image cap. Every photo for one product stays in one gallery transaction. Groups retain at most nine approval IDs for capacity checking; individual captured entries are separate documents, including for oversized groups.

A database lease ensures one worker step owns the run. API restart recovers unfinished work; a terminated worker's lease expires after ten minutes. The immutable manifest is saved before import, so a crash after a successful import safely replays the same receipt before acknowledging progress. Published products are not re-uploaded or written twice. Audit counters and group completion are committed together. **Pause publication** prevents further imports; an import already in progress may finish. **Resume publication** retries the same work and can be performed by another active administrator. Administrator privileges are checked again before imports; revocation pauses the run. Pause/resume actions retain the acting administrator in an audit collection.

Changed identities, withdrawals, invalid hashes, missing/deleted products, ambiguous identities, or full/oversized galleries return only the captured, still-current approvals to Held. The hold appends history and preserves original evidence, newer pharmacist decisions and completed imports. Holds are processed 25 captured entries at a time, so oversized groups do not create oversized transactions. The worker then continues with valid products. The progress panel lists up to 20 affected products; Held contains all remaining associations. Provider or unexpected service failures pause instead of discarding approvals; correct the service and click Resume. Disabling the module stops new worker steps; in-flight work may finish. Graceful shutdown waits for the current step.

The former browser queue is superseded. Remaining server approvals are discovered by the new job; completed receipt-backed imports remain completed. Local browser queue data grants no authority and is no longer read.

## Prepare the package

```sh
cd /Users/administrator/Nabeel/dev/almina-image-pipeline
node scripts/approval-review-export.mjs
cd /Users/administrator/Nabeel/dev/almina
npm run media:review:package -- --pipeline /Users/administrator/Nabeel/dev/almina-image-pipeline
```

The current package pointer is `outputs/image-review-module-2026-10-26/LATEST.json`. The prepared package contains **1,951 images and two withdrawal barriers**. Identical evidence produces identical package bytes/hash. Historical applied exports are untouched. The other 49 assignment slots from the two splits are not counted as extracted/reviewed images here. Product identity is fetched live during review and rechecked at import; the snapshot cannot authorize overwriting it.

## Enable or disable

Deploy the normal API/domain build and Next.js admin changes, then set **`IMAGE_REVIEW_ENABLED=true` on the retained API service**. The configured `CLOUDINARY_CLOUD_NAME` must match the source account; upload credentials are not required. The server reuses its existing Cloudinary/recovery cloud-name configuration. The module defaults to disabled and shows its disabled state without exposing queue data. Do not expose the local pipeline server or give reviewers database/provider credentials.

The additive index plan includes review queue/history, worker leases, product-group status and captured-entry cursors. The standard retained API startup starts/stops the worker only when the module is enabled. Review/apply the normal index migration before enabling at scale. Authentication, CSRF, exact route allowlists, strict schemas, response projection, request/body limits and no-store admin responses remain enforced.

New collections: `image_review_items`, `image_review_events`, `image_review_withdrawals`, `image_review_manifests`, `image_review_imports`, `image_review_uploads`, `image_review_upload_chunks`, `image_review_publish_requests`, `image_review_publications`, `image_review_publication_control`, `image_review_publication_requests`, `image_review_publication_groups`, `image_review_publication_entries`, `image_review_publication_actions`. Events, chunks, publication requests and manifests are inserted once; replay cannot overwrite old evidence. Existing `media_history` retains pre-import assets for a reviewed rollback. Automatic rollback is not exposed because later edits must be preserved. A completed import always replays as a no-op, including after a later manual media correction.

Set `IMAGE_REVIEW_ENABLED=false` to disable the module while retaining evidence and applied links. Removing it later must preserve audit/history and galleries. The standalone pipeline has no automatic production connection.

## Disposable preview

```sh
npm run dev:image-review
```

Open `http://127.0.0.1:4790/admin/image-review`. Synthetic users: `review-admin` or `review-pharmacist`; password: `synthetic-test-password`. The preview creates its own loopback MongoDB replica set and isolated Next.js output. It reads no production database URL or dotenv credentials. It has a sample original and two isolated product records; imports affect only this disposable database. Preview data disappears at shutdown. The full package is a separate file for the deployed authenticated queue.

## Verification commands

```sh
npm run build:commerce
node --import tsx --test tests/image-review.test.ts tests/admin-migration.test.ts tests/gateway-policy.test.ts
node scripts/tooling/test-commerce-integration.mjs tests/image-review-integration.test.ts tests/media-integration.test.ts tests/staff-administration-integration.test.ts
npm run typecheck
npm run lint
```

Integration tests use a disposable loopback replica set and synthetic identities. They cover independent decisions/imports, source/product changes, withdrawals, missing evidence, OCR correction, duplicate identifiers, atomic gallery append, concurrent/replayed imports, unchanged commercial/publication fields, access, CSRF and disablement. Runtime/browser results are recorded in the task outputs and migration status after verification.

## Verification completed 2026-10-26

- Unit suite: 212 passed, including bulk planning/resume coverage for 37 images and seven photos of one product.
- Disposable MongoDB integrations: 11 passed across review, media and staff authorization. Seven same-product approvals publish atomically; replay/concurrent requests do not duplicate imports.
- Commerce build/integrity check, workspace typechecks, lint and isolated Next.js production build passed.
- Browser: inspect/approve → Publish all → Imported verified against disposable data. Next.js compilation/runtime diagnostics clean; review accessibility scan zero violations; no document overflow at 360/390/768/1440 pixels.
- No production import, Cloudinary mutation or deployment was performed.

## Background publication verification

The follow-up replaces browser-only execution with the retained API worker. All 212 unit tests and 16 disposable integration tests pass. Coverage includes 109 captured approvals across multiple preparation pages, seven photos published in one gallery transaction, 102 invalid approvals returned to Held without blocking the valid product, simultaneous starts, lease exclusion and recovery, receipt replay after lost acknowledgement, provider pause/resume, revoked-admin takeover, newer pharmacist decisions, disabled workers and draining an in-flight read. Workspace typechecks, lint, commerce build/integrity and the isolated Next.js production build pass.

Resume a real configured run by opening **Catalogue → Image review** as an administrator. Active work resumes automatically on the API; paused runs offer **Resume publication** after the current worker releases its lease. No browser file, new AI key or repeat package import is required. Real deployment and enablement remain separate; no production mutation has been performed.

Browser follow-up: started publication and closed the browser before the result was shown. Reopening displayed **Complete: 1 published, 0 returned for review** and **Imported 1**. Progress survives independently of browser storage. Next.js compilation/runtime diagnostics are clean; the review accessibility scan reports zero violations, and no document overflow occurs at 360/390/768/1440 pixels. This used disposable catalogue records only.
