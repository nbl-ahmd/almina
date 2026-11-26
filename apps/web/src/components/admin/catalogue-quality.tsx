import { ArrowDownTrayIcon, CheckBadgeIcon, ExclamationTriangleIcon, QrCodeIcon, ShoppingBagIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import {
  catalogueGapLabels, catalogueGaps, enrichmentScopeLabels, enrichmentScopes,
  type CatalogueFilter, type CatalogueGap, type EnrichmentQuery, type EnrichmentQueue, type QualityReport,
} from '@almina/contracts';
import Link from '../app-link';
import { Card, Note, PageHeader, buttonVariants, cn } from './ui';
import { EnrichmentImport, EnrichmentTable, type QueueRow } from './catalogue-quality-actions';
import { editorHref, listHref } from '../../lib/admin/catalogue-links';

const number = (value: number) => value.toLocaleString('en-AE');
const percent = (part: number, whole: number) => whole ? Math.round((part / whole) * 100) : 100;
/** The Products list filter that shows the same gap, where one exists. */
const productFilter: Partial<Record<CatalogueGap, CatalogueFilter>> = {
  photo: 'missing-photo', brand: 'missing-brand', gtin: 'missing-gtin', manufacturer: 'missing-manufacturer', pack: 'missing-pack',
  description: 'missing-description', type: 'classification',
};
const listView = { live: 'live', instock: 'all', all: 'all' } as const;

function queueHref(query: Pick<EnrichmentQuery, 'scope' | 'gap'>, offset = 0) {
  const params = new URLSearchParams();
  if (query.scope !== 'live') params.set('scope', query.scope);
  if (query.gap !== 'any') params.set('gap', query.gap);
  if (offset) params.set('offset', String(offset));
  return `/admin/catalogue-quality${params.size ? `?${params}` : ''}#queue`;
}

function Coverage({ report, query }: { report: QualityReport; query: Pick<EnrichmentQuery, 'scope' | 'gap'> }) {
  const scope = report[query.scope];
  return <Card title="Completeness" description={`${enrichmentScopeLabels[query.scope]}: ${number(scope.total)} ${scope.total === 1 ? 'product' : 'products'}. Share that has each detail.`}
    aside={<nav aria-label="Which products" className="flex flex-wrap gap-1.5">{enrichmentScopes.map(value => <Link key={value} href={queueHref({ ...query, scope: value }).replace('#queue', '')}
      aria-current={query.scope === value ? 'true' : undefined}
      className={cn('inline-flex min-h-8 items-center rounded-full border px-3 text-[13px] font-medium no-underline', query.scope === value ? '!border-ink bg-ink text-white' : '!border-line-strong bg-surface text-ink-2 hover:bg-fill')}>{enrichmentScopeLabels[value]}</Link>)}</nav>}>
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">{catalogueGaps.map(gap => {
      const missing = scope.missing[gap], have = scope.total - missing, share = percent(have, scope.total), filter = productFilter[gap];
      return <li key={gap} className="grid gap-1.5 rounded-lg bg-soft p-3">
        <span className="flex items-baseline justify-between gap-3 text-[13px]"><span className="font-medium">{catalogueGapLabels[gap]}</span><span className="tabular-nums text-mute"><strong className="text-ink">{share}%</strong> · {number(have)} of {number(scope.total)}</span></span>
        <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className={cn('block h-full rounded-full', share >= 90 ? 'bg-ok' : share >= 50 ? 'bg-ink' : 'bg-warn')} style={{ width: `${share}%` }} /></span>
        {missing ? <span className="flex flex-wrap gap-x-3 text-xs">
          <Link href={queueHref({ ...query, gap })}>{number(missing)} to fix, by priority</Link>
          {filter ? <Link href={listHref({ view: listView[query.scope], filter })} className="text-mute">Open in Products</Link> : null}
        </span> : <span className="text-xs text-ok">Complete</span>}
      </li>;
    })}</ul>
  </Card>;
}

