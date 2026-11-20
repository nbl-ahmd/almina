import Image, { getImageProps } from 'next/image';
import Link from './app-link';
import { bannerArtwork, bannerMobileMedia, bannerSizes } from '../lib/catalog/banner-artwork';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { campaignImageUrl, growthPagePath, type GrowthPage } from '@almina/contracts';

/** Match the editor preview and the storefront so a campaign can be reviewed at both sizes. */
export function CampaignArtwork({ page, preview, cloudName }: {
  page: GrowthPage;
  preview?: 'mobile' | 'desktop';
  cloudName?: string | undefined;
}) {
  const desktop = campaignImageUrl(page.image, cloudName);
  const mobile = campaignImageUrl(page.mobileImage, cloudName) ?? desktop;
  const src = preview === 'mobile' ? mobile : desktop ?? mobile;
  const href = growthPagePath(page);
  const arabic = page.locale === 'ar';
  const lead = page.homepagePlacement === 'hero';
  const dimensions = bannerArtwork[preview ?? 'desktop'];
  const mediaRatio = lead ? 'aspect-[3/1] md:aspect-[4/1]' : 'aspect-[3/1]';
  const action = page.ctaLabel || (arabic ? 'استكشف العرض' : 'Explore campaign');

  if (!src) {
    return (
      <article dir={arabic ? 'rtl' : 'ltr'} className="campaign-text-fallback rounded-2xl border border-border bg-white p-4 text-ink">
        <h2 className="text-lg font-semibold">{page.title}</h2>
        <p className="max-w-prose text-sm leading-6 text-muted">{page.description}</p>
        {preview
          ? <p className="text-sm text-muted">{arabic ? 'أضف صورة لعرض المعاينة' : 'Add campaign artwork to preview it here'}</p>
          : <Link href={href} className="home-action">{action}<ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link>}
      </article>
    );
  }

  const mobileSource = !preview && mobile && mobile !== desktop
    ? getImageProps({ src: mobile, alt: '', ...bannerArtwork.mobile, sizes: bannerSizes }).props
    : undefined;
  const image = (
    <picture className={`block overflow-hidden rounded-2xl bg-subtle ${mediaRatio}`}
      style={preview ? { aspectRatio: lead ? preview === 'mobile' ? '3 / 1' : '4 / 1' : '3 / 1' } : undefined}>
      {mobileSource ? <source media={bannerMobileMedia} srcSet={mobileSource.srcSet} sizes={mobileSource.sizes} /> : null}
      <Image src={src} alt={preview ? page.imageAlt : ''} {...(lead ? dimensions : { width: 1440, height: 480 })}
        sizes={preview === 'mobile' ? '390px' : lead ? bannerSizes : '(max-width: 767px) 100vw, 600px'}
        loading="lazy" className="h-full w-full object-contain" />
    </picture>
  );
  return (
    <article dir={arabic ? 'rtl' : 'ltr'}>
      <h2 className="sr-only">{page.title}</h2>
      {preview ? image : <Link href={href} className="campaign-art-link block rounded-2xl" aria-label={action} aria-describedby={`campaign-copy-${page.slug}`}>
        {image}
        <span className="sr-only" id={`campaign-copy-${page.slug}`}>{page.imageAlt}. {page.description}</span>
      </Link>}
    </article>
  );
}
