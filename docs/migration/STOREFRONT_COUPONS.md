# Storefront coupon codes

Administrators manage campaign codes under **Website & growth → Coupons**. Codes can be enabled, disabled or scheduled in UAE time. Configure a fixed AED or percentage discount, a cap on percentage savings, a minimum eligible spend and a total redemption limit. Codes are case-insensitive and remain stable after creation. Admin writes use the saved revision to detect edits by another administrator.

Customers can apply a code in the cart or during checkout. The cart shows estimated savings and checks the code again after basket edits. Checkout checks the complete order and displays the coupon as a separate row before the customer accepts the total. Only reviewed general-sale products qualify. Eligible items use their current selling price, including existing sale prices. One campaign coupon or reward voucher can be applied per retail order. Wholesale checkout stays outside this feature.

Coupon savings are allocated over eligible lines in fils before VAT is calculated by the existing commerce policy. Basket and delivery minimums continue to use the pre-coupon product subtotal. The cashier and online card flows use the same accepted quote. Online totals below the card minimum require another payment method or removal of the coupon.

The API uses the canonical code as the unique MongoDB document ID in `checkout_coupons`. Order creation, inventory deduction and redemption count share one transaction. An unpaid online checkout releases its use on verified expiry. Cancellation of an offline order releases its use. Paid online transactions and refunds retain a use. Historical orders keep their applied code and discount independently of later edits.

The collection is additive and created on the first administrator save. Deploy the commerce API and compatible storefront and admin together before enabling a coupon. If coupon issuance must stop, disable the codes while retaining the coupon-aware API and order readers for existing orders and online payment reconciliation.
