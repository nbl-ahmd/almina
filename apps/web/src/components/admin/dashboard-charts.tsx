'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownTrayIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { dailyReportCsv, minorMoney, reportDate, type DashboardReport } from '../../lib/admin/dashboard';

type Daily = DashboardReport['daily'];

export function ReloadReport() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? 'Reloading…' : 'Reload report'}</button>;
}

export function DashboardControls({ report, days }: { report: Pick<DashboardReport, 'days' | 'daily'> | null; days: 7 | 30 | 90 }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="commerce-controls" aria-busy={pending}>
    <label className="commerce-period"><CalendarDaysIcon width={16} height={16} aria-hidden="true" />
      <span className="sr-only">Report period</span>
      <select value={days} disabled={pending} onChange={event => startTransition(() => router.push(`/admin?days=${event.target.value}`))}>
        <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
      </select>
    </label>
    <button type="button" className="admin-btn--primary" disabled={!report || pending} onClick={() => {
      if (!report) return;
      const url = URL.createObjectURL(new Blob([dailyReportCsv(report)], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `almina-orders-${report.days}-days.csv`; anchor.click(); URL.revokeObjectURL(url);
    }}><ArrowDownTrayIcon width={16} height={16} aria-hidden="true" />Export report</button>
    {pending ? <span className="commerce-updating" role="status">Updating report…</span> : null}
  </div>;
}

/** All plotted values are supplied by the authenticated reporting API. */
export function DailySalesChart({ daily }: { daily: Daily }) {
  const [metric, setMetric] = useState<'revenueMinor' | 'orders'>('revenueMinor');
  const [active, setActive] = useState<number | null>(null);
  const [shape, setShape] = useState<'bars' | 'line'>('bars');
  const highest = Math.max(0, ...daily.map(day => day[metric]));
  const maximum = metric === 'orders' && highest > 1 ? Math.ceil(highest / 2) * 2 : Math.max(1, highest);
  const width = 640, height = 220;
  const step = width / Math.max(1, daily.length);
  const x = (index: number) => step * index + step / 2;
  const y = (value: number) => height - (value / maximum) * (height - 16);
  const line = daily.map((day, index) => `${x(index)},${y(day[metric])}`).join(' ');
  const selected = active === null ? null : daily[active];
  const format = (value: number) => metric === 'orders' ? String(value) : `AED ${minorMoney(value)}`;
  return <>
    <div className="commerce-chart-toolbar">
      <div className="commerce-toggle" aria-label="Chart metric">
        <button type="button" aria-pressed={metric === 'revenueMinor'} onClick={() => setMetric('revenueMinor')}>Order value</button>
        <button type="button" aria-pressed={metric === 'orders'} onClick={() => setMetric('orders')}>Orders</button>
      </div>
      <div className="commerce-toggle commerce-toggle--shape" aria-label="Chart style">
        <button type="button" aria-pressed={shape === 'bars'} onClick={() => setShape('bars')}>Bar</button>
        <button type="button" aria-pressed={shape === 'line'} onClick={() => setShape('line')}>Line</button>
      </div>
    </div>
    <figure className="commerce-chart">
      <div className="commerce-chart__scale" aria-hidden="true"><span>{highest ? format(maximum) : ''}</span><span>{highest && (metric !== 'orders' || maximum > 1) ? format(maximum / 2) : ''}</span><span>0</span></div>
      <div className="commerce-chart__plot" tabIndex={0} role="group" aria-label="Daily order chart. Use left and right arrow keys to inspect dates."
        onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? daily.length - 1 : Math.max(0, Math.min(daily.length - 1, (index ?? -1) + (event.key === 'ArrowLeft' ? -1 : 1))));
        }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {[0, .5, 1].map(ratio => <line key={ratio} x1={0} x2={width} y1={height * ratio} y2={height * ratio} className="commerce-chart__grid" />)}
          {shape === 'line' ? <><polygon points={`${x(0)},${height} ${line} ${x(daily.length - 1)},${height}`} className="commerce-chart__area" /><polyline points={line} className="commerce-chart__line" /></> : null}
          {daily.map((day, index) => <g key={day.date} onPointerEnter={() => setActive(index)}>
            {shape === 'bars' ? <rect x={index * step + Math.min(3, step * .15)} y={y(day[metric])} width={Math.max(1, step * .7)} height={Math.max(day[metric] ? 2 : 0, height - y(day[metric]))} rx={Math.min(3, step * .15)} className="commerce-chart__bar" data-active={active === index || undefined} /> : null}
            <rect x={index * step} y={0} width={step} height={height} fill="transparent" />
          </g>)}
          {selected ? <line x1={x(active!)} x2={x(active!)} y1={0} y2={height} className="commerce-chart__cursor" /> : null}
        </svg>
        {selected ? <div className="commerce-chart__tooltip" style={{ left: `${Math.max(22, Math.min(78, (x(active!) / width) * 100))}%` }}>
          <span>{reportDate(selected.date)}</span><strong>{format(selected[metric])}</strong><small>{selected.orders} orders placed</small>
        </div> : null}
      </div>
      <figcaption><span>{daily[0] ? reportDate(daily[0].date) : '—'}</span><span>{daily[Math.floor(daily.length / 2)] ? reportDate(daily[Math.floor(daily.length / 2)]!.date) : ''}</span><span>{daily.at(-1) ? reportDate(daily.at(-1)!.date) : '—'}</span></figcaption>
      <span className="sr-only" role="status">{selected ? `${reportDate(selected.date)}: ${format(selected[metric])}, ${selected.orders} orders placed` : 'Focus the chart and use arrow keys to inspect daily values.'}</span>
    </figure>
    {!daily.some(day => day.orders > 0) ? <p className="commerce-chart-empty">No online orders in this period. Choose a longer period to explore.</p> : null}
  </>;
}
