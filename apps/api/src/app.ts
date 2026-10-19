import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { commerceEventSchema, emptyQuerySchema, statusSchema, successSchema } from '@almina/contracts';
import type { Logger } from '@almina/config/logger';
import type { DatabaseProbe, GetDb } from './database.js';
import { HttpError } from './errors.js';
import { verifyBrowserMutation } from './modules/auth/cookies.js';
import { errorHandler } from './http/errors.js';
import { apiRoutes } from './http/routes.js';
import { validate, noBody } from './http/validation.js';
import type { LocationOptions } from './modules/location/reverse.js';
import { createOperationalMetrics, installOperationalMetrics, type OperationalMetrics } from './modules/operations/metrics.js';

export function createApp(options: {
  database: DatabaseProbe; logger: Logger; getDb?: GetDb; webOrigin?: string;
  development?: boolean; trustProxy?: string[]; rateLimit?: number; draining?: () => boolean; requestDeadlineMs?: number;
  webOrigins?: readonly string[]; metrics?: OperationalMetrics; observeRequests?: boolean;
  commerceTelemetryEnabled?: boolean;
  location?: LocationOptions;
  onOrderCreated?: (order: { id: string; orderId: string }) => void;
}) {
  const app = express();
  const metrics = options.metrics ?? createOperationalMetrics('api', Date.now, options.commerceTelemetryEnabled === true);
  if (options.observeRequests !== false) installOperationalMetrics(app, metrics);
  const origins = options.webOrigins ?? (options.webOrigin ? [options.webOrigin] : []);
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.set('trust proxy', options.trustProxy?.length ? options.trustProxy : false);
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.set({ 'X-Request-ID': requestId, 'Cache-Control': 'no-store' });
    const start = performance.now();
    const deadline = setTimeout(() => {
      if (!res.headersSent) errorHandler(options.logger, metrics)(new HttpError(504, 'REQUEST_TIMEOUT'), req, res, next);
      else if (!res.writableEnded) res.destroy();
    }, options.requestDeadlineMs ?? 10000);
    deadline.unref();
    res.on('close', () => clearTimeout(deadline));
    res.on('finish', () => {
      clearTimeout(deadline);
      options.logger.log('info', 'http_request', {
        requestId, method: req.method,
        route: typeof req.route?.path === 'string' ? req.route.path : '/unmatched',
        status: res.statusCode, durationMs: Math.round((performance.now() - start) * 100) / 100,
      });
    });
    next();
  });
  app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: {
    defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"],
  } }, strictTransportSecurity: options.development ? false : { maxAge: 31536000, includeSubDomains: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }));
  app.use((_req, res, next) => {
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); next();
  });
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
      if (!origins.includes(req.headers.origin)) { next(new HttpError(403, 'FORBIDDEN')); return; }
      res.set({ 'Access-Control-Allow-Origin': req.headers.origin,
        'Access-Control-Allow-Credentials': 'true', 'Access-Control-Expose-Headers': 'X-Request-ID, RateLimit, Retry-After' });
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
        || headers.some(value => !['content-type', 'x-csrf-protection'].includes(value))) {
        next(new HttpError(403, 'FORBIDDEN')); return;
      }
      res.set({ 'Access-Control-Allow-Methods': 'GET, HEAD, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Protection',
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
  app.use('/api/v1/commerce-events', (_req, _res, next) => {
    next(options.commerceTelemetryEnabled === true ? undefined : new HttpError(404, 'NOT_FOUND'));
  }, express.json({ limit: '128b', strict: true, inflate: false }));
  app.post('/api/v1/commerce-events', (req, res) => {
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    if (req.headers['sec-gpc'] === '1' || req.headers.dnt === '1') throw new HttpError(403, 'FORBIDDEN');
    validate(emptyQuerySchema, req.query);
    const value = validate(commerceEventSchema, req.body);
    if (!metrics.recordCommerceEvent(value.event)) throw new HttpError(429, 'RATE_LIMITED');
    res.status(204).end();
  });
  app.use('/api/v1/admin/growth/page',express.json({limit:'64kb',strict:true,inflate:false}));
  app.use(express.json({ limit: '16kb', strict: true, inflate: false }));
  app.all(routes, (_req, res, next) => {
    res.set('Allow', 'GET, HEAD'); next(new HttpError(405, 'METHOD_NOT_ALLOWED'));
  });
  const getDb: GetDb = options.getDb ?? (() => Promise.reject(new HttpError(503, 'SERVICE_UNAVAILABLE')));
  app.use('/api/v1', apiRoutes(getDb, origins, options.development, measurement => {
    options.logger.log(measurement.success ? 'info' : 'warn', 'catalog_query', {
      operation: measurement.operation, durationMs: Math.round(measurement.durationMs * 100) / 100,
      status: measurement.success ? 200 : 500,
    });
  }, metrics, order => {
    try { options.onOrderCreated?.(order); }
    catch { options.logger.log('warn', 'request_failed'); } // Committed commerce never depends on realtime.
  }, options.location));
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND')));
  app.use(errorHandler(options.logger, metrics));
  return app;
}
