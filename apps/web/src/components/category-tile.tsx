import Image from 'next/image';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from './app-link';
import { BeakerIcon, HeartIcon, SparklesIcon, SunIcon, ShoppingBagIcon, PlusIcon } from '@heroicons/react/24/outline';
import { categoryHref, type Category } from '../lib/catalog/model';
import { categoryImage } from '../lib/server/catalog';
export async function CategoryTile({ category, headingLevel = 3 }: { category: Category; headingLevel?: 2 | 3 }) {
 const locale = await getLocale();
 const Heading = headingLevel === 2 ? 'h2' : 'h3';
 const Glyph = /skin|cosmetic/i.test(category.name) ? SparklesIcon : /vitamin|supplement/i.test(category.name) ? SunIcon : /baby/i.test(category.name) ? HeartIcon : /first|medical/i.test(category.name) ? PlusIcon : /oral|hair/i.test(category.name) ? BeakerIcon : ShoppingBagIcon;
 return <Link href={categoryHref(category)} className="category-tile"><span className="category-tile-media">{category.image ? <Image src={categoryImage(category.image)} alt="" width={100} height={100} sizes="80px" className="h-full w-full object-contain" /> : <Glyph className="size-7" aria-hidden="true" />}</span><Heading>{u(locale, category.name)}</Heading></Link>;
}
