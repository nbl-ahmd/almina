import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
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
  const colour = scene ? ['#e6efe6','#f7e7dd','#eae7f4','#e3edf7','#f8e3e0','#f7f0d7'][scene.index] : deodorant ? '#e3edf7' : extra === 0 ? '#efe9df' : extra === 1 ? '#eae7f4' : '#eaf0e9';
  return <Link href={categoryHref(category)} className="group relative isolate flex min-h-[150px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-4 text-ink transition-transform duration-200 motion-safe:hover:-translate-y-0.5 md:min-h-[205px] md:p-5" style={{ backgroundColor: colour }}>
    {category.image ? <Image src={categoryImage(category.image)} alt="" fill sizes="(max-width:639px) 45vw, 320px" className="-z-10 object-contain object-bottom pt-14" /> : scene ? <div className="absolute inset-x-0 bottom-0 -z-10 overflow-hidden" style={{ aspectRatio: scene.index < 3 ? '512 / 499' : '512 / 525' }} aria-hidden="true"><Image src="/design/home/category-scenes.webp" alt="" width={1536} height={1024} sizes="(max-width:639px) 480px, 900px" className="absolute h-auto w-[300%] max-w-none" style={{ left: `-${(scene.index % 3) * 100}%`, top: scene.index < 3 ? '0' : `-${(499 / 525) * 100}%` }} /></div> : deodorant ? <Image src="/design/home/deodorant-category.webp" alt="" fill sizes="(max-width:639px) 160px, 320px" className="-z-10 object-cover object-bottom" /> : extra !== null ? <div className="absolute inset-x-0 bottom-0 -z-10 overflow-hidden" style={{aspectRatio:'768 / 1024'}} aria-hidden="true"><Image src="/design/home/general-nail-scenes.webp" alt="" width={1200} height={800} sizes="(max-width:639px) 320px, 640px" className="absolute top-0 h-auto w-[200%] max-w-none" style={{left: extra ? '-100%' : '0'}} /></div> : <span className="pointer-events-none absolute -right-3 -bottom-6 -z-10 text-[120px] leading-none font-semibold text-white/50" aria-hidden="true">{category.name.slice(0, 1).toUpperCase()}</span>}
    <Heading className="relative z-10 max-w-[85%] text-[15px] leading-tight font-semibold tracking-[-0.02em] md:text-[19px]">{category.name}</Heading>
    <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors group-hover:bg-ink group-hover:text-white md:size-9"><ArrowUpRightIcon className="size-4" /></span>
  </Link>;
}
