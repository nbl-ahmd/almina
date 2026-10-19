import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, HeartIcon } from '@heroicons/react/24/outline';
import { categoryHref, type Category } from '../lib/catalog/model';
import { categoryImage } from '../lib/server/catalog';
const scenes = [
  { match: /skin|cosmetic/i, index: 0 }, { match: /baby care/i, index: 1 },
  { match: /oral/i, index: 2 }, { match: /hair/i, index: 3 },
  { match: /first|medical/i, index: 4 }, { match: /feeding/i, index: 5 },
];
export function CategoryTile({ category, headingLevel = 3 }: { category: Category; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const scene = scenes.find(item => item.match.test(category.name));
  const deodorant = /deodorant/i.test(category.name);
  const extra = /nail/i.test(category.name) ? 1 : /general|daily|personal/i.test(category.name) ? 0 : null;
  const colour = scene ? ['#cce7d8','#ffdec9','#d8cfed','#d1edfc','#ffd1d1','#fff0ba'][scene.index] : deodorant ? '#bce2f8' : extra === 0 ? '#f4ece0' : extra === 1 ? '#e1d6ee' : '#f0f3fb';
  return <Link href={categoryHref(category)} className="group relative isolate flex min-h-[190px] min-w-0 flex-col overflow-hidden rounded-2xl p-3 text-ink md:min-h-[250px] md:p-4" style={{ backgroundColor: colour }}>
    {category.image ? <Image src={categoryImage(category.image)} alt="" fill sizes="(max-width:639px) 45vw, 320px" className="-z-10 object-contain object-bottom pt-16" /> : scene ? <div className="absolute inset-x-0 bottom-0 -z-10 overflow-hidden" style={{ aspectRatio: scene.index < 3 ? '512 / 499' : '512 / 525' }} aria-hidden="true"><Image src="/design/home/category-scenes.webp" alt="" width={1536} height={1024} sizes="(max-width:639px) 480px, 900px" className="absolute h-auto w-[300%] max-w-none" style={{ left: `-${(scene.index % 3) * 100}%`, top: scene.index < 3 ? '0' : `-${(499 / 525) * 100}%` }} /></div> : deodorant ? <Image src="/design/home/deodorant-category.webp" alt="" fill sizes="(max-width:639px) 160px, 320px" className="-z-10 object-cover object-bottom" /> : extra !== null ? <div className="absolute inset-x-0 bottom-0 -z-10 overflow-hidden" style={{aspectRatio:'768 / 1024'}} aria-hidden="true"><Image src="/design/home/general-nail-scenes.webp" alt="" width={1200} height={800} sizes="(max-width:639px) 320px, 640px" className="absolute top-0 h-auto w-[200%] max-w-none" style={{left: extra ? '-100%' : '0'}} /></div> : <HeartIcon className="absolute right-4 bottom-4 size-16 text-brand/30" />}
    <Heading className="mb-2 max-w-[90%] text-base leading-tight font-semibold md:text-xl">{category.name}</Heading>
    <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-ink"><ArrowRightIcon className="size-4" /></span>
  </Link>;
}
