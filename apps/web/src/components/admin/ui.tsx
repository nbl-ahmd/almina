import type { ReactNode } from 'react';
import Link from 'next/link';

/* Presentational admin primitives. Server-safe: no hooks, no browser APIs. */

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string | undefined;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-page-head">
      <div className="admin-page-head__text">
        {eyebrow ? <p className="admin-page-head__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? (
          <p className="admin-page-head__desc">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="admin-page-head__actions">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  description,
  aside,
  flush = false,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  const head = title || aside ? (
    <div className="admin-card__head">
      <div>
        {title ? <h2>{title}</h2> : null}
        {description ? <p className="admin-card__hint">{description}</p> : null}
      </div>
      {aside ? <div className="admin-actions">{aside}</div> : null}
    </div>
  ) : null;
  if (flush) {
    return (
      <section className="admin-card admin-card--flush">
        {head}
        {children}
      </section>
    );
  }
  return (
    <section className="admin-card">
      {head}
      {description && !title ? (
        <p className="admin-card__hint">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`admin-badge admin-badge--${tone}`}>
      {dot ? <span className="admin-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function StatTile({
  href,
  label,
  value,
  meta,
  icon,
}: {
  href?: string;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
}) {
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
      <span className="admin-stat__value">{value}</span>
      {meta ? <span className="admin-stat__meta">{meta}</span> : null}
    </>
  );
  return href ? (
    <li>
      <Link className="admin-stat" href={href}>
        {body}
      </Link>
    </li>
  ) : (
    <li className="admin-stat">{body}</li>
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
          itemTone === 'warning' || itemTone === 'danger'
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
  // A single sample renders as a flat span so the chart never looks broken.
  const series = points.length === 1 ? [points[0]!, points[0]!] : points;
  const step = width / (series.length - 1);
  const coords = series.map((point, index) => ({
    x: index * step,
    y: height - (point.value / max) * (height - 4) - 2,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `M ${coords[0]!.x},${height} L ${line.replaceAll(' ', ' L ')} L ${coords.at(-1)!.x},${height} Z`;
  const summary = `${label}: ${points.map((point) => `${point.label} ${format(point.value)}`).join(', ')}`;
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="admin-spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        <path className="admin-spark__area" d={area} />
        <polyline className="admin-spark__line" points={line} vectorEffect="non-scaling-stroke" />
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
