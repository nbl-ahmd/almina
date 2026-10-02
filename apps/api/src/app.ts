import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { emptyQuerySchema, statusSchema, successSchema } from '@almina/contracts';
import type { Logger } from '@almina/config/logger';
import type { DatabaseProbe, GetDb } from './database.js';
import { HttpError } from './errors.js';
import { errorHandler } from './http/errors.js';
import { apiRoutes } from './http/routes.js';
import { validate, noBody } from './http/validation.js';

export function createApp(options: {
  database: DatabaseProbe; logger: Logger; getDb?: GetDb; webOrigin?: string;
  trustProxy?: string[]; rateLimit?: number; draining?: () => boolean; requestDeadlineMs?: number;
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.set('trust proxy', options.trustProxy?.length ? options.trustProxy : false);
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.set({ 'X-Request-ID': requestId, 'Cache-Control': 'no-store' });
    const start = performance.now();
    const deadline = setTimeout(() => {
      if (!res.headersSent) errorHandler(options.logger)(new HttpError(504, 'REQUEST_TIMEOUT'), req, res, next);
      else if (!res.writableEnded) res.destroy();
    }, options.requestDeadlineMs ?? 10000);
    deadline.unref();
    res.on('close', () => clearTimeout(deadline));
    res.on('finish', () => {
      clearTimeout(deadline);
      options.logger.log('info', 'http_request', {
        requestId, method: req.method,
        route: typeof req.route?.path === 'string' ? req.route.path : '/unmatched',
        status: res.statusCode, durationMs: Math.round(performance.now() - start),
      });
    });
    next();
  });
  app.use(helmet());
  // Health routes do not depend on browser CORS or public-API quota.
  const routes = ['/health/live', '/health/ready', '/api/v1/status'];
  for (const route of routes) app.get(route, async (req, res) => {
    noBody(req); validate(emptyQuerySchema, req.query);
    const ready = req.path === '/health/live' || (!options.draining?.() && await options.database.checkReadiness());
    if (!ready) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    if (!res.writableEnded) res.json(successSchema(statusSchema).parse({
      data: { service: 'almina-api', contractVersion: '1',
        database: options.database.mode === 'disabled' ? 'disabled' : req.path === '/health/live' ? 'not_checked' : 'ready' },
      requestId: res.locals.requestId,
    }));
  });
  // Restrict exact origins; absent Origin permits server-to-server callers. CORS is not authentication.
  app.use('/api/v1', (req, res, next) => {
    res.vary('Origin');
    if (req.headers.origin) {
      if (req.headers.origin !== options.webOrigin) { next(new HttpError(403, 'FORBIDDEN')); return; }
      res.set({ 'Access-Control-Allow-Origin': options.webOrigin,
        'Access-Control-Expose-Headers': 'X-Request-ID, RateLimit, Retry-After' });
    }
    next();
  });
  app.use('/api/v1', rateLimit({ windowMs: 60000, limit: options.rateLimit ?? 120,
    standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED')) }));
  app.use('/api/v1', (req, res, next) => {
    if (options.draining?.()) { next(new HttpError(503, 'SERVICE_UNAVAILABLE')); return; }
    if (req.method === 'OPTIONS') {
      const method = req.headers['access-control-request-method'];
      const headers = String(req.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
      if (!req.headers.origin || !['GET', 'HEAD', 'POST'].includes(String(method))
        || headers.some(value => !['authorization', 'content-type'].includes(value))) {
        next(new HttpError(403, 'FORBIDDEN')); return;
      }
      res.set({ 'Access-Control-Allow-Methods': 'GET, HEAD, POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600' }).status(204).end();
      return;
    }
    if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
      next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE')); return;
    }
    if ((Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding']) && !req.is('application/json')) {
      next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE')); return;
    }
    next();
  });
  app.use(express.json({ limit: '16kb', strict: true, inflate: false }));
  app.all(routes, (_req, res, next) => {
    res.set('Allow', 'GET, HEAD'); next(new HttpError(405, 'METHOD_NOT_ALLOWED'));
  });
  const getDb: GetDb = options.getDb ?? (() => Promise.reject(new HttpError(503, 'SERVICE_UNAVAILABLE')));
  app.use('/api/v1', apiRoutes(getDb));
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND')));
  app.use(errorHandler(options.logger));
  return app;
}
