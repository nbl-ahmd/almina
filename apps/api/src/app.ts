import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import { emptyQuerySchema, statusSchema, successSchema, type ApiError } from '@almina/contracts';
import type { Logger } from '@almina/config/logger';
import type { DatabaseProbe } from './database.js';
import { HttpError, errorMessages } from './errors.js';

export function createApp(options: { database: DatabaseProbe; logger: Logger }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.set('trust proxy', false);

  app.use((req, res, next) => {
    const requestId = randomUUID(); // Never trust/log a client-supplied correlation ID.
    res.locals.requestId = requestId;
    res.set({ 'X-Request-ID': requestId, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    const start = performance.now();
    res.on('finish', () => options.logger.log('info', 'http_request', {
      requestId, method: req.method,
      route: typeof req.route?.path === 'string' ? req.route.path : '/unmatched',
      status: res.statusCode, durationMs: Math.round(performance.now() - start),
    }));
    next();
  });

  app.use(express.json({ limit: '16kb', strict: true }));

  const routes = ['/health/live', '/health/ready', '/api/v1/status'];
  for (const route of routes) app.get(route, async (req, res) => {
    if (!emptyQuerySchema.safeParse(req.query).success) throw new HttpError(400, 'INVALID_REQUEST');
    const ready = req.path === '/health/live' || await options.database.checkReadiness();
    if (!ready) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    res.json(successSchema(statusSchema).parse({
      data: { service: 'almina-api', contractVersion: '1',
        database: options.database.mode === 'disabled' ? 'disabled' : req.path === '/health/live' ? 'not_checked' : 'ready' },
      requestId: res.locals.requestId,
    }));
  });
  app.all(routes, (_req, res, next) => {
    res.set('Allow', 'GET, HEAD');
    next(new HttpError(405, 'METHOD_NOT_ALLOWED'));
  });
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND')));

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) { next(error); return; }
    const parserError = typeof error === 'object' && error !== null && 'type' in error
      && ['entity.parse.failed', 'entity.too.large', 'encoding.unsupported', 'charset.unsupported'].includes(String(error.type));
    const failure = error instanceof HttpError ? error
      : parserError ? new HttpError(400, 'INVALID_REQUEST') : new HttpError(500, 'INTERNAL_ERROR');
    const body: ApiError = { error: { code: failure.code, message: errorMessages[failure.code] },
      requestId: res.locals.requestId as string };
    options.logger.log(failure.status >= 500 ? 'error' : 'warn', 'request_failed', {
      requestId: body.requestId, status: failure.status,
    });
    if (failure.status === 503) res.set('Retry-After', '5');
    res.status(failure.status).json(body);
  };
  app.use(handleError);
  return app;
}
