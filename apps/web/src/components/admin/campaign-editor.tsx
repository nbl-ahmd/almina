'use client';
import { inputClass, selectClass, buttonVariants } from './shadcn/styles';
import Link from '../app-link';
import Image from 'next/image';
import { useState } from 'react';
import { ComputerDesktopIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { campaignImageUrl, campaignReviewSchema, campaignState, growthPagePath, type GrowthPage, type CampaignReview } from '@almina/contracts';
import { CampaignArtwork } from '../campaign-artwork';
import { ImageUploadField } from './image-upload-field';
import { campaignFrames } from '../../lib/storefront/campaign-frames';
import { heroArtwork, pairedStripDesktop, promoStripArtwork, sizeLabel, stripArtwork } from '../../lib/storefront/artwork';


export function CampaignEditor({ page, onChange, cloudName, artwork = [] }: { page: GrowthPage; onChange: (page: GrowthPage) => void; cloudName?: string | undefined; artwork?: {name:string;image:string}[] }) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [review, setReview] = useState<{ key: string; data: CampaignReview } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const usableArtwork=artwork.filter(item=>campaignImageUrl(item.image,cloudName));
  const key = JSON.stringify(page), current = review?.key === key ? review.data : null;
  function change(value: Partial<GrowthPage>) { onChange({ ...page, ...value }); }
  const frames = campaignFrames(page);
  async function check() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/growth/admin/campaign-review', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: key });
      if (!response.ok) throw new Error('Campaign checks are unavailable. Check the fields and try again.');
      const value = await response.json() as { data: unknown };
      setReview({ key, data: campaignReviewSchema.parse(value.data) });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to check campaign.'); }
    finally { setBusy(false); }
  }
  return <section className="grid gap-4 border-y py-5" aria-labelledby="campaign-merchandising-title">
    <div><h2 id="campaign-merchandising-title" className="mb-1 text-lg font-semibold">Homepage campaign</h2><p className="mb-0 text-sm">Choose where this campaign appears, then check its artwork and pinned products. Saving a draft keeps it private.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">Homepage position<select className={selectClass} value={page.homepagePlacement} onChange={event => change({ homepagePlacement: event.target.value as GrowthPage['homepagePlacement'] })}><option value="none">Landing page only</option><option value="hero">Main campaign carousel</option><option value="secondary">Supporting campaign banners</option><option value="strip">Section banner (thin strip)</option><option value="popup">Popup when the store opens</option></select></label>
      <label className="grid gap-1.5 text-sm font-medium">Display priority<input className={inputClass} type="number" min={0} max={100} step={1} value={page.priority} onChange={event => change({ priority: Math.min(100, Math.max(0, Math.trunc(Number(event.target.value) || 0))) })} /><span className="text-xs font-normal">Higher numbers appear first. Ties use the URL name.</span></label>
    </div>
    {usableArtwork.length ? <div className="grid gap-4 sm:grid-cols-2">{(['image','mobileImage'] as const).map(field=><label className="grid gap-1.5 text-sm font-medium" key={field}>{field==='image'?'Choose saved desktop artwork':'Choose saved mobile artwork'}<select className={selectClass} value={usableArtwork.some(item=>item.image===page[field])?page[field]:''} onChange={event=>{if(event.target.value)change({[field]:event.target.value});}}><option value="">Select saved banner artwork</option>{usableArtwork.map((item,index)=><option value={item.image} key={item.image+index}>{item.name}</option>)}</select></label>)}</div> : null}
    <p className="mb-0 text-xs"><Link href="/admin/banners" target="_blank" rel="noopener noreferrer" className="font-medium">Upload artwork in Banners</Link>, then reload this page after saving your draft to select it here. You can also paste an approved image URL.</p>
    <ImageUploadField label="Phone artwork" value={page.mobileImage} onChange={mobileImage => change({ mobileImage })} size={frames ? sizeLabel(frames.mobile) : undefined} frame={frames?.mobile} hint={`Shown on screens ${page.homepagePlacement === 'secondary' ? 'below 768px' : 'below 900px'}. Design it separately with larger text; leave blank to reuse the desktop artwork.`} />
    {page.homepagePlacement === 'hero' ? <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">Carousel layout<select className={selectClass} value={page.heroLayout} onChange={event => change({ heroLayout: event.target.value === 'overlay' ? 'overlay' : 'image' })}><option value="image">Finished image only (whole banner links)</option><option value="overlay">Image with title, text and button on the left</option></select><span className="text-xs font-normal">Artwork: desktop {sizeLabel(heroArtwork.desktop)} px (screens 900px and wider), phone {sizeLabel(heroArtwork.mobile)} px (below 900px). Upload both. For text, leave the left 45% of the artwork plain (right 45% for Arabic artwork).</span></label>
      {page.heroLayout === 'overlay' ? <label className="grid gap-1.5 text-sm font-medium">Text colour<select className={selectClass} value={page.textTone} onChange={event => change({ textTone: event.target.value === 'light' ? 'light' : 'dark' })}><option value="dark">Dark text (light artwork)</option><option value="light">White text (dark artwork)</option></select></label> : null}
    </div> : null}
    {page.homepagePlacement === 'strip' ? <label className="grid gap-1.5 text-sm font-medium">Where the strip appears<select className={selectClass} value={page.stripSlot} onChange={event => change({ stripSlot: event.target.value as GrowthPage['stripSlot'] })}><option value="home-promo">Home — thin promo strip above the carousel</option><option value="home-top">Home — under categories</option><option value="home-middle">Home — between product shelves</option><option value="home-bottom">Home — above brands</option><option value="listing">Product listing, category and search pages</option></select><span className="text-xs font-normal">Finished artwork only. Section strips: desktop {sizeLabel(stripArtwork.desktop)} px, phone {sizeLabel(stripArtwork.mobile)} px. Top promo strip: desktop {sizeLabel(promoStripArtwork.desktop)} px, phone {sizeLabel(promoStripArtwork.mobile)} px. Two section strips in the same place sit side by side on desktop in a taller frame: upload {sizeLabel(pairedStripDesktop)} px for those.</span></label> : null}
    {page.homepagePlacement === 'popup' ? <label className="grid gap-1.5 text-sm font-medium">Popup style<select className={selectClass} value={page.popupLayout} onChange={event => change({ popupLayout: event.target.value === 'image' ? 'image' : 'card' })}><option value="card">Artwork with title and message</option><option value="image">Designed poster with one button (900 × 1200 px)</option></select><span className="text-xs font-normal">Poster style shows the artwork whole, with the button text underneath it. The title stays the popup’s name for screen readers.</span></label> : null}
    {page.homepagePlacement === 'popup' ? <p className="m-0 rounded-lg bg-soft p-3 text-xs">The popup shows once per device for each saved version, a couple of seconds after a page loads, never on cart, checkout or account pages. It uses the title and description below; artwork is optional (800 × 600 px). Leave the button text empty for an information-only message.</p> : null}
    <label className="grid gap-1.5 text-sm font-medium">Button link (optional)<input className={inputClass} maxLength={250} value={page.ctaHref} onChange={event => change({ ctaHref: event.target.value })} placeholder="/categories/skin-care--… or /offers" /><span className="text-xs font-normal">A page on this site, starting with /. Leave blank to open this campaign’s own page.</span></label>
    <label className="grid gap-1.5 text-sm font-medium">Campaign button text<input className={inputClass} maxLength={60} value={page.ctaLabel} onChange={event => change({ ctaLabel: event.target.value })} placeholder="e.g. Explore skincare offers" /></label>
    <p className="mb-0 break-all text-xs">Destination: {page.ctaHref || growthPagePath(page)} · Schedule: {campaignState(page)}. Dates below use UTC. Product discounts are managed separately; this campaign does not create a discount.</p>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="m-0 text-base font-medium">Unsaved preview</h3><div className="flex gap-2" role="group" aria-label="Campaign preview size"><button type="button" className={`${buttonVariants({ variant: 'outline', size: 'sm' })} text-xs`} aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}><ComputerDesktopIcon className="size-4" />Desktop</button><button type="button" className={`${buttonVariants({ variant: 'outline', size: 'sm' })} text-xs`} aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}><DevicePhoneMobileIcon className="size-4" />Mobile</button></div></div>
    <div className="overflow-x-auto"><div className={viewport === 'mobile' ? 'campaign-preview-mobile' : undefined}>{page.homepagePlacement === 'hero' || page.homepagePlacement === 'strip' ? <BannerPreview page={page} viewport={viewport} cloudName={cloudName} /> : <CampaignArtwork cloudName={cloudName} page={page} preview={viewport} />}</div></div>
    <div><button type="button" className={`${buttonVariants({ variant: 'outline', size: 'sm' })} text-sm`} onClick={() => void check()} disabled={busy}>{busy ? 'Checking campaign…' : 'Check campaign readiness'}</button>{review && !current ? <p className="mt-2 text-xs">The campaign changed. Run checks again before publishing.</p> : null}</div>
    {error ? <p role="alert" className="m-0 text-sm">{error}</p> : null}
    {current ? <div role="status" className="rounded-lg border p-4"><h3 className="mb-2 text-sm font-semibold">{current.warnings.length ? `${current.warnings.length} items to review` : 'No readiness warnings found'}</h3>{current.warnings.length ? <ul className="m-0 grid list-none gap-2 p-0">{current.warnings.map((warning, index) => <li className="flex items-start gap-2 text-sm" key={`${warning.code}:${warning.productId ?? index}`}><ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" /><span>{warning.message}</span></li>)}</ul> : <p className="m-0 text-xs">Check the preview and pharmacy-approved terms before saving. These checks do not approve the offer.</p>}</div> : null}
  </section>;
}

/** Admin preview of the fixed storefront frames (shapes in lib/storefront/artwork.ts), drawn with admin styles. */
function BannerPreview({ page, viewport, cloudName }: { page: GrowthPage; viewport: 'desktop' | 'mobile'; cloudName?: string | undefined }) {
  const src = campaignImageUrl(viewport === 'mobile' ? page.mobileImage || page.image : page.image, cloudName);
  const strip = page.homepagePlacement === 'strip';
  const promo = strip && page.stripSlot === 'home-promo';
  const ratio = promo ? (viewport === 'mobile' ? '191 / 22' : '37 / 2') : strip ? (viewport === 'mobile' ? '191 / 44' : '8 / 1') : (viewport === 'mobile' ? '2 / 1' : '16 / 5');
  const overlay = !strip && page.heroLayout === 'overlay';
  return <div className="relative w-full overflow-hidden rounded-xl bg-soft" style={{ aspectRatio: ratio, maxWidth: viewport === 'mobile' ? 390 : undefined, color: page.textTone === 'light' ? '#fff' : '#1c1c1e' }} dir={page.locale === 'ar' ? 'rtl' : 'ltr'}>
    {src ? <Image src={src} alt={page.imageAlt} fill sizes="(max-width: 767px) 100vw, 900px" className="object-contain" /> : <span className="absolute inset-0 grid place-items-center text-xs">Add artwork to preview it here</span>}
    {overlay ? <div className="absolute inset-y-0 start-0 grid w-[52%] content-center justify-items-start gap-1.5 p-4 md:p-8"><strong className="text-lg leading-tight md:text-3xl">{page.title}</strong>{page.description ? <span className="line-clamp-2 text-xs md:text-sm">{page.description}</span> : null}{page.ctaLabel ? <span className="mt-1 rounded-full px-4 py-2 text-xs font-bold" style={{ background: page.textTone === 'light' ? '#fff' : '#DA3729', color: page.textTone === 'light' ? '#1c1c1e' : '#fff' }}>{page.ctaLabel}</span> : null}</div> : null}
  </div>;
}

