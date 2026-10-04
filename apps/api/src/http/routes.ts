import { Router, type Request, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { z } from 'zod';
import { emptyQuerySchema, catalogQuerySchema, adminProductQuerySchema, cursorQuerySchema, resourceParamsSchema,
  businessProductParamsSchema, orderQuerySchema, loginBodySchema, productDtoSchema, categoryDtoSchema, bannerDtoSchema,
  storeDtoSchema, staffDtoSchema, loginDtoSchema, orderSummaryDtoSchema, orderDetailDtoSchema, pageSchema, successSchema,
  quoteDtoSchema, checkoutDtoSchema, statusInputSchema, orderStatusSchema, type Staff } from '@almina/contracts';
import { sitemapQuerySchema, sitemapPageSchema } from '@almina/contracts';
import { cookieOptions, cookieName, readSessionCookie, verifyBrowserMutation } from '../../../../backend/security/sessions.cjs';
import { createCommerceService } from '../modules/orders/commerce.js';
import { ObjectId } from 'mongodb';
import { HttpError } from '../errors.js';
import { validate, noBody } from './validation.js';
import { createCatalogRepository } from '../modules/catalog/repository.js';
import type { GetDb } from '../database.js';
import { createAuthService } from '../modules/auth/service.js';
import { createStaffRepository } from '../modules/auth/repository.js';
import { createOrderRepository } from '../modules/orders/repository.js';
import type { CatalogQueryObserver } from '../modules/catalog/timing.js';
import { operationsSnapshotSchema } from '@almina/contracts';
import { operationsSnapshot } from '../modules/operations/snapshot.js';
import type { OperationalMetrics } from '../modules/operations/metrics.js';

export function apiRoutes(getDb: GetDb, webOrigin: string | readonly string[], development = false, observeCatalogQuery?: CatalogQueryObserver, metrics?: OperationalMetrics,
  onOrderCreated?: (order: { id: string; orderId: string }) => void) {
  const router = Router();
  const origins = typeof webOrigin === 'string' ? [webOrigin] : [...webOrigin];
  const catalog = createCatalogRepository(getDb, observeCatalogQuery);
  const auth = createAuthService(getDb);
  const orders = createOrderRepository(getDb);
  const commerce = createCommerceService(getDb);
  const staff = createStaffRepository(getDb);
  function send<T>(res: Parameters<RequestHandler>[1], schema: z.ZodType<T>, data: unknown) {
    // Validate responses too: no raw database fields can leak through the envelope.
    const response = successSchema(schema).parse({ data, requestId: res.locals.requestId });
    if (!res.writableEnded) res.json(response);
  }
  async function identity(req: Request, admin = false): Promise<Staff> {
    const user = await auth.authenticate(readSessionCookie(req.headers, development));
    if (admin && user.role !== 'admin') throw new HttpError(403, 'FORBIDDEN');
    return user;
  }
  function read(route: string, handler: RequestHandler) {
    router.get(route, (req, _res, next) => { noBody(req); next(); }, handler);
    router.all(route, (_req, res, next) => { res.set('Allow', 'GET, HEAD'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
  }
  read('/admin/operations', async (req, res) => {
    await identity(req, true); validate(emptyQuerySchema, req.query);
    if (!metrics) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    send(res, operationsSnapshotSchema, await operationsSnapshot(await getDb(), metrics));
  });
  read('/catalog/products', async (req, res) => {
    send(res, pageSchema(productDtoSchema), await catalog.products(validate(catalogQuerySchema, req.query)));
  });
  read('/catalog/sitemap', async (req, res) => {
    send(res, sitemapPageSchema, await catalog.sitemap(validate(sitemapQuerySchema, req.query)));
  });
  read('/catalog/products/by-business-id/:productId', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    send(res, productDtoSchema, await catalog.product(validate(businessProductParamsSchema, req.params)));
  });
  read('/catalog/products/:id', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    send(res, productDtoSchema, await catalog.product(validate(resourceParamsSchema, req.params)));
  });
  read('/catalog/categories', async (req, res) => {
    send(res, pageSchema(categoryDtoSchema), await catalog.categories(validate(cursorQuerySchema, req.query)));
  });
  read('/catalog/categories/:id', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    send(res, categoryDtoSchema, await catalog.category(validate(resourceParamsSchema, req.params).id));
  });
  read('/catalog/banners', async (req, res) => {
    send(res, pageSchema(bannerDtoSchema), await catalog.banners(validate(cursorQuerySchema, req.query)));
  });
  read('/catalog/store', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    send(res, storeDtoSchema, await catalog.store());
  });
  router.post('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED')) }), async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    const input = validate(loginBodySchema, req.body);
    await auth.limitLogin(input.username, req.ip);
    const login = await auth.login(input);
    const prior = readSessionCookie(req.headers, development);
    if (prior) await auth.logout(prior);
    res.cookie(cookieName(development), login.token, cookieOptions(development));
    send(res, loginDtoSchema, { expiresAt: login.expiresAt, user: login.user });
  });
  router.all('/auth/login', (_req, res, next) => { res.set('Allow', 'POST'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
  read('/auth/me', async (req, res) => {
    const user = await identity(req);
    validate(emptyQuerySchema, req.query);
    send(res, staffDtoSchema, user);
  });
  router.post('/auth/logout', async (req, res) => {
    await identity(req);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    noBody(req); validate(emptyQuerySchema, req.query);
    await auth.logout(readSessionCookie(req.headers, development));
    const { maxAge: _maxAge, ...options } = cookieOptions(development);
    void _maxAge;
    res.clearCookie(cookieName(development), options);
    if (!res.writableEnded) res.status(204).end();
  });
  router.all('/auth/logout', (_req, res, next) => { res.set('Allow', 'POST'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
  router.post('/auth/logout-all', async (req, res) => {
    const user = await identity(req);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    noBody(req); validate(emptyQuerySchema, req.query);
    await auth.revokeUser(new ObjectId(user.id));
    const { maxAge: _maxAge, ...options } = cookieOptions(development);
    void _maxAge;
    res.clearCookie(cookieName(development), options).status(204).end();
  });
  router.all('/auth/logout-all', (_req, res, next) => { res.set('Allow', 'POST'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
  router.post('/checkout/quote', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    send(res, quoteDtoSchema, await commerce.quote(req.body));
  });
  router.post('/checkout', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    const result = await commerce.checkout(req.body);
    res.status(result.replayed ? 200 : 201);
    send(res, checkoutDtoSchema, result);
    if (!result.replayed) onOrderCreated?.({ id: result.id, orderId: result.orderId });
  });
  router.post('/admin/orders/:id/status', async (req, res) => {
    const user = await identity(req);
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    const result = await commerce.transition(validate(resourceParamsSchema, req.params).id, validate(statusInputSchema, req.body), user);
    send(res, statusInputSchema.pick({ status: true }), { status: orderStatusSchema.parse(result?.status) });
  });
  read('/admin/products', async (req, res) => {
    await identity(req, true);
    send(res, pageSchema(productDtoSchema), await catalog.products(validate(adminProductQuerySchema, req.query), true));
  });
  read('/admin/products/:id', async (req, res) => {
    await identity(req, true); validate(emptyQuerySchema, req.query);
    send(res, productDtoSchema, await catalog.product(validate(resourceParamsSchema, req.params), true));
  });
  read('/admin/orders', async (req, res) => {
    const user = await identity(req);
    send(res, pageSchema(orderSummaryDtoSchema), await orders.list(validate(orderQuerySchema, req.query), user));
  });
  read('/admin/orders/:id', async (req, res) => {
    const user = await identity(req); validate(emptyQuerySchema, req.query);
    send(res, orderDetailDtoSchema, await orders.detail(validate(resourceParamsSchema, req.params).id, user));
  });
  read('/admin/users', async (req, res) => {
    const user = await identity(req, true);
    const query = validate(cursorQuerySchema, req.query);
    send(res, pageSchema(staffDtoSchema), await staff.list(query, user));
  });
  return router;
}
