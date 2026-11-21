import type { CommercePolicy } from '@almina/contracts';

// Single source of truth for customer-facing store policies. The same values are
// rendered on the policy pages and emitted in Product structured data so Google
// never sees a promise that is missing from the page a shopper reads.
export const policyLastUpdated = '2026-10-25';
export const policyPaths = {
  returns: '/returns',
  shipping: '/shipping',
  terms: '/terms',
  privacy: '/privacy',
} as const;
export const policyLinks = [
  { key: 'footerReturns', path: policyPaths.returns },
  { key: 'footerShipping', path: policyPaths.shipping },
  { key: 'footerTerms', path: policyPaths.terms },
  { key: 'footerPrivacy', path: policyPaths.privacy },
] as const;

const pharmacyPhone = '+971504825007';
const whatsappMessage = "Hi Al Mina Pharmacy! I'd like to make an inquiry about your products.";

export const businessContact = {
  name: 'Al Mina Pharmacy',
  telephone: pharmacyPhone,
  whatsapp: 'https://api.whatsapp.com/send/?' + new URLSearchParams({
    phone: pharmacyPhone.slice(1),
    text: whatsappMessage,
  }),
  email: 'info@alminapharmacy.com',
  addressLocality: 'Ras Al Khaimah',
  addressCountry: 'AE',
} as const;

// Pharmacy returns: sealed, non-medicine products only. Medicines, prescription
// items, opened hygiene/cosmetic goods and temperature-controlled items are
// excluded for patient-safety reasons and cannot be resold.
export const merchantReturns = {
  days: 7,
  country: 'AE',
  method: 'ReturnInStore',
  fees: 'ReturnFeesCustomerResponsibility',
} as const;

// Delivery estimates shown on /shipping and emitted in Offer shippingDetails.
// They are deliberately conservative (5 business days) because the page states
// that remote emirates can take longer than local Ras Al Khaimah deliveries.
export const deliveryEstimate = {
  handlingDays: { min: 0, max: 1 },
  transitDays: { min: 0, max: 5 },
} as const;

export type ShippingPolicy = Pick<
  CommercePolicy,
  'currency' | 'minimumOrderMinor' | 'vatMode' | 'vatRateBps' | 'delivery'
>;

export function formatAedMinor(minor: number) {
  return `AED ${(minor / 100).toFixed(2)}`;
}

export function lowestDeliveryFeeMinor(policy: ShippingPolicy | null | undefined) {
  if (!policy?.delivery.length) return null;
  return Math.min(...policy.delivery.map(rule => rule.feeMinor));
}

// A country-wide Google rate must cover every served emirate. Publishing the
// local minimum would advertise free delivery where checkout charges AED 21.
export function countryDeliveryFeeMinor(policy: ShippingPolicy | null | undefined) {
  if (!policy?.delivery.length) return null;
  return Math.max(...policy.delivery.map(rule => rule.feeMinor));
}

/**
 * schema.org MerchantReturnPolicy for Offer.hasMerchantReturnPolicy.
 * Only reviewed general-sale products are returnable; medicines, prescriptions
 * and unclassified products must not inherit the general 7-day window.
 */
export type MerchantReturnPolicy = {
  '@type': 'MerchantReturnPolicy';
  applicableCountry: string;
  returnPolicyCountry: string;
  returnPolicyCategory: string;
  merchantReturnDays?: number;
  returnMethod?: string;
  returnFees?: string;
  merchantReturnLink: string;
};
export function merchantReturnPolicyData(origin: string, returnable = true): MerchantReturnPolicy {
  const base = {
    '@type': 'MerchantReturnPolicy' as const,
    applicableCountry: merchantReturns.country,
    returnPolicyCountry: merchantReturns.country,
    merchantReturnLink: new URL(policyPaths.returns, origin).href,
  };
  return returnable ? {
    ...base,
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow' as const,
    merchantReturnDays: merchantReturns.days,
    returnMethod: `https://schema.org/${merchantReturns.method}`,
    returnFees: `https://schema.org/${merchantReturns.fees}`,
  } : {
    ...base,
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted' as const,
  };
}

/**
 * schema.org OfferShippingDetails for Offer.shippingDetails.
 * Conservatively covers every emirate; exact regional fees and free-delivery
 * thresholds remain visible on /shipping and authoritative at checkout.
 */
export function shippingDetailsData(policy: ShippingPolicy | null | undefined) {
  const feeMinor = countryDeliveryFeeMinor(policy);
  if (feeMinor === null) return null;
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: (feeMinor / 100).toFixed(2), currency: policy!.currency },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: merchantReturns.country },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: deliveryEstimate.handlingDays.min, maxValue: deliveryEstimate.handlingDays.max, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: deliveryEstimate.transitDays.min, maxValue: deliveryEstimate.transitDays.max, unitCode: 'DAY' },
    },
  };
}
