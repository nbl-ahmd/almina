# Storefront token and primitive review

The phone references keep product identity, price and quick add together. On the 390px homepage the floating WhatsApp action could cover the second product name. The existing overlap check now includes names, pack details and the purchase row.

The shared type scale previously used fixed pixel sizes. Its rem values now preserve the default catalogue density and respect the reader’s browser text size. English uses Plus Jakarta Sans. Arabic uses IBM Plex Sans Arabic with more line height in control labels.

Filter-specific CSS lowered phone controls to 44px. Inputs and selects now inherit the primitive’s 48px minimum on small or touch screens. The retail field outline now has 3.14:1 contrast against the subtle fill, up from 1.85:1. The primary blue, stock green and coral sale roles retain their distinct meanings.

Buttons rendered as links previously missed hover feedback because anchors cannot match the enabled form-control selector. Actions now share feedback across both element types, with reduced-motion support. The automated design detector reported no findings in the shared primitives. Browser inspection exposed the issues above.
