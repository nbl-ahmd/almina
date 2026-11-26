import { catalogueFilterLabels, catalogueViewLabels, catalogueViews, type CatalogueContext, type CatalogueFilter, type CatalogueList } from '@almina/contracts';
import Link from '../app-link';
import { listHref } from '../../lib/admin/catalogue-links';
import { cn } from './cn';
import { buttonVariants, focusRing, inputClass, selectClass } from './shadcn/styles';
/* Server-rendered controls of the product list. Every filter lives in the address, so a list can be shared, reloaded and
   worked through from the editor. */

const number = (value: number) => value.toLocaleString('en-AE');
const toolOrder: CatalogueFilter[] = ['ready', 'missing-photo', 'classification', 'identity', 'content', 'prescription', 'has-photo',
  'missing-brand', 'missing-gtin', 'missing-pack', 'missing-manufacturer', 'missing-description'];


export function CatalogueFiltersBar({ list, context, limit, categories }: {
  list: CatalogueList; context: CatalogueContext; limit: number; categories: { id: string; name: string }[];
}) {
  const href = (patch: Partial<CatalogueContext>) => listHref({ ...context, ...patch }, 0, limit);
  return (
    <>
      <nav aria-label="Inventory views" className="mb-3 flex gap-1 overflow-x-auto border-b border-line">
        {catalogueViews.map(view => {
          const active = context.view === view;
          return <Link key={view} href={href({ view })} aria-current={active ? 'page' : undefined}
            className={cn('-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] font-medium no-underline transition-colors', focusRing, active ? '!border-ink text-ink' : '!border-transparent text-mute hover:text-ink')}>
            {catalogueViewLabels[view]} <span className="rounded-md bg-fill px-1.5 text-xs tabular-nums">{number(list.counts.views[view])}</span>
          </Link>;
        })}
      </nav>
      <nav aria-label="Needs work" className="mb-4 flex flex-wrap gap-2">
        {(['all', ...toolOrder] as CatalogueFilter[]).filter(filter => filter === 'all' || filter === context.filter || list.counts.filters[filter] > 0).map(filter => {
          const active = context.filter === filter;
          return <Link key={filter} href={href({ filter })} aria-current={active ? 'true' : undefined}
            className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium no-underline', focusRing,
              active ? '!border-ink bg-ink text-white' : '!border-line-strong bg-surface text-ink-2 hover:bg-fill')}>
            {catalogueFilterLabels[filter]}{filter === 'all' ? null : <> <span className={cn('text-xs tabular-nums', active ? 'text-white/80' : 'text-mute')}>{number(list.counts.filters[filter])}</span></>}
          </Link>;
        })}
      </nav>
      <form role="search" action="/admin/products" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <label htmlFor="q" className="sr-only">Search products</label>
        <input id="q" name="q" type="search" key={context.q ?? ''} defaultValue={context.q ?? ''} maxLength={80} placeholder="Search name, PD number, brand or barcode" className={cn(inputClass, 'min-w-0 flex-1 basis-64')} />
        {categories.length ? <div className="w-52 max-sm:w-full"><label htmlFor="category" className="sr-only">Category</label>
          <select id="category" name="category" key={context.category ?? ''} defaultValue={context.category ?? ''} className={selectClass}>
            <option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select></div> : context.category ? <input type="hidden" name="category" value={context.category} /> : null}
        {context.view !== 'all' ? <input type="hidden" name="view" value={context.view} /> : null}
        {context.filter !== 'all' ? <input type="hidden" name="filter" value={context.filter} /> : null}
        {limit !== 25 ? <input type="hidden" name="limit" value={limit} /> : null}
        <button className={buttonVariants({ variant: 'dark' })}>Search</button>
        {context.q || context.category || context.view !== 'all' || context.filter !== 'all' ? <Link className={buttonVariants({ variant: 'outline' })} href="/admin/products">Reset</Link> : null}
      </form>
    </>
  );
}

export function CataloguePager({ total, offset, shown, limit, context }: { total: number; offset: number; shown: number; limit: number; context: CatalogueContext }) {
  const pages = Math.max(1, Math.ceil(total / limit)), page = Math.floor(offset / limit) + 1;
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter(value => value >= 1 && value <= pages).sort((a, b) => a - b);
  const link = cn('inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-[13px] font-medium no-underline', focusRing);
  const to = (value: number) => listHref(context, (value - 1) * limit, limit);
  return (
    <nav aria-label="Pagination" className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-mute">
      <span role="status">{shown ? `Showing ${number(offset + 1)}–${number(offset + shown)} of ${number(total)}` : total ? `Nothing on this page · ${number(total)} products` : 'No products match'}</span>
      <span className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1" role="group" aria-label="Products per page">{[25, 50, 100].map(size => <Link key={size} href={listHref(context, 0, size)} aria-current={limit === size ? 'true' : undefined} className={cn(link, limit === size ? '!border-ink text-ink' : '!border-transparent text-mute hover:bg-fill')}>{size}</Link>)}<span className="text-xs">per page</span></span>
        {pages > 1 ? <span className="flex flex-wrap items-center gap-1">
          {page > 1 ? <Link className={cn(link, '!border-line-strong bg-surface text-ink')} href={to(page - 1)}>Previous</Link> : null}
          {numbers.map((value, index) => <span key={value} className="flex items-center gap-1">{index && value - numbers[index - 1]! > 1 ? <span aria-hidden="true">…</span> : null}
            <Link href={to(value)} aria-label={`Page ${value}`} aria-current={value === page ? 'page' : undefined} className={cn(link, value === page ? '!border-ink bg-ink text-white' : '!border-line-strong bg-surface text-ink')}>{number(value)}</Link></span>)}
          {page < pages ? <Link className={cn(link, '!border-line-strong bg-surface text-ink')} href={to(page + 1)}>Next</Link> : null}
        </span> : null}
      </span>
    </nav>
  );
}
