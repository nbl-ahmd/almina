# Storefront navigation refinement — 21 October 2026

## Delivered

Desktop category mega menu uses existing Radix Popover and customized Button primitives. It exposes up to twelve real, enabled categories, an all-categories route, care collections, brands, offers and pharmacy support. The tablet menu has two browsing columns; the desktop adds a mint help panel. Mobile uses a Radix Dialog drawer with scrolling content, persistent account/language footer, focus containment, Escape dismissal and focus restoration. Crossing the mobile breakpoint closes open navigation. Existing bottom navigation remains intact.

The server header reuses the cached category loader, passes only names/URLs to the client and falls back to existing browse routes when category loading fails. No new API, package or image was added. Category and product identifiers/URLs are preserved.

Search now opens useful collection suggestions before typing or recent searches stored on the device. Live category/product suggestions use the existing endpoint with a 220ms debounce, cancellation and a two-character threshold. Loading, no-result and failure feedback retain a full search-results link. Arrow keys move through suggestions and keep the active option in view; Enter navigates, Escape dismisses, and outside interaction/focus closes the dropdown. Search remains a native GET form. Search failure does not disable ordinary submission.

## Visual and interaction review

| Before | After | Why |
|---|---|---|
| Flat desktop links | Category mega menu and shorter primary link row | Expose catalogue breadth without wrapping the navigation |
| Mobile browsing depended on bottom navigation | Compact menu trigger and a focused drawer | Group departments, collections and help in one reachable place |
| Location control crowded the logo | Bounded, full-width-in-cell location control and 96px mobile logo | Preserve separation at 360px |
| Native and custom search-clear controls both appeared | One clear action; composite field owns focus styling | Reduce duplicated controls and nested field borders |
| Escape could clear the native search then reopen suggestions | Escape prevents that browser default and dismisses the dropdown | Predictable keyboard behavior |
| First desktop primitive exposed a hidden focus proxy | Radix Popover provides the final disclosure/focus implementation | Resolve the open-state accessibility finding |
| Tablet help column wrapped into a tall narrow block | Two-column tablet browsing, third help column at large widths | Better proportion and scanning |
| Hero companion inherited low-contrast coral text | Explicit ink text | Pass text contrast with photo-ready inventory |

English and Arabic/RTL navigation are supported. Menus use neutral surfaces and controls, with restrained 160ms motion disabled for reduced-motion preferences. No checkout, account authorization, pricing, stock or production data behavior changed.

## Verification

Final verification: isolated production build, repository typecheck and lint pass. All 16 navigation/search/Arabic browser cases pass, including axe checks with navigation open at 360/390/768/1280px. Captures are in outputs/navigation-2026-10-21/menu-{360,390,768,1280}.png and search-{360,390,768,1280}.png. Tests exercise menu opening/dismissal/focus restoration, active routes, suggestion keyboard selection, empty states, normal search submission, Arabic drawer navigation, viewport overflow and axe checks with menus open and closed. These establish the tested states, not a universal accessibility certification.

No commit, deployment or production mutation performed.
