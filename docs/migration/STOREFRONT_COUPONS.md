# Storefront coupon codes

Administrators manage campaign codes under **Website & growth → Coupons**. Codes can be enabled, disabled or scheduled in UAE time. Configure a fixed AED or percentage discount, a cap on percentage savings, a minimum eligible spend and a total redemption limit. Codes are case-insensitive and remain stable after creation. Admin writes use the saved revision to detect edits by another administrator.

Customers can apply a code in the cart or during checkout. The cart shows estimated savings and checks the code again after basket edits. Checkout checks the complete order and displays the coupon as a separate row before the customer accepts the total. Only reviewed general-sale products qualify. Eligible items use their current selling price, including existing sale prices. One campaign coupon or reward voucher can be applied per retail order. Wholesale checkout stays outside this feature.

Coupon savings are allocated over eligible lines in fils before VAT is calculated by the existing commerce policy. Basket and delivery minimums continue to use the pre-coupon product subtotal. The cashier and online card flows use the same accepted quote. Online totals below the card minimum require another payment method or removal of the coupon.

The API uses the canonical code as the unique MongoDB document ID in `checkout_coupons`. Order creation, inventory deduction and redemption count share one transaction. An unpaid online checkout releases its use on verified expiry. Cancellation of an offline order releases its use. Paid online transactions and refunds retain a use. Historical orders keep their applied code and discount independently of later edits.

The collection is additive and created on the first administrator save. Deploy the commerce API and compatible storefront and admin together before enabling a coupon. If coupon issuance must stop, disable the codes while retaining the coupon-aware API and order readers for existing orders and online payment reconciliation.

## Scopes, customer copy and the offers list (2026-11-25)

Each coupon now also has:

- **Applies to:**
  - all eligible products (the default),
  - selected products (up to 200),
  - or selected categories (up to 50).

  A scope only narrows eligibility. Medicines and unreviewed products never qualify, whatever is selected. Brand scope is not offered,
  because brand is free text on products and commerce does not load it.
- **Customer-facing title and description** (80 and 400 characters), shown in the offers list.
- **Show in offers list:** when set, a live code appears in the cart and checkout under "View available offers" (1mg "Coupons &
  offers"). The public endpoint `GET /api/v1/growth/coupons` returns live listed codes only: code, title, description, discount,
  minimum, end date and the scope *type*. Product and category ids stay private. It sends a 60-second shared cache header.

Behaviour:

- **Scoped allocation:** the discount is allocated only to eligible lines.
- **Minimum spend:** measured on the eligible subtotal.
- **Nothing eligible:** a scoped coupon with no eligible lines returns `COUPON_NOT_APPLICABLE` ("doesn't apply to the items in your
  cart"). An all-products coupon still returns `COUPON_UNAVAILABLE`.

Compatibility: the fields are additive with schema defaults. Rows saved before this change read as all-products, unlisted and untitled,
and keep working unchanged. Older admin clients that omit the fields save all-products coupons. No migration or backfill is needed.
Rollback: deploy the previous API and storefront together. Stored scope fields are then ignored, which widens scoped coupons to all
eligible products, so disable scoped codes before rolling back.

Tests: `tests/coupon-scope.test.ts` (eligibility and legacy parsing). `tests/coupons-integration.test.ts` covers category and product
scopes on a mixed basket, the minimum on the eligible subtotal, not-applicable rejection, a legacy row without new fields, and public
listing with no id leakage.
