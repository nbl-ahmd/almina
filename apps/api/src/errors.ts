import type { ErrorCode } from '@almina/contracts';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode) {
    super(code);
    this.name = 'HttpError';
  }
}

export const errorMessages: Record<ErrorCode, string> = {
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
