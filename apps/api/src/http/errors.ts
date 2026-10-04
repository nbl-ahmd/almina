import type { ErrorRequestHandler } from 'express';
import { MongoError } from 'mongodb';
import type { ApiError } from '@almina/contracts';
import type { Logger } from '@almina/config/logger';
import { HttpError, errorMessages } from '../errors.js';
import type { OperationalMetrics } from '../modules/operations/metrics.js';

export function errorHandler(logger: Logger, metrics?: OperationalMetrics): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    void _next; // Express identifies error middleware by its four-argument arity.
    if (error instanceof MongoError) metrics?.databaseError();
    if (res.writableEnded) return;
    if (res.headersSent) {
      logger.log('error', 'request_failed', { requestId: res.locals.requestId as string, status: 500 });
      res.destroy(); return;
    }
    let failure = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR');
    if (error instanceof MongoError) failure = new HttpError(503, 'SERVICE_UNAVAILABLE');
    if (typeof error === 'object' && error !== null && 'type' in error) {
      if (error.type === 'entity.too.large') failure = new HttpError(413, 'PAYLOAD_TOO_LARGE');
      else if (['encoding.unsupported', 'charset.unsupported'].includes(String(error.type))) failure = new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE');
      else if (['entity.parse.failed', 'request.aborted', 'request.size.invalid'].includes(String(error.type))) failure = new HttpError(400, 'INVALID_REQUEST');
    }
    const body: ApiError = { error: { code: failure.code, message: errorMessages[failure.code] }, requestId: res.locals.requestId as string };
    logger.log(failure.status >= 500 ? 'error' : 'warn', 'request_failed', { requestId: body.requestId, status: failure.status });
    if (failure.status === 503) res.set('Retry-After', '5');
    res.status(failure.status).json(body);
  };
}
