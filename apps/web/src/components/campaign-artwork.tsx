import Image, { getImageProps } from 'next/image';
import Link from './app-link';
import { ArrowRightIcon } from './storefront-icons';
import { campaignImageUrl, growthPagePath, type GrowthPage } from '@almina/contracts';

/** Used by the real homepage and the editor preview so artwork/copy don't drift. */
export function CampaignArtwork({ page, preview, eager = false, cloudName }: { page: GrowthPage; preview?: 'mobile' | 'desktop'; eager?: boolean; cloudName?: string | undefined }) {
  const desktop = campaignImageUrl(page.image,cloudName), mobile = campaignImageUrl(page.mobileImage,cloudName) ?? desktop;
  const src = preview === 'mobile' ? mobile : desktop;
  const href = growthPagePath(page), arabic = page.locale === 'ar';
  const image = src ? <picture className={preview ? 'block' : 'block aspect-[2/1] md:aspect-[8/3]'} style={preview ? {aspectRatio:preview==='mobile'?'2 / 1':'8 / 3'} : undefined}>
    {!preview && mobile && mobile !== desktop ? <source media="(max-width: 767px)" srcSet={getImageProps({ src: mobile, alt: page.imageAlt, width: 800, height: 400, sizes: '100vw' }).props.srcSet} /> : null}
    <Image src={src} alt={page.imageAlt} width={preview==='mobile'?800:1440} height={preview==='mobile'?400:540} sizes={preview === 'mobile' ? '390px' : '(max-width: 767px) 100vw, 75vw'} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} className="h-full w-full object-contain" />
  </picture> : <div className="flex min-h-40 items-center justify-center px-5 text-sm">{arabic ? 'أضف صورة لعرض المعاينة' : 'Add campaign artwork to preview it here'}</div>;
  return <article dir={arabic ? 'rtl' : 'ltr'} className="overflow-hidden rounded-2xl border bg-white">
    {preview ? image : <Link href={href}>{image}</Link>}
    <div className={`flex gap-3 p-4 md:p-5 ${preview==='mobile'?'flex-col items-stretch':'flex-col items-stretch md:flex-row md:items-center md:justify-between'}`}>
      <div className="min-w-0 flex-1"><h2 className="mb-1 text-lg font-semibold leading-tight md:text-xl">{page.title}</h2><p className="mb-0 max-w-prose text-sm leading-6">{page.description}</p></div>
      {preview ? <span className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold">{page.ctaLabel || (arabic ? 'استكشف العرض' : 'Explore campaign')}<ArrowRightIcon className="size-4 rtl:rotate-180" /></span> : <Link href={href} className="button min-h-11 w-fit shrink-0 rounded-full px-5 text-sm">{page.ctaLabel}<ArrowRightIcon className="size-4 rtl:rotate-180" /></Link>}
    </div>
  </article>;
}