function Merchant({ report }: { report: QualityReport }) {
  const { merchant } = report, eligible = report.live.total - merchant.medicines;
  const list = (rows: QualityReport['merchant']['dataGaps']) => <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">{rows.slice(0, 6).map(row =>
    <li key={row.issue} className="flex justify-between gap-3"><span>{row.issue}</span><span className="tabular-nums text-mute">{number(row.products)}</span></li>)}</ul>;
  return <Card title="Google Merchant readiness" icon={<ShoppingBagIcon className="size-4" />}
    description={`Live products the UAE Google feed would accept today, checked with the same rules as the feed.`}>
    <p className="m-0 flex items-baseline gap-2 text-3xl font-semibold tabular-nums">{number(merchant.ready)}<span className="text-sm font-medium text-mute">of {number(eligible)} eligible live products ready</span></p>
    <p className="mb-4 mt-1 text-xs text-mute">{number(merchant.medicines)} live {merchant.medicines === 1 ? 'medicine is' : 'medicines are'} excluded from Google in the UAE by policy.</p>
    {merchant.legacyPhotoOnly ? <Note tone="info" icon={<CheckBadgeIcon />}><p>{number(merchant.legacyPhotoOnly)} live {merchant.legacyPhotoOnly === 1 ? 'product shows' : 'products show'} an older photo that the feed cannot use. Publish its reviewed image from <Link href="/admin/image-review">Image review</Link> or upload a new one.</p></Note> : null}
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <div><h3 className="mb-2 mt-0 text-[13px] font-semibold">Missing details</h3>{merchant.dataGaps.length ? list(merchant.dataGaps) : <p className="m-0 text-[13px] text-mute">None.</p>}</div>
      <div><h3 className="mb-2 mt-0 text-[13px] font-semibold">Needs a person’s review</h3>{merchant.reviewSteps.length ? list(merchant.reviewSteps) : <p className="m-0 text-[13px] text-mute">None.</p>}
        <p className="mb-0 mt-2 text-xs text-mute">Approval for Google, content review and the identifier decision are made in each product’s editor, under catalogue readiness.</p></div>
    </div>
  </Card>;
}

function Identifiers({ report }: { report: QualityReport }) {
  const { identifiers } = report;
  return <Card title="Barcodes and identifiers" icon={<QrCodeIcon className="size-4" />}>
    <ul className="m-0 mb-4 grid list-none gap-2 p-0 text-[13px] sm:grid-cols-3">
      <li className="rounded-lg bg-soft p-3"><strong className="block text-xl tabular-nums">{number(identifiers.barcodeGtinCandidates)}</strong>barcodes can be confirmed as GTINs
        {identifiers.barcodeGtinCandidates ? <Link className="block text-xs" href={queueHref({ scope: 'all', gap: 'gtin' })}>Review them</Link> : null}</li>
      <li className="rounded-lg bg-soft p-3"><strong className="block text-xl tabular-nums">{number(identifiers.restrictedBarcodes)}</strong>in-store or coupon codes<span className="block text-xs text-mute">Valid barcodes, never a GTIN</span></li>
      <li className="rounded-lg bg-soft p-3"><strong className="block text-xl tabular-nums">{number(identifiers.nonGtinBarcodes)}</strong>barcodes that are not GTINs<span className="block text-xs text-mute">Internal codes, or a typo in the digits</span></li>
    </ul>
    <h3 className="mb-2 mt-0 text-[13px] font-semibold">Products sharing a barcode or GTIN ({number(identifiers.duplicateGroupTotal)})</h3>
    {identifiers.duplicateGroups.length ? <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">{identifiers.duplicateGroups.slice(0, 12).map(group => <li key={group.code} className="rounded-lg bg-soft px-3 py-2">
      <Link href={listHref({ q: group.code })} className="font-medium tabular-nums">{group.code}</Link>: {group.products.map((product, index) => <span key={product._id}>{index ? ', ' : ''}<Link href={editorHref(product._id)}>{product.productId || product.name}</Link></span>)}
    </li>)}</ul> : <p className="m-0 text-[13px] text-mute">No two products share a code.</p>}
    {identifiers.duplicateGroupTotal > 12 ? <p className="mb-0 mt-2 text-xs text-mute">Showing 12 of {number(identifiers.duplicateGroupTotal)}. Search Products by code to see the rest.</p> : null}
  </Card>;
}

