import { z } from 'zod';

export const requestIdSchema = z.uuid();
export const errorCodeSchema = z.enum([
  'INVALID_REQUEST', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR',
  'UNAUTHORIZED', 'FORBIDDEN', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'RATE_LIMITED', 'REQUEST_TIMEOUT', 'COMMERCE_UNAVAILABLE', 'PRODUCT_UNAVAILABLE', 'INSUFFICIENT_STOCK', 'STOCK_CHANGED',
  'MINIMUM_ORDER', 'IDEMPOTENCY_CONFLICT', 'INVALID_TRANSITION', 'PRICE_CHANGED',
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

// Business IDs and MongoDB IDs stay separate; no money/commerce policy is invented here.
export const productBusinessIdSchema = z.string().regex(/^PD\d+$/);
export const mongoIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

export * from './api';

export * from './commerce';

export { cloudinaryImage } from './media';
