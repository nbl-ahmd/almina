import styles from './category-tile.module.css';
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
 const photo = category.image
   ? <Image src={categoryImage(category.image)} alt="" width={100} height={100} sizes="80px" />
   : product ? <ProductPhoto product={product} sizes="80px" /> : null;
 return (
   <Link href={categoryHref(category)} className={`category-tile ${styles.tile}`}>
     {photo && <span className={`category-tile-media ${styles.media}`}>{photo}</span>}
     <Heading className={styles.label}>{u(locale, category.name)}</Heading>
   </Link>
 );
}
