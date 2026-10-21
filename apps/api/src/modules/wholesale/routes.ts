import { type Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { emptyQuerySchema, wholesaleAccountSchema, wholesaleTypeSchema, wholesaleTermsSchema, wholesaleCatalogSchema, quoteDtoSchema, checkoutDtoSchema, checkoutInputSchema } from '@almina/contracts';
import type { GetDb } from '../../database.js';
import { validate, noBody } from '../../http/validation.js';
import { verifyBrowserMutation } from '../auth/cookies.js';
import { HttpError } from '../../errors.js';
import { createCommerceService } from '../orders/commerce.js';
import * as store from './repository.js';
export function installWholesaleRoutes(router: Router, getDb: GetDb, origins: string[], admin: (req: Request) => Promise<{
    id: string;
}>, customer: (req: Request) => Promise<{
    id: string;
    email: string;
}>, onOrderCreated?: (order: {
    id: string;
    orderId: string;
}) => void) {
    const commerce = createCommerceService(getDb);
    const send = <T>(res: Response, schema: z.ZodType<T>, data: unknown) => res.json({ data: schema.parse(data), requestId: res.locals.requestId });
    const read = (path: string, handler: (req: Request, res: Response) => Promise<unknown>) => { router.get(path, async (req, res) => { noBody(req); res.set('Cache-Control', 'private, no-store'); await handler(req, res); }); };
    const post = (path: string, handler: (req: Request, res: Response) => Promise<unknown>) => { router.post(path, async (req, res) => { verifyBrowserMutation(req, origins); validate(emptyQuerySchema, req.query); res.set('Cache-Control', 'private, no-store'); await handler(req, res); }); };
    read('/admin/wholesale/types', async (req, res) => { await admin(req); validate(emptyQuerySchema, req.query); return send(res, z.array(wholesaleTypeSchema), await store.wholesaleAdminTypes(await getDb())); });
    post('/admin/wholesale/types', async (req, res) => send(res, z.array(wholesaleTypeSchema), await store.saveWholesaleType(await getDb(), req.body, (await admin(req)).id)));
    read('/admin/wholesale/accounts', async (req, res) => { await admin(req); const input = validate(z.object({ cursor: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict(), req.query); return send(res, z.object({ items: z.array(wholesaleAccountSchema), nextCursor: z.string().nullable() }), await store.wholesaleAdminAccounts(await getDb(), input.cursor)); });
    post('/admin/wholesale/accounts', async (req, res) => send(res, wholesaleAccountSchema, await store.saveWholesaleAccount(await getDb(), req.body, (await admin(req)).id)));
    read('/admin/wholesale/terms', async (req, res) => { await admin(req); const input = validate(z.object({ productId: z.string().regex(/^[a-f0-9]{24}$/i) }).strict(), req.query); return send(res, wholesaleTermsSchema, await store.wholesaleAdminTerms(await getDb(), input.productId)); });
    post('/admin/wholesale/terms', async (req, res) => send(res, wholesaleTermsSchema, await store.saveWholesaleTerms(await getDb(), req.body, (await admin(req)).id)));
    post('/admin/wholesale/invite', async (req, res) => send(res, z.object({ token: z.string(), expiresAt: z.string(), account: wholesaleAccountSchema }), await store.issueWholesaleInvite(await getDb(), req.body, (await admin(req)).id)));
    read('/wholesale/access', async (req, res) => { validate(emptyQuerySchema, req.query); return send(res, z.object({ businessName: z.string(), typeName: z.string() }), await store.wholesaleAccess(await getDb(), await customer(req))); });
    post('/wholesale/accept', async (req, res) => send(res, z.object({ accepted: z.literal(true) }), await store.acceptWholesaleInvite(await getDb(), (await customer(req)).email, req.body)));
    read('/wholesale/catalog', async (req, res) => send(res, wholesaleCatalogSchema, await store.wholesaleCatalog(await getDb(), await customer(req), req.query)));
    post('/wholesale/quote', async (req, res) => { const user = await customer(req); return send(res, quoteDtoSchema, await commerce.quote(req.body, user.id, user)); });
    post('/wholesale/checkout', async (req, res) => { const user = await customer(req); const input = validate(checkoutInputSchema.extend({ acceptedQuoteHash: z.string().regex(/^[a-f0-9]{64}$/) }), req.body); const result = await commerce.checkout(input, user.id, user); res.status(result.replayed ? 200 : 201); send(res, checkoutDtoSchema, result); if (!result.replayed)
        onOrderCreated?.({ id: result.id, orderId: result.orderId }); });
    for (const path of ['/admin/wholesale/types', '/admin/wholesale/accounts', '/admin/wholesale/terms', '/admin/wholesale/invite', '/wholesale/access', '/wholesale/accept', '/wholesale/catalog', '/wholesale/quote', '/wholesale/checkout'])
        router.all(path, (_req, res, next) => { res.set('Allow', path.endsWith('/types') || path.endsWith('/accounts') || path.endsWith('/terms') ? 'GET, HEAD, POST' : path.endsWith('/access') || path.endsWith('/catalog') ? 'GET, HEAD' : 'POST'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
}
