// Coarse events only: no product/category, medicine, identity, URL or money data. Optional campaign attribution uses a published CMS slug.
export const commerceEvents = ['cart_updated', 'checkout_reviewed', 'checkout_confirmed', 'checkout_failed', 'client_error', 'page_viewed', 'product_viewed', 'search_performed', 'search_matched', 'campaign_viewed', 'campaign_clicked'] as const;
export type CommerceEvent = typeof commerceEvents[number];
