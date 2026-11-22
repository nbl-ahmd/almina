import type { ErrorCode } from '@almina/contracts';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode) {
    super(code);
    this.name = 'HttpError';
  }
}

export const errorMessages: Record<ErrorCode, string> = {
  BRANCH_LOGIN_CONFLICT: 'Choose an available branch login. Existing credentials were not changed.',
  BRANCH_STOCK_RETIRED: 'All branches use the main catalogue stock. Update stock from Products.',
  BRANCH_STOCK_CONFLICT: 'Review branch allocations before changing available stock.',
  DELIVERY_SETUP_REQUIRED: 'Complete branch, staff, zone and index setup before enabling zone delivery.',
  DELIVERY_LOCATION_REQUIRED: 'Choose an accurate delivery pin to check coverage.',
  REMINDERS_UNAVAILABLE: 'Requested reminders are not available right now.',
  REMINDER_PRODUCT_INELIGIBLE: 'Reminders are available only for reviewed general-care products. Check the selected product or basket.',
  REMINDER_LIMIT: 'You can have up to 20 active reminders. Cancel one in your account first.',
  COUPON_UNAVAILABLE: 'This coupon is unavailable for this basket.',
  COUPON_MINIMUM: 'The basket needs more eligible items to use this coupon.',
  COUPON_COMBINATION: 'Use one coupon or reward voucher per order.',
  COUPON_PAYMENT_MINIMUM: 'The discounted total is below the online card payment minimum.',
  VOUCHER_UNAVAILABLE: 'This voucher is expired, already used or not available to this account.',
  VOUCHER_MINIMUM: 'Add enough eligible products to meet this voucher’s minimum spend.',
  CATALOG_REVIEW_REQUIRED: 'Complete the product content, classification, image rights and physical stock review before publishing.',
  PRODUCT_FAMILY_CONFLICT: 'Check the family name, brand, form, strength, category and option combinations. Each combination must be unique.',
  LOCATION_NOT_FOUND: 'A complete delivery address could not be found.',
  LOCATION_OUTSIDE_UAE: 'Delivery is available only in the United Arab Emirates.',
  ADDRESS_NOT_SERVICEABLE: 'We cannot currently deliver to that address. Contact the pharmacy or choose another address.',
  DELIVERY_UNCERTAIN: 'Delivery is uncertain. Review provider records before sending again.',
  PRICE_CHANGED: 'The quote changed. Review the updated total before ordering.',
  COMMERCE_UNAVAILABLE: 'Checkout configuration is unavailable.',
  PRODUCT_UNAVAILABLE: 'A product is unavailable.',
  INSUFFICIENT_STOCK: 'Insufficient stock.',
  RECOVERY_IMPORT_REQUIRED: 'Use the reviewed recovery import workflow.',
  STOCK_CHANGED: 'Stock changed. Reload the product before saving.',
  MINIMUM_ORDER: 'The minimum order amount was not met.',
  IDEMPOTENCY_CONFLICT: 'The checkout key was already used for a different request.',
  INVALID_TRANSITION: 'The order cannot move to that status.',
  INVALID_REQUEST: 'The request is invalid.',
  NOT_FOUND: 'The resource was not found.',
  METHOD_NOT_ALLOWED: 'The request method is not supported.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
  UNAUTHORIZED: 'Authentication is required.',
  FORBIDDEN: 'Access is denied.',
  PAYLOAD_TOO_LARGE: 'The request body is too large.',
  UNSUPPORTED_MEDIA_TYPE: 'The request media type is not supported.',
  RATE_LIMITED: 'Too many requests.',
  REQUEST_TIMEOUT: 'The request timed out.',
};
