import type { ErrorCode } from '@almina/contracts';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode) {
    super(code);
    this.name = 'HttpError';
  }
}

export const errorMessages: Record<ErrorCode, string> = {
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
