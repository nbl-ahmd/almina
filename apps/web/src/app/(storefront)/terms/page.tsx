import Link from 'next/link';
import { Breadcrumb } from '../../../components/storefront';
import { StructuredData } from '../../../components/structured-data';
import { metadataFor } from '../../../lib/server/seo';
import { getWebEnvironment } from '../../../lib/server/env';
import { breadcrumbData, type Query } from '../../../lib/seo';
import { businessContact, policyLastUpdated, policyPaths } from '../../../lib/policies';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor(
    'Terms of service',
    'The terms that apply when you browse this website or order from Al Mina Pharmacy in Ras Al Khaimah.',
    policyPaths.terms,
    await searchParams,
  );
}

export default function TermsPage() {
  const origin = getWebEnvironment().WEB_ORIGIN;
  return <>
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Terms of service', path: policyPaths.terms }])} />
    <Breadcrumb title="Terms of service" />
    <article className="policy-page mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 md:p-9">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Store policy</p>
      <h1 className="mb-3 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Terms of service</h1>
      <p className="text-sm leading-7 text-muted">Last updated {policyLastUpdated}. These terms apply when you use this website or place an order with Al Mina Pharmacy in {businessContact.addressLocality}, United Arab Emirates. By ordering, you agree to these terms, our <Link className="text-teal underline underline-offset-4" href={policyPaths.returns}>returns policy</Link>, our <Link className="text-teal underline underline-offset-4" href={policyPaths.shipping}>delivery policy</Link> and our <Link className="text-teal underline underline-offset-4" href={policyPaths.privacy}>privacy policy</Link>.</p>

      <h2 className="mt-8 text-xl font-semibold">About us</h2>
      <p className="mt-2 text-sm leading-7 text-muted">This website is operated by {businessContact.name}, a pharmacy in {businessContact.addressLocality}, United Arab Emirates. You can reach us on <a className="text-teal" href={`tel:${businessContact.telephone}`}>{businessContact.telephone}</a> or <a className="text-teal" href={`mailto:${businessContact.email}`}>{businessContact.email}</a>.</p>

      <h2 className="mt-8 text-xl font-semibold">Product information and health advice</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Product descriptions, images, ingredients and directions are provided for general information. They are not a diagnosis or a substitute for advice from a doctor or pharmacist. Always read the packaging and directions before use, check for allergies, and ask the pharmacy if you are unsure. Prescription medicines are dispensed only after a valid prescription and pharmacist review. Do not use this website for urgent medical care; contact emergency services when needed.</p>

      <h2 className="mt-8 text-xl font-semibold">Orders and availability</h2>
      <p className="mt-2 text-sm leading-7 text-muted">An order is an offer to buy. It is accepted only after the pharmacy confirms it. All orders are subject to product availability, stock checks, delivery serviceability, minimum order rules, prescription verification and pharmacy review. We may cancel and refund an order if an item is unavailable, the price or stock was displayed incorrectly, the order cannot be delivered safely, or we suspect misuse. If we cancel, we will contact you using the details provided.</p>

      <h2 className="mt-8 text-xl font-semibold">Prices, VAT and delivery</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Prices are shown in United Arab Emirates dirhams (AED). Where a product is marked as VAT-applicable, VAT is included or added according to the policy displayed at checkout. Delivery charges depend on the delivery address and are shown before you confirm the order. The server recalculates product prices, stock, VAT, discounts and the delivery fee when you review and place the order; the checkout total is the authoritative amount. We do not accept a price that was tampered with on the client.</p>

      <h2 className="mt-8 text-xl font-semibold">Payment</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Available payment methods are shown at checkout. Where cash or card payment on delivery is offered, the amount is due when the order is delivered. We do not store full card numbers on this website. Vouchers and rewards are subject to the terms shown with the offer and to minimum-spend, expiry and eligibility rules.</p>

      <h2 className="mt-8 text-xl font-semibold">Delivery and returns</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Delivery is provided under our <Link className="text-teal underline underline-offset-4" href={policyPaths.shipping}>delivery and shipping policy</Link>. Returns, exchanges and refunds are provided under our <Link className="text-teal underline underline-offset-4" href={policyPaths.returns}>returns and refunds policy</Link>. Safety rules may prevent us from accepting a return of a medicine or an opened health product.</p>

      <h2 className="mt-8 text-xl font-semibold">Your account</h2>
      <p className="mt-2 text-sm leading-7 text-muted">You are responsible for the accuracy of the details you provide and for keeping your sign-in method secure. Do not share sign-in codes. Tell us promptly if you believe someone else has accessed your account. We may suspend an account that is used for fraudulent orders, abuse, scraping or activity that harms the service or other customers.</p>

      <h2 className="mt-8 text-xl font-semibold">Website use and content</h2>
      <p className="mt-2 text-sm leading-7 text-muted">The website, brand, photographs, copy and design are owned by us or used with permission. You may browse and shop for personal use. You may not scrape, copy, resell or misuse the catalog, interfere with security features, attempt unauthorized access, or use automated tools in a way that degrades the service. Product and brand names belong to their respective owners.</p>

      <h2 className="mt-8 text-xl font-semibold">Limitation of liability</h2>
      <p className="mt-2 text-sm leading-7 text-muted">We take care to keep product, price and availability information accurate, but errors can occur. To the extent permitted by law, we are not liable for indirect or consequential loss arising from use of the website. Nothing in these terms excludes or limits liability that cannot be excluded under UAE law, including liability for death or personal injury caused by negligence, fraud, or your statutory consumer rights.</p>

      <h2 className="mt-8 text-xl font-semibold">Changes and governing law</h2>
      <p className="mt-2 text-sm leading-7 text-muted">We may update these terms when our service or legal requirements change. The version published on this page applies from its last-updated date. These terms are governed by the laws of the United Arab Emirates, and disputes are subject to the courts of {businessContact.addressLocality}, without affecting any mandatory consumer protection rights.</p>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <Link className="button text-sm" href="/contact">Contact the pharmacy</Link>
        <Link className="button button-secondary text-sm" href={policyPaths.privacy}>Privacy policy</Link>
      </div>
    </article>
  </>;
}