export function CatalogueQualityPage({ report, queue, query }: { report: QualityReport | null; queue: (EnrichmentQueue & { items: QueueRow[] }) | null; query: Pick<EnrichmentQuery, 'scope' | 'gap' | 'limit'> }) {
  const exportHref = `/api/admin/products/enrichment/export?scope=${query.scope}&gap=${query.gap}`;
  return <>
    <PageHeader title="Catalogue quality" description="See which product details are missing, fix the products that sell first, and bring supplier data in with a reviewed spreadsheet."
      actions={<a className={buttonVariants({ variant: 'outline' })} href={exportHref} download="catalogue-enrichment.csv"><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Download enrichment sheet</a>} />
    {report?.unreadableLiveTotal ? <Note tone="danger" icon={<ExclamationTriangleIcon />}>
      <p><strong>{number(report.unreadableLiveTotal)} live {report.unreadableLiveTotal === 1 ? 'product cannot' : 'products cannot'} be shown to customers.</strong> A stored value (often an invalid GTIN or an over-long field) fails validation, so the product page returns “not found”. Open each one and save it again with the value corrected:{' '}
        {report.unreadableLive.slice(0, 10).map((product, index) => <span key={product._id}>{index ? ', ' : ''}<Link href={editorHref(product._id)}>{product.productId || product.name}</Link></span>)}{report.unreadableLiveTotal > 10 ? ' …' : ''}</p></Note> : null}
    {report ? <>
      <Coverage report={report} query={query} />
      <div className="grid gap-4 xl:grid-cols-2 [&>section]:mb-0"><Merchant report={report} /><Identifiers report={report} /></div>
    </> : <Note tone="warning"><p>The quality report is unavailable right now. Reload the page to try again.</p></Note>}
    <div id="queue" className="mt-4 scroll-mt-4">
      <Card title="What to enrich next" flush
        description={queue ? `${number(queue.total)} ${queue.total === 1 ? 'product' : 'products'} to complete, highest priority first: units sold in the last 90 days (current order system only), then stock, live status and merchandising.` : 'The list is unavailable right now.'}
        aside={<nav aria-label="Missing detail" className="flex flex-wrap gap-1.5">{(['any', ...catalogueGaps] as const).map(gap => <Link key={gap} href={queueHref({ scope: query.scope, gap })} aria-current={query.gap === gap ? 'true' : undefined}
          className={cn('inline-flex min-h-8 items-center rounded-full border px-3 text-[13px] font-medium no-underline', query.gap === gap ? '!border-ink bg-ink text-white' : '!border-line-strong bg-surface text-ink-2 hover:bg-fill')}>{gap === 'any' ? 'Anything missing' : catalogueGapLabels[gap]}</Link>)}</nav>}>
        {queue ? <>
          <EnrichmentTable rows={queue.items} />
          <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[13px] text-mute md:px-6">
            <span>{queue.total ? `Showing ${number(queue.offset + 1)} to ${number(queue.offset + queue.items.length)} of ${number(queue.total)}` : 'Nothing to show'}</span>
            <span className="flex gap-2">
              {queue.offset > 0 ? <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={queueHref(query, Math.max(0, queue.offset - query.limit))}>Previous</Link> : null}
              {queue.offset + queue.items.length < queue.total ? <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={queueHref(query, queue.offset + query.limit)}>Next</Link> : null}
            </span>
          </nav>
        </> : null}
      </Card>
    </div>
    <Card title="Bring in details from a spreadsheet" icon={<TableCellsIcon className="size-4" />} className="mt-4"
      description="Download the sheet above, fill in brand, manufacturer, GTIN, pack size or description from the pack or the supplier, then upload it here. Empty cells change nothing. Medicine descriptions are edited in the product editor only.">
      <EnrichmentImport />
    </Card>
    <Card title="How to work through the catalogue">
      <ol className="m-0 grid gap-2 pl-5 text-[13px] leading-5">
        <li>Start with <strong>Live products</strong>, then <strong>In stock</strong>. The list puts products that sell first.</li>
        <li>Confirm barcodes as GTINs in bulk where the pack shows the same number (<Link href={queueHref({ scope: 'all', gap: 'gtin' })}>GTIN filter</Link>, tick, Use barcode as GTIN).</li>
        <li>For photos: download the sheet filtered to <Link href={queueHref({ scope: query.scope, gap: 'photo' })}>Photo</Link> and send it to the supplier or brand. Ask for authorised pack shots named as in the photo_file_name column (for example PD1234.jpg), then add them with Products → Upload many photos. Images from other websites need the owner’s permission first.</li>
        <li>For text details: fill the same sheet from the pack or the manufacturer’s data, upload it here, check the preview and save.</li>
        <li>Finish each product in its editor: Google approval, content review and the identifier decision stay a person’s call.</li>
      </ol>
    </Card>
  </>;
}
