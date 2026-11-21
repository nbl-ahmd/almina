# Color system

Use `color.<name>` consistently in Figma and the future implementation. These are documentation tokens for the approved light storefront. Component states use semantic roles so branding, purchasing and status feedback remain distinguishable.

## Palette

| Token | sRGB | Role |
|---|---|---|
| color.canvas | #FFFFFF | Page canvas, white labels and inverse focus |
| color.text | #1A241D | Product names, body text and prices |
| color.muted | #59655D | Secondary information and disabled labels |
| color.surface | #F6F7F6 | Secondary media wells, grouped choices and disabled fill |
| color.divider | #DCE3DC | Nonessential separators |
| color.control | #788279 | Essential input and choice boundaries |
| color.brand | #FF6465 | Branding and promotional accents |
| color.action | #D63D44 | Primary purchase actions with canvas labels |
| color.hover | #C93640 | Primary action hover |
| color.pressed | #A62832 | Primary action pressed |
| color.tint | #FFF0EE | Subtle selected and secondary hover fill |
| color.forest | #173C25 | Supporting brand ink, secondary actions and selection marks |
| color.lime | #C5F28A | Optional primary merchandising campaign fill |
| color.focus | #173C25 | Keyboard focus on light surfaces |
| color.success | #236245 | Confirmed completion on canvas with readable status |
| color.warning | #79500F | Attention needed on canvas with an explanation |
| color.error | #952436 | Validation and failure on canvas with a recovery action |

## Measured contrast

Computed with WCAG relative luminance from opaque sRGB. Ratios are rounded to two decimals after calculation. Normal text needs 4.5:1. Essential boundaries and state indicators need 3:1. Decorative separators can use divider. Validate composited colors again during implementation, particularly over images or when opacity is applied.

| Foreground | Background | Contrast |
|---|---|---|
| color.canvas | color.action | 4.56:1 |
| color.canvas | color.hover | 5.14:1 |
| color.canvas | color.pressed | 7.07:1 |
| color.canvas | color.brand | 2.89:1 — fails for white text |
| color.text | color.canvas | 15.98:1 |
| color.text | color.surface | 14.88:1 |
| color.text | color.tint | 14.42:1 |
| color.text | color.brand | 5.53:1 |
| color.muted | color.canvas | 6.10:1 |
| color.muted | color.surface | 5.68:1 |
| color.forest | color.canvas | 12.28:1 |
| color.forest | color.lime | 9.62:1 |
| color.forest | color.tint | 11.09:1 |
| color.control | color.canvas | 3.99:1 |
| color.control | color.surface | 3.71:1 |
| color.focus | color.canvas | 12.28:1 |
| color.focus | color.surface | 11.44:1 |
| color.focus | color.tint | 11.09:1 |
| color.focus | color.lime | 9.62:1 |
| color.canvas | color.forest | 12.28:1 |
| color.success | color.canvas | 7.23:1 |
| color.warning | color.canvas | 7.08:1 |
| color.error | color.canvas | 8.13:1 |

## Role and state recipes

| Element | Default | Hover / pressed | Selected / unavailable |
|---|---|---|---|
| Primary purchase | action fill and canvas text | hover then pressed, canvas text retained | Busy preserves geometry. Disabled uses muted on surface and suppresses activation. |
| Secondary control | forest on canvas, control boundary | tint fill, then forest inset outline | Selection adds a visible check and selected semantics. |
| Inline link | forest with underline in prose | Thicker underline | Current navigation also has a filled icon or marker and current-page semantics. |
| Field | text on canvas, control boundary | Forest boundary | Invalid uses error boundary and associated readable message. |
| Checkbox/radio | control outline | Forest outline | Forest fill with canvas check/dot. |
| Variant/filter chip | forest on canvas, control boundary | tint fill | Tint with forest check and outline. Keep focus independent. |
| Offer badge | text on brand | Read-only | Use actual verified discount data. |
| Navigation | muted on canvas | Forest label on tint | Forest filled icon, label and current marker. |

Use action for primary purchase controls. Its 4.56:1 white-label contrast has a small margin, so retain full opacity and the specified fill. Brand coral supports accents and dark text. White on brand coral measures 2.89:1 and fails both normal and large white-text thresholds. Forest remains a supporting brand/action role. Success, warning and error use their named foregrounds on canvas with text and icons. Labels explain the state independently of color.

Keyboard focus is a 2px focus outline separated by a 2px canvas gap. On forest surfaces use a canvas outline with forest separation. Keep focus visible at scroll edges and in selected, invalid and busy states. Disabled controls may be exempt from contrast criteria, but this system keeps their labels readable through muted on surface.

Canvas and neutral surfaces dominate the page. Lime primarily serves one optional homepage or merchandising campaign with forest copy. Additional promotions use quieter treatments. Product detail, cart, checkout and account pages have no lime requirement. Place coral purchase controls on canvas. Color roles are fixed, while content and page purpose determine whether a campaign is present.

## Surface consistency

The approved light palette governs all storefront surfaces, including portal menus, sheets, browser selection and caret. Use text on lime for body copy only after validating its pairing; the established campaign recipe uses forest on lime. Keep a semantic foreground on the actual solid surface underneath text. A hovered or pressed control retains its full label contrast, focus ring and state semantics. Any alternate theme needs a separate approved token mapping and measured states.
