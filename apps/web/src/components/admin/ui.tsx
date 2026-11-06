import type { ReactNode } from 'react';
import Link from '../app-link';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
/* Presentational admin primitives, adapted from the shadcn pattern (cva
   variants + Radix Slot for asChild) and tuned to the Dub-inspired console.
   The authoritative visual specification is ../app/(admin)/admin/DESIGN.md.
   Everything here is server-safe: no hooks, no browser APIs. */

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-page-head">
      <div className="admin-page-head__text">
        <h1>{title}</h1>
        {description ? (
          <p className="admin-page-head__desc">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="admin-page-head__actions">{actions}</div> : null}
    </div>
  );
}

const buttonVariants = cva(
  // Colour transitions and the press transform are owned by admin.css so the
  // timing matches every other control; a Tailwind `transition-colors` here
  // would silently replace that shorthand inside the utilities layer.
  'admin-btn inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium disabled:cursor-not-allowed disabled:opacity-100',
  {
    variants: {
      variant: {
        primary: 'admin-btn--primary',
        outline: 'admin-btn--outline',
        secondary: 'admin-btn--secondary',
        ghost: 'admin-btn--ghost',
        danger: 'admin-btn--danger',
      },
      size: {
        sm: 'admin-btn--sm',
        md: '',
        lg: 'admin-btn--lg',
        icon: 'admin-btn--sm w-8 px-0',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      className={[buttonVariants({ variant, size }), className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

export function Card({
  title,
  description,
  aside,
  icon,
  flush = false,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  icon?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const head = title || aside ? (
    <div className="admin-card__head">
      <div>
        {title ? (
          <h2>
            {icon ? (
              <span className="admin-card__title-icon" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            {title}
          </h2>
        ) : null}
        {description ? <p className="admin-card__hint">{description}</p> : null}
      </div>
      {aside ? <div className="admin-actions">{aside}</div> : null}
    </div>
  ) : null;
  const classes = `admin-card${flush ? ' admin-card--flush' : ''}${className ? ` ${className}` : ''}`;
  return (
    <section className={classes}>
      {head}
      {description && !title ? (
        <p className="admin-card__hint">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      {icon ? (
        <span className="admin-empty__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="admin-empty__title">{title}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

const badgeVariants = cva('admin-badge', {
  variants: {
    tone: {
      neutral: '',
      brand: 'admin-badge--brand',
      success: 'admin-badge--success',
      warning: 'admin-badge--warning',
      danger: 'admin-badge--danger',
      info: 'admin-badge--info',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={[badgeVariants({ tone }), className].filter(Boolean).join(' ')}
    >
      {dot ? <span className="admin-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function StatTile({
  href,
  label,
  value,
  count,
  meta,
  icon,
  tone = 'brand',
  active = false,
  chip,
}: {
  href?: string;
  label: string;
  value?: ReactNode;
  /** A plain sample count. Rendered with locale separators and no count-up. */
  count?: number;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  active?: boolean;
  /** State that belongs to the reading, never a fabricated trend. */
  chip?: { label: string; tone?: Tone | undefined } | undefined;
}) {
  const accent =
    tone === 'warning' || tone === 'danger' || tone === 'success'
      ? ` admin-stat--${tone}`
      : '';
  const body = (
    <>
      <div className="admin-stat__top">
        {icon ? (
          <span className="admin-stat__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="admin-stat__label">{label}</span>
      </div>
      <span className="admin-stat__value">
        {typeof count === 'number' ? count.toLocaleString() : value}
        {chip ? (
          <span className="admin-stat__chip" data-tone={chip.tone ?? 'neutral'}>
            {chip.label}
          </span>
        ) : null}
      </span>
      {meta ? <span className="admin-stat__meta">{meta}</span> : null}
    </>
  );
  return href ? (
    <li>
      <Link
        className={`admin-stat${accent}`}
        href={href}
        data-active={active ? 'true' : undefined}
      >
        {body}
      </Link>
    </li>
  ) : (
    <li className={`admin-stat${accent}`} data-active={active ? 'true' : undefined}>
      {body}
    </li>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <ul className="admin-stats">{children}</ul>;
}

export type Stage = {
  label: string;
  count: number;
  href: string;
  tone?: Tone | undefined;
};

/* The dispatch rail. Four equal stages rather than proportional slices: a
   three-percent slice cannot carry a number, and the count is the point. The
   meter underneath carries the share of the sample. */
export function StageRail({
  stages,
  total,
  footer,
}: {
  stages: Stage[];
  /** Size of the sample the counts were drawn from, so the meter reads share. */
  total: number;
  footer?: ReactNode;
}) {
  return (
    <>
      <ol className="admin-pipeline">
        {stages.map((stage) => {
          const empty = stage.count === 0;
          return (
            <li key={stage.label}>
              <Link
                className="admin-pipeline__link"
                href={stage.href}
                data-tone={empty ? undefined : (stage.tone ?? 'neutral')}
                data-empty={empty ? 'true' : undefined}
              >
                <span className="admin-pipeline__head">
                  <span className="admin-pipeline__stage">{stage.label}</span>
                  <span className="admin-pipeline__count">{stage.count}</span>
                </span>
                <span className="admin-pipeline__meter" aria-hidden="true">
                  <span
                    style={{
                      width: `${total > 0 ? Math.min(100, Math.round((stage.count / total) * 100)) : 0}%`,
                    }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {footer ? <p className="admin-pipeline__foot">{footer}</p> : null}
    </>
  );
}

export function BarList({
  items,
  tone = 'brand',
}: {
  items: { label: string; value: number; hint?: string; tone?: Tone }[];
  tone?: Tone;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="admin-bars">
      {items.map((item) => {
        const width = Math.round((item.value / max) * 100);
        const itemTone = item.tone ?? tone;
        const variant =
          itemTone === 'warning' ||
          itemTone === 'danger' ||
          itemTone === 'success'
            ? ` admin-bar__fill--${itemTone}`
            : '';
        return (
          <li className="admin-bar" key={item.label}>
            <span className="admin-bar__label" title={item.label}>
              {item.label}
            </span>
            <span className="admin-bar__track">
              <span
                className={`admin-bar__fill${variant}`}
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="admin-bar__value">
              {item.hint ?? item.value.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function TrendChart({
  points,
  label,
  format = (value: number) => value.toLocaleString(),
}: {
  points: { label: string; value: number }[];
  label: string;
  format?: (value: number) => string;
}) {
  if (!points.length)
    return (
      <p className="admin-card__hint admin-hint--tight">
        No dated orders in this view yet.
      </p>
    );
  // A single sample is a fact, not a trend. Stretching one point across the
  // full width draws a line that implies movement that never happened, so the
  // chart becomes a plain reading of that day instead.
  if (points.length === 1) {
    const only = points[0]!;
    return (
      <figure className="admin-figure">
        <p className="admin-single">
          <span className="admin-single__value">{format(only.value)}</span>
          <span className="admin-single__meta">
            {only.value === 1 ? 'order' : 'orders'} on {only.label}
          </span>
        </p>
        <p className="admin-card__hint admin-hint--tight">
          One day of activity is in this view. The trend line appears when a
          second day has orders.
        </p>
      </figure>
    );
  }
  const width = 100;
  const height = 40;
  const max = Math.max(1, ...points.map((point) => point.value));
  const step = width / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: index * step,
    y: height - (point.value / max) * (height - 5) - 2.5,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `M ${coords[0]!.x},${height} L ${line.replaceAll(' ', ' L ')} L ${coords.at(-1)!.x},${height} Z`;
  const summary = `${label}: ${points.map((point) => `${point.label} ${format(point.value)}`).join(', ')}`;
  // The peak is the only marker: seven dots along four pixels of travel read as
  // noise, and the one point anyone asks about is the high-water mark.
  const peakIndex = points.reduce(
    (best, point, index) => (point.value > points[best]!.value ? index : best),
    0,
  );
  const peak = coords[peakIndex]!;
  const middle = points.length > 2 ? points[Math.floor(points.length / 2)]! : null;
  const midValue = Math.ceil(max / 2);
  return (
    <figure className="admin-chart">
      <div className="admin-chart__body">
        <div className="admin-chart__y" aria-hidden="true">
          <span>{format(max)}</span>
          {midValue < max ? <span>{format(midValue)}</span> : <span />}
          <span>0</span>
        </div>
        <div className="admin-chart__plot">
          <svg
            className="admin-chart__svg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={summary}
          >
            {[0, 0.5, 1].map((ratio) => (
              <line
                key={ratio}
                className={`admin-chart__grid${ratio === 1 ? ' admin-chart__grid--base' : ''}`}
                x1="0"
                x2={width}
                y1={height * ratio}
                y2={height * ratio}
              />
            ))}
            <path className="admin-chart__area" d={area} />
            <polyline className="admin-chart__line" points={line} />
          </svg>
          <span
            className="admin-chart__peak"
            style={{
              left: `${(peak.x / width) * 100}%`,
              top: `${(peak.y / height) * 100}%`,
            }}
            aria-hidden="true"
          />
        </div>
      </div>
      <figcaption className="admin-axis">
        <span>{points[0]!.label}</span>
        {middle ? <span>{middle.label}</span> : null}
        <span>{points.at(-1)!.label}</span>
      </figcaption>
    </figure>
  );
}

export function Note({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const variant =
    tone === 'warning' || tone === 'danger' ? ` admin-note--${tone}` : '';
  return (
    <div className={`admin-note${variant}`}>
      {icon ? (
        <span className="admin-note__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

const orderTones: Record<string, Tone> = {
  pending: 'warning',
  confirmed: 'info',
  packed: 'brand',
  dispatched: 'success',
  cancelled: 'danger',
  refunded: 'neutral',
};

export function orderStatusTone(status: string): Tone {
  return orderTones[status] ?? 'neutral';
}
