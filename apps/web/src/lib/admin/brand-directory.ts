import { growthPageSchema, type GrowthPage } from '@almina/contracts';
import { brandSlug } from '../catalog/merchandising';

export type BrandLocale = 'en' | 'ar';
export type BrandEntry = { slug: string; name: string; onProducts: boolean; en?: GrowthPage | undefined; ar?: GrowthPage | undefined };

/** Every brand staff can set up: names written on products, plus brand pages (including brands with no products yet).
 *  A page joins a product brand by its URL name, which is how the storefront matches them. */
export function brandDirectory(productBrands: string[], pages: GrowthPage[]): BrandEntry[] {
  const entries = new Map<string, BrandEntry>();
  for (const name of productBrands) {
    const slug = brandSlug(name);
    if (slug && !entries.has(slug)) entries.set(slug, { slug, name, onProducts: true });
  }
  for (const page of pages) {
    if (page.kind !== 'brand') continue;
    const entry = entries.get(page.slug) ?? { slug: page.slug, name: page.title, onProducts: false };
    entry[page.locale] = page;
    // Without products the English title is the brand's name.
    if (!entry.onProducts && page.locale === 'en') entry.name = page.title;
    entries.set(page.slug, entry);
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type BrandPageState = 'published' | 'draft' | 'automatic' | 'none';
/** English brands with products get an automatic page until staff publish their own; Arabic pages exist only when written. */
export function brandPageState(entry: BrandEntry, locale: BrandLocale): BrandPageState {
  const page = entry[locale];
  if (page?.published) return 'published';
  if (locale === 'en' && entry.onProducts) return page ? 'draft' : 'automatic';
  return page ? 'draft' : 'none';
}

/** An unsaved page with starting text. It never fails: brandProblem explains anything that stops it being saved. */
export function newBrandPage(name: string, locale: BrandLocale = 'en', slug = brandSlug(name)): GrowthPage {
  const ar = locale === 'ar', brand = name.trim().slice(0, 200);
  const defaults = growthPageSchema.parse({ kind: 'brand', slug: 'brand', locale, title: 'Brand', description: '' });
  return { ...defaults, slug: slug.replace(/-+$/, ''), title: brand,
    description: (ar ? `تسوق منتجات ${brand} من صيدلية المينا في رأس الخيمة. قارن الأسعار الحالية وأحجام العبوات والتوفر.`
      : `Shop ${brand} products at Al Mina Pharmacy in Ras Al Khaimah. Compare current prices, pack sizes and availability.`).slice(0, 320),
    body: ar ? `تصفح منتجات ${brand} المتوفرة أدناه. تعرض صفحة كل منتج سعره الحالي وتفاصيله.` : `Browse the available ${brand} range below. Each product page shows its current price, pack size and availability.`,
  };
}

/** Why a brand cannot be saved yet, in staff words; null when it can. */
export function brandProblem(page: GrowthPage): string | null {
  if (page.title.trim().length < 3) return 'A saved brand page needs a brand name of at least 3 characters. Shorter brands on products keep their automatic page.';
  if (!page.slug) return 'This name has no letters or numbers to make a web address from. Add the brand name in English letters.';
  if (page.published && (!page.description.trim() || !page.body.trim())) return 'A published brand page needs a search description and page text.';
  return growthPageSchema.safeParse(page).success ? null : 'Check the fields: the description holds 320 characters, and each question needs an answer.';
}
