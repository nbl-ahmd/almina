'use client';
import Link from '../app-link';
import { useState } from 'react';
import { ComputerDesktopIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { campaignImageUrl, campaignReviewSchema, campaignState, growthPagePath, type GrowthPage, type CampaignReview } from '@almina/contracts';
import { CampaignArtwork } from '../campaign-artwork';


export function CampaignEditor({ page, onChange, cloudName, artwork = [] }: { page: GrowthPage; onChange: (page: GrowthPage) => void; cloudName?: string | undefined; artwork?: {name:string;image:string}[] }) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [review, setReview] = useState<{ key: string; data: CampaignReview } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const usableArtwork=artwork.filter(item=>campaignImageUrl(item.image,cloudName));
  const key = JSON.stringify(page), current = review?.key === key ? review.data : null;
  function change(value: Partial<GrowthPage>) { onChange({ ...page, ...value }); }
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
      <label className="grid gap-1.5 text-sm font-medium">Homepage position<select value={page.homepagePlacement} onChange={event => change({ homepagePlacement: event.target.value as GrowthPage['homepagePlacement'] })}><option value="none">Landing page only</option><option value="hero">Main campaign carousel</option><option value="secondary">Supporting campaign banners</option></select></label>
      <label className="grid gap-1.5 text-sm font-medium">Display priority<input type="number" min={0} max={100} step={1} value={page.priority} onChange={event => change({ priority: Math.min(100, Math.max(0, Math.trunc(Number(event.target.value) || 0))) })} /><span className="text-xs font-normal">Higher numbers appear first. Ties use the URL name.</span></label>
    </div>
    {usableArtwork.length ? <div className="grid gap-4 sm:grid-cols-2">{(['image','mobileImage'] as const).map(field=><label className="grid gap-1.5 text-sm font-medium" key={field}>{field==='image'?'Choose saved desktop artwork':'Choose saved mobile artwork'}<select value={usableArtwork.some(item=>item.image===page[field])?page[field]:''} onChange={event=>{if(event.target.value)change({[field]:event.target.value});}}><option value="">Select saved banner artwork</option>{usableArtwork.map((item,index)=><option value={item.image} key={item.image+index}>{item.name}</option>)}</select></label>)}</div> : null}
    <p className="mb-0 text-xs"><Link href="/admin/banners" target="_blank" rel="noopener noreferrer" className="font-medium">Upload artwork in Banners</Link>, then reload this page after saving your draft to select it here. You can also paste an approved image URL.</p>
    <label className="grid gap-1.5 text-sm font-medium">Mobile artwork URL<input type="url" value={page.mobileImage} onChange={event => change({ mobileImage: event.target.value })} /><span className="text-xs font-normal">Use approved Cloudinary or pharmacy CDN artwork. Leave blank to reuse the desktop image above.</span></label>
    <label className="grid gap-1.5 text-sm font-medium">Campaign button text<input maxLength={60} value={page.ctaLabel} onChange={event => change({ ctaLabel: event.target.value })} placeholder="e.g. Explore skincare offers" /></label>
    <p className="mb-0 break-all text-xs">Destination: {growthPagePath(page)} · Schedule: {campaignState(page)}. Dates below use UTC. Product discounts are managed separately; this campaign does not create a discount.</p>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="m-0 text-base font-medium">Unsaved preview</h3><div className="flex gap-2" role="group" aria-label="Campaign preview size"><button type="button" className="button-secondary text-xs" aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}><ComputerDesktopIcon className="size-4" />Desktop</button><button type="button" className="button-secondary text-xs" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}><DevicePhoneMobileIcon className="size-4" />Mobile</button></div></div>
    <div className="overflow-x-auto"><div className={viewport === 'mobile' ? 'campaign-preview-mobile' : undefined}><CampaignArtwork cloudName={cloudName} page={page} preview={viewport} /></div></div>
    <div><button type="button" className="button-secondary text-sm" onClick={() => void check()} disabled={busy}>{busy ? 'Checking campaign…' : 'Check campaign readiness'}</button>{review && !current ? <p className="mt-2 text-xs">The campaign changed. Run checks again before publishing.</p> : null}</div>
    {error ? <p role="alert" className="m-0 text-sm">{error}</p> : null}
    {current ? <div role="status" className="rounded-xl border p-4"><h3 className="mb-2 text-sm font-semibold">{current.warnings.length ? `${current.warnings.length} items to review` : 'No readiness warnings found'}</h3>{current.warnings.length ? <ul className="m-0 grid list-none gap-2 p-0">{current.warnings.map((warning, index) => <li className="flex items-start gap-2 text-sm" key={`${warning.code}:${warning.productId ?? index}`}><ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" /><span>{warning.message}</span></li>)}</ul> : <p className="m-0 text-xs">Check the preview and pharmacy-approved terms before saving. These checks do not approve the offer.</p>}</div> : null}
  </section>;
}
