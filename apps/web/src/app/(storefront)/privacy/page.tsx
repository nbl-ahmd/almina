import Link from '../../../components/app-link';
import { Breadcrumb } from '../../../components/storefront';
import { StructuredData } from '../../../components/structured-data';
import { metadataFor } from '../../../lib/server/seo';
import { getWebEnvironment } from '../../../lib/server/env';
import { breadcrumbData, type Query } from '../../../lib/seo';
import { businessContact, policyPaths } from '../../../lib/policies';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor(
    'Privacy policy',
    'How Al Mina Pharmacy collects, uses and protects account, order and website information.',
    policyPaths.privacy,
    await searchParams,
  );
}

export default function PrivacyPage() {
  const origin = getWebEnvironment().WEB_ORIGIN;
  return <>
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Privacy policy', path: policyPaths.privacy }])} />
    <Breadcrumb title="Privacy policy" />
    <article className="policy-page mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 md:p-9">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Store policy</p>
      <h1 className="mb-3 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Privacy policy</h1>
      <p className="text-sm leading-7 text-muted">Last updated 2026-10-29. This policy explains what information Al Mina Pharmacy collects when you use this website, create an account or place an order, why we use it and the choices you have. You can shop and check out as a guest without creating an account.</p>

      <h2 className="mt-8 text-xl font-semibold">Google Customer Reviews and store quality</h2>
      <p className="mt-2 text-sm leading-7 text-muted">When Google Customer Reviews is offered after a confirmed order, Google receives your order reference, email address, delivery country and estimated delivery date to display its optional survey invitation. You choose whether to receive the survey. We do not send Google your product names, product identifiers, medical details, delivery address or payment information through this integration. The store-quality widget, when enabled on public discovery pages, may use Google cookies and collect aggregated widget views and clicks.</p>
      <p className="mt-2 text-sm leading-7 text-muted">Read <a className="text-teal underline" href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">Google’s privacy policy</a> and manage advertising preferences through <a className="text-teal underline" href="https://myadcenter.google.com/" rel="noopener noreferrer" target="_blank">Google My Ad Center</a>. Declining a survey does not affect your order, pharmacy support or access to the website.</p>

      <h2 className="mt-8 text-xl font-semibold">Information we collect</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
        <li><strong>Order details:</strong> name, phone number, email address, delivery address, area, order contents and the payment method you choose. We do not collect or store full card numbers on this website. If online card payment is offered and you choose it, Stripe collects card details on its hosted checkout page. We retain payment references, amounts, statuses and refund updates.</li>
        <li><strong>Account details:</strong> your verified email address, Google account identifier if you choose Google sign-in, saved addresses, saved products, communication choices and rewards balance.</li>
        <li><strong>Prescription and pharmacy review information:</strong> where an order requires pharmacist review, the information you or your prescriber provide to verify and dispense it safely.</li>
        <li><strong>Site and device information:</strong> pages viewed, searches, approximate area, browser type and a small amount of technical data used to keep the site secure and working. Optional site-usage measurement is separate and can be controlled on the site.</li>
        <li><strong>Messages:</strong> the content of enquiries you send by phone, WhatsApp or email, and review content you submit for publication.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">How we use information</h2>
      <p className="mt-2 text-sm leading-7 text-muted">We use information to take and deliver your order, verify prescriptions, calculate prices, VAT and delivery, provide customer support, manage returns and refunds, operate accounts, save lists and addresses, provide eligible rewards, prevent fraud and misuse, keep the site secure, and meet legal, tax and pharmacy-record obligations. With your separate optional consent, we may send marketing messages or product reminders. You can change marketing choices in your account or unsubscribe from the link in a message.</p>

      <h2 className="mt-8 text-xl font-semibold">Signing in and cookies</h2>
      <p className="mt-2 text-sm leading-7 text-muted">An essential cookie keeps you signed in for up to thirty days. Signing out removes the current sign-in session. We also use essential storage for your cart, delivery area and security. Optional site-usage measurement and marketing preferences have separate controls and are not required to shop. Google sign-in is processed by Google under its own privacy policy; we do not receive your Google password.</p>

      <h2 className="mt-8 text-xl font-semibold">When we share information</h2>
      <p className="mt-2 text-sm leading-7 text-muted">We share only what is needed with service providers who help us run the store, such as hosting, database, media delivery, email delivery, payment processing, location lookup and pharmacy operations. These providers process information for the services they supply. We may also share information when required by law, a regulator, a court or a pharmacy authority, or to protect the safety and rights of customers and the pharmacy. We do not sell your personal information.</p>

      <p className="mt-2 text-sm leading-7 text-muted">If you choose online card payment, you provide billing and payment information directly to Stripe. Read <a className="text-teal" href="https://stripe.com/privacy">Stripe’s privacy policy</a> for how Stripe handles that information.</p>

      <h2 className="mt-8 text-xl font-semibold">Optional search improvement reports</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Search improvement reports have a separate, optional control in Usage preferences. When enabled, they record search phrases, result positions, product clicks, cart activity and anonymous purchase attribution. Query text expires after seven days; anonymous event totals expire after thirty days. These reports do not include your name, contact details, account identifier or order number. Popular searches are shown only from approved vocabulary after at least ten searches. Search works when reporting is off. Your browser’s Do Not Track or Global Privacy Control preference disables optional reporting, and withdrawing consent stops future reports.</p>
      <p className="mt-2 text-sm leading-7 text-muted">Reviewed catalogue content and staff-approved search phrases may be processed by an embedding provider to improve product discovery. Shopper phrases await staff review before external processing. Search does not provide a diagnosis, treatment recommendation or medicine-equivalence decision.</p>
      <h2 className="mt-8 text-xl font-semibold">How long we keep information</h2>
      <p className="mt-2 text-sm leading-7 text-muted">Order, prescription and financial records are kept for as long as required by applicable pharmacy, tax and consumer-protection rules. Account preferences and saved items are kept while your account is active. Marketing consent records and unsubscribes are kept so we can honour your choice. We delete or anonymise information when it is no longer needed, unless the law requires us to keep it.</p>

      <h2 className="mt-8 text-xl font-semibold">Security</h2>
      <p className="mt-2 text-sm leading-7 text-muted">We use access controls, encrypted connections, server-side validation and limited staff permissions. No online service can be completely secure. Please use a strong, private sign-in method, do not share sign-in codes, and tell us promptly if you believe your account has been accessed without permission.</p>

      <h2 className="mt-8 text-xl font-semibold">Your choices and requests</h2>
      <p className="mt-2 text-sm leading-7 text-muted">You can ask us for access to the personal information we hold about you, ask us to correct it, or ask us to delete information that we are not required to keep. You can also object to optional marketing or withdraw consent at any time. To make a request, contact us using the details below. We may need to verify your identity before acting. We will review each request and explain any legal record-retention requirement that applies.</p>

      <h2 className="mt-8 text-xl font-semibold">Children</h2>
      <p className="mt-2 text-sm leading-7 text-muted">This store is intended for adults ordering pharmacy and everyday-care products. A parent or guardian should place an order for a child. We do not knowingly create accounts for children.</p>

      <h2 className="mt-8 text-xl font-semibold">Changes to this policy</h2>
      <p className="mt-2 text-sm leading-7 text-muted">We may update this policy when our services or legal obligations change. The version on this page applies from its last-updated date. If a change is significant, we will take reasonable steps to make it clear on the site.</p>

      <h2 className="mt-8 text-xl font-semibold">Contact us</h2>
      <p className="mt-2 text-sm leading-7 text-muted">{businessContact.name}, {businessContact.addressLocality}, United Arab Emirates. Phone <a className="text-teal" href={`tel:${businessContact.telephone}`}>{businessContact.telephone}</a> or email <a className="text-teal" href={`mailto:${businessContact.email}`}>{businessContact.email}</a>. Please do not send passwords, sign-in codes or full card numbers.</p>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <Link className="button text-sm" href="/contact">Contact the pharmacy</Link>
        <Link className="button button-secondary text-sm" href={policyPaths.returns}>Returns policy</Link>
        <Link className="button button-secondary text-sm" href="/account">Back to your account</Link>
      </div>
    </article>
  </>;
}
