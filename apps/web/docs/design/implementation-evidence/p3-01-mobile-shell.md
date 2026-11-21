# P3-01 mobile storefront shell

18 November 2026. Implemented on `codex/storefront-pharmacy-app-reference` from `af358e2`. The mobile header on the public storefront routes now puts logo, delivery area, menu and cart in one row and uses the full next row for search. The accepted tokens are scoped to the header. The five existing labelled navigation destinations remain available in browse mode.

Focusing search expands an in-flow panel with room for suggestions and a labelled Cancel action. The same field keeps its draft and native GET form. Cancel focuses the form to let the software keyboard dismiss, Escape returns focus to the field, and browser Back closes the panel through the existing history. The panel scrolls locally on short viewports. Suggestions, recent search, manual delivery entry, optional GPS and the device cart still use their existing implementations.

Cart hides the browse navigation, gives shoppers a route back to products, and anchors its existing continuation to the safe-area edge. Checkout uses its existing in-page back and continuation controls. The public PDP keeps its existing contextual toolbar and purchase dock until P4-03. The image-first PDP in the direction proof remains the reference for that stage. Desktop layout work is P3-02 and home merchandising is P3-03.

`storefront-mobile-shell.css` owns migrated mobile geometry and consumes the accepted `--store-*` roles. The shared menu and delivery dialog retain existing component styles and semantics. The root missing-page fallback, wholesale and admin stay outside the opt-in. Incumbent page, cart and checkout styling remains in use as consumers migrate.

- The isolated Next 16.4.2 production build, workspace typecheck, repository lint and 17 focused unit checks passed. The fresh worktree exposed an implicit type in the existing P2-05 authority test. An explicit type restored the workspace check. Live Next diagnostics and the browser reported no errors.
- Eighteen Chromium checks passed on the compiled local storefront. Coverage includes EN/AR search fallback, Escape/Cancel/Tab/Enter and Back, delivery-area save and reload, cart counts, populated cart/checkout task bars, responsive layout, menu focus, navigation accessibility scans, checkout quote/review, admin and scope preservation.
- Six public-route captures cover EN/AR browse, search and location states on the local fixture. At 320px the header and document remained within the viewport when header text sizes were doubled. This emulates enlarged text and short viewports. Native keyboard, device safe-area and screen-reader verification remain open.
- The local preview uses fixture data. The existing proof session and the admin worktree remain available. No production access, order submission or deployment.

[Capture directory](p3-01-mobile-shell/) · [Local storefront preview](http://127.0.0.1:4880/)
