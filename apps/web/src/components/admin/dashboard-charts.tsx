'use client';
import { buttonVariants } from './shadcn/styles';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownTrayIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './shadcn/select';
import { dailyReportCsv, reportDate, type DashboardReport } from '../../lib/admin/dashboard';

type Daily = DashboardReport['daily'];

export function ReloadReport() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="h-8 rounded-lg bg-white px-4 text-xs font-semibold text-ink disabled:opacity-50">{pending ? 'Reloading…' : 'Reload report'}</button>;
}

export function DashboardControls({ report, days }: { report: Pick<DashboardReport, 'days' | 'daily'> | null; days: 7 | 30 | 90 }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
    <Select value={String(days)} disabled={pending} onValueChange={value => startTransition(() => router.push(`/admin?days=${value}`))}>
      <SelectTrigger aria-label="Report period" className="min-w-40"><CalendarDaysIcon className="size-4 text-mute" aria-hidden="true" /><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
    <button type="button" disabled={!report || pending} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-50" onClick={() => {
      if (!report) return;
      const url = URL.createObjectURL(new Blob([dailyReportCsv(report)], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `almina-orders-${report.days}-days.csv`; anchor.click(); URL.revokeObjectURL(url);
    }}><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Export report</button>
    {pending ? <span className="text-xs text-mute" role="status">Updating report…</span> : null}
  </div>;
}

type Point = { date: string; label: string; value: number; orders: number };
function ChartTip({ active, payload, format }: { active?: boolean; payload?: { payload: Point }[]; format: (value: number) => string }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="grid gap-0.5 rounded-lg bg-ink px-3 py-2 text-xs text-white border border-line shadow-pop"><span className="text-white/70">{point.label}</span><strong className="text-sm">{format(point.value)}</strong><small className="text-white/70">{point.orders} orders placed</small></div>;
}

/** All plotted values are supplied by the authenticated reporting API. Recharts provides axes, tooltip and keyboard inspection. */
export function DailySalesChart({ daily }: { daily: Daily }) {
  const [metric, setMetric] = useState<'revenueMinor' | 'orders'>('revenueMinor');
  const [shape, setShape] = useState<'bars' | 'line'>('bars');
  const data: Point[] = daily.map(day => ({ date: day.date, label: reportDate(day.date), value: metric === 'orders' ? day.orders : day.revenueMinor / 100, orders: day.orders }));
  const format = (value: number) => metric === 'orders' ? String(value) : `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const axis = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: '#5f6773' } } as const;
  const common = { data, margin: { top: 8, right: 4, bottom: 0, left: 0 } };
  const parts = <>
    <CartesianGrid vertical={false} stroke="#e6e9ee" strokeDasharray="4 6" />
    <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
    <YAxis {...axis} width={44} allowDecimals={false} tickFormatter={(value: number) => metric === 'orders' ? String(value) : value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value)} />
    <Tooltip cursor={{ fill: '#f6f7f9' }} content={<ChartTip format={format} />} />
  </>;
  const toggle = 'inline-flex rounded-lg bg-fill p-1 [&>button]:h-8 [&>button]:rounded-lg [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-3.5 [&>button]:text-xs [&>button]:font-medium [&>button]:text-mute [&>button]:outline-0 [&>button[aria-pressed=true]]:bg-surface [&>button[aria-pressed=true]]:text-ink [&>button[aria-pressed=true]]:border border-line';
  return <>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className={toggle} role="group" aria-label="Chart metric">
        <button className={buttonVariants({ variant: "default" })} type="button" aria-pressed={metric === 'revenueMinor'} onClick={() => setMetric('revenueMinor')}>Order value</button>
        <button className={buttonVariants({ variant: "default" })} type="button" aria-pressed={metric === 'orders'} onClick={() => setMetric('orders')}>Orders</button>
      </div>
      <div className={toggle} role="group" aria-label="Chart style">
        <button className={buttonVariants({ variant: "default" })} type="button" aria-pressed={shape === 'bars'} onClick={() => setShape('bars')}>Bar</button>
        <button className={buttonVariants({ variant: "default" })} type="button" aria-pressed={shape === 'line'} onClick={() => setShape('line')}>Line</button>
      </div>
    </div>
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {shape === 'bars'
          ? <BarChart {...common}>{parts}<Bar dataKey="value" fill="#d9dce1" radius={[0, 0, 0, 0]} maxBarSize={28} activeBar={{ fill: '#111418' }} /></BarChart>
          : <AreaChart {...common}>{parts}<Area type="linear" dataKey="value" stroke="#111418" strokeWidth={2.5} fill="#d9dce1" fillOpacity={0.35} activeDot={{ r: 5, fill: '#111418', stroke: '#fff', strokeWidth: 2 }} /></AreaChart>}
      </ResponsiveContainer>
    </div>
    <p className="sr-only" role="status">{`${data.length} days plotted. Total ${format(data.reduce((sum, point) => sum + point.value, 0))}.`}</p>
    {!daily.some(day => day.orders > 0) ? <p className="m-0 mt-3 text-center text-[13px] text-mute">No online orders in this period. Choose a longer period to explore.</p> : null}
  </>;
}

export function FulfilmentDonut({ stages, label, centre }: { stages: { label: string; count: number; color: string }[]; label: string; centre: string }) {
  const hasData = stages.some(stage => stage.count > 0);
  const slices = hasData ? stages : [{ label: 'None', count: 1, color: '#eef0f3' }];
  return <figure className="relative mx-auto my-3 size-32 md:size-40" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <PieChart>
        <Pie data={slices} dataKey="count" nameKey="label" innerRadius="72%" outerRadius="100%" paddingAngle={hasData ? 2 : 0} stroke="none" isAnimationActive={false}>
          {slices.map(slice => <Cell key={slice.label} fill={slice.color} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <figcaption className="absolute inset-0 grid place-content-center text-center"><strong className="text-3xl font-semibold tabular-nums">{centre}</strong><span className="text-xs text-mute">dispatched</span></figcaption>
  </figure>;
}
