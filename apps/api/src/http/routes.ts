import { adminHomeLayout, catalogueBrandNames, publicBrandNames, publishedHomeLayout, saveHomeLayout } from '../modules/growth/home-layout.js';
import { homeLayoutAdminSchema, homeLayoutSchema } from '@almina/contracts';
import { appliedCouponSchema, couponListQuerySchema, couponListSchema, couponRecordSchema, publicCouponListSchema } from '@almina/contracts';
import { listCoupons, listPublicCoupons, saveCoupon } from '../modules/coupons/service.js';
import { deliveryPointSchema } from '@almina/contracts';
import {stripeCheckoutDtoSchema} from '@almina/contracts';
import type {StripePayments} from '../modules/payments/stripe.js';
import { installSearchRoutes } from '../modules/search/routes.js';
import type { SearchDiagnostic } from '../modules/search/search-types.js';
import {installMarketingRoutes} from '../modules/marketing/routes.js';
import { resolveLegacyMapping,legacyPath } from '../modules/media/legacy-migration.js';
import { installWholesaleRoutes } from '../modules/wholesale/routes.js';
import { homepageCampaigns, reviewCampaign } from '../modules/growth/campaigns.js';
import { campaignReviewSchema, legacyGrowthPageSchema } from '@almina/contracts';
import { createHash as growthHash } from 'node:crypto';
import { retentionPolicySchema, reminderDtoSchema } from '@almina/contracts';
import { retentionPolicy, saveRetentionPolicy, retentionProviderReady, customerReminders, updateCustomerReminder, restoreRecoveryCart, unsubscribeReminder } from '../modules/growth/retention.js';
import { customerMutationQuota } from '../modules/growth/limits.js';
import { rewardsPolicySchema } from '@almina/contracts';
import { rewardsPolicy,saveRewardsPolicy,rewardAccount,referralCode,attachReferral,redeemPoints,confirmRewardDelivery } from '../modules/growth/rewards.js';
import { customerSaved,updateCustomerSaved } from '../modules/growth/saved.js';
import { submitReview,publicReviews,moderateReview } from '../modules/growth/reviews.js';
import { readDeliveryPolicy,saveDeliveryPolicy,previewDelivery } from '../modules/growth/delivery.js';
import { branchDirectory,saveBranchDirectory,readServiceability,saveServiceability } from '../modules/growth/branches.js';
import { branchDirectorySchema, serviceabilityPolicySchema } from '@almina/contracts';
import { commercePolicySchema } from '@almina/contracts';
import { indexSearchBatch,suggestProducts } from '../modules/growth/search.js';
import { customerAuthOptions,customerCookie,customerToken,requestEmailCode,verifyEmailCode,googleSignIn,customerIdentity,customerLogout,customerOrders,saveCustomerPreferences,customerAddresses,updateCustomerAddresses } from '../modules/growth/customers.js';
import { growthPageSchema, pharmacyProfileSchema, growthKinds, growthSlug } from '@almina/contracts';
import { growthPages, growthPage, saveGrowthPage, saveLegacyGrowthPage, pharmacyProfile, savePharmacyProfile } from '../modules/growth/repository.js';
import { z as growthZ } from 'zod';
import { orderCostInputSchema,orderCostViewSchema,growthMetricsResponseSchema } from '@almina/contracts';
import { orderCosts,recordOrderCosts } from '../modules/growth/economics.js';
import { growthMetrics } from '../modules/growth/metrics.js';
import { growthProductOptions,growthCategoryOptions } from '../modules/growth/selectors.js';
import { Router, type Request, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { z } from 'zod';
import { emptyQuerySchema, catalogQuerySchema, adminProductQuerySchema, cursorQuerySchema, resourceParamsSchema,
  businessProductParamsSchema, orderQuerySchema, loginBodySchema, productDtoSchema, categoryDtoSchema, bannerDtoSchema,
  storeDtoSchema, staffDtoSchema, loginDtoSchema, orderSummaryDtoSchema, orderDetailDtoSchema, pageSchema, successSchema,
  quoteDtoSchema, checkoutDtoSchema, statusInputSchema, orderStatusSchema, type Staff } from '@almina/contracts';
import { sitemapQuerySchema, sitemapPageSchema } from '@almina/contracts';
import { cookieOptions, cookieName, readSessionCookie, verifyBrowserMutation } from '../modules/auth/cookies.js';
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
import { reverseLocationDtoSchema, reverseLocationInputSchema, deliveryCoverageDtoSchema } from '@almina/contracts';
import { coverageAt } from '../modules/delivery/service.js';
import { createReverseLocationService, type LocationOptions } from '../modules/location/reverse.js';

export function apiRoutes(getDb: GetDb, webOrigin: string | readonly string[], development = false, observeCatalogQuery?: CatalogQueryObserver, metrics?: OperationalMetrics,
  onOrderCreated?: (order: { id: string; orderId: string }) => void, locationOptions?: LocationOptions, observeSearch?:((measurement:SearchDiagnostic)=>void), payments?:StripePayments) {
  const router = Router();
  const origins = typeof webOrigin === 'string' ? [webOrigin] : [...webOrigin];
  const catalog = createCatalogRepository(getDb, observeCatalogQuery);
  const auth = createAuthService(getDb);
  const orders = createOrderRepository(getDb);
  const commerce = createCommerceService(getDb,payments);
  const staff = createStaffRepository(getDb);
  const location = createReverseLocationService(getDb, locationOptions);
  router.post('/checkout/location', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    const input = validate(reverseLocationInputSchema, req.body);
    send(res, reverseLocationDtoSchema, await location.lookup(input));
  });
  router.post('/checkout/coverage', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    const input = validate(reverseLocationInputSchema, req.body);
    send(res, deliveryCoverageDtoSchema, await coverageAt(await getDb(), input));
  });
  router.all('/checkout/coverage', (_req, res, next) => { res.set('Allow', 'POST'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
  router.all('/checkout/location', (_req, res, next) => { res.set('Allow', 'POST'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
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
  installSearchRoutes(router,getDb,origins,identity,observeSearch);
  function read(route: string, handler: RequestHandler) {
    router.get(route, (req, _res, next) => { noBody(req); next(); }, handler);
    router.all(route, (_req, res, next) => { res.set('Allow', 'GET, HEAD'); next(new HttpError(405, 'METHOD_NOT_ALLOWED')); });
  }
  read('/payments/stripe/availability',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,growthZ.object({available:growthZ.boolean(),ready:growthZ.boolean(),testMode:growthZ.boolean()}).strict(),payments?await payments.availability():{available:false,ready:false,testMode:true});});
  read('/admin/operations', async (req, res) => {
    await identity(req, true); validate(emptyQuerySchema, req.query);
    if (!metrics) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    send(res, operationsSnapshotSchema, await operationsSnapshot(await getDb(), metrics));
  });
  read('/catalog/legacy-media',async(req,res)=>{const query=validate(growthZ.object({path:growthZ.string().max(240).regex(legacyPath)}).strict(),req.query);send(res,growthZ.object({target:growthZ.string().nullable()}),{target:await resolveLegacyMapping(await getDb(),query.path,process.env.CLOUDINARY_CLOUD_NAME)});});
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
  router.post('/growth/coupon-preview', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins);
    send(res, appliedCouponSchema, await commerce.previewCoupon(req.body));
  });
  // Public "Coupons & offers": only codes staff marked as listed, live now. Short shared cache; prices are never in it.
  router.get('/growth/coupons', async (req, res) => {
    noBody(req); validate(emptyQuerySchema, req.query);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    send(res, publicCouponListSchema, await listPublicCoupons(await getDb()));
  });
  router.get('/admin/growth/coupons', async (req, res) => {
    noBody(req);
    await identity(req, true);
    const query = validate(couponListQuerySchema, req.query);
    send(res, couponListSchema, await listCoupons(await getDb(), query.after));
  });
  router.post('/admin/growth/coupons', async (req, res) => {
    const user = await identity(req, true);
    verifyBrowserMutation(req, origins);
    validate(emptyQuerySchema, req.query);
    send(res, couponRecordSchema, await saveCoupon(await getDb(), req.body, user.id));
  });
  router.post('/checkout/quote', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    send(res, quoteDtoSchema, await commerce.quote(req.body,req.body?.voucherCode?(await sessionCustomer(req)).id:undefined));
  });
  for(const action of ['start','status','cancel'] as const) router.post('/payments/stripe/'+action,async(req,res)=>{
    validate(emptyQuerySchema,req.query);verifyBrowserMutation(req,origins,()=>new HttpError(403,'FORBIDDEN'));
    if(!payments)throw new HttpError(404,'NOT_FOUND');
    const result=action==='start'?await payments.start(req.body):await payments.status(req.body,action==='cancel');
    send(res,stripeCheckoutDtoSchema,result);
  });
  router.post('/checkout', async (req, res) => {
    validate(emptyQuerySchema, req.query);
    verifyBrowserMutation(req, origins, () => new HttpError(403, 'FORBIDDEN'));
    const result = await commerce.checkout(req.body,req.body?.voucherCode?(await sessionCustomer(req)).id:undefined);
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
  const customerAuthLimit=rateLimit({windowMs:15*60*1000,limit:20,keyGenerator:req=>growthHash('sha256').update(String(req.body?.email??req.body?.challenge??req.body?.idToken??'invalid').trim().toLowerCase()).digest('hex'),standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,_res,next)=>next(new HttpError(429,'RATE_LIMITED'))});
  const limitedCustomer=async(req:Request)=>{const db=await getDb(),customer=await sessionCustomer(req);await customerMutationQuota(db,customer.id);return customer;};
  const sessionCustomer=async(req:Request)=>customerIdentity(await getDb(),customerToken(req.headers.cookie,development));
  read('/customers/reminders',async(req,res)=>{validate(emptyQuerySchema,req.query);const customer=await sessionCustomer(req);send(res,growthZ.array(reminderDtoSchema),await customerReminders(await getDb(),customer.id));});
  router.post('/customers/reminders',async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const customer=await limitedCustomer(req);send(res,growthZ.array(reminderDtoSchema),await updateCustomerReminder(await getDb(),customer.id,req.body));});
  router.all('/customers/reminders',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.post('/customers/recovery-cart',async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const customer=await limitedCustomer(req);send(res,growthZ.array(growthZ.object({id:growthZ.string(),quantity:growthZ.number().int().positive()})),await restoreRecoveryCart(await getDb(),customer.id,req.body));});
  router.all('/customers/recovery-cart',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  read('/growth/reminder-options',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,retentionPolicySchema.extend({deliveryReady:growthZ.boolean()}),{...await retentionPolicy(await getDb()),deliveryReady:retentionProviderReady()});});
  router.post('/growth/unsubscribe',rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false}),async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const input=validate(growthZ.object({token:growthZ.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict(),req.body);send(res,growthZ.object({cancelled:growthZ.literal(true)}),await unsubscribeReminder(await getDb(),input.token));});
  router.all('/growth/unsubscribe',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.get('/admin/growth/retention',async(req,res)=>{noBody(req);validate(emptyQuerySchema,req.query);await identity(req,true);send(res,retentionPolicySchema.extend({deliveryReady:growthZ.boolean()}),{...await retentionPolicy(await getDb()),deliveryReady:retentionProviderReady()});});
  router.post('/admin/growth/retention',async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const user=await identity(req,true);send(res,retentionPolicySchema,await saveRetentionPolicy(await getDb(),req.body,user.id));});
  router.all('/admin/growth/retention',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  const customerSchema=growthZ.object({id:growthZ.string(),email:growthZ.email(),marketingEmail:growthZ.boolean().optional(),marketingWhatsapp:growthZ.boolean().optional()});
  read('/customers/options',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,growthZ.object({googleClientId:growthZ.string().nullable(),emailEnabled:growthZ.boolean()}),customerAuthOptions());});
  read('/customers/me',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,customerSchema,await sessionCustomer(req));});
  read('/customers/orders',async(req,res)=>{validate(emptyQuerySchema,req.query);const customer=await sessionCustomer(req);const orders=await customerOrders(await getDb(),customer);send(res,growthZ.array(growthZ.object({channel:growthZ.literal('wholesale').optional(),orderId:growthZ.string(),status:growthZ.string(),createdAt:growthZ.coerce.date(),totals:growthZ.object({totalMinor:growthZ.number().int().nonnegative(),lines:growthZ.array(growthZ.object({productId:growthZ.string(),name:growthZ.string(),quantity:growthZ.number().int()}))})})),orders);});
  const addressDto=growthZ.object({coordinates:deliveryPointSchema.optional(),id:growthZ.string().uuid(),label:growthZ.string(),name:growthZ.string(),mobile:growthZ.string(),emirate:growthZ.string(),city:growthZ.string(),address:growthZ.string(),buildingname:growthZ.string(),flatno:growthZ.string(),note:growthZ.string(),maplink:growthZ.string(),isDefault:growthZ.boolean(),createdAt:growthZ.coerce.date()});
  read('/customers/addresses',async(req,res)=>{validate(emptyQuerySchema,req.query);const customer=await sessionCustomer(req);send(res,growthZ.array(addressDto),await customerAddresses(await getDb(),customer.id));});
  router.post('/customers/addresses',async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const customer=await limitedCustomer(req);send(res,growthZ.array(addressDto),await updateCustomerAddresses(await getDb(),customer.id,req.body));});
  router.all('/customers/addresses',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  for(const action of ['email','verify','google','logout','preferences'] as const){
    router.post(`/customers/${action}`,...(['email','verify','google'].includes(action)?[customerAuthLimit]:[]),async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);
      if(action==='email'){send(res,growthZ.object({challenge:growthZ.string()}),await requestEmailCode(await getDb(),req.body));return;}
      if(action==='verify'||action==='google'){const login=action==='verify'?await verifyEmailCode(await getDb(),req.body):await googleSignIn(await getDb(),req.body);res.cookie(customerCookie(development),login.token,{httpOnly:true,secure:!development,sameSite:'lax',path:'/',maxAge:30*86400000});send(res,customerSchema,login.customer);return;}
      if(action==='logout'){validate(emptyQuerySchema,req.body);await customerLogout(await getDb(),customerToken(req.headers.cookie,development));res.clearCookie(customerCookie(development),{httpOnly:true,secure:!development,sameSite:'lax',path:'/'});res.status(204).end();return;}
      const customer=await limitedCustomer(req);
      send(res,growthZ.object({marketingEmail:growthZ.boolean(),marketingWhatsapp:growthZ.boolean()}),await saveCustomerPreferences(await getDb(),customer.id,req.body));
    });
    router.all(`/customers/${action}`,(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  }
  read('/growth/suggest',async(req,res)=>{const input=validate(growthZ.object({q:growthZ.string().trim().min(2).max(80)}).strict(),req.query);send(res,growthZ.array(growthZ.object({id:growthZ.string(),name:growthZ.string(),productId:growthZ.string(),category:growthZ.string()})),await suggestProducts(await getDb(),input.q));});
  router.post('/admin/growth/search-index',async(req,res)=>{await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const input=validate(growthZ.object({cursor:growthZ.string().regex(/^[a-f0-9]{24}$/).optional()}).strict(),req.body);send(res,growthZ.object({processed:growthZ.number(),nextCursor:growthZ.string().nullable()}),await indexSearchBatch(await getDb(),input.cursor));});
  router.all('/admin/growth/search-index',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.get('/admin/growth/delivery',async(req,res)=>{noBody(req);await identity(req,true);validate(emptyQuerySchema,req.query);send(res,commercePolicySchema,await readDeliveryPolicy(await getDb()));});
  router.post('/admin/growth/delivery',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,commercePolicySchema,await saveDeliveryPolicy(await getDb(),req.body,user.id));});
  router.all('/admin/growth/delivery',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.post('/growth/delivery',async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,growthZ.object({emirate:growthZ.string(),subtotalMinor:growthZ.number(),deliveryFeeMinor:growthZ.number(),freeAboveMinor:growthZ.number().nullable(),remainingMinor:growthZ.number().nullable(),policyVersion:growthZ.string()}),await previewDelivery(await getDb(),req.body));});
  router.all('/growth/delivery',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  // Public, read-only delivery terms for the shipping policy page and Product JSON-LD.
  // No customer, order or credential data is stored in or returned from this collection.
  read('/growth/shipping',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,commercePolicySchema,await readDeliveryPolicy(await getDb()));});
  read('/growth/branches',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,branchDirectorySchema,await branchDirectory(await getDb()));});
  router.get('/admin/growth/branches',async(req,res)=>{noBody(req);await identity(req,true);validate(emptyQuerySchema,req.query);send(res,branchDirectorySchema,await branchDirectory(await getDb(),true));});
  router.post('/admin/growth/branches',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,branchDirectorySchema,await saveBranchDirectory(await getDb(),req.body,user.id));});
  router.all('/admin/growth/branches',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.get('/admin/growth/serviceability',async(req,res)=>{noBody(req);await identity(req,true);validate(emptyQuerySchema,req.query);send(res,serviceabilityPolicySchema,await readServiceability(await getDb()));});
  router.post('/admin/growth/serviceability',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,serviceabilityPolicySchema,await saveServiceability(await getDb(),req.body,user.id));});
  router.all('/admin/growth/serviceability',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  const reviewsSchema=growthZ.object({items:growthZ.array(growthZ.object({rating:growthZ.number().int(),displayName:growthZ.string(),title:growthZ.string(),body:growthZ.string(),createdAt:growthZ.coerce.date(),verifiedPurchase:growthZ.literal(true)})),ratingCount:growthZ.number().int(),average:growthZ.number().nullable()});
  read('/growth/reviews',async(req,res)=>{const query=validate(growthZ.object({productId:growthZ.string().regex(/^[a-f0-9]{24}$/i)}).strict(),req.query);send(res,reviewsSchema,await publicReviews(await getDb(),query.productId));});
  router.get('/customers/saved',async(req,res)=>{noBody(req);validate(emptyQuerySchema,req.query);const customer=await sessionCustomer(req);send(res,growthZ.object({ids:growthZ.array(growthZ.string())}),await customerSaved(await getDb(),customer.id));});
  for(const action of ['saved','review'] as const){router.post(`/customers/${action}`,...(['email','verify','google'].includes(action)?[customerAuthLimit]:[]),async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const customer=await limitedCustomer(req);if(action==='saved')send(res,growthZ.object({ids:growthZ.array(growthZ.string())}),await updateCustomerSaved(await getDb(),customer.id,req.body));else send(res,growthZ.object({status:growthZ.literal('pending')}),await submitReview(await getDb(),customer,req.body));});router.all(`/customers/${action}`,(_req,res,next)=>{res.set('Allow',action==='saved'?'GET, HEAD, POST':'POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});}
  read('/admin/growth/reviews',async(req,res)=>{await identity(req,true);validate(emptyQuerySchema,req.query);const rows=await(await getDb()).collection('product_reviews').find({moderation:'pending'},{maxTimeMS:3000,projection:{customerId:0,orderId:0}}).sort({createdAt:1}).limit(50).toArray();send(res,growthZ.array(growthZ.object({_id:growthZ.string(),productId:growthZ.string(),rating:growthZ.number(),displayName:growthZ.string(),title:growthZ.string(),body:growthZ.string(),verifiedPurchase:growthZ.literal(true),moderation:growthZ.literal('pending'),createdAt:growthZ.coerce.date()})),rows);});
  router.post('/admin/growth/review',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,growthZ.object({status:growthZ.enum(['approved','rejected'])}),await moderateReview(await getDb(),req.body,user.id));});
  router.all('/admin/growth/review',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.get('/admin/growth/order-costs',async(req,res)=>{noBody(req);await identity(req,true);const input=validate(growthZ.object({orderId:growthZ.string().regex(/^[a-f0-9]{24}$/i)}).strict(),req.query);send(res,orderCostViewSchema,await orderCosts(await getDb(),input.orderId));});
  router.post('/admin/growth/order-costs',async(req,res)=>{verifyBrowserMutation(req,origins);const actor=await identity(req,true);validate(emptyQuerySchema,req.query);send(res,orderCostViewSchema,await recordOrderCosts(await getDb(),validate(orderCostInputSchema,req.body),actor.id));});
  router.all('/admin/growth/order-costs',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  read('/admin/growth/metrics',async(req,res)=>{await identity(req,true);const input=validate(growthZ.object({days:growthZ.coerce.number().int().refine(value=>[7,30,90].includes(value))}).strict(),req.query);const result=await growthMetrics(await getDb(),input);send(res,growthMetricsResponseSchema,result);});
  router.get('/admin/growth/rewards',async(req,res)=>{noBody(req);await identity(req,true);validate(emptyQuerySchema,req.query);send(res,rewardsPolicySchema,await rewardsPolicy(await getDb()));});
  router.post('/admin/growth/rewards',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,rewardsPolicySchema,await saveRewardsPolicy(await getDb(),req.body,user.id));});
  router.all('/admin/growth/rewards',(_req,res,next)=>{res.set('Allow','GET, HEAD, POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  router.post('/admin/growth/delivered',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,growthZ.object({awarded:growthZ.number().int(),replayed:growthZ.boolean()}),await confirmRewardDelivery(await getDb(),req.body,user.id));});
  router.all('/admin/growth/delivered',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  read('/customers/rewards',async(req,res)=>{validate(emptyQuerySchema,req.query);const user=await sessionCustomer(req);const data=await rewardAccount(await getDb(),user.id);send(res,growthZ.object({enabled:growthZ.boolean(),points:growthZ.number().int(),pointsPerAed:growthZ.number().int(),pointsPerVoucher:growthZ.number().int(),voucherValueMinor:growthZ.number().int(),minimumSpendMinor:growthZ.number().int(),voucherDays:growthZ.number().int(),terms:growthZ.string(),referralCode:growthZ.string().nullable(),vouchers:growthZ.array(growthZ.object({code:growthZ.string(),valueMinor:growthZ.number(),expiresAt:growthZ.coerce.date(),minimumSpendMinor:growthZ.number()}))}),data);});
  for(const action of ['redeem','referral-code','referral'] as const){router.post('/customers/'+action,async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const user=await limitedCustomer(req),db=await getDb();if(action==='redeem')send(res,growthZ.object({code:growthZ.string(),valueMinor:growthZ.number(),expiresAt:growthZ.coerce.date()}),await redeemPoints(db,user.id,req.body));else if(action==='referral-code'){validate(emptyQuerySchema,req.body);send(res,growthZ.object({code:growthZ.string()}),await referralCode(db,user.id));}else send(res,growthZ.object({attached:growthZ.boolean()}),await attachReferral(db,user,req.body));});router.all('/customers/'+action,(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});}
  const growthQuery=growthZ.object({kind:growthZ.enum(growthKinds).optional(),locale:growthZ.enum(['en','ar']).default('en'),offset:growthZ.coerce.number().int().min(0).max(10000).default(0),merchandising:growthZ.literal('1').optional()}).strict();
  const pageQuery=growthZ.object({kind:growthZ.enum(growthKinds),slug:growthSlug,locale:growthZ.enum(['en','ar']).default('en'),merchandising:growthZ.literal('1').optional()}).strict();
  const growthList=(modern:boolean)=>growthZ.object({items:growthZ.array(modern?growthPageSchema:legacyGrowthPageSchema),hasNext:growthZ.boolean()});
  read('/growth/campaigns',async(req,res)=>{const query=validate(growthZ.object({locale:growthZ.enum(['en','ar']).default('en')}).strict(),req.query);send(res,growthZ.array(growthPageSchema).max(24),await homepageCampaigns(await getDb(),query.locale));});
  router.post('/admin/growth/campaign-review',async(req,res)=>{await identity(req,true);validate(emptyQuerySchema,req.query);verifyBrowserMutation(req,origins);send(res,campaignReviewSchema,await reviewCampaign(await getDb(),req.body));});
  router.all('/admin/growth/campaign-review',(_req,res,next)=>{res.set('Allow','POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  read('/growth/pages',async(req,res)=>{const query=validate(growthQuery,req.query);send(res,growthList(query.merchandising==='1'),await growthPages(await getDb(),false,query.kind,query.locale,query.offset));});
  read('/growth/page',async(req,res)=>{const query=validate(pageQuery,req.query);send(res,query.merchandising==='1'?growthPageSchema:legacyGrowthPageSchema,await growthPage(await getDb(),query.kind,query.slug,query.locale));});
  read('/growth/profile',async(req,res)=>{validate(emptyQuerySchema,req.query);send(res,pharmacyProfileSchema,await pharmacyProfile(await getDb()));});
  read('/admin/growth/pages',async(req,res)=>{await identity(req,true);const query=validate(growthQuery,req.query);send(res,growthList(query.merchandising==='1'),await growthPages(await getDb(),true,query.kind,query.locale,query.offset));});
  read('/admin/growth/products',async(req,res)=>{await identity(req,true);const query=validate(growthZ.object({q:growthZ.string().trim().min(2).max(80).optional(),ids:growthZ.string().max(499).optional()}).strict(),req.query);send(res,growthZ.array(growthZ.object({id:growthZ.string(),name:growthZ.string(),productId:growthZ.string(),category:growthZ.string()})),await growthProductOptions(await getDb(),query));});
  read('/admin/growth/categories',async(req,res)=>{await identity(req,true);validate(emptyQuerySchema,req.query);send(res,growthZ.array(growthZ.object({id:growthZ.string(),name:growthZ.string()})),await growthCategoryOptions(await getDb()));});
  router.get('/admin/growth/profile',async(req,res)=>{noBody(req);await identity(req,true);validate(emptyQuerySchema,req.query);send(res,pharmacyProfileSchema,await pharmacyProfile(await getDb(),true));});
  for(const part of ['page','profile'] as const) {
    router.post(`/admin/growth/${part}`,async(req,res)=>{const user=await identity(req,true);const query=validate(part==='page'?growthZ.object({merchandising:growthZ.literal('1').optional()}).strict():emptyQuerySchema,req.query);verifyBrowserMutation(req,origins);if(part==='page'){const modern='merchandising' in query&&query.merchandising==='1';send(res,modern?growthPageSchema:legacyGrowthPageSchema,await (modern?saveGrowthPage:saveLegacyGrowthPage)(await getDb(),req.body,user.id));}else send(res,pharmacyProfileSchema,await savePharmacyProfile(await getDb(),req.body,user.id));});
    router.all(`/admin/growth/${part}`,(_req,res,next)=>{res.set('Allow',part==='profile'?'GET, HEAD, POST':'POST');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
  }
  // Homepage sections (Website & growth → Homepage). Public read returns the published layout or 404 (use built-in homepage).
  const layoutQuery=growthZ.object({locale:growthZ.enum(['en','ar']).default('en')}).strict();
  read('/growth/home-layout',async(req,res)=>{const query=validate(layoutQuery,req.query);const layout=await publishedHomeLayout(await getDb(),query.locale);if(!layout)throw new HttpError(404,'NOT_FOUND');send(res,homeLayoutSchema,layout);});
  read('/admin/growth/home-layout',async(req,res)=>{await identity(req,true);const query=validate(layoutQuery,req.query);send(res,homeLayoutAdminSchema,await adminHomeLayout(await getDb(),query.locale));});
  router.post('/admin/growth/home-layout',async(req,res)=>{const user=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);send(res,homeLayoutAdminSchema,await saveHomeLayout(await getDb(),req.body,user.id));});
  read('/growth/brands',async(req,res)=>{validate(emptyQuerySchema,req.query);res.set('Cache-Control','public, max-age=60, stale-while-revalidate=120');send(res,growthZ.array(growthZ.string()).max(2000),await publicBrandNames(await getDb()));});
  read('/admin/growth/brands',async(req,res)=>{await identity(req,true);validate(emptyQuerySchema,req.query);send(res,growthZ.array(growthZ.string()).max(2000),await catalogueBrandNames(await getDb()));});
  installMarketingRoutes(router,getDb,origins,identity);
  installWholesaleRoutes(router,getDb,origins,req=>identity(req,true),req=>limitedCustomer(req),onOrderCreated);
  return router;
}
