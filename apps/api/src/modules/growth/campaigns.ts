import { ObjectId, type Db, type Document } from 'mongodb';
import { campaignState, growthPageSchema, hasProductPhoto, campaignImageUrl, type GrowthPage, type CampaignReview } from '@almina/contracts';
import { HttpError } from '../../errors.js';

type ProductSnapshot = Document & { _id: ObjectId; categories: Document[] };
async function snapshots(db: Db, ids: string[]): Promise<ProductSnapshot[]> {
  if (!ids.length) return [];
  return db.collection('products').aggregate<ProductSnapshot>([
    { $match: { _id: { $in: [...new Set(ids)].map(id => new ObjectId(id)) } } },
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categories', pipeline: [{ $project: { disabled: 1, archivedAt: 1 } }] } },
    { $project: { name: 1, published: 1, disabled: 1, active: 1, archivedAt: 1, stock: 1, image: 1, images: 1, cloudinaryImages: 1, gdriveFileIds: 1, categories: 1 } },
  ], { maxTimeMS: 3000 }).toArray();
}
function available(row: ProductSnapshot | undefined): row is ProductSnapshot {
  return !!row && row.published !== false && row.disabled !== true && row.active !== false && !row.archivedAt &&
    row.categories.length > 0 && row.categories.every(category => category.disabled !== true && !category.archivedAt);
}
/** Advisory, read-only checks. No link crawler, outbound fetch, publication or price mutation. */
export async function reviewCampaign(db: Db, raw: unknown, now = new Date()): Promise<CampaignReview> {
  // Review incomplete drafts too; publication validation is applied separately by saveGrowthPage.
  const parsed = growthPageSchema.safeParse(raw && typeof raw === 'object' ? { ...raw, published: false } : raw);
  if (!parsed.success || parsed.data.kind !== 'campaign') throw new HttpError(400, 'INVALID_REQUEST');
  const page = parsed.data, warnings: CampaignReview['warnings'] = [];
  const warn = (code: CampaignReview['warnings'][number]['code'], message: string, productId?: string) => warnings.push({ code, message, ...(productId ? { productId } : {}) });
  if (!page.image) warn('missing-artwork', 'Add desktop campaign artwork before placing it on the homepage.');
  for(const image of [page.image,page.mobileImage])if(image&&!campaignImageUrl(image,process.env.CLOUDINARY_CLOUD_NAME))warn('unapproved-artwork','Artwork must use the configured Cloudinary account or the pharmacy CDN.');
  if (!page.mobileImage) warn('missing-mobile-artwork', 'No mobile artwork selected. The desktop image will also be used on mobile.');
  if (!page.imageAlt) warn('missing-alt', 'Add a useful image description.');
  if (!page.ctaLabel) warn('missing-cta', 'Add a clear button label.');
  if (!page.terms) warn('missing-terms', 'Add the campaign eligibility, dates and exclusions in the terms.');
  const state = campaignState(page, now.getTime());
  if (state === 'ended') warn('expired', 'This campaign has ended and will not appear on the homepage.');
  if (state === 'upcoming') warn('upcoming', 'This campaign is scheduled for later and is not yet on the homepage.');
  if (!page.productIds.length) warn('no-products', 'No products are pinned. Add products to give the campaign a shoppable destination.');
  const rows = await snapshots(db, page.productIds), byId = new Map(rows.map(row => [String(row._id), row]));
  for (const id of page.productIds) {
    const row = byId.get(id);
    if (!available(row)) { warn('product-unavailable', 'A pinned product is missing, unpublished, archived or in an unavailable category. Remove or replace it.', id); continue; }
    const label = String(row.name ?? 'Pinned product');
    if (!(Number(row.stock) > 0)) warn('out-of-stock', `${label} is out of stock.`, id);
    if (!hasProductPhoto(row) && !(Array.isArray(row.gdriveFileIds) && row.gdriveFileIds.some(value=>typeof value==='string'&&value.trim()))) warn('missing-photo', `${label} has no product photo.`, id);
  }
  return { warnings, checkedAt: now.toISOString() };
}
/** Bounded, current, locale-specific homepage placements. Old documents opt out by default. */
export async function homepageCampaigns(db: Db, locale: 'en' | 'ar', now = new Date()): Promise<GrowthPage[]> {
  const rows = (await Promise.all((['hero', 'secondary'] as const).map(homepagePlacement => db.collection('growth_pages').find({
    kind: 'campaign', locale, published: true, homepagePlacement,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now.toISOString() } }] }, { $or: [{ endsAt: null }, { endsAt: { $gt: now.toISOString() } }] }],
  }, { maxTimeMS: 3000, projection: { _id: 0, updatedAt: 0, updatedBy: 0 } }).sort({ priority: -1, slug: 1 }).limit(homepagePlacement === 'hero' ? 8 : 4).toArray()))).flat();
  const pages = rows.flatMap(row => { const value = growthPageSchema.safeParse(row); return value.success && value.data.image ? [value.data] : []; });
  const products = await snapshots(db, pages.flatMap(page => page.productIds)), live = new Set(products.filter(row => available(row) && Number(row.stock) > 0).map(row => String(row._id)));
  // A selected-product promotion must still have something available to shop.
  return pages.filter(page => !page.productIds.length || page.productIds.some(id => live.has(id)));
}
