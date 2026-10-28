import Link from 'next/link';
import { Breadcrumb } from '../../../components/storefront';
import { StructuredData } from '../../../components/structured-data';
import { metadataFor } from '../../../lib/server/seo';
import { getShippingPolicy } from '../../../lib/server/growth';
import { getWebEnvironment } from '../../../lib/server/env';
import { breadcrumbData, type Query } from '../../../lib/seo';
import { businessContact, deliveryEstimate, formatAedMinor, policyLastUpdated, policyPaths } from '../../../lib/policies';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor(
    'Delivery and shipping',
    'Delivery areas, current charges, free-delivery thresholds and order handling for Al Mina Pharmacy in Ras Al Khaimah.',
    policyPaths.shipping,
    await searchParams,
  );
}

export default async function ShippingPage() {
  const origin = getWebEnvironment().WEB_ORIGIN;
  const policy = await getShippingPolicy();
  return <>
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Delivery and shipping', path: policyPaths.shipping }])} />
    <Breadcrumb title="Delivery and shipping" />
    <article className="policy-page mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 md:p-9">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Store policy</p>
      <h1 className="mb-3 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Delivery and shipping</h1>
      <p className="text-sm leading-7 text-muted">Last updated {policyLastUpdated}. We deliver pharmacy and everyday-care orders in the United Arab Emirates where our delivery service is available. The checkout confirms the charge and final total for your address before you place an order.</p>

      <h2 className="mt-8 text-xl font-semibold">Where we deliver</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Delivery availability depends on your emirate and area. Enter your delivery address at checkout to confirm service. If your area is not serviceable, checkout will not accept the order; you can also contact the pharmacy for help.</p>

      <h2 className="mt-8 text-xl font-semibold">Current delivery charges</h2>
      {policy ? <>
        <p className="mt-2 text-sm leading-7 text-muted">The table below is read from the same delivery policy used by checkout. Charges are in AED and may change; the checkout total is always authoritative.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead className="bg-subtle text-start">
              <tr><th className="p-3 text-start font-semibold">Emirate</th><th className="p-3 text-start font-semibold">Delivery fee</th><th className="p-3 text-start font-semibold">Free delivery</th></tr>
            </thead>
            <tbody>
              {policy.delivery.map(rule => <tr key={rule.emirate} className="border-t border-border">
                <td className="p-3">{rule.emirate}</td>
                <td className="p-3 tabular-nums">{formatAedMinor(rule.feeMinor)}</td>
                <td className="p-3">{rule.freeAboveMinor === undefined ? 'Not available' : `On orders of ${formatAedMinor(rule.freeAboveMinor)} or more`}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted">Minimum order value: <strong>{formatAedMinor(policy.minimumOrderMinor)}</strong>. Prices include {policy.vatMode === 'inclusive' ? `${policy.vatRateBps / 100}% VAT` : `${policy.vatRateBps / 100}% VAT added at checkout`} where applicable. Product prices and the final delivery charge are calculated again on the server when you review and place your order.</p>
      </> : <p className="mt-2 text-sm leading-7 text-muted">The live delivery fee table is temporarily unavailable. Delivery charges are confirmed at checkout based on your emirate, or you can contact the pharmacy for a current quote.</p>}

      <h2 className="mt-8 text-xl font-semibold">Order handling and delivery time</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Orders are prepared during pharmacy opening hours after stock and prescription checks, within {deliveryEstimate.handlingDays.max} business day. Delivery is estimated within {deliveryEstimate.transitDays.max} business days, and most Ras Al Khaimah deliveries arrive on the same or next day. These are estimates, not guaranteed times; the pharmacy will contact you if an order is delayed. Someone should be available to receive the order and show the order confirmation if asked.</p>

      <h2 className="mt-8 text-xl font-semibold">Payment</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Cash and card payment on delivery remain available. Any online payment option available for your order is shown at checkout. If you choose online card payment, Stripe processes it on its hosted checkout page; we do not collect or store full card numbers on this website. The final amount is shown before you confirm the order and is recalculated by the server from current catalog prices, stock, VAT and the delivery rule for your address.</p>

      <h2 className="mt-8 text-xl font-semibold">Restricted and prescription items</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Prescription medicines are supplied only against a valid prescription that our pharmacist can verify. Some health products may be unavailable for delivery, require an age or identity check, or need pharmacist advice. We may contact you before dispatch and cancel or refund an order that cannot be supplied safely.</p>

      <h2 className="mt-8 text-xl font-semibold">Failed delivery</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Please check that your phone number, emirate, area and street address are correct. If we cannot reach you or deliver to the address, the order may be returned to the pharmacy. Contact us to arrange a new delivery; an additional delivery charge may apply.</p>

      <h2 className="mt-8 text-xl font-semibold">Questions</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Call <a className="text-teal" href={`tel:${businessContact.telephone}`}>{businessContact.telephone}</a> or email <a className="text-teal" href={`mailto:${businessContact.email}`}>{businessContact.email}</a> for delivery help. Read our <Link className="text-teal underline underline-offset-4" href={policyPaths.returns}>returns and refunds policy</Link> for information about returning an item.</p>
      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <Link className="button text-sm" href="/contact#delivery">Ask about delivery</Link>
        <Link className="button button-secondary text-sm" href="/products">Browse products</Link>
      </div>
    </article>
  </>;
}
