import { z } from 'zod';

export const requestIdSchema = z.uuid();
export const errorCodeSchema = z.enum([
  'DELIVERY_SETUP_REQUIRED','DELIVERY_LOCATION_REQUIRED','BRANCH_STOCK_CONFLICT','BRANCH_STOCK_RETIRED','BRANCH_LOGIN_CONFLICT',
  'VOUCHER_UNAVAILABLE','VOUCHER_MINIMUM',
  'REMINDERS_UNAVAILABLE', 'REMINDER_PRODUCT_INELIGIBLE', 'REMINDER_LIMIT',
  'INVALID_REQUEST', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR',
  'UNAUTHORIZED', 'FORBIDDEN', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'RATE_LIMITED', 'REQUEST_TIMEOUT', 'COMMERCE_UNAVAILABLE', 'PRODUCT_UNAVAILABLE', 'INSUFFICIENT_STOCK', 'STOCK_CHANGED', 'RECOVERY_IMPORT_REQUIRED',
  'CATALOG_REVIEW_REQUIRED', 'PRODUCT_FAMILY_CONFLICT', 'MINIMUM_ORDER', 'IDEMPOTENCY_CONFLICT', 'INVALID_TRANSITION', 'PRICE_CHANGED', 'DELIVERY_UNCERTAIN',
  'LOCATION_NOT_FOUND', 'LOCATION_OUTSIDE_UAE', 'ADDRESS_NOT_SERVICEABLE',
]);
export const apiErrorSchema = z.object({
  error: z.object({ code: errorCodeSchema, message: z.string().max(200) }).strict(),
  requestId: requestIdSchema,
}).strict();
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

export function successSchema<T extends z.ZodType>(data: T) {
  return z.object({ data, requestId: requestIdSchema }).strict();
}

export const statusSchema = z.object({
  service: z.literal('almina-api'),
  contractVersion: z.literal('1'),
  database: z.enum(['disabled', 'ready', 'not_checked']),
}).strict();
export const statusResponseSchema = successSchema(statusSchema);
export type ServiceStatus = z.infer<typeof statusSchema>;

// Shared pagination is opt-in for future collection endpoints. No raw MongoDB filters.
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
}).strict();
export const emptyQuerySchema = z.object({}).strict();

// Namespace selection belongs to the explicit route, not the spelling of an ID.
export { productBusinessIdSchema, productBusinessIdPattern } from './identifiers';
export const mongoIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

export * from './api';

export * from './commerce';

export { cloudinaryImage } from './media';
export * from './operations';
export * from './telemetry';
export * from './commerce-events';
export * from './location';
export { productFamilyFields, productFamilySchema, familyFieldNames, optionFields, optionLabels, familyProfile, validateProductFamily, variantLabel, sameFamilyIdentity, strengthSignature, type ProductFamilyFields } from './product-family';

export * from './product-content';

export * from "./growth";
export * from './serviceability';
export * from './retention';

export * from "./wholesale";
export * from './reporting';

export * from "./marketing";
export * from './image-review';

export * from './order-routing';

export * from './delivery-zones';

export * from './branch-management';

export * from './staff-access';
