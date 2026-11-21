# Reference mapping and provenance

The five images supplied with this request were reviewed and saved as exact copies under `docs/design/references/`. Their layout and visual characteristics inform the specification. Al Mina’s approved coral/forest/lime system, fonts and existing assets supply the final identity. Sample prices, brands, reviews, payment methods, medicine claims and delivery promises come from the reference artwork and require actual Al Mina data before use.

## Pattern mapping

| Reference | Visible characteristics | Al Mina application | Adaptation constraint |
|---|---|---|---|
| [Pharmily mobile](references/pharmily-mobile.png) | Search-first home, category shortcuts, recommendation cards and labeled bottom navigation. | Place search before campaigns, keep category access compact and use real product recommendations. The bottle-first detail image informs pack prominence. | Keep complete identity and supported navigation destinations. Delivery and offer claims require real data. |
| [Medicare desktop](references/medicare-desktop.png) | Bold campaign typography, category strip, dense shelves and changing sectional rhythm. | Use the large forest campaign headline, optional lime merchandising block, clear shelf headings and varied neutral editorial sections. Size grids for shopping efficiency. | Use the approved neutral/coral/forest/lime roles. Services, ratings and trust claims require existing capabilities and evidence. |
| [Electronics shopping](references/electronics-mobile.png) | Product gallery thumbnails, named variant groups, quantity, sticky purchase controls and cart selection details. | Adapt the anatomy to genuine pharmacy packs/formulations, with one fixed purchase region and complete chosen variant details in the cart. | Keep one dominant purchase action per region and use real supported product-family choices. |
| [Blue pharmacy](references/blue-pharmacy-mobile.png) | Compact products, category discovery, pack-focused detail and stacked cart rows. | Use square contain-fit media, readable identity/pack/price/action order, compact grids and separated editable cart lines. | Preserve full strength/formulation and 44px control targets when adapting its compact density. |
| [Muted teal pharmacy](references/teal-pharmacy-mobile.png) | Restrained surfaces, spacious detail presentation, cart summary separation and payment choice rows. | Use approved neutral surfaces, a generous pack well, clear totals and supported payment options with labeled selection states. | Use existing Al Mina payment and delivery choices. Keep the palette within the approved tokens. |

## Exact supplied files

Original files were supplied from the system clipboard directory `/var/folders/r7/r90tx0kn6z3_g444zt5cp1cr0000gn/T/`. Saved copies preserve their bytes. The following SHA-256 values establish which attachment each specification uses.

| Original clipboard filename | Saved copy | SHA-256 |
|---|---|---|
| `codex-clipboard-b79366f5-db98-4fa8-8b35-abd72e8337eb.png` | `pharmily-mobile.png` | `44517a5a30e9e53838b5be4454a7ea59779a4f5c06463cb5bc0939d3c0befed9` |
| `codex-clipboard-ad6fe904-f34e-46bd-bdca-fea2e5507269.png` | `medicare-desktop.png` | `cdddaa0ee338d42dedfb63b1a1b4e80102129c1df6284b25f76172d4d43aa717` |
| `codex-clipboard-7cbefce7-554d-4dbe-bf52-5fb0799072ff.png` | `electronics-mobile.png` | `0401e4a0f00ad5efd471b479096d70760a8e5a79d65d4e1d1ce3249fbd1ad96f` |
| `codex-clipboard-1e3eaae2-23f3-42f7-a02e-aa2d93e87e2b.png` | `blue-pharmacy-mobile.png` | `d59f6651a0cc683b1a3b68627eec37309c63db88548b02b90a18b6479dd69780` |
| `codex-clipboard-e3fcd78b-02a4-4605-8d04-84524c8961b7.png` | `teal-pharmacy-mobile.png` | `4ee422d7ab1c3b1bc79ea10e4e398321ca5fba2055b8e366a00ee5a4cd478bc7` |

## Interpretation and limits

Static artwork establishes visible composition, control anatomy and hierarchy. Swipe behavior, keyboard access, request states, safe areas and RTL rules are explicit specification decisions to verify during implementation. The long Medicare image supports sectional composition and proportions, while its tiny copy is unsuitable as evidence for factual claims.

The [historical comparison board](directions.png) is included because the approved brief links it. Its source is `docs/design/directions.png` at commit `9a14ee5`. It records the earlier A/B/C comparison, earlier font labels and illustrative prices. The approved Market Green / Coral Edition text and supporting tokens take precedence over that historical artwork.

The external Sephora, Glossier and Mobbin observations in DESIGN.md are carried from the approved brief's previous audit. This documentation pass reviews the five supplied images and makes no fresh external-site audit claim.
