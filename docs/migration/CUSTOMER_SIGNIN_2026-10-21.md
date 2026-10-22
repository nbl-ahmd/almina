# Customer sign-in surface — 21 October 2026

## Reported defect

The production `/account` sign-in card rendered the Google Identity Services (GIS) button as an unstyled block: the "G" logo filled the card width, the accessible label text was visible next to the button label ("Continue with GoogleContinue with Google. Opens in new tab"), and the control did not match the rest of the design system.

## Cause

GIS does not ship a button stylesheet from `https://accounts.google.com/gsi/style`; that file only contains One Tap picker rules. The button styling is injected at runtime as an inline `<style>` element that copies the page's CSP nonce. When that injection is rejected — a stale nonce from a cached HTML document, an extension/browser that blocks the injection, or any other CSP mismatch — the markup still renders, so the unwrapped `<svg>` grows to the container width, `.L6cTce` (Google's visually-hidden duplicate label) becomes visible, and Google's `height`/`padding`/`border` rules are missing entirely.

Nothing in the application depended on Google's stylesheet for the control to work: `accounts.id.renderButton` renders the same markup and click behaviour either way. Only the appearance was delegated to a stylesheet that can legitimately fail.

## Change

`apps/web/src/components/customer-sign-in.tsx`

- The GIS host is a `relative` frame that renders a same-size loading state, so the card no longer jumps when the provider script arrives and a slow provider never leaves a blank gap.
- The provider's inline pixel width is replaced with `100%` after render (and while polling for a deferred render), so the control fills the card at every viewport instead of using a width measured once.
- Google availability is reported to the parent (`onUnavailable`). One message is shown per unavailable provider: a Google failure no longer stacks with the "email is unavailable" note that tells the customer to use Google.
- The failure note and the email-unavailable note share the same bordered, low-contrast treatment.

`apps/web/src/app/globals.css`

- A `.google-signin` frame owns the button's geometry: full width, 48px, 12px radius, project border/surface colours, 18px logo, hidden duplicate label, and hover/active/focus states from the design tokens.
- These rules are deliberately **unlayered**. Google injects unlayered styles at runtime; Tailwind's `@layer` declarations lose to unlayered CSS regardless of specificity, which is exactly how a styled application produced an unstyled provider button. The `div[role="button"]` selector is one element more specific than Google's two-class shape rules so the frame wins either way.
- Google's own hover tint (`.MJoBVe`) is suppressed because the frame provides the same states; its markup is otherwise untouched.

`tests/signin-surface.test.ts` guards the layering contract, the 18px logo, the hidden duplicate label and the single-message rule.

## Verification

- Playwright against a running app with the real GIS markup capture, in three states: provider stylesheet applied, provider stylesheet blocked, provider script blocked. Button measured 48px high with a 12px radius, an 18px logo and no horizontal overflow at 360/390/768/1280px in every state.
- `tests/e2e/customer-account.spec.ts` (9 tests) — Google callback, provider failure, email flow, keyboard focus and responsive widths.
- `npm run lint`, `npm run typecheck --workspace @almina/web`, `npm run test:unit` (176 tests).

## Residual risk

The frame targets Google's current internal markup (`div[role="button"]`, `.L6cTce`, `.MJoBVe`). A provider markup revision degrades the frame cosmetically — the button keeps working, the logo stays constrained and the duplicate label still cannot appear — but a follow-up visual check is required whenever GIS changes its DOM. Marketing sites that restyle provider buttons accept the same trade-off; the alternative is an appearance that fails whenever Google's injected stylesheet is rejected.
