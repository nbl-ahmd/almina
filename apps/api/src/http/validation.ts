import type { Request } from 'express';
import type { z } from 'zod';
import { HttpError } from '../errors.js';

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}
export function noBody(req: Request) {
  const emptyParsedBody = req.headers['content-length'] === '0' && req.body !== null && typeof req.body === 'object' && Object.keys(req.body).length === 0;
  if ((req.body !== undefined && !emptyParsedBody) || Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding']) {
    throw new HttpError(400, 'INVALID_REQUEST');
  }
}
