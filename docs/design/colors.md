# Color

Use the following names under the color namespace. Canvas also supplies the on-action and inverse focus colors. Focus and forest share a value so that keyboard cues work against white, lime and coral-tinted surfaces.

| Token | sRGB | Intended use |
|---|---|---|
| canvas | #FFFFFF | Page, cards and white button labels |
| text | #1A241D | Names, prices and body copy |
| muted | #59655D | Pack sizes, hints and disabled labels |
| surface | #F6F7F6 | Secondary and disabled fill |
| divider | #DCE3DC | Decorative separators |
| control | #788279 | Input and checkbox boundaries |
| brand | #FF6465 | Logo-related accents, promotional highlights |
| action | #D63D44 | Primary purchase button |
| hover | #C93640 | Pointer hover on primary |
| pressed | #A62832 | Pressed primary |
| tint | #FFF0EE | Selected filter or variant fill |
| forest | #173C25 | Campaign text, secondary actions |
| lime | #C5F28A | Campaign background |
| focus | #173C25 | Keyboard outline |
| success | #236245 | Confirmed completion with check icon |
| warning | #79500F | Review needed with warning icon |
| error | #952436 | Validation and failure with text explanation |

## Contrast checks

WCAG relative luminance, opaque sRGB. Normal text needs 4.5:1. Essential outlines and state indicators need 3:1. Ratios below are calculated before rounding. [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

| Foreground | Background | Ratio |
|---|---|---:|
| canvas | action | 4.56:1 |
| canvas | hover | 5.14:1 |
| canvas | pressed | 7.07:1 |
| canvas | forest | 12.28:1 |
| canvas | brand | 2.89:1 · fails for white text |
| text | canvas | 15.98:1 |
| text | surface | 14.88:1 |
| text | tint | 14.42:1 |
| text | brand | 5.53:1 |
| muted | canvas | 6.10:1 |
| muted | surface | 5.68:1 |
| forest | lime | 9.62:1 |
| forest | canvas | 12.28:1 |
| forest | tint | 11.09:1 |
| control | canvas | 3.99:1 |
| control | surface | 3.71:1 |
| focus | canvas | 12.28:1 |
| focus | surface | 11.44:1 |
| focus | tint | 11.09:1 |
| focus | lime | 9.62:1 |
| success | canvas | 7.23:1 |
| warning | canvas | 7.08:1 |
| error | canvas | 8.13:1 |

## State recipes

Primary uses action → hover → pressed with canvas lettering. Brand coral may carry text ink. Keep the lime campaign in a single block and place purchase buttons on canvas. Secondary controls use forest on canvas with a control border. Hover uses tint, press adds an inset forest stroke. Selected options pair tint with a forest check and an explicit selected state. Disabled controls use muted on surface, disable activation and explain unmet prerequisites nearby.

Keyboard focus uses a 2px focus ring with a 2px canvas gap on light surfaces. On forest panels use a canvas ring. Use persistent labels and status icons alongside semantic colors. Divider is for grouping only. Recheck contrast over images, overlays and every new pairing in rendered components.

## Role boundaries and remaining states

Palette values above are fixed. Map `color.action`, `color.hover` and `color.pressed` to primary controls. Retain full opacity for text and focus rings in enabled states. The 4.56:1 primary label pairing has little contrast margin, so changes to its fill, opacity or compositing need a fresh measurement.

| Element | Rest | Hover / press | Selected / error |
|---|---|---|---|
| Inline link | forest with underline | forest, thicker underline | Current navigation also has an explicit current-page state |
| Text field | text on canvas, control border | forest border | Error border and message use error, with a named error association |
| Checkbox / radio | control outline on canvas | forest outline | Forest fill and canvas check or dot |
| Navigation | muted label on canvas | forest label with tint background | Forest filled icon, text label and current marker |
| Product card | canvas, text and square media | Underline product title on pointer hover | Keyboard focus outlines the focused link or button |
| Loading button | action and canvas label | Activation suppressed during request | Preserve label or show Adding… with an announced busy state |

Success, warning and error appear on canvas with their named foreground token. Keep warning text next to unresolved choices and error text next to failures. The product discount badge uses text on brand. Muted text remains for secondary information and genuine former prices. Product ratings, where supported by real data, use text plus a forest icon, with a readable score and review count.

On action-colored controls, the canvas gap separates the forest focus ring from the fill. On forest surfaces use a canvas outline with a forest gap. Focus must remain visible when selected, pressed, invalid or busy. Keep outline space inside scrollable viewport edges. Tokens sharing a hex remain separate semantic roles so later maintenance can preserve intent.
