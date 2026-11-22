import type { ReactNode } from 'react';
import Link from '../app-link';
/* Server-safe primitives for the administration console. Styling is Tailwind
   utilities backed by the tokens in app/(admin)/admin/admin.css; see
   docs/design/admin/components.md. */

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export { cn } from './cn';
export { focusRing, buttonVariants, type ButtonStyle } from './shadcn/styles';
export { Button } from './shadcn/button';
import { cn } from './cn';
import { focusRing, badgeVariants } from './shadcn/styles';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="m-0 text-xl font-semibold leading-7 tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-mute">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, description, aside, icon, flush = false, className, children }: {
  title?: ReactNode; description?: ReactNode; aside?: ReactNode; icon?: ReactNode; flush?: boolean; className?: string; children: ReactNode;
}) {
  const head = title || aside ? (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', flush && 'px-5 pt-5 md:px-6 md:pt-6')}>
      <div className="min-w-0">
        {title ? (
          <h2 className="m-0 flex items-center gap-2 text-base font-semibold leading-6 text-ink">
            {icon ? <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-fill text-ink">{icon}</span> : null}
            {title}
          </h2>
        ) : null}
        {description ? <p className="mt-0.5 text-[13px] text-mute">{description}</p> : null}
      </div>
      {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
    </div>
  ) : null;
  return (
    <section className={cn('mb-4 min-w-0 rounded-xl bg-surface shadow-card', flush ? 'overflow-hidden pb-1' : 'p-5 md:p-6', className)}>
      {head}
      {description && !title ? <p className="mb-3 text-[13px] text-mute">{description}</p> : null}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-1 px-6 py-10 text-center text-mute">
      {icon ? <span aria-hidden="true" className="mb-2 grid size-12 place-items-center rounded-full bg-fill text-ink-2 [&>svg]:size-6">{icon}</span> : null}
      <p className="m-0 text-[15px] font-semibold text-ink">{title}</p>
      {children ? <p className="m-0 max-w-sm text-[13px]">{children}</p> : null}
    </div>
  );
}

const dotClass: Record<Tone, string> = {
  neutral: 'bg-faint', brand: 'bg-ink', success: 'bg-ok', warning: 'bg-warn', danger: 'bg-bad', info: 'bg-info',
};

/** Status badge. Always carries text; colour reinforces it. */
export function Badge({ tone = 'neutral', dot = false, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn(badgeVariants({ tone }), 'capitalize', className)}>
      {dot ? <span aria-hidden="true" className={cn('size-1.5 rounded-full', dotClass[tone])} /> : null}
      {children}
    </span>
  );
}

export function StatTile({ href, label, value, count, meta, icon, tone = 'brand' }: {
  href?: string; label: string; value?: ReactNode; count?: number; meta?: ReactNode; icon?: ReactNode; tone?: Tone; active?: boolean;
  chip?: { label: string; tone?: Tone | undefined } | undefined;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-mute">
        {label}
        {icon ? <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-fill text-ink [&>svg]:size-[18px]">{icon}</span> : null}
      </span>
      <span className={cn('text-[28px] font-semibold leading-8 tabular-nums', tone === 'warning' || tone === 'danger' ? 'text-warn' : 'text-ink')}>
        {typeof count === 'number' ? count.toLocaleString() : value}
      </span>
      {meta ? <span className="text-xs text-mute">{meta}</span> : null}
    </>
  );
  const box = 'grid min-w-0 gap-3 rounded-xl bg-surface p-5 shadow-card';
  return href ? <li className="contents"><Link className={cn(box, 'no-underline hover:bg-soft')} href={href}>{body}</Link></li> : <li className={box}>{body}</li>;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <ul className="m-0 mb-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">{children}</ul>;
}

export function Note({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  const color = tone === 'warning' ? 'bg-warn-soft text-warn' : tone === 'danger' ? 'bg-bad-soft text-bad' : 'bg-fill text-ink-2';
  return (
    <div className={cn('mb-4 flex gap-3 rounded-2xl p-4 text-[13px] leading-5', color)}>
      {icon ? <span aria-hidden="true" className="mt-0.5 shrink-0 [&>svg]:size-5">{icon}</span> : null}
      <div className="min-w-0 [&_p]:m-0">{children}</div>
    </div>
  );
}

const orderTones: Record<string, Tone> = { pending: 'warning', confirmed: 'info', packed: 'brand', dispatched: 'success', cancelled: 'danger', refunded: 'neutral' };
export function orderStatusTone(status: string): Tone {
  return orderTones[status] ?? 'neutral';
}

/** Pill filter chips for status views and inventory tabs. Links, so filters live in the URL. */
export function FilterChips({ label, items }: { label: string; items: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((item) => (
        <Link key={item.label} href={item.href} aria-current={item.active ? 'page' : undefined}
          className={cn('-mb-px inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-[13px] font-medium no-underline transition-colors', focusRing,
            item.active ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink')}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Callout({ tone = 'neutral', role, children }: { tone?: Tone; role?: 'status' | 'alert'; children: ReactNode }) {
  const color = tone === 'success' ? 'bg-ok-soft text-ok' : tone === 'warning' ? 'bg-warn-soft text-warn' : tone === 'danger' ? 'bg-bad-soft text-bad' : 'bg-surface text-ink-2 shadow-card';
  return <div role={role} className={cn('mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[13px] leading-5 [&_a]:font-semibold [&_a]:underline [&_p]:m-0', color)}>{children}</div>;
}

/** Collapsible create form. */
export function CreatePanel({ summary, open = false, children }: { summary: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group mb-4">
      <summary className={cn('inline-flex h-11 cursor-pointer list-none items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2 [&::-webkit-details-marker]:hidden', focusRing)}>{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function Pager({ count, offset, more, hrefFor }: { count: number; offset: number; more: boolean; hrefFor: (offset: number) => string }) {
  if (!count && offset === 0) return null;
  const link = cn('inline-flex h-10 items-center rounded-lg bg-surface px-5 text-[13px] font-medium text-ink no-underline shadow-card hover:bg-soft', focusRing);
  return (
    <nav aria-label="Pagination" className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-mute">
      <span role="status">{count ? `Showing ${offset + 1}–${offset + count}${more ? '' : ' (end of list)'}` : 'No more items'}</span>
      <span className="flex gap-2">
        {offset > 0 ? <Link className={link} href={hrefFor(Math.max(0, offset - 25))}>Previous</Link> : null}
        {more ? <Link className={link} href={hrefFor(offset + 25)}>Next</Link> : null}
      </span>
    </nav>
  );
}
