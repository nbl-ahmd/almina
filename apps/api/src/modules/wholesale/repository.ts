import { wholesaleBusinessFields, wholesaleBusinessSchema, wholesaleOrdersSchema } from '@almina/contracts';
import { retainedProductList, retainedCatalogQuery } from '../catalog/compatibility-reads.js';
import { wholesaleAudienceFilter } from '../catalog/audience.js';
import { createHash, randomBytes } from 'node:crypto';
import { ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import { wholesaleAccountInputSchema, wholesaleAccountSchema, wholesaleTypeSchema, wholesaleTermsSchema, wholesaleInviteInputSchema, wholesaleAcceptSchema, wholesaleQuerySchema, wholesaleCatalogSchema } from '@almina/contracts';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { permittedWholesaleProduct, wholesalePrice, decimalMinor } from './policy.js';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const opts = { maxTimeMS: 3000 };
type RecordRow = Document & {
    _id: string;
};
function parse<T>(schema: z.ZodType<T>, raw: unknown): T { const result = schema.safeParse(raw); if (!result.success)
    throw new HttpError(400, 'INVALID_REQUEST'); return result.data; }
function accountDto(row: Document) { return wholesaleAccountSchema.parse(Object.fromEntries([...Object.keys(wholesaleAccountInputSchema.shape).map(key => [key, row[key]]), ['accepted', row.acceptedAt instanceof Date]])); }
async function save(db: Db, collection: string, id: string, fields: Document, revision: number, adminId: string) {
    const rows = db.collection<RecordRow>(collection), now = new Date();
    if (revision === 0) {
        try {
            await rows.insertOne({ ...fields, _id: id, revision: 1, createdAt: now, updatedAt: now, updatedBy: adminId });
        }
        catch (error) {
            if ((error as {
                code?: number;
            }).code === 11000)
                throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
            throw error;
        }
    }
    else {
        const result = await rows.updateOne({ _id: id, revision }, { $set: { ...fields, revision: revision + 1, updatedAt: now, updatedBy: adminId } }, opts);
        if (result.modifiedCount !== 1)
            throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    }
    return rows.findOne({ _id: id }, opts);
}
export async function wholesaleAdminTypes(db: Db) { const rows = await db.collection<RecordRow>('wholesale_types').find({}, opts).sort({ _id: 1 }).limit(50).toArray(); return rows.map(row => wholesaleTypeSchema.parse({ id: row._id, name: row.name, active: row.active, allowMedicines: row.allowMedicines, revision: row.revision })); }
export async function saveWholesaleType(db: Db, raw: unknown, adminId: string) { const input = parse(wholesaleTypeSchema, raw); const { id, revision, ...fields } = input; await save(db, 'wholesale_types', id, fields, revision, adminId); return wholesaleAdminTypes(db); }
export async function wholesaleAdminAccounts(db: Db, after?: string) { const rows = await db.collection<RecordRow>('wholesale_accounts').find(after ? { _id: { $gt: after } } : {}, opts).sort({ _id: 1 }).limit(51).toArray(); return { items: rows.slice(0, 50).map(accountDto), nextCursor: rows.length > 50 ? rows[49]!._id : null }; }
export async function saveWholesaleAccount(db: Db, raw: unknown, adminId: string) { const input = parse(wholesaleAccountInputSchema, raw); const type = await db.collection<RecordRow>('wholesale_types').findOne({ _id: input.typeId, active: true }, opts); if (!type)
    throw new HttpError(400, 'INVALID_REQUEST'); const { revision, ...fields } = input; const row = await save(db, 'wholesale_accounts', digest(input.email), fields, revision, adminId); return accountDto(row!); }
export async function wholesaleAdminTerms(db: Db, id: string) { if (!ObjectId.isValid(id))
    throw new HttpError(400, 'INVALID_REQUEST'); const row = await db.collection<RecordRow>('wholesale_terms').findOne({ _id: id }, opts); return row ? wholesaleTermsSchema.parse({ productId: row._id, enabled: row.enabled, prices: row.prices, revision: row.revision }) : { productId: id, enabled: false, prices: [], revision: 0 }; }
export async function saveWholesaleTerms(db: Db, raw: unknown, adminId: string) { const input = parse(wholesaleTermsSchema, raw); if (!await db.collection('products').findOne({ _id: new ObjectId(input.productId) }, { ...opts, projection: { _id: 1 } }))
    throw new HttpError(404, 'NOT_FOUND'); const types = await wholesaleAdminTypes(db); if (input.prices.some(price => !types.some(type => type.id === price.typeId)))
    throw new HttpError(400, 'INVALID_REQUEST'); const { productId, revision, ...fields } = input; await save(db, 'wholesale_terms', productId, fields, revision, adminId); return wholesaleAdminTerms(db, productId); }
export async function issueWholesaleInvite(db: Db, raw: unknown, adminId: string) { const input = parse(wholesaleInviteInputSchema, raw), token = randomBytes(32).toString('base64url'), expiresAt = new Date(Date.now() + 7 * 86400000); const row = await db.collection<RecordRow>('wholesale_accounts').findOneAndUpdate({ _id: digest(input.email), revision: input.revision, approval: 'approved', acceptedAt: { $exists: false } }, { $set: { inviteHash: digest(token), inviteExpiresAt: expiresAt, updatedAt: new Date(), updatedBy: adminId }, $inc: { revision: 1 } }, { ...opts, returnDocument: 'after' }); if (!row)
    throw new HttpError(409, 'IDEMPOTENCY_CONFLICT'); return { token, expiresAt: expiresAt.toISOString(), account: accountDto(row) }; }
export async function acceptWholesaleInvite(db: Db, email: string, raw: unknown) { const input = parse(wholesaleAcceptSchema, raw); const row = await db.collection<RecordRow>('wholesale_accounts').findOneAndUpdate({ _id: digest(email.toLowerCase()), approval: 'approved', inviteHash: digest(input.token), inviteExpiresAt: { $gt: new Date() }, acceptedAt: { $exists: false } }, { $set: { acceptedAt: new Date(), updatedAt: new Date() }, $unset: { inviteHash: '', inviteExpiresAt: '' }, $inc: { revision: 1 } }, { ...opts, returnDocument: 'after' }); if (!row)
    throw new HttpError(403, 'FORBIDDEN'); return { accepted: true }; }
// Keep session reads sequential: parallel operations on one MongoDB transaction are unsupported.
export async function wholesaleIdentity(db: Db, customerId: string, email: string, session?: ClientSession) { const query = { ...opts, ...(session ? { session } : {}) }; const account = await db.collection<RecordRow>('wholesale_accounts').findOne({ _id: digest(email.toLowerCase()), approval: 'approved', acceptedAt: { $type: 'date' } }, query); const user = await db.collection('customers').findOne({ _id: new ObjectId(customerId), disabled: { $ne: true } }, query); if (!account || !user || String(user.email).toLowerCase() !== email.toLowerCase())
    throw new HttpError(403, 'FORBIDDEN'); accountDto(account); const type = await db.collection<RecordRow>('wholesale_types').findOne({ _id: account.typeId, active: true }, query); if (!type || !wholesaleTypeSchema.safeParse({ id: type._id, name: type.name, active: type.active, allowMedicines: type.allowMedicines, revision: type.revision }).success)
    throw new HttpError(403, 'FORBIDDEN'); return { account, type }; }
export async function wholesaleAccess(db: Db, customer: {
    id: string;
    email: string;
}) { const { account, type } = await wholesaleIdentity(db, customer.id, customer.email); return { businessName: account.businessName, typeName: type.name }; }
export async function prepareWholesaleProducts(db: Db, customer: {
    id: string;
    email: string;
}, products: Document[], items: {
    productId: string;
    quantity: number;
}[], session?: ClientSession) { const { account, type } = await wholesaleIdentity(db, customer.id, customer.email, session), query = { ...opts, ...(session ? { session } : {}) }; const terms = await db.collection<RecordRow>('wholesale_terms').find({ _id: { $in: items.map(item => item.productId) } }, query).toArray(); const categories = await db.collection('categories').find({ _id: { $in: products.map(product => product.category) } }, query).toArray(); return { account, type, products: products.map(product => { const category = categories.find(item => String(item._id) === String(product.category)); if (!category || !permittedWholesaleProduct(account, type, product, category))
        throw new HttpError(409, 'PRODUCT_UNAVAILABLE'); const quantity = items.find(item => item.productId === String(product._id))?.quantity ?? 0, price = wholesalePrice(terms.find(term => term._id === String(product._id)), account.typeId, quantity); return { ...product, price: decimalMinor(price.unitPriceMinor), sale: false, salePrice: 0 }; }) }; }
export async function wholesaleCatalog(db: Db, customer: {
    id: string;
    email: string;
}, raw: unknown) {
    const input = parse(wholesaleQuerySchema, raw), { account, type } = await wholesaleIdentity(db, customer.id, customer.email);
    const escaped = input.q?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rows = await db.collection<RecordRow>('wholesale_terms').aggregate([
        { $match: { enabled: true, prices: { $elemMatch: { typeId: account.typeId } }, ...(input.cursor ? { _id: { $gt: input.cursor } } : {}) } }, { $sort: { _id: 1 } },
        { $lookup: { from: 'products', let: { id: { $convert: { input: '$_id', to: 'objectId', onError: null, onNull: null } } }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$id'] } } }], as: 'product' } }, { $unwind: '$product' },
        { $match: { ...wholesaleAudienceFilter(account.typeId, 'product.'), 'product.disabled': { $ne: true }, 'product.active': { $ne: false }, 'product.published': { $ne: false }, 'product.archivedAt': { $exists: false }, 'product.contentReviewed': true, 'product.productType': { $in: ['general', 'otc', 'prescription'] }, ...(!type.allowMedicines ? { 'product.productType': 'general' } : {}), ...(escaped ? { 'product.name': { $regex: escaped, $options: 'i' } } : {}), ...(account.scope === 'type' ? {} : { $or: [{ _id: { $in: account.productIds ?? [] } }, { 'product.category': { $in: (account.categoryIds ?? []).map((id: string) => new ObjectId(id)) } }] }) } },
        { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } }, { $unwind: '$category' }, { $match: { 'category.disabled': { $ne: true }, 'category.archivedAt': { $exists: false } } }, { $limit: 25 },
        { $project: { _id: 1, prices: 1, 'product._id': 1, 'product.name': 1, 'product.product_id': 1, 'product.stock': 1, 'product.images': 1, 'product.cloudinaryImages': 1, 'category.name': 1 } },
    ], { maxTimeMS: 5000 }).toArray();
    const products = rows.slice(0, 24).flatMap(row => { const price = wholesalePriceSchemaResult(row.prices, account.typeId); if (!price || !Number.isSafeInteger(row.product.stock) || row.product.stock < 0)
        return []; return [{ productId: row._id, sku: row.product.product_id, name: row.product.name, categoryName: row.category.name, stock: row.product.stock, images: (row.product.cloudinaryImages ?? []).filter((value: unknown) => typeof value === 'string').slice(0, 8), price }]; });
    return wholesaleCatalogSchema.parse({ businessName: account.businessName, typeName: type.name, products, nextCursor: rows.length > 24 ? rows[23]!._id : null });
}
function wholesalePriceSchemaResult(prices: Document[], typeId: string) { try {
    return wholesalePrice({ enabled: true, prices }, typeId, prices.find(price => price.typeId === typeId)?.minimumQuantity ?? 0);
}
catch {
    return null;
} }

export async function wholesaleBusiness(db: Db, customer: {id:string;email:string}) {
 const {account,type} = await wholesaleIdentity(db,customer.id,customer.email);
 return wholesaleBusinessSchema.parse({ businessName: account.businessName, typeName: type.name,
   ...Object.fromEntries(Object.keys(wholesaleBusinessFields).map(key=>[key,account[key]])) });
}
export async function wholesaleOrders(db: Db, customer: {id:string;email:string}, raw: unknown) {
 const input = parse(wholesaleQuerySchema.pick({cursor:true}),raw);
 const {account} = await wholesaleIdentity(db,customer.id,customer.email);
 const rows = await db.collection('orders').find({ schemaVersion:2, channel:'wholesale', customerId:customer.id,
   'wholesale.accountId':account._id, ...(input.cursor ? {_id:{$lt:new ObjectId(input.cursor)}} : {}) },
   {...opts,projection:{orderId:1,status:1,createdAt:1,totals:1}}).sort({_id:-1}).limit(21).toArray();
 return wholesaleOrdersSchema.parse({items:rows.slice(0,20),nextCursor:rows.length>20?String(rows[19]!._id):null});
}
export async function wholesaleProductOptions(db: Db, raw: unknown) {
 const input = parse(z.object({q:z.string().trim().min(2).max(80).optional(),ids:z.string().max(499).optional()}).strict().refine(value=>Boolean(value.q)!==Boolean(value.ids)),raw);
 if (input.ids && !/^[a-f0-9]{24}(,[a-f0-9]{24}){0,19}$/i.test(input.ids)) throw new HttpError(400,'INVALID_REQUEST');
 const rows = input.q
   ? await retainedProductList(db,retainedCatalogQuery({q:input.q,limit:'20'},'search'),true)
   : await db.collection('products').aggregate([
     {$match:{_id:{$in:input.ids!.split(',').map(id=>new ObjectId(id))},archivedAt:{$exists:false}}},
     {$lookup:{from:'categories',localField:'category',foreignField:'_id',as:'category'}},{$limit:20},
     {$project:{name:1,product_id:1,'category.name':1}},
   ],opts).toArray();
 return rows.map(row=>({id:String(row._id),name:String(row.name),productId:String(row.product_id),category:String(Array.isArray(row.category)?row.category[0]?.name??'':row.category?.name??'')}));
}
