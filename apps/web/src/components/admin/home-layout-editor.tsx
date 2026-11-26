'use client';
import { useEffect, useId, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { homeLayoutAdminSchema, homeLayoutSaveSchema, sectionBackgrounds, withTopSections, type HomeLayoutAdmin, type HomeSection } from '@almina/contracts';
import { inputClass, selectClass } from './shadcn/styles';
import { ImageUploadField } from './image-upload-field';
import { heroArtwork, sizeLabel, stripArtwork, type ArtworkFrames } from '../../lib/storefront/artwork';
import { GrowthProductPicker } from './growth-product-picker';

const field = 'grid min-w-0 gap-1.5 text-sm font-medium text-ink';
const secondary = 'min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink';
const builtinNames: Record<string, string> = {
  promo: 'Thin promo strip (campaigns)', hero: 'Main carousel (campaigns and banners)',
  categories: 'Shop by care (category tiles)', 'strip-top': 'Campaign strips: under categories', essentials: 'Your everyday essentials (shelf)',
  'strip-middle': 'Campaign strips: between shelves', collections: 'Collection tiles', offers: 'A little more value (offers shelf)',
  daily: 'Personal care shelf', routine: 'Skincare routine', budget: 'AED 50 & under shelf', 'strip-bottom': 'Campaign strips: above brands',
  brands: 'Brand tiles', campaigns: 'Supporting campaign cards', recent: 'Recently viewed', help: 'Help row',
};
const typeNames = { products: 'Product row', categories: 'Category cards', brands: 'Brand tiles', images: 'Image tiles', carousel: 'Image carousel', strip: 'Banner strip' } as const;
type CustomType = keyof typeof typeNames;
const blankArt = { image: '', mobileImage: '', alt: '', href: '' };
const uaeOffset = 4 * 3600000;
const uaeInput = (value: string | null) => value ? new Date(Date.parse(value) + uaeOffset).toISOString().slice(0, 16) : '';
const uaeValue = (value: string) => value ? new Date(value + '+04:00').toISOString() : null;

function newSection(type: CustomType): HomeSection {
  // A random suffix: a removed section's id (and its /sections/<id> address) is never handed to a different section.
  const common = { id: `${type}-${crypto.randomUUID().slice(0, 8)}`, enabled: true, title: '', subtitle: '', background: 'none' as const, viewAllHref: '', banner: null, startsAt: null, endsAt: null };
  if (type === 'products') return { ...common, type, source: { kind: 'offers' }, limit: 12 };
  if (type === 'categories') return { ...common, type, categoryIds: [] as unknown as [string] };
  if (type === 'brands') return { ...common, type, brands: [] as unknown as [string] };
  if (type === 'images') return { ...common, type, tiles: [{ ...blankArt }] as never, columns: 2, ratio: 'square' };
  if (type === 'carousel') return { ...common, type, slides: [{ ...blankArt }] as never };
  return { ...common, type: 'strip', strip: { ...blankArt } as never };
}
const label = (section: HomeSection) => section.type === 'builtin' ? builtinNames[section.key] ?? section.key : `${typeNames[section.type]}${section.title ? ` · ${section.title}` : ''}`;

// Tile frames keep one shape on every screen.
const tile = (width: number, height: number): ArtworkFrames => ({ desktop: { width, height }, mobile: { width, height } });
const tileFrames = { square: tile(800, 800), portrait: tile(600, 800), landscape: tile(1280, 720) };
function ArtFields({ value, onChange, frames }: { value: { image: string; mobileImage: string; alt: string; href: string }; onChange: (value: { image: string; mobileImage: string; alt: string; href: string }) => void; frames: ArtworkFrames }) {
  return <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
    <ImageUploadField label="Desktop image" size={sizeLabel(frames.desktop)} frame={frames.desktop} value={value.image} onChange={image => onChange({ ...value, image })} hint="Screens 900px and wider." />
    <ImageUploadField label="Phone image" size={sizeLabel(frames.mobile)} frame={frames.mobile} value={value.mobileImage} onChange={mobileImage => onChange({ ...value, mobileImage })} hint="Phones and tablets below 900px. Optional; the desktop image is used when empty." />
    <label className={field}>Image description<input className={inputClass} maxLength={80} value={value.alt} onChange={event => onChange({ ...value, alt: event.target.value })} placeholder="What the image shows or says" /></label>
    <label className={field}>Link (optional)<input className={inputClass} maxLength={250} value={value.href} onChange={event => onChange({ ...value, href: event.target.value.trim() })} placeholder="/offers, /brands/cerave, /categories/…" /></label>
  </div>;
}

type FilteredSource = Extract<Extract<HomeSection, { type: 'products' }>['source'], { kind: 'filtered' }>;
function FilterFields({ source, categories, brandList, onChange }: { source: FilteredSource; categories: { id: string; name: string }[]; brandList: string; onChange: (source: FilteredSource) => void }) {
  // An empty field removes its filter altogether.
  const set = (key: keyof FilteredSource, value: string | number | boolean | undefined) => { const next: Record<string, unknown> = { ...source, [key]: value }; if (value === undefined || value === '' || value === false) delete next[key]; onChange(next as FilteredSource); };
  const price = (value: string) => value === '' ? undefined : Math.max(0, Math.round(Number(value) * 100) / 100);
  return <fieldset className="m-0 grid gap-3 border-0 p-0 sm:col-span-2 sm:grid-cols-3"><legend className="mb-1 text-sm font-medium">Show products that match all of these</legend>
    <label className={field}>Category<select className={selectClass} value={source.categoryId ?? ''} onChange={event => set('categoryId', event.target.value)}><option value="">Any category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label className={field}>Brand<input className={inputClass} list={brandList} value={source.brand ?? ''} placeholder="Any brand" onChange={event => set('brand', event.target.value)} /></label>
    <label className={field}>Order<select className={selectClass} value={source.sort ?? 'relevance'} onChange={event => set('sort', event.target.value === 'relevance' ? undefined : event.target.value)}><option value="relevance">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
    <label className={field}>Minimum price (AED)<input className={inputClass} type="number" min={0} step="0.01" value={source.minPrice ?? ''} onChange={event => set('minPrice', price(event.target.value))} /></label>
    <label className={field}>Maximum price (AED)<input className={inputClass} type="number" min={0} step="0.01" value={source.maxPrice ?? ''} onChange={event => set('maxPrice', price(event.target.value))} /></label>
    <div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={source.offers === true} onChange={event => set('offers', event.target.checked)} />On offer</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={source.inStock === true} onChange={event => set('inStock', event.target.checked)} />In stock</label></div>
  </fieldset>;
}

/** The ordered list of sections with their editors, shared by the homepage and custom pages. */
export function SectionsEditor({ sections, onChange }: { sections: HomeSection[]; onChange: (sections: HomeSection[]) => void }) {
  const brandList = useId();
  const [open, setOpen] = useState<string>('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const list = (path: string) => fetch('/api/growth/admin/' + path).then(response => response.ok ? response.json() : { data: [] }).catch(() => ({ data: [] }));
    void Promise.all([list('categories'), list('brands')]).then(([cats, names]) => { if (!active) return; setCategories(Array.isArray(cats.data) ? cats.data : []); setBrands(Array.isArray(names.data) ? names.data : []); });
    return () => { active = false; };
  }, []);
  const set = onChange;
  const update = (index: number, value: Partial<HomeSection>) => set(sections.map((item, at) => at === index ? { ...item, ...value } as HomeSection : item));
  const move = (index: number, by: number) => { const next = [...sections]; const [item] = next.splice(index, 1); next.splice(index + by, 0, item!); set(next); };
  return <div className="grid gap-4">
    <ol className="m-0 grid list-none gap-2 p-0">{sections.map((section, index) => <li key={section.id} className={`rounded-xl border bg-surface ${dragging === index ? 'border-ink opacity-60' : 'border-line'}`}
      draggable onDragStart={event => { setDragging(index); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragging(null)}
      onDragOver={event => { if (dragging !== null) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (dragging !== null && dragging !== index) move(dragging, index - dragging); setDragging(null); }}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={section.enabled} onChange={event => update(index, { enabled: event.target.checked })} aria-label={`Show ${label(section)}`} /></label>
        <button type="button" className="min-h-11 flex-1 text-start text-sm font-medium" onClick={() => setOpen(open === section.id ? '' : section.id)} aria-expanded={open === section.id} disabled={section.type === 'builtin'}>{label(section)}{section.type !== 'builtin' ? <span className="ms-2 text-xs font-normal text-mute">{open === section.id ? 'Close' : 'Edit'}</span> : <span className="ms-2 text-xs font-normal text-mute">Built in</span>}</button>
        <button type="button" className="grid size-11 place-items-center rounded-full border border-line" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${label(section)} up`}><ArrowUpIcon className="size-4" /></button>
        <button type="button" className="grid size-11 place-items-center rounded-full border border-line" disabled={index === sections.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${label(section)} down`}><ArrowDownIcon className="size-4" /></button>
        {section.type !== 'builtin' ? <button type="button" className="grid size-11 place-items-center rounded-full border border-line" onClick={() => set(sections.filter((_, at) => at !== index))} aria-label={`Remove ${label(section)}`}><TrashIcon className="size-4" /></button> : null}
      </div>
      {section.type !== 'builtin' && open === section.id ? <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
        <label className={field}>Title<input className={inputClass} maxLength={80} value={section.title} onChange={event => update(index, { title: event.target.value })} placeholder="e.g. Pharmacy essentials" /></label>
        <label className={field}>Short description (optional)<input className={inputClass} maxLength={160} value={section.subtitle} onChange={event => update(index, { subtitle: event.target.value })} /></label>
        <label className={field}>Background<select className={selectClass} value={section.background} onChange={event => update(index, { background: event.target.value as typeof sectionBackgrounds[number] })}>{sectionBackgrounds.map(value => <option key={value} value={value}>{value === 'none' ? 'None (white)' : value[0]!.toUpperCase() + value.slice(1) + ' tint'}</option>)}</select></label>
        <label className={field}>“View all” link (optional)<input className={inputClass} maxLength={250} value={section.viewAllHref} onChange={event => update(index, { viewAllHref: event.target.value.trim() })} placeholder="Leave blank to link the category, brand or offers page" /></label>
        <label className={field}>Starts (UAE time, optional)<input className={inputClass} type="datetime-local" value={uaeInput(section.startsAt)} onChange={event => update(index, { startsAt: uaeValue(event.target.value) })} /></label>
        <label className={field}>Ends (UAE time, optional)<input className={inputClass} type="datetime-local" value={uaeInput(section.endsAt)} onChange={event => update(index, { endsAt: uaeValue(event.target.value) })} /></label>
        {section.type === 'products' ? <>
          <label className={field}>Products from<select className={selectClass} value={section.source.kind} onChange={event => { const kind = event.target.value; update(index, { source: kind === 'category' ? { kind, categoryId: categories[0]?.id ?? '' } : kind === 'brand' ? { kind, brand: brands[0] ?? '' } : kind === 'selected' ? { kind, productIds: [] as unknown as [string] } : kind === 'filtered' ? { kind, inStock: true } : { kind: 'offers' } } as Partial<HomeSection>); }}><option value="offers">Current offers</option><option value="category">A category</option><option value="brand">A brand</option><option value="selected">Products I choose</option><option value="filtered">Combine filters</option></select></label>
          <label className={field}>Number of products<input className={inputClass} type="number" min={4} max={24} value={section.limit} onChange={event => update(index, { limit: Math.min(24, Math.max(4, Number(event.target.value) || 12)) })} /></label>
          {section.source.kind === 'category' ? <label className={field}>Category<select className={selectClass} value={section.source.categoryId} onChange={event => update(index, { source: { kind: 'category', categoryId: event.target.value } })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label> : null}
          {section.source.kind === 'brand' ? <label className={field}>Brand<input className={inputClass} list={brandList} value={section.source.brand} onChange={event => update(index, { source: { kind: 'brand', brand: event.target.value } })} /></label> : null}
          {section.source.kind === 'filtered' ? <FilterFields source={section.source} categories={categories} brandList={brandList} onChange={source => update(index, { source })} /> : null}
          {section.source.kind === 'selected' ? <div className="sm:col-span-2"><GrowthProductPicker ids={section.source.productIds} onChange={productIds => update(index, { source: { kind: 'selected', productIds: productIds as [string] } })} limit={40} label="Products in this row" hint="Shown in this order; out-of-stock products move to the end." /></div> : null}
        </> : null}
        {section.type === 'categories' ? <fieldset className="m-0 grid gap-2 border-0 p-0 sm:col-span-2"><legend className="mb-1 text-sm font-medium">Categories to show</legend><div className="flex flex-wrap gap-2">{categories.map(category => <label key={category.id} className="flex min-h-10 items-center gap-2 rounded-full bg-soft px-3 text-sm"><input type="checkbox" checked={section.categoryIds.includes(category.id)} onChange={event => update(index, { categoryIds: (event.target.checked ? [...section.categoryIds, category.id] : section.categoryIds.filter(id => id !== category.id)) as [string] })} />{category.name}</label>)}</div><p className="m-0 text-xs text-mute">Each card uses the category image from Categories, or a product photo from that category when none is uploaded.</p></fieldset> : null}
        {section.type === 'brands' ? <fieldset className="m-0 grid gap-2 border-0 p-0 sm:col-span-2"><legend className="mb-1 text-sm font-medium">Brands to show</legend><div className="flex flex-wrap gap-2">{section.brands.map(name => <button type="button" key={name} className="min-h-10 rounded-full bg-soft px-3 text-sm" onClick={() => update(index, { brands: section.brands.filter(item => item !== name) as [string] })}>{name} ✕</button>)}</div><input className={inputClass} list={brandList} placeholder="Type a brand and press Enter" onKeyDown={event => { if (event.key !== 'Enter') return; event.preventDefault(); const value = event.currentTarget.value.trim(); if (value && !section.brands.includes(value) && section.brands.length < 24) update(index, { brands: [...section.brands, value] as [string] }); event.currentTarget.value = ''; }} /><p className="m-0 text-xs text-mute">Logos come from each brand’s page in Website & growth → Pages (kind: brand).</p></fieldset> : null}
        {section.type === 'images' ? <div className="grid gap-3 sm:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2"><label className={field}>Tiles per row on phones<select className={selectClass} value={section.columns} onChange={event => update(index, { columns: Number(event.target.value) as 2 | 3 | 4 })}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label><label className={field}>Tile shape<select className={selectClass} value={section.ratio} onChange={event => update(index, { ratio: event.target.value as 'square' | 'portrait' | 'landscape' })}><option value="square">Square (800 × 800)</option><option value="portrait">Portrait (600 × 800)</option><option value="landscape">Landscape (1280 × 720)</option></select></label></div>
          {section.tiles.map((tile, at) => <div key={at} className="grid gap-2"><ArtFields value={tile} frames={tileFrames[section.ratio]} onChange={value => update(index, { tiles: section.tiles.map((item, i) => i === at ? value : item) as never })} />{section.tiles.length > 1 ? <button type="button" className="w-fit text-sm underline" onClick={() => update(index, { tiles: section.tiles.filter((_, i) => i !== at) as never })}>Remove tile</button> : null}</div>)}
          {section.tiles.length < 8 ? <button type="button" className={secondary + ' w-fit'} onClick={() => update(index, { tiles: [...section.tiles, { ...blankArt }] as never })}>Add tile</button> : null}
        </div> : null}
        {section.type === 'carousel' ? <div className="grid gap-3 sm:col-span-2">
          {section.slides.map((slide, at) => <div key={at} className="grid gap-2"><ArtFields value={slide} frames={heroArtwork} onChange={value => update(index, { slides: section.slides.map((item, i) => i === at ? value : item) as never })} />{section.slides.length > 1 ? <button type="button" className="w-fit text-sm underline" onClick={() => update(index, { slides: section.slides.filter((_, i) => i !== at) as never })}>Remove slide</button> : null}</div>)}
          {section.slides.length < 10 ? <button type="button" className={secondary + ' w-fit'} onClick={() => update(index, { slides: [...section.slides, { ...blankArt }] as never })}>Add slide</button> : null}
        </div> : null}
        {section.type === 'strip' ? <div className="sm:col-span-2"><ArtFields value={section.strip} frames={stripArtwork} onChange={value => update(index, { strip: value as never })} /></div> : null}
        {section.type !== 'strip' ? <div className="grid gap-2 sm:col-span-2"><p className="m-0 text-sm font-medium">Banner above this section (optional, thin strip)</p>{section.banner ? <><ArtFields value={section.banner} frames={stripArtwork} onChange={value => update(index, { banner: value })} /><button type="button" className="w-fit text-sm underline" onClick={() => update(index, { banner: null })}>Remove banner</button></> : <button type="button" className={secondary + ' w-fit'} onClick={() => update(index, { banner: { ...blankArt } })}>Add banner</button>}</div> : null}
      </div> : null}
    </li>)}</ol>
    <datalist id={brandList}>{brands.map(name => <option key={name} value={name} />)}</datalist>
    <div className="flex flex-wrap items-center gap-2"><label className={field}>Add a section<select className={selectClass} value="" onChange={event => { const type = event.target.value as CustomType; if (!type) return; const section = newSection(type); set([...sections, section]); setOpen(section.id); }}><option value="">Choose a type…</option>{(Object.keys(typeNames) as CustomType[]).map(type => <option key={type} value={type}>{typeNames[type]}</option>)}</select></label></div>
  </div>;
}

/** Website & growth → Homepage: order, hide and schedule homepage sections, and add Life Pharmacy / Aster style sections. */
export function HomeLayoutEditor() {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [layout, setLayout] = useState<HomeLayoutAdmin | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [busy, setBusy] = useState(true), [message, setMessage] = useState(''), [issue, setIssue] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/growth/admin/home-layout?locale=' + locale).then(response => response.ok ? response.json() : Promise.reject(new Error('load'))).then(saved => {
      if (!active) return;
      const draft = homeLayoutAdminSchema.parse(saved.data); setLayout({ ...draft, sections: withTopSections(draft.sections) }); setUnsaved(false);
      setIssue('');
    }).catch(() => { if (active) setIssue('Could not load the homepage layout. Reload to try again.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [locale]);
  if (!layout) return <p className="text-sm text-mute">{busy ? 'Loading homepage…' : issue}</p>;
  const sections = layout.sections;
  const set = (next: HomeSection[]) => { setLayout({ ...layout, sections: next }); setUnsaved(true); setMessage(''); };
  async function save(action: 'save' | 'publish' | 'unpublish') {
    if (!layout) return;
    const parsed = homeLayoutSaveSchema.safeParse({ ...layout, action });
    if (!parsed.success) { setIssue(parsed.error.issues[0]?.message.startsWith('Invalid') ? 'Check each section: titles, chosen items, images and their descriptions, and links starting with /.' : parsed.error.issues[0]?.message ?? 'Check the sections.'); return; }
    setBusy(true); setIssue(''); setMessage('');
    try {
      const response = await fetch('/api/growth/admin/home-layout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify(parsed.data) });
      if (response.status === 409) { setIssue('Someone else saved the homepage. Reload before editing again.'); return; }
      if (!response.ok) throw new Error();
      const next = homeLayoutAdminSchema.parse((await response.json()).data);
      setLayout({ ...next, sections: withTopSections(next.sections) }); setUnsaved(false);
      setMessage(action === 'publish' ? 'Published. The homepage shows this layout now.' : action === 'unpublish' ? 'Unpublished. Customers see the built-in homepage; your draft is kept.'
        : next.published ? 'Draft saved. The live homepage is unchanged until you publish.' : 'Draft saved. Customers see the built-in homepage until you publish.');
    } catch { setIssue('Could not save. Check the sections and try again.'); }
    finally { setBusy(false); }
  }
  // Copies the sections on screen into the Arabic draft only; the live Arabic homepage changes when someone publishes it.
  async function copyToArabic() {
    if (!layout) return;
    setBusy(true); setIssue(''); setMessage('');
    try {
      const current = await fetch('/api/growth/admin/home-layout?locale=ar');
      if (!current.ok) throw new Error();
      const arabic = homeLayoutAdminSchema.parse((await current.json()).data);
      if (arabic.revision > 0 && !window.confirm('Replace the saved Arabic draft with these sections? The live Arabic homepage is not changed.')) return;
      const parsed = homeLayoutSaveSchema.safeParse({ locale: 'ar', revision: arabic.revision, sections: layout.sections, action: 'save' });
      if (!parsed.success) { setIssue('Complete every section before copying it to Arabic.'); return; }
      const response = await fetch('/api/growth/admin/home-layout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify(parsed.data) });
      if (!response.ok) throw new Error();
      setMessage('Copied to the Arabic draft. Choose Arabic above to translate the titles, replace artwork, then publish.');
    } catch { setIssue('Could not copy to Arabic. Try again.'); }
    finally { setBusy(false); }
  }
  return <section className="grid gap-4" aria-labelledby="home-layout-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="home-layout-title" className="mb-1 text-lg font-semibold">Homepage sections</h2><p className="m-0 max-w-prose text-sm text-mute">Drag sections (or use the arrows) to order them; hide or schedule them, and add product rows, category or brand cards, image tiles, carousels and banner strips. {!layout.published ? 'Nothing is published: the homepage uses the built-in order.' : layout.unpublishedChanges ? 'A published version is live. This draft has changes customers cannot see yet.' : 'This layout is published.'}{unsaved ? ' You have unsaved edits.' : ''}</p></div>
      <label className={field}>Language<select className={selectClass} value={locale} onChange={event => { setBusy(true); setLayout(null); setLocale(event.target.value === 'ar' ? 'ar' : 'en'); }}><option value="en">English</option><option value="ar">Arabic</option></select></label>
    </div>
    <SectionsEditor sections={sections} onChange={set} />
    <div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={busy} onClick={() => void save('save')}>Save draft</button>{locale === 'en' ? <button type="button" className={secondary} disabled={busy} onClick={() => void copyToArabic()}>Copy to Arabic draft</button> : null}<a className={secondary + ' inline-flex items-center'} href="/?preview=layout" target="_blank" rel="noopener noreferrer" title={locale === 'ar' ? 'Switch the storefront to العربية to see the Arabic draft' : undefined}>Preview saved draft</a><button type="button" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white" disabled={busy} onClick={() => void save('publish')}>Publish homepage</button>{layout.published ? <button type="button" className={secondary} disabled={busy} onClick={() => void save('unpublish')}>Unpublish (use built-in homepage)</button> : null}</div>
    <p className="m-0 text-xs text-mute">Preview shows the last saved draft to signed-in admins only{locale === 'ar' ? '; switch the storefront language to العربية first to see the Arabic layout' : ''}.</p>
    {issue ? <p role="alert" className="m-0 text-sm">{issue}</p> : null}
    {message ? <p role="status" className="m-0 text-sm">{message}</p> : null}
  </section>;
}
