# Shared main stock and delivery map refinement — 8 November 2026

## Decision and behaviour

The owner requires one stock source: `products.stock`. Branches select who fulfils
an order; they do not own stock allocations. Geographic coverage, configured
branch priority, then straight-line distance and a stable branch ID tie-break
choose the receiving branch. The existing server quote checks the entire cart
against main stock. The existing atomic checkout transaction decrements that
stock with order creation and its idempotency receipt. No new inventory system.

The branch Stock tab and allocation checklist are removed. Activation requires
routing, actual branch coordinates, an active zone and its 2dsphere index, with
no branch-stock index prerequisite. The branch workspace retains the optional
`stockedProducts` field as an empty array for API compatibility. The protected
legacy inventory read returns main quantities in the existing projection; writes
are rejected with 409 so older clients cannot keep allocating stock. Existing
allocation/audit collections and indexes are retained, without affecting new
routing or main-stock adjustments.

New orders carry `inventory.source: main`. Reassignment validates destination
coverage, eligibility and unchanged delivery fee, without checking already
reserved items against remaining stock or decrementing it again. Uncovered or
disabled destinations fail explicitly. Cancellation and payment expiry use the
existing exactly-once main-stock restoration rules.

## Existing orders and deployment

No backfill, stock correction, data deletion or new environment variable is
needed. Pre-release orders without the source marker still release their old
branch reservation on cancellation/refund/expiry. If reassigned, the old branch
reservation is released atomically once and `branchReservationReleased` prevents
later double restoration. The main reservation remains intact throughout.
Historical totals and original quoted delivery remain immutable; assignment
history and branch order alerts retain their existing workflow.

Deploy API and frontend together after review. Existing orders, real zones and
stock are not modified by this implementation. Rollback is a forward fix: do not
redeploy an older writer after main-only orders exist, because it expects branch
allocations and lacks the new restoration guard. Retain the source-marker guards
and allocation records until all old orders are terminal and refund windows have
closed. No destructive contraction is part of this release.

## Map workflow

The existing lazy-loaded Leaflet + Geoman editor stays mounted when entering a
full-screen native dialog. Desktop and mobile get Fit area, Escape/Done exit,
focus restoration, protected keyboard focus, background scroll locking and safe
area handling. Completed polygon drafts survive opening/closing. ResizeObserver
resizes the same map without resetting points or bounds. In overview, real saved
branches/zones determine fitted bounds; selecting a polygon opens its editor,
with the list retained for keyboard users. Drawing instructions explain corner
placement, completion, editing and replacement without implying autosave.

No Google account/billing change, paid API or new dependency was introduced.
OpenStreetMap attribution remains visible. Public OSM tiles are best effort,
subject to usage policy; this does not provide a production tile SLA.

## Verification

- 272 unit tests and 157 API tests passed.
- Full disposable-database integration suite: 207 tests passed before the last
  cross-branch race case was added; final focused delivery suite: 14 passed,
  including the cross-branch last-unit race and both legacy restoration paths.
- Eight branch/delivery browser cases passed; final two delivery cases passed
  again after text tool labels and map-to-editor selection were added.
- Real pointer polygon drawing in full-screen, Escape/Done focus restoration,
  retained geometry, map selection, save/activation and main-stock checkout were
  exercised. Screenshots inspected at 390px and 1280px; overflow assertions at
  360/390/768/1280px. Tile fixtures are visibly labelled synthetic; these checks
  establish map/editor behaviour, not real-world boundary accuracy.
- Typecheck, lint, isolated production build, diff whitespace checks passed.
- Next.js 16.4.2 Turbopack dev MCP reported no compilation/configuration/runtime
  errors. The dev browser rendered the full-screen editor successfully.

All database writes in verification used disposable loopback databases. No real
order, branch, zone, customer record, stock quantity or production flag changed.
