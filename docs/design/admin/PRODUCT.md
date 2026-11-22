# Administration product context

## Users and the job each one has

| User | Role | Main jobs | Device |
|---|---|---|---|
| Owner or administrator | `admin` | See how the shop is doing and what needs attention, manage catalogue, delivery, coupons, content, staff | Desktop, sometimes phone |
| Pharmacist or catalogue reviewer | legacy staff (`user`) | Review draft products, check classification and images, view stock | Desktop |
| Branch receiving team | branch store account | Receive, confirm and pack assigned orders, hear new-order alerts | Shared tablet or counter PC, kept open all day |

Branch accounts see Orders and Notifications only. Layout and copy must never imply other sections exist for them.

## Questions the console must answer fast

1. What needs doing right now? Pending orders and their age, address reviews, out-of-stock items, draft products awaiting review.
2. How are we doing? Orders, order value, average order, dispatched, by period.
3. Where do I go to change X? Navigation is grouped by task, not by data model.

## Tone

Calm, exact and plain. Short sentences, verbs on buttons ("Confirm order", "Archive product"). State what will happen before a risky action and what happened after it.

## Constraints

- Production commerce data. Never present a figure as exact when it is a sample; say what it covers.
- Server decides permissions. UI hiding is convenience, not security.
- Pharmacy rules: prescription items stay unpublished; classification needs pharmacist confirmation. The UI must keep these warnings.
- Accessible by keyboard, with visible focus, 44px touch targets on mobile, and reduced-motion support.

## Out of scope for this direction

Storefront visuals, checkout, customer account, email templates.
