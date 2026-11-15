# Al Mina — Screen and Implementation Directions

Status: forward recommendations, 15 November 2026. These directions accompany
[DESIGN.md](../../DESIGN.md), whose primary accent is owner-confirmed. They are
not generated screens, a completed surface contract or owner-approved layouts.
The owner later explicitly authorized local implementation, now recorded in
DESIGN.md and the migration report. These directions remain the composition
intent; creating documents alone never authorizes production changes.

## 1. Read before making screens

Use [PRODUCT.md](../../PRODUCT.md) for verified functionality,
[DESIGN-BRIEF.md](../../DESIGN-BRIEF.md) for coverage, [references.md](references.md)
for source interpretation and [decisions.md](decisions.md) for status.
The rejected runtime and old screenshots are functional/anti-reference evidence,
not a starting template. Keep one new customer system; admin/wholesale are separate.

**Working direction:** search-led shopping, coral emphasis, clear white product
areas, compact category controls and readable bilingual retail typography.
Only the primary accent and recorded owner requirements are confirmed; proposed
support colours, font pair and geometry must remain changeable at screen review.

## 2. First comparable screen set — recommended

Use the same representative catalogue records and states on home, search/listing
and PDP. Show mobile around 390px and desktop around 1440px, check narrow 360px
and intermediate widths, and include Arabic core screens. Viewport numbers are
review frames, not final implementation breakpoints. Use working coded previews
in the later authorized phase, matching the owner's existing workflow preference.

### Home

- **Job:** find a known item quickly; discover a real department or current product.
- **Recommended opening:** a compact identity/delivery/cart row on mobile with a
  full-width search directly beneath; a unified search/address/account/cart
  composition on desktop. Category controls appear early, before campaigns take
  over the viewport. Final arrangement is tested, not inferred from a screenshot.
- **Discovery:** 03-like image-and-label category controls and an all-categories
  destination. Allow real long labels. Horizontal movement needs a visible cue
  and keyboard access; don't hide essentials behind a carousel gesture.
- **Campaign:** one purposeful advertising region using approved content/media,
  legible text and a real destination. Consider a main campaign and a smaller
  supporting destination on wide screens, collapsing cleanly on mobile. Avoid
  duplicate pack-shot spotlight templates and repeated aqua support cards.
- **Products:** show useful 01-like cards early. Use actual merchandising and
  supported offers only. Small catalogues must not become a long page repeating
  the same six products under invented themes.
- **Close:** compact real contact/service links and policy navigation. Do not
  repeat the same contact invitation as floating widget, banner and footer hero.
- **Proof needed:** search is unmistakable, category labels fit, product imagery
  is reachable early and the coral identity is apparent beyond the unchanged logo.

### Search / category / product listing

- Keep the entered query or category context clear. Relate heading/count,
  categories, filter/sort controls, active criteria and results as one task.
- Mobile uses readable two-column comparison where actual content allows it;
  desktop can expose filters beside a denser grid. Preserve GET/query/back/reload
  semantics; the layout must not force a new filtering model.
- Put photo, stock, brand/pack, name, price and add/options in a stable order.
  Actual option families must not be quick-added as an arbitrary variant.
- Demonstrate zero results, filter reversal/reset, loading, failed suggestions,
  unavailable stock, missing photos and long mixed-script names. Distinguish
  suggestion failure from the ability to submit a normal catalogue search.
- Avoid treating coral badges as popularity/review evidence or adding pseudo-data
  to make a candidate look complete.

### Product detail

- Follow reference 02: actual gallery first on mobile, followed by identity,
  brand/pack, current price, availability, options, quantity and add action.
- Desktop pairs media with a deliberate information/buying column, rather than
  enlarging a mobile card. Keep complete product labels and meaningful media scale.
- Follow the earlier reference-03 request for persistent mobile purchase access.
  Test the dock with navigation, keyboard, safe area, validation and long labels.
  Do not create duplicate, conflicting purchase controls.
- Use a compact reading structure for available facts. No large empty outlined
  specification box; no invented benefits, ingredients, reviews or medical copy.
- Demonstrate single/multiple/missing images, option/price changes, unavailable
  combinations and server feedback. Related products must be real catalogue
  relationships, not a clinical recommendation engine.

## 3. Remaining coverage and states

- **Cart:** empty/populated, quantity limits, removals, persisted cart, server price
  and stock changes. Keep the next step distinct from recommendations/promotions.
- **Checkout:** preserve guest access, details/review, manual address and optional
  GPS, field errors, quote changes, pending/uncertain response and idempotent retry.
  Present only currently available methods from existing gates; show service-off
  and failure states. Success requires a server-confirmed outcome.
- **Account/saved:** guest/signed-in/loading/expired/unavailable states; existing
  orders, reorder checks, address book, preferences and configured programmes.
  No new account, reward or marketing terms are invented by the design.
- **Content/routes:** all existing directories, offers, growth landings, guides,
  policies/contact and error states share the customer system. Preserve canonical,
  indexing and redirect behaviours. No full route prefix migration for Arabic.
- **RTL:** mirror directional layout, not pack imagery/logo. Keep script shaping,
  product-name accuracy, numerals and price/quantity ordering usable. Native Arabic
  review is needed; glyph availability alone is insufficient.

## 4. Approval and later implementation sequence

1. Review these forward directions and DESIGN.md's candidate system on the same
   core screens; record actual owner feedback. Do not call the current old preview
   a demonstration of the new identity.
2. Resolve colour/type/spacing/geometry candidates on screens and record approval
   in decisions.md. A file write, opened preview or unanswered concept board is
   not screen approval. Do not ask again for already confirmed coral/search rules.
3. In an authorized build, establish one scoped customer token source. Migrate the
   shell and core components, then listing/PDP, commerce presentation and remaining
   customer routes. Keep functional logic and shared/admin contracts stable.
4. Trace old globals, aliases, CSS, fonts, authored media and shared preview users
   before removing anything. Do not pile new CSS overrides over the rejected
   world or introduce a second palette under renamed old tokens.
5. Verify the running app in English/Arabic and mobile/tablet/desktop, including
   direct URLs/reload, keyboard/zoom, errors, network/console and existing commerce
   and admin regressions. Use only disposable local data; never production writes.
6. Obtain the relevant independent finish review, then document actual implemented
   tokens/components in DESIGN.md and its generated sidecar. Preserve the distinction
   between specification, implementation evidence and production release acceptance.

No runtime token file, font download, component preview sidecar, raster generator,
backend change or deployment is part of this documentation task.
