import { retailAudienceFilter } from './audience.js';
import { productContentNames } from '@almina/contracts';
import { z } from 'zod';
import { ObjectId, type Db, type Document } from 'mongodb';
import { familyFieldNames, familyProfile, sameFamilyIdentity, productBusinessIdSchema } from '@almina/contracts';
import { HttpError } from '../../errors.js';

const mongo = z.string().regex(/^[a-f0-9]{24}$/i);
const page = z.string().regex(/^\d{1,5}$/).transform(Number);
const fields = z.object({ disabled: z.boolean().optional(), featured: z.boolean().optional(), sale: z.boolean().optional(),
  category: mongo.optional(), stock: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional() }).strict();
const options = { maxTimeMS: 3000, allowDiskUse: false };
const categoryProjection = { _id: 1, name: 1, image: 1, gdriveFileId: 1, color: 1, disabled: 1, createdAt: 1 };
export const compatibilityProductProjection = { ...Object.fromEntries([...familyFieldNames,...productContentNames,'catalogManaged','stockReviewedAt','websiteStockProposed'].map(key=>[key,1])), _id: 1, product_id: 1, category: 1, name: 1, barcode: 1, image: 1, images: 1, cloudinaryImages: 1,
  gdriveFileId: 1, gdriveFileIds: 1, price: 1, stock: 1, vat: 1, sale: 1, featured: 1, disabled: 1, published: 1,
  salePrice: 1, salePercent: 1, saleBadge: 1, saleType: 1, description: 1, familyOptionCount:1,familyPriceVaries:1, createdAt: 1, updatedAt: 1, mediaRevision: 1 };
