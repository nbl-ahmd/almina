import Image from 'next/image';
import Link from './app-link';
import { categoryHref, type Category } from '../lib/catalog/model';
import { categoryImage } from '../lib/server/catalog';

export function CategoryTile({ category, headingLevel = 3 }: { category: Category; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return <Link href={categoryHref(category)} className="category-tile">
    {category.image ? <Image src={categoryImage(category.image)} alt="" width={160} height={160} /> : null}
    <Heading>{category.name}</Heading>
  </Link>;
}
