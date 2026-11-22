import { Squares2X2Icon, SuitcaseIcon } from './storefront-icons';
import Image from 'next/image';
import Link from './app-link';
import { categoryHref, type Category } from '../lib/catalog/model';
import { categoryImage } from '../lib/server/catalog';

export function CategoryTile({ category }: { category: Category }) {
  const FallbackIcon = /travel|سفر/i.test(category.name) ? SuitcaseIcon : Squares2X2Icon;
  return <Link href={categoryHref(category)} className="category-tile">
    <span className={category.image ? 'category-media' : 'category-media category-media-symbol'}>{category.image ? <Image src={categoryImage(category.image)} alt="" width={160} height={160} sizes="80px" /> : <FallbackIcon aria-hidden="true" />}</span>
    <span className="category-label">{category.name}</span>
  </Link>;
}