function validate<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw); if (!result.success) throw new HttpError(400, 'INVALID_REQUEST'); return result.data;
}
export function retainedCatalogQuery(raw: unknown, kind: 'products' | 'search' | 'categories') {
  const value = validate(z.object({ filter: z.string().max(2000).optional(),
    limit: page.pipe(z.number().int().min(1).max(kind === 'categories' ? 1000 : 100)).optional(),
    offset: page.pipe(z.number().int().nonnegative().max(10000)).optional(),
    disabledCat: z.enum(['true', 'false']).optional(), groupFamilies: z.enum(['true','false']).optional(), q: z.string().min(1).max(80).optional(),
    inStock: z.enum(['true','false']).optional(), minPrice: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/).optional(),
    maxPrice: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/).optional(), sort: z.enum(['relevance','price-asc','price-desc','name']).optional(),
  }).strict(), raw);
  if (kind === 'search' && value.q === undefined || kind !== 'search' && value.q !== undefined
    || kind === 'categories' && (value.disabledCat !== undefined || value.inStock !== undefined || value.minPrice !== undefined || value.maxPrice !== undefined || value.sort !== undefined)) throw new HttpError(400, 'INVALID_REQUEST');
  let parts: unknown;
  try { parts = value.filter === undefined ? {} : JSON.parse(value.filter); } catch { throw new HttpError(400, 'INVALID_REQUEST'); }
  const values = kind === 'search' && Array.isArray(parts) ? parts : [parts];
  if (values.length > 10) throw new HttpError(400, 'INVALID_REQUEST');
  let filter: z.infer<typeof fields> = {};
  for (const part of values) filter = { ...filter, ...validate(kind === 'categories' ? fields.pick({ disabled: true }) : fields, part) };
  const minPrice = value.minPrice === undefined ? undefined : Number(value.minPrice);
  const maxPrice = value.maxPrice === undefined ? undefined : Number(value.maxPrice);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new HttpError(400, 'INVALID_REQUEST');
  return { filter, limit: value.limit ?? (kind === 'categories' ? 1000 : 30), offset: value.offset ?? 0,
    disabledCategory: value.disabledCat, q: value.q, groupFamilies:value.groupFamilies==='true',
    inStock: value.inStock === undefined ? undefined : value.inStock === 'true', minPrice, maxPrice,
    sort: value.sort ?? 'relevance' };
}
type Query = Omit<ReturnType<typeof retainedCatalogQuery>,'groupFamilies'> & {groupFamilies?:boolean};
const published = { ...retailAudienceFilter, disabled: { $ne: true }, published: { $ne: false }, active: { $ne: false } };
function match(query: Query, staff: boolean): Document {
  const { category, ...filters } = query.filter;
  const priceBounds = query.minPrice !== undefined || query.maxPrice !== undefined
    ? { ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}) } : undefined;
  const currentPrice = { $cond: [{ $and: [{ $eq: ['$sale', true] }, { $isNumber: '$salePrice' }, { $gte: ['$salePrice', 0] }, { $lte: ['$salePrice', '$price'] }] }, '$salePrice', '$price'] };
  return { $and: [{ ...filters, ...(category ? { category: new ObjectId(category) } : {}) },
    ...(priceBounds ? [{ price: { $type: 'number', $gte: 0 } }, { $expr: { $and: [
      ...(priceBounds.$gte !== undefined ? [{ $gte: [currentPrice, priceBounds.$gte] }] : []),
      ...(priceBounds.$lte !== undefined ? [{ $lte: [currentPrice, priceBounds.$lte] }] : []),
    ] } }] : []),
    ...(query.inStock === true ? [{ stock: { $gt: 0 } }] : []),
    ...(query.inStock === false ? [{ stock: { $lte: 0 } }] : []),
    { archivedAt: { $exists: false }, ...(staff ? {} : published) },
    ...(query.q ? [{ $or: ['name', 'description'].map(field => ({ [field]: { $regex: query.q!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) }] : []),
  ] };
}
function categoryJoin(staff: boolean, disabledCategory?: 'true' | 'false'): Document[] {
  const filter = { archivedAt: { $exists: false }, ...(staff ? {} : { disabled: { $ne: true } }) };
  return [{ $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category',
    pipeline: [{ $match: filter }, { $project: categoryProjection }] } },
  { $unwind: { path: '$category', preserveNullAndEmptyArrays: staff && disabledCategory === undefined } },
  ...(disabledCategory !== undefined ? [{ $match: { 'category.disabled': disabledCategory === 'true' ? true : { $ne: true } } }] : [])];
}
export function familyListingStages(): Document[] {
  return [
    {$set:{_familySortPrice:{$cond:[{$and:[{$eq:['$sale',true]},{$isNumber:'$salePrice'},{$gte:['$salePrice',0]},{$lte:['$salePrice','$price']}]},'$salePrice','$price']},_familyAvailable:{$cond:[{$gt:['$stock',0]},0,1]}}},
    {$sort:{_familyAvailable:1,_familySortPrice:1,_id:1}},
    {$group:{_id:{$cond:[{$and:[{$eq:[{$type:'$familyKey'},'string']},{$ne:['$familyKey','']}]},{$concat:['family:','$familyKey']},'$_id']},product:{$first:'$$ROOT'},count:{$sum:1},minPrice:{$min:'$_familySortPrice'},maxPrice:{$max:'$_familySortPrice'}}},
    {$replaceRoot:{newRoot:{$mergeObjects:['$product',{familyOptionCount:'$count',familyPriceVaries:{$ne:['$minPrice','$maxPrice']}}]}}},
  ];
}
export async function retainedProductList(db: Db, query: Query, staff = false) {
  return db.collection('products').aggregate([{ $match: match(query, staff) }, ...categoryJoin(staff, query.disabledCategory),
    ...(!query.groupFamilies && (query.sort === 'price-asc' || query.sort === 'price-desc') ? [{$set:{_familySortPrice:{$cond:[{$and:[{$eq:['$sale',true]},{$isNumber:'$salePrice'},{$gte:['$salePrice',0]},{$lte:['$salePrice','$price']}]},'$salePrice','$price']}}}] : []),
    ...(query.groupFamilies&&!staff?familyListingStages():[]),
    { $sort: query.sort === 'price-asc' ? { _familySortPrice: 1, price: 1, _id: 1 }
      : query.sort === 'price-desc' ? { _familySortPrice: -1, price: -1, _id: 1 }
      : query.sort === 'name' ? { name: 1, _id: 1 }
      : query.filter.sale ? { createdAt: -1, _id: 1 } : { stock: -1, _id: 1 } },
    { $skip: query.offset }, { $limit: query.limit }, { $project: compatibilityProductProjection }], options).toArray();
}
export async function retainedProductDetail(db: Db, identifier: { id: string } | { productId: string }, staff = false) {
  const filter = 'id' in identifier ? { _id: new ObjectId(validate(mongo, identifier.id)) }
    : { product_id: validate(productBusinessIdSchema, identifier.productId) };
  const products = await db.collection('products').aggregate([{ $match: { ...filter, archivedAt: { $exists: false }, ...(staff ? {} : published) } },
    ...categoryJoin(staff), { $limit: 1 }, { $project: compatibilityProductProjection }], options).toArray();
  const product = products[0]; if (!product) throw new HttpError(404, 'NOT_FOUND');
  if ('id' in identifier) return { ...product, category: product.category?._id ?? null };
  const relatedProducts = product.category?._id ? (await retainedProductList(db, { filter: { category: String(product.category._id) }, limit: 31, offset: 0, q: undefined, disabledCategory: undefined, inStock: undefined, minPrice: undefined, maxPrice: undefined, sort: 'relevance' }, staff))
    .filter(value => String(value._id) !== String(product._id)).slice(0, 30) : [];
  const profile = familyProfile(product);
  const variants = profile ? (await db.collection('products').aggregate([
    { $match: {familyKey:profile.familyKey,category:product.category._id,archivedAt:{$exists:false},...(staff?{}:published)} },
    ...categoryJoin(staff), {$sort:{product_id:1}}, {$limit:61}, {$project:compatibilityProductProjection},
  ],options).toArray()).filter(member=>{const other=familyProfile(member);return other&&sameFamilyIdentity({...profile,name:product.name},{...other,name:member.name});}).slice(0,60) : [];
  return { product, relatedProducts, variants };
}
export async function retainedCategoryList(db: Db, query: Query, staff = false) {
  return db.collection('categories').find({ $and: [query.filter, { archivedAt: { $exists: false }, ...(staff ? {} : { disabled: { $ne: true } }) }] },
    { projection: categoryProjection, maxTimeMS: 3000 }).sort({ name: 1, _id: 1 }).skip(query.offset).limit(query.limit).toArray();
}
export async function retainedCategoryDetail(db: Db, id: string, staff = false) {
  const category = await db.collection('categories').findOne({ _id: new ObjectId(validate(mongo, id)), archivedAt: { $exists: false }, ...(staff ? {} : { disabled: { $ne: true } }) },
    { projection: categoryProjection, maxTimeMS: 3000 });
  if (!category) throw new HttpError(404, 'NOT_FOUND'); return category;
}
