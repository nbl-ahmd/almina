# P5-01 cart presentation and verification

Implemented on `codex/storefront-pharmacy-app-reference` from `66fced4` on 18 November 2026.

## Customer experience

- The cart uses the accepted storefront canvas, type and button roles. Exact catalogue images, identities, selected pack labels, unit prices and line subtotals stay together. The line-list heading states the number of distinct products and total units separately. Mixed-script product names are directionally isolated.
- Desktop uses compact item rows and a separate summary. Portrait phones place the same continuation link in a safe-area-aware bottom bar with the estimated subtotal. Short landscape keeps the action within the summary. The fixed height is measured from the rendered bar and reserved below the footer, with additional focus-scroll clearance.
- The cart amounts come from the existing server catalogue-price response. The summary labels the amount as an estimate and explains when delivery, VAT and the final total are confirmed. Disabled ordering keeps the existing information destination and pharmacy contact without suggesting checkout is enabled. A missing SKU stays removable and makes the estimate unavailable. A stock conflict keeps the requested quantity visible with an explicit availability message.
- A cart read error has its own retry state. Loading, empty and error copy stay within a bounded panel. Quantity controls remain guarded until the server refresh finishes. Last-item keyboard removal moves focus to the empty-state heading. Recommendations exclude current cart SKUs before rendering and retain the existing two-card limit and in-stock candidate source.
- The existing conditional delivery-progress and reminder services are preserved. The disabled checkout route still uses the read-only cart estimate. Enabled checkout, tax, stock, price, delivery, inventory and order rules use their existing implementations.

## Captures and browser evidence

| State | Evidence |
| --- | --- |
| Phone, loaded | [English](p5-01-cart/en-cart-390.png), [Arabic](p5-01-cart/ar-cart-390.png) |
| Desktop, loaded | [English](p5-01-cart/en-cart-1440.png), [Arabic](p5-01-cart/ar-cart-1440.png) |
| Phone, empty | [English](p5-01-cart/en-empty-390.png) |
| Bilingual browser measurements | [Chromium and WebKit](p5-01-cart/matrix.json) |

The running fixture preview has ordering disabled. The isolated browser suite also used a disposable checkout-enabled fixture and followed the cart action to the existing checkout form. Tests verified that a selected SKU stays linked to its exact option and server price, client-supplied price hints cannot change estimates, stock validation still applies, and cart state survives reload. They also verified recommendation exclusion, keyboard focus on resize and removal, and separate recovery for a catalogue outage.

The isolated production build, web typecheck, repository lint, and 44 unit checks passed. The cart and surrounding storefront suite covered Chromium and WebKit. The Chromium run included the staff product-family form. The WebKit cart scenarios initialize fixture storage before first navigation to avoid cancelling an in-flight request during test setup. Reload persistence is separately covered after the cart has rendered.

The live matrix covers 28 measurements from 320px to 1440px, including short landscape and tablet. No document overflow was observed. Each loaded cart had one checkout or ordering-information continuation. Measured action targets were at least 44px and use the accepted 10px control radius. The focused end-of-footer link cleared the fixed dock in both locale tests. The four browser/locale combinations passed a CSS 200% zoom reflow check. Both scoped axe scans reported zero violations in the tested populated states. The live fixture retains expected saved/sign-in and reminder-options 404 responses. Next development diagnostics reported zero compilation, configuration and session errors.

## Cleanup and next checkpoint

Removed the retired cart stylesheet, the duplicate breakpoint action and its shell positioning override, and the stateful recommendation wrapper. The disabled checkout estimate adopts the same component styles. Retained checkout, shared and admin styling remains scoped to its existing consumers. Checkout presentation follows in P5-02. Physical-device and assistive-technology checks remain open. No production data or provider access, order submission or deployment.
