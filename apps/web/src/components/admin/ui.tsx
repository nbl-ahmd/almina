import type { ReactNode } from 'react';
import Link from 'next/link';
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
  'admin-btn inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-100',
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
  countTo,
  meta,
  icon,
  tone = 'brand',
  active = false,
}: {
  href?: string;
  label: string;
  value?: ReactNode;
  countTo?: number;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  active?: boolean;
}) {
  const accent =
    tone === 'warning' || tone === 'danger' || tone === 'success'
      ? ` admin-stat--${tone}`
      : '';
  const body = (
    <>
      <div className="admin-stat__top">
        <span className="admin-stat__label">{label}</span>
        {icon ? (
          <span className="admin-stat__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <span className="admin-stat__value">
        {typeof countTo === 'number' ? countTo.toLocaleString() : value}
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
    return <p className="admin-card__hint">No sample to chart yet.</p>;
  const width = 100;
  const height = 32;
  const max = Math.max(1, ...points.map((point) => point.value));
  // A single sample renders as one flat centred run instead of a fake area,
  // so the chart never looks like a broken block.
  const single = points.length === 1;
  const series = single ? [points[0]!, points[0]!] : points;
  const step = width / (series.length - 1);
  const coords = series.map((point, index) => ({
    x: index * step,
    y: single ? height / 2 : height - (point.value / max) * (height - 4) - 2,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `M ${coords[0]!.x},${height} L ${line.replaceAll(' ', ' L ')} L ${coords.at(-1)!.x},${height} Z`;
  const summary = `${label}: ${points.map((point) => `${point.label} ${format(point.value)}`).join(', ')}`;
  return (
    <figure className="admin-figure">
      <svg
        className="admin-spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            className="admin-spark__grid"
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
          />
        ))}
        {single ? (
          <circle
            className="admin-spark__dot"
            cx={width / 2}
            cy={height / 2}
            r={2.4}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <>
            <path className="admin-spark__area" d={area} />
            <polyline className="admin-spark__line" points={line} />
            {coords.map((point, index) => (
              <circle
                key={index}
                className="admin-spark__dot"
                cx={point.x}
                cy={point.y}
                r={1.4}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}
      </svg>
      <figcaption className="admin-axis">
        {points.length > 1 ? (
          <>
            <span>{points[0]!.label}</span>
            <span>peak {format(max)}</span>
            <span>{points.at(-1)!.label}</span>
          </>
        ) : (
          <span>
            {points[0]!.label} · {format(points[0]!.value)}
          </span>
        )}
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
