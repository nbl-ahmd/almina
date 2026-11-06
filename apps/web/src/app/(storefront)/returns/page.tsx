import Link from '../../../components/app-link';
import { Breadcrumb } from '../../../components/storefront';
import { StructuredData } from '../../../components/structured-data';
import { metadataFor } from '../../../lib/server/seo';
import { getWebEnvironment } from '../../../lib/server/env';
import { breadcrumbData, type Query } from '../../../lib/seo';
import { businessContact, merchantReturns, policyLastUpdated, policyPaths } from '../../../lib/policies';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor(
    'Returns and refunds',
    `How to return or exchange an eligible product, report a damaged order, or request a refund from Al Mina Pharmacy within ${merchantReturns.days} days.`,
    policyPaths.returns,
    await searchParams,
  );
}

export default function ReturnsPage() {
  const origin = getWebEnvironment().WEB_ORIGIN;
  return <>
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Returns and refunds', path: policyPaths.returns }])} />
    <Breadcrumb title="Returns and refunds" />
    <article className="policy-page mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 md:p-9">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Store policy</p>
      <h1 className="mb-3 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Returns and refunds</h1>
      <p className="text-sm leading-7 text-muted">Last updated {policyLastUpdated}. This policy explains when an item ordered from this website can be returned, exchanged or refunded. Your rights under applicable UAE consumer protection law are not limited by this policy.</p>

      <h2 className="mt-8 text-xl font-semibold">Before you order</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Check the product name, strength, pack size, directions and ingredients on the product page. If you are unsure whether a product is right for you, contact the pharmacy before ordering. Prescription items require a valid prescription and are dispensed only after pharmacist review.</p>

      <h2 className="mt-8 text-xl font-semibold">What can be returned</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Unopened, non-medicine products in their original sealed packaging may be returned or exchanged within {merchantReturns.days} days of delivery when you have proof of purchase. The item must be unused, undamaged and resaleable. Delivery charges are not refunded for a change of mind, and the cost of returning the item to the pharmacy is your responsibility unless the return is caused by our error.</p>

      <h2 className="mt-8 text-xl font-semibold">What cannot be returned</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
        <li>Medicines, prescription items and pharmacy-only products once dispensed or handed over.</li>
        <li>Opened or unsealed supplements, baby formula and food, cosmetics, skincare and personal-care products.</li>
        <li>Products that need temperature control, or items marked as final sale or non-returnable on the product page.</li>
        <li>Products that have been used, damaged after delivery, or are missing their packaging, seals or instructions.</li>
      </ul>
      <p className="mt-3 text-sm leading-7 text-muted">These exclusions protect patient safety and follow the rules that apply to medicines and health products in the UAE.</p>

      <h2 className="mt-8 text-xl font-semibold">Damaged, wrong or expired items</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Contact us within 48 hours of delivery with your order number, a photo of the item and a photo of the packaging. If we sent the wrong item, or it arrived damaged or expired, we will arrange a replacement or refund, including any delivery charge you paid for that item.</p>

      <h2 className="mt-8 text-xl font-semibold">Cancelling an order</h2>
      <p className="mt-2 text-sm leading-7 text-muted">You can ask us to cancel an order before it is dispatched. Contact the pharmacy as soon as possible. If the order has already left the pharmacy, please follow the return steps below. We may cancel and refund an order when an item is unavailable, a prescription cannot be verified, the delivery address is outside our service area, or a pricing or stock error is found before dispatch.</p>

      <h2 className="mt-8 text-xl font-semibold">How to start a return</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-7 text-muted">
        <li>Contact Al Mina Pharmacy on <a className="text-teal" href={`tel:${businessContact.telephone}`}>{businessContact.telephone}</a> or <a className="text-teal" href={`mailto:${businessContact.email}`}>{businessContact.email}</a>. Include your order number and the item you want to return.</li>
        <li>Wait for our team to confirm that the item is eligible. Please do not send medicines back without confirmation.</li>
        <li>Return the item to the agreed Al Mina branch in {businessContact.addressLocality}, or follow the collection arrangement our team confirms.</li>
        <li>We inspect the item and confirm the outcome. Approved refunds are issued to the original payment method, or by cash or bank transfer for cash-on-delivery orders.</li>
      </ol>
      <p className="mt-3 text-sm leading-7 text-muted">Approved refunds are usually processed within 5–10 business days after inspection. Your bank or card issuer may need additional time to show the credit.</p>

      <h2 className="mt-8 text-xl font-semibold">Delivery charges</h2>
      <p className="mt-2 text-sm leading-7 text-muted">The original delivery charge is refunded when the return is caused by our error. For a change of mind, the original delivery charge is not refunded. See our <Link className="text-teal underline underline-offset-4" href={policyPaths.shipping}>delivery and shipping policy</Link> for current charges.</p>

      <h2 className="mt-8 text-xl font-semibold">Questions</h2>
      <p className="mt-2 text-sm leading-7 text-muted">If anything about your order is unclear, contact the pharmacy before opening or using the product. Our team will help you find the right next step.</p>
      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <Link className="button text-sm" href="/contact">Contact the pharmacy</Link>
        <Link className="button button-secondary text-sm" href={policyPaths.terms}>Read the terms of service</Link>
      </div>
    </article>
  </>;
}
