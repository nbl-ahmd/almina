# Al Mina Administration · Soft Console

**Design direction for the staff and administrator console only.** It does not govern the customer storefront; the root `DESIGN.md` does that. The two share the forest-green identity and nothing else: the storefront sells, the console operates.

The five reference screenshots live in `references/` (`ref-1` SignGaze dashboard, `ref-2` SalesSync product form, `ref-3` NeoCommerce product grid, `ref-4` SalesSync list and KPIs, `ref-5` eComma overview). They govern composition and control shape. Al Mina's palette, fonts, accessibility and commerce rules still apply.

Companion documents: [PRODUCT.md](PRODUCT.md) · [components.md](components.md) · [page-patterns.md](page-patterns.md) · [responsive.md](responsive.md)

## What we take from the references

| Observation | Source | Decision |
|---|---|---|
| Floating white sidebar and top bar sit on a pale ground, with inner content in one large rounded panel | 1, 3 | Canvas is a pale grey-green; sidebar, topbar and content are separate 16px-radius surfaces with a 12px gap between them |
| Active navigation is a filled soft pill, not an underline or left bar | 1, 2, 3 | Active item: mint fill, forest text and icon, 12px radius |
| Sidebar groups carry small quiet labels | 2, 3 | Keep group labels, 11px, sentence case, muted |
| KPI cards: label, large figure, change chip with arrow and "from last week" | 4, 5 | One `Metric` card pattern; change chip green up, red down, neutral flat |
| Inputs are filled soft grey with no visible border until focus | 2, 3 | Filled fields on cards; a 2px forest focus ring replaces the border |
| Primary action is a pill, usually dark or brand green | 1, 2, 4 | Primary button: capsule, forest fill. Secondary: capsule, white with a hairline |
| Tables use zebra rows, soft status pills, row action icons, numbered pagination with entry counts | 4, 5 | Adopt all four, see components |
| Filter tabs as pill chips above a grid or table | 3 | Segmented pill chips for status views |
| Product thumbnail inside rows and cards | 3, 4, 5 | Show a 40px rounded thumbnail wherever a product is listed |
| Search with a keyboard hint | 2, 5 | Global search shows `⌘K`/`Ctrl K` and focuses on that shortcut |
| Dark mode toggle in the sidebar | 2 | Not in scope now; tokens are built so it can follow |

## What we deliberately do not take

- Illustrations, mascots and "refer a friend" promo tiles (ref 1). Operations screens carry no decoration.
- Tilted or perspective mockup presentation (ref 5).
- Curved smoothed lines that imply data between samples (ref 1, 5). Charts use straight segments or bars.
- Coloured product-form chips for size or gender as the only state carrier. Selection always has a text or check cue as well as colour.
- Status communicated by colour alone (ref 4 red/green pills). Pills always carry text.

## Foundations

| Decision | Specification |
|---|---|
| Colour | Canvas `#eef1f5`. Cards `#ffffff`. Soft fill (fields, zebra rows, chips) `#eef0f3` and `#f6f7f9`. Ink `#111418`, muted `#5f6773`. **Mint `#a8f0b5`** is the one accent: primary actions and the active nav pill (hover `#8fe3a1`, tint `#e3f9e8`). Black pills carry dark actions such as Export. Status: green `#16803c`/`#dcf7e3`, amber `#8a5300`/`#fff0d6`, red `#c62d3a`/`#ffe4e4`, blue `#1d4ed8`/`#e4ecff`. Forest green is retired from the admin. |
| Type | Manrope (already loaded). Page title 24/32 600, card title 16/24 600, body 14/20, table 13.5/20, caption 12. Tabular numerals for figures. |
| Shape | Cards 20px (`rounded-[20px]`), shell surfaces 24px, fields and chips capsule or 12–14px, buttons capsule. |
| Depth | `shadow-card` (hairline plus soft contact shadow). Menus and dialogs use `shadow-pop`. No borders on cards. |
| Icons | Heroicons outline 20px, one unique icon per section. |
| Motion | State only, 150ms, reduced-motion respected. |

## Implementation: Tailwind, not stylesheets

- Admin screens are styled with Tailwind utilities in markup. `app/(admin)/admin/admin.css` is only the Tailwind entry: the `@theme` tokens above and a small `@layer base` (scoped border/button reset and native form controls).
- Utilities are imported `important` so the root `globals.css` unlayered rules cannot override them.
- Shared building blocks live in `components/admin/ui.tsx`: `PageHeader`, `Card`, `Button`/`buttonVariants`, `Badge`, `StatTile`, `Note`, `Callout`, `FilterChips`, `CreatePanel`, `Pager`, `EmptyState`; plus `Table` in `views.tsx`, `confirm-dialog.tsx` and `row-actions.tsx`.
- There is no admin stylesheet beyond `admin.css`. Do not add one.

## Hard rules

1. Colour comes from the `@theme` tokens (`bg-mint`, `text-mute`, …). No raw hex in components except SVG chart fills.
2. All admin styling is Tailwind utilities in markup. Do not add stylesheet rules.
3. Every destructive or store-wide action uses the shared confirm dialog, never `window.confirm`.
4. Every list shows how many items exist and which are visible.
5. Staff-visible text is plain language. No internal terms such as "process-local" or "committed record" outside Operations.
6. Money is always AED, right-aligned, tabular, from server-calculated minor units.

## Status

This direction is recorded from the references and the audit of the existing console. Visual sign-off from the owner on real data is still needed, as is a native Arabic review of admin labels if the console is localised.
