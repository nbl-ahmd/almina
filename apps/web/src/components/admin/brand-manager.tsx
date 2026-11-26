'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { campaignImageUrl, growthPagePath, growthPageSchema, type GrowthPage } from '@almina/contracts';
import Link from '../app-link';
import { brandDirectory, brandPageState, brandProblem, newBrandPage, type BrandEntry, type BrandLocale, type BrandPageState } from '../../lib/admin/brand-directory';
import { brandSlug } from '../../lib/catalog/merchandising';
import { rememberBrand } from '../../lib/admin/catalogue-options';
import { Badge, Callout, Card, EmptyState, PageHeader } from './ui';
import { buttonVariants, inputClass, labelClass, textareaClass } from './shadcn/styles';
import { ImageUploadField } from './image-upload-field';
import { GrowthProductPicker } from './growth-product-picker';

const perPage = 25;
const states: Record<BrandPageState, { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }> = {
  published: { label: 'Published', tone: 'success' }, draft: { label: 'Draft', tone: 'warning' }, automatic: { label: 'Automatic page', tone: 'info' }, none: { label: 'No page', tone: 'neutral' },
};

async function request(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch('/api/growth/admin/' + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(response.status === 409 ? 'This brand page was changed by someone else, or already exists. Reload before saving.'
    : response.status === 400 ? 'The server rejected these details. Use an uploaded or approved image, and check the text lengths.' : 'Brand pages are unavailable. Check the connection and try again.');
  return (await response.json() as { data: unknown }).data;
}
async function brandPages(locale: BrandLocale) {
  const pages: GrowthPage[] = [];
  for (let offset = 0; offset < 2000; offset += 50) {
    // merchandising=1 returns and accepts the full page, including the newer fields.
    const result = await request(`pages?${new URLSearchParams({ kind: 'brand', locale, offset: String(offset), merchandising: '1' })}`) as { items: unknown[]; hasNext: boolean };
    pages.push(...result.items.map(item => growthPageSchema.parse(item)));
    if (!result.hasNext) break;
  }
  return pages;
}
async function loadDirectory() {
  const [names, en, ar] = await Promise.all([request('brands') as Promise<string[]>, brandPages('en'), brandPages('ar')]);
  return brandDirectory(names, [...en, ...ar]);
}

function Logo({ entry, cloudName }: { entry: BrandEntry; cloudName?: string | undefined }) {
  const url = campaignImageUrl(entry.en?.image || entry.ar?.image || '', cloudName);
  return <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface text-sm font-semibold text-mute" aria-hidden="true">
    {url ? <Image src={url} alt="" fill sizes="40px" className="object-contain p-1" /> : entry.name.slice(0, 1).toUpperCase()}
  </span>;
}

/** Catalogue → Brands: create brands, give them a logo and write their /brands/<name> page, one language at a time.
 *  Pages are the same records Website & growth uses (page type "brand"), so nothing is stored twice. */
export function BrandManager({ cloudName, initial }: { cloudName?: string | undefined; initial?: string | undefined }) {
  const [entries, setEntries] = useState<BrandEntry[] | null>(null);
  const [page, setPage] = useState<GrowthPage | null>(null);
  const [creating, setCreating] = useState(false), [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [shown, setShown] = useState(perPage), [newName, setNewName] = useState('');

  useEffect(() => {
    let active = true;
    void loadDirectory().then(rows => {
      if (!active) return;
      setEntries(rows);
      const wanted = rows.find(entry => entry.slug === initial);
      if (wanted) setPage(wanted.en ?? newBrandPage(wanted.name, 'en', wanted.slug));
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Brands could not be loaded.'); });
    return () => { active = false; };
  }, [initial]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const matches = useMemo(() => (entries ?? []).filter(entry => entry.name.toLowerCase().includes(query.trim().toLowerCase())), [entries, query]);
  const entry = page ? entries?.find(item => item.slug === page.slug) : undefined;
  const leave = () => !dirty || window.confirm('Discard the changes you have not saved?');
  function open(next: GrowthPage | null) { setPage(next); setDirty(false); setError(''); setMessage(''); window.scrollTo({ top: 0 }); }
  function change(value: Partial<GrowthPage>) { setPage(current => current ? { ...current, ...value } : current); setDirty(true); setMessage(''); }

  function create(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim(), slug = brandSlug(name);
    if (name.length < 3 || !slug) { setError('Enter the brand name in at least 3 characters, including English letters or numbers.'); return; }
    const existing = entries?.find(item => item.slug === slug);
    open(existing ? existing.en ?? newBrandPage(existing.name, 'en', existing.slug) : newBrandPage(name));
    setDirty(!existing?.en); setCreating(false); setNewName('');
    if (existing) setMessage(`${existing.name} already exists, so you are editing it.`);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!page) return;
    const value = { ...page, title: page.title.trim(), imageAlt: page.image ? page.imageAlt.trim() || `${page.title.trim()} logo` : '', faqs: page.faqs.filter(faq => faq.question.trim() || faq.answer.trim()) };
    const problem = brandProblem(value);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = growthPageSchema.parse(await request('page?merchandising=1', value));
      setPage(saved); setDirty(false);
      if (saved.locale === 'en') rememberBrand(saved.title);
      setEntries(current => {
        const rows = current ?? [];
        const names = rows.filter(item => item.onProducts).map(item => item.name);
        const pages = rows.flatMap(item => [item.en, item.ar].filter((row): row is GrowthPage => Boolean(row))).filter(row => !(row.slug === saved.slug && row.locale === saved.locale));
        return brandDirectory(names, [...pages, saved]);
      });
      setMessage(saved.published ? 'Saved and published. Shoppers see this page now.' : 'Draft saved. Publish the page when it is ready for shoppers.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }

  const notices = <>
    {error ? <Callout tone="danger" role="alert"><p>{error}</p></Callout> : null}
    {message ? <Callout tone="success" role="status"><p>{message}</p></Callout> : null}
  </>;

  if (page) {
    const locale = page.locale, path = growthPagePath(page);
    const switchTo = (next: BrandLocale) => {
      if (next === locale || !leave()) return;
      const existing = entry?.[next];
      // A new Arabic page keeps the same address and logo; its text is written in Arabic.
      open(existing ?? { ...newBrandPage(entry?.name ?? page.title, next, page.slug), image: entry?.en?.image ?? page.image, imageAlt: entry?.en?.imageAlt ?? page.imageAlt });
    };
    return <>
      <PageHeader title={entry?.name ?? (page.title || 'New brand')} description={<>Brand page at <code>{path}</code></>}
        actions={<>
          {page.published && !dirty ? <a className={buttonVariants({ variant: 'ghost' })} href={path} target="_blank" rel="noopener noreferrer">View page</a> : null}
          <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => { if (leave()) open(null); }}><ArrowLeftIcon className="size-4" aria-hidden="true" />All brands</button>
        </>} />
      {notices}
      <div className="mb-4 flex gap-2" role="group" aria-label="Page language">{(['en', 'ar'] as const).map(value => <button key={value} type="button" aria-pressed={locale === value} disabled={busy || (value === 'ar' && !entry)} className={buttonVariants({ variant: locale === value ? 'default' : 'secondary' })} onClick={() => switchTo(value)}>{value === 'en' ? 'English' : 'Arabic'}</button>)}
        {!entry ? <span className="self-center text-xs text-mute">Save the English page first to add Arabic.</span> : null}</div>
      <form onSubmit={save} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card title="Brand">
            <div className="grid gap-4">
              <label className={labelClass}>Brand name{locale === 'ar' ? ' (Arabic)' : ''}<input className={inputClass} dir={locale === 'ar' ? 'rtl' : 'ltr'} required minLength={3} maxLength={200} value={page.title} onChange={event => change({ title: event.target.value })} />
                {locale === 'en' ? <span className="text-xs font-normal text-mute">{entry?.onProducts && brandSlug(page.title) !== page.slug ? `This no longer matches the brand written on products (“${entry.name}”), so the page may list no products.` : 'Products appear on this page when their Brand field matches this name.'}</span> : null}</label>
              <ImageUploadField label="Brand logo" size="600 × 600" value={page.image} onChange={image => change({ image })} hint="A square logo on a transparent or white background (PNG or WebP). It shows on the brand page, the brands list and homepage brand tiles." />
              {page.image ? <label className={labelClass}>Logo description<input className={inputClass} maxLength={200} value={page.imageAlt} placeholder={`${page.title} logo`} onChange={event => change({ imageAlt: event.target.value })} /></label> : null}
            </div>
          </Card>
          <Card title="Page content">
            <div className="grid gap-4">
              <label className={labelClass}>Search description<textarea className={textareaClass} dir={locale === 'ar' ? 'rtl' : 'ltr'} maxLength={320} value={page.description} onChange={event => change({ description: event.target.value })} /><span className="text-xs font-normal text-mute">{page.description.length} of 320 characters. Shown under the page title and in search results.</span></label>
              <label className={labelClass}>Page text<textarea className={`${textareaClass} min-h-40`} dir={locale === 'ar' ? 'rtl' : 'ltr'} maxLength={12000} value={page.body} onChange={event => change({ body: event.target.value })} /><span className="text-xs font-normal text-mute">Plain text. Separate paragraphs with a blank line. Do not copy manufacturer text.</span></label>
            </div>
          </Card>
          <Card title="Products" description="Leave empty to list every product that carries this brand name. Choose products to show only those, in your order.">
            <GrowthProductPicker limit={80} ids={page.productIds} onChange={productIds => change({ productIds })} label="Choose products (optional)" />
          </Card>
          <Card title="Questions & answers">
            <div className="grid gap-3">
              {page.faqs.map((faq, index) => <div key={index} className="grid gap-2 rounded-lg border border-line p-3">
                <label className={labelClass}>Question<input className={inputClass} maxLength={200} value={faq.question} onChange={event => change({ faqs: page.faqs.map((item, at) => at === index ? { ...item, question: event.target.value } : item) })} /></label>
                <label className={labelClass}>Answer<textarea className={textareaClass} maxLength={1500} value={faq.answer} onChange={event => change({ faqs: page.faqs.map((item, at) => at === index ? { ...item, answer: event.target.value } : item) })} /></label>
                <button type="button" className={`${buttonVariants({ variant: 'outline', size: 'sm' })} w-fit`} onClick={() => change({ faqs: page.faqs.filter((_, at) => at !== index) })}>Remove question</button>
              </div>)}
              <button type="button" className={`${buttonVariants({ variant: 'outline' })} w-fit`} disabled={page.faqs.length >= 15} onClick={() => change({ faqs: [...page.faqs, { question: '', answer: '' }] })}>Add question</button>
            </div>
          </Card>
        </div>
        <div className="lg:sticky lg:top-4">
          <Card title="Publishing">
            <div className="grid gap-3">
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-5" checked={page.published} onChange={event => change({ published: event.target.checked })} />Publish this page</label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-5" checked={page.healthContent} onChange={event => change({ healthContent: event.target.checked })} />Contains health guidance</label>
              {page.healthContent ? <label className={labelClass}>Pharmacy reviewer<input className={inputClass} maxLength={200} value={page.reviewer} onChange={event => change({ reviewer: event.target.value })} /><span className="text-xs font-normal text-mute">Required to publish health guidance.</span></label> : null}
              <button type="submit" disabled={busy} className={buttonVariants({ variant: 'default', size: 'lg' })}>{busy ? 'Saving…' : page.published ? 'Save and publish' : 'Save draft'}</button>
              <p className="m-0 text-xs text-mute">{locale === 'en' ? 'Until you publish, shoppers see the automatic page for brands that have products.' : 'The Arabic page appears only after you publish it.'}</p>
              {entry?.onProducts ? <Link className="text-[13px] font-medium" href={`/admin/products?q=${encodeURIComponent(entry.name)}&view=all`}>View products from this brand</Link> : null}
            </div>
          </Card>
        </div>
      </form>
    </>;
  }

  return <>
    <PageHeader title="Brands" description="Create brands, add their logos and set up each brand page."
      actions={<button type="button" className={buttonVariants({ variant: 'default', size: 'lg' })} aria-expanded={creating} onClick={() => { setCreating(value => !value); setError(''); }}><PlusIcon className="size-4" aria-hidden="true" />Create brand</button>} />
    {notices}
    {creating ? <Card title="Create brand" description="Name the brand, then add its logo and page. Use the same spelling on its products.">
      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <label className={`${labelClass} min-w-[240px] flex-1`}>New brand name<input className={inputClass} autoFocus required minLength={3} maxLength={120} value={newName} onChange={event => setNewName(event.target.value)} /></label>
        <button type="submit" className={buttonVariants({ variant: 'default' })} disabled={entries === null}>Continue</button>
      </form>
    </Card> : null}
    <Card flush>
      <div className="px-5 pt-5 md:px-6"><label className={`${labelClass} max-w-sm`}>Search brands<input className={inputClass} type="search" value={query} onChange={event => { setQuery(event.target.value); setShown(perPage); }} /></label></div>
      {entries === null ? <p role="status" className="px-5 py-6 text-sm text-mute md:px-6">{error ? 'Reload the page to try again.' : 'Loading brands…'}</p>
        : !matches.length ? <EmptyState icon={<TagIcon />} title={entries.length ? 'No brands match' : 'No brands yet'}>{entries.length ? 'Try another name, or create the brand.' : 'Create the first brand to add its logo and page.'}</EmptyState>
          : <>
            <ul className="m-0 mt-3 list-none divide-y divide-line p-0">{matches.slice(0, shown).map(item => <li key={item.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 md:px-6">
              <Logo entry={item} cloudName={cloudName} />
              <span className="grid min-w-[140px] flex-1"><strong className="break-words text-sm">{item.name}</strong><span className="text-xs text-mute">/brands/{item.slug}{item.onProducts ? '' : ' · no products yet'}</span></span>
              <span className="flex flex-wrap gap-2">{(['en', 'ar'] as const).map(locale => { const state = states[brandPageState(item, locale)]; return <Badge key={locale} tone={state.tone} className="normal-case">{locale === 'en' ? 'English' : 'Arabic'}: {state.label.toLowerCase()}</Badge>; })}</span>
              <button type="button" className={buttonVariants({ variant: 'outline' })} aria-label={`${item.en ? 'Edit' : 'Set up'} ${item.name}`} onClick={() => open(item.en ?? newBrandPage(item.name, 'en', item.slug))}>{item.en ? 'Edit' : 'Set up page'}</button>
            </li>)}</ul>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] text-mute md:px-6"><span role="status">Showing {Math.min(shown, matches.length)} of {matches.length}</span>{shown < matches.length ? <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => setShown(value => value + perPage)}>Show more</button> : null}</div>
          </>}
    </Card>
  </>;
}
