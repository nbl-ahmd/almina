// Deliberately coarse: no product/category, medicine, identity, URL or money data.
export const commerceEvents = ['cart_updated', 'checkout_reviewed', 'checkout_confirmed', 'checkout_failed', 'client_error'] as const;
export type CommerceEvent = typeof commerceEvents[number];
