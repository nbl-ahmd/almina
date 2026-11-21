# Reference material — the three owner-supplied screens

> Wiik overview · Nexadash dashboard · Dub payouts

**Status:** historical source material, kept so a future session can re-read what
the console's direction was derived from. It is **not** the specification for
this codebase. The implemented, authoritative system is [`DESIGN.md`](./DESIGN.md).

Admin only. The customer storefront visual system was retired on 15 November 2026.
This admin-only material must not influence its replacement.

The owner supplied three screenshots on 24 October 2026 and asked for the
console to be redesigned to their anatomy. Measurements below are read from the
images; component decisions are interpretations, not copies. No asset,
illustration, product, number or claim was carried over.

## What each screen contributed

**Wiik — overview.** The page ground is warm off-white, not pure white, and the
content sits on raised white sheets. The KPI row reads as icon + small label,
one large figure, and a quiet supporting line. That is where the stat tile's
three-row anatomy and the warm `#f7f5f1` canvas come from.

**Nexadash — dashboard.** Two things were taken:

- the **two-thirds / one-third split**: the working column holds the chart and
  the narrower rail holds what needs a person's attention;
- the **pipeline as a horizontal track of stages**, each stage a destination
  rather than a static label.

We rejected its decorative deltas and trend arrows: the console shows real
counts over a stated sample, and never invents a percentage it did not measure.

**Dub — payouts.** The list treatment: a divided queue of rows, each row an
icon, an action label, a qualifier and a trailing figure. It also confirmed that
an almost monochrome operations screen is legible when status colour is the only
chromatic element.

## What was deliberately not taken

- Electric-blue or violet accents for links and active navigation. Ink carries
  interaction; colour reports state.
- Gradients, glows, glass panels and wide soft shadows. The console uses a
  hairline plus one tight contact shadow.
- Dark-mode chrome. The console is a daylight surface used at a counter.
- Any illustrative or photographic surface. The data is the visual.
- Fabricated metrics: deltas, percent changes, sparkline shapes, sample avatars,
  or "vs last month" comparisons.

## The synthesis

The three references share a posture — warm neutral ground, softly raised white
cards, ink-led type, colour only for state — and that posture became
**"Counter daylight"** (see `DESIGN.md`). The one element the references did not
supply is the console's signature move: the **dispatch rail**, which turns their
generic pipeline strip into the four stages of a pharmacy order's day, each with
its count and its share of the orders in view.

The previous direction in this file — Dub's frosted rice-paper console with a
rainbow-ringed logo and one electric-blue accent — is retained in git history at
commit `314124b` and is the explicit anti-reference for the current system.
