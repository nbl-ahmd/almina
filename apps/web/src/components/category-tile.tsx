import { Squares2X2Icon, SuitcaseIcon } from './storefront-icons';
import Image from 'next/image';
import Link from './app-link';
import { categoryHref, type Category } from '../lib/catalog/model';
import { categoryImage } from '../lib/server/catalog';

/** Admin image first (curated, consistent); else an in-stock product photo from the category; else an icon. */
export function CategoryTile({ category, fallback }: { category: Category; fallback?: string | undefined }) {
  const FallbackIcon = /travel|سفر/i.test(category.name) ? SuitcaseIcon : Squares2X2Icon;
  return <Link href={categoryHref(category)} className="category-tile">
    <span className={category.image || fallback ? 'category-media' : 'category-media category-media-symbol'}>{category.image ? <Image src={categoryImage(category.image)} alt="" width={160} height={160} sizes="80px" /> : fallback ? <Image src={fallback} alt="" width={160} height={160} sizes="80px" /> : <FallbackIcon aria-hidden="true" />}</span>
    <span className="category-label">{category.name}</span>
  </Link>;
}
