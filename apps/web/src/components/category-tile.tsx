import Image from 'next/image';
import { ProductPhoto } from './product-card';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from './app-link';
import { categoryHref, type Category, type Product } from '../lib/catalog/model';
import { categoryImage } from '../lib/server/catalog';
export async function CategoryTile({ category, headingLevel = 3, product }: { category: Category; headingLevel?: 2 | 3; product?: Product | undefined }) {
 const locale = await getLocale();
 const Heading = headingLevel === 2 ? 'h2' : 'h3';
 const position = /skin|cosmetic/i.test(category.name) ? [0,0] : /vitamin|supplement/i.test(category.name) ? [1,0] : /baby/i.test(category.name) ? [2,0] : /oral/i.test(category.name) ? [0,1] : /hair/i.test(category.name) ? [1,1] : /first|medical/i.test(category.name) ? [2,1] : null;
 return <Link href={categoryHref(category)} className="category-tile"><span className="category-tile-media">{category.image ? <Image src={categoryImage(category.image)} alt="" width={100} height={100} sizes="80px" className="h-full w-full object-contain" /> : position ? <Image src="/design/categories/pharmacy-categories.png" alt="" width={1536} height={1024} sizes="300px" className="category-illustration" style={{left:`-${position[0]! * 100}%`,top:`-${position[1]! * 100}%`}} /> : product ? <ProductPhoto product={product} sizes="80px" /> : <span aria-hidden="true" className="category-photo-fallback" />}</span><Heading>{u(locale, category.name)}</Heading></Link>;
}
