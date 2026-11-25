import Image, { getImageProps } from 'next/image';
import Link from './app-link';
import { ArrowRightIcon } from './storefront-icons';
import { campaignImageUrl, growthPagePath, type GrowthPage } from '@almina/contracts';

// Fixed artwork sizes for designers (shown in the admin editor too). The frame never changes height with the artwork.
// Measured from Aster's homepage (2026-11-25): hero 1600×500 desktop / 764×376 phone; section strips 2224×276 / 764×176; top promo
// strip 2220×120 / 764×88. Frames contain-fit, so art at these sizes fills them and older art is never cropped.
export const heroArtwork = { desktop: { width: 1600, height: 500 }, mobile: { width: 800, height: 400 } } as const;
export const stripArtwork = { desktop: { width: 1600, height: 200 }, mobile: { width: 764, height: 176 } } as const;

export function campaignHref(page: GrowthPage) { return page.ctaHref || growthPagePath(page); }

function Art({ page, cloudName, eager, sizes, size, preview }: { page: GrowthPage; cloudName?: string | undefined; eager: boolean; sizes: string; size: typeof heroArtwork | typeof stripArtwork; preview?: 'mobile' | 'desktop' | undefined }) {
  const desktop = campaignImageUrl(page.image, cloudName), mobile = campaignImageUrl(page.mobileImage, cloudName) ?? desktop;
  const src = preview === 'mobile' ? mobile : desktop;
  if (!src) return <span className="qc-banner-empty">{page.locale === 'ar' ? 'أضف صورة لعرض المعاينة' : 'Add artwork to preview it here'}</span>;
  return <picture className="qc-banner-art">
    {!preview && mobile && mobile !== desktop ? <source media="(max-width: 767px)" srcSet={getImageProps({ src: mobile, alt: '', width: size.mobile.width, height: size.mobile.height, sizes: '100vw' }).props.srcSet} /> : null}
    <Image src={src} alt={page.imageAlt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} />
  </picture>;
}

/** Main carousel slide (Life Pharmacy / Talabat): a fixed-height banner. 'image' is finished artwork and the whole slide is one link
 *  named by the artwork description. 'overlay' adds a real heading, text and a button on the start side, over the safe zone the
 *  designer left empty; the button is the one link and stretches over the slide so the whole banner stays tappable. */
export function HeroBanner({ page, cloudName, eager = false, preview }: { page: GrowthPage; cloudName?: string | undefined; eager?: boolean; preview?: 'mobile' | 'desktop' }) {
  const overlay = page.heroLayout === 'overlay';
  const art = <Art page={page} cloudName={cloudName} eager={eager} preview={preview} size={heroArtwork} sizes="(max-width: 899px) 100vw, 1280px" />;
  const shared = { 'data-layout': page.heroLayout, 'data-tone': page.textTone, 'data-preview': preview, dir: page.locale === 'ar' ? 'rtl' : 'ltr' } as const;
  if (!overlay) return preview ? <div className="qc-hero" {...shared}>{art}</div> : <Link className="qc-hero" {...shared} href={campaignHref(page)} aria-label={page.imageAlt || page.title}>{art}</Link>;
  return <article className="qc-hero" {...shared}>
    {art}
    <div className="qc-hero-copy">
      <h2 className="qc-hero-title">{page.title}</h2>
      {page.description ? <p className="qc-hero-text">{page.description}</p> : null}
      {page.ctaLabel ? preview ? <span className="qc-hero-cta">{page.ctaLabel}<ArrowRightIcon aria-hidden="true" className="rtl:rotate-180" /></span>
        : <Link className="qc-hero-cta qc-stretched" href={campaignHref(page)}>{page.ctaLabel}<ArrowRightIcon aria-hidden="true" className="rtl:rotate-180" /></Link> : null}
    </div>
  </article>;
}

/** Thin, wide section banner (Life Pharmacy "Deals under AED 49" strips): finished artwork, one link, fixed height. */
export function StripBanner({ page, cloudName, preview }: { page: GrowthPage; cloudName?: string | undefined; preview?: 'mobile' | 'desktop' }) {
  const body = <Art page={page} cloudName={cloudName} eager={false} preview={preview} size={stripArtwork} sizes="(max-width: 899px) 100vw, 1280px" />;
  return preview ? <div className="qc-strip" data-slot={page.stripSlot} data-preview={preview}>{body}</div> : <Link className="qc-strip" data-slot={page.stripSlot} href={campaignHref(page)} aria-label={page.imageAlt || page.title}>{body}</Link>;
}

export function SectionStrips({ pages, slot, cloudName }: { pages: GrowthPage[]; slot: GrowthPage['stripSlot']; cloudName?: string | undefined }) {
  const strips = pages.filter(page => page.homepagePlacement === 'strip' && page.stripSlot === slot).slice(0, 2);
  if (!strips.length) return null;
  return <section className="qc-strips" aria-label={strips[0]!.locale === 'ar' ? 'عروض' : 'Offers'}>{strips.map(page => <StripBanner key={page.slug} page={page} cloudName={cloudName} />)}</section>;
}
