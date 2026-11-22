import Link from '../app-link';
import { ArrowRightIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, CubeIcon, ExclamationTriangleIcon, InboxIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { adminRead } from '../../lib/server/admin/gateway';
import { readDashboardReport } from '../../lib/server/admin/reporting';
import type { Identity } from '../../lib/admin/policy';
import { changePercent, minorMoney, reportDate, type DashboardReport } from '../../lib/admin/dashboard';
import { display, record, rows } from './views';
import { Badge, Button, Card, EmptyState, PageHeader, cn, orderStatusTone, type Tone } from './ui';
import { DailySalesChart, DashboardControls, FulfilmentDonut, ReloadReport } from './dashboard-charts';

const panel = 'rounded-xl bg-surface p-5 border border-line';
const cell = 'px-5 py-3.5 text-[13.5px]';

function stamp(value: unknown) {
  const raw = display(value), date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' });
}

function age(iso: unknown) {
  const time = typeof iso === 'string' ? Date.parse(iso) : NaN;
  if (Number.isNaN(time)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return minutes < 1440 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${Math.floor(minutes / 1440)} d`;
}

type Attention = { pending: number | null; oldest: unknown; review: number | null; outOfStock: number | null; drafts: number | null };

/** Everything here is read through the same authorised admin reads as its destination list. */
async function readAttention(admin: boolean): Promise<Attention> {
  const [receiving, stock, drafts] = await Promise.all([
    adminRead('orders/receiving').then(record).catch(() => null),
    admin ? adminRead('products', new URLSearchParams({ limit: '100', view: 'outofstock' })).then(rows).catch(() => null) : Promise.resolve(null),
    admin ? adminRead('products/needs-action', new URLSearchParams({ limit: '1', status: 'drafts' })).then(record).catch(() => null) : Promise.resolve(null),
  ]);
  const count = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : null);
  return { pending: receiving ? count(receiving.pendingCount) : null, oldest: receiving?.oldestPendingAt, review: receiving ? count(receiving.reviewCount) : null,
    outOfStock: stock ? stock.length : null, drafts: drafts ? count(drafts.total) : null };
}

function NeedsAttention({ data }: { data: Attention }) {
  const waiting = age(data.oldest);
  const tiles = [
    { key: 'pending', label: 'Pending orders', count: data.pending, note: waiting ? `Oldest waiting ${waiting}` : 'Waiting to be confirmed', href: '/admin/orders?status=pending', icon: <ClipboardDocumentCheckIcon />, urgent: (data.pending ?? 0) > 0 },
    { key: 'review', label: 'Addresses to review', count: data.review, note: 'Delivery area needs a check', href: '/admin/orders?status=pending&review=1', icon: <MapPinIcon />, urgent: (data.review ?? 0) > 0 },
    { key: 'stock', label: 'Out of stock', count: data.outOfStock, note: 'Hidden from ordering', href: '/admin/products?view=outofstock', icon: <ExclamationTriangleIcon />, urgent: false },
    { key: 'drafts', label: 'Drafts to review', count: data.drafts, note: 'Products not yet published', href: '/admin/needs-action', icon: <CubeIcon />, urgent: false },
  ].filter(tile => tile.count !== null);
  const open = tiles.filter(tile => (tile.count ?? 0) > 0);
  if (!open.length) return <p className="mb-4 flex items-center gap-2 rounded-lg bg-fill px-4 py-3 text-[13px] font-medium text-ok"><CheckCircleIcon className="size-5" aria-hidden="true" />{tiles.length ? 'All clear. Nothing is waiting on you right now.' : 'Attention counts are unavailable. Reload to try again.'}</p>;
  return <section aria-label="Needs attention" className="mb-4">
    <h2 className="sr-only">Needs attention</h2>
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 xl:grid-cols-4">{open.map(tile => <li key={tile.key}>
      <Link href={tile.href} className={cn('flex min-h-16 items-center gap-2.5 rounded-lg px-3 py-3 sm:gap-3 sm:px-4 text-ink no-underline border border-line transition hover:-translate-y-px', tile.urgent ? 'bg-warn-soft' : 'bg-surface')}>
        <span aria-hidden="true" className="hidden size-10 shrink-0 place-items-center rounded-lg bg-white/80 sm:grid [&>svg]:size-5">{tile.icon}</span>
        <span className="grid min-w-0 flex-1 text-[13px] leading-snug"><strong className="text-xl font-semibold tabular-nums">{tile.count === 100 && tile.key === 'stock' ? '100+' : tile.count}</strong>{tile.label}<small className="text-xs text-mute">{tile.note}</small></span>
        <ArrowRightIcon className="hidden size-4 shrink-0 text-mute sm:block" aria-hidden="true" />
      </Link>
    </li>)}</ul>
  </section>;
}

function Metric({ label, value, previous, current, currency = false, inverse = false }: {
  label: string; value: string; previous?: number | undefined; current?: number | undefined; currency?: boolean; inverse?: boolean;
}) {
  const delta = previous === undefined || current === undefined ? null : changePercent(current, previous);
  const tone: Tone = delta === null || delta === 0 ? 'neutral' : (delta > 0) !== inverse ? 'success' : 'danger';
  return <article className="grid min-w-0 content-between gap-2 p-4 md:p-5">
    <div className="flex items-center justify-between gap-2">
      <h2 className="m-0 text-[13px] font-medium text-mute">{label}</h2>
    </div>
    <p className="m-0 flex items-baseline gap-1.5 text-2xl font-semibold leading-8 tabular-nums">{currency ? <span className="text-sm font-medium text-mute">AED</span> : null}{value}</p>
    <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
      {delta === null ? <span>{current === undefined ? 'Report unavailable' : 'No previous-period baseline'}</span> : <><Badge tone={tone}>{delta > 0 ? '+' : ''}{delta}%</Badge><span>vs previous period</span></>}
    </div>
  </article>;
}

function Fulfilment({ report }: { report: DashboardReport | null }) {
  const total = report?.current.orders ?? 0, completed = report?.current.completed ?? 0, cancelled = report?.current.cancelled ?? 0;
  const other = Math.max(0, total - completed - cancelled);
  const percentage = total ? Math.round(completed / total * 100) : 0;
  const stages = [
    { label: 'Dispatched', count: completed, color: '#111418', href: '/admin/orders?status=dispatched' },
    { label: 'Cancelled', count: cancelled, color: '#c62d3a', href: '/admin/orders?status=cancelled' },
    { label: 'Other stages', count: other, color: '#d9dce1', href: '/admin/orders' },
  ];
  return <Card title="Fulfilment" aside={<TruckIcon className="size-5 text-mute" aria-hidden="true" />} className="mb-0">
    <FulfilmentDonut stages={stages} label={report ? `${completed} of ${total} orders dispatched in this period` : 'Fulfilment report unavailable'} centre={report ? `${percentage}%` : '—'} />
    <ul className="m-0 grid list-none gap-1 p-0">{stages.map(stage => <li key={stage.label}><Link href={stage.href} className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-[13px] text-ink no-underline hover:bg-soft"><span aria-hidden="true" className="size-2.5 rounded-lg" style={{ background: stage.color }} /><span className="flex-1">{stage.label}</span><strong className="tabular-nums">{report ? stage.count : '—'}</strong></Link></li>)}</ul>
    <p className="m-0 mt-3 text-xs text-mute">{report ? `${total} online orders in the selected period` : 'Try reloading the order report.'}</p>
  </Card>;
}

function TopProducts({ report }: { report: DashboardReport | null }) {
  return <Card title="Most ordered products" description="Ranked by units placed in this period" className="mb-0" aside={<Link href="/admin/products" aria-label="View all products" className="grid size-9 place-items-center rounded-lg bg-fill text-ink hover:bg-line"><ArrowRightIcon className="size-4" aria-hidden="true" /></Link>}>
    {report?.topProducts.length ? <ol className="m-0 grid list-none gap-1 p-0">{report.topProducts.slice(0, 5).map((product, index) => <li key={`${product.productId}-${index}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-soft">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill text-xs font-semibold text-ink-2">{index + 1}</span>
      <div className="grid min-w-0 flex-1 text-[13.5px]">{/^[a-f0-9]{24}$/i.test(product.productId) ? <Link href={`/admin/products/${product.productId}`} className="truncate font-medium text-ink no-underline">{product.name}</Link> : <strong className="truncate">{product.name}</strong>}<span className="text-xs text-mute">{product.quantity.toLocaleString()} units ordered</span></div>
      <span className="text-[13px] font-semibold tabular-nums"><small className="mr-1 font-medium text-mute">AED</small>{minorMoney(product.revenueMinor)}</span>
    </li>)}</ol> : <EmptyState icon={<CubeIcon />} title={report ? 'No products ordered yet' : 'Product report unavailable'}>{report ? 'Products will appear as orders arrive in this period.' : 'Reload to try again.'}</EmptyState>}
    <p className="m-0 mt-3 text-xs text-mute">Order snapshots; cancellations and refunds are included.</p>
  </Card>;
}

function RecentOrders({ orders }: { orders: Record<string, unknown>[] }) {
  if (!orders.length) return <EmptyState icon={<InboxIcon />} title="No orders yet">Orders permitted by your role and city assignments will appear here.</EmptyState>;
  return <>
    <ul className="m-0 grid list-none gap-1 p-2 md:hidden">{orders.map((order, index) => {
      const customer = record(order.customer), status = display(order.status);
      return <li key={display(order._id ?? index)}><Link href={`/admin/orders/${display(order._id)}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 rounded-lg px-3 py-2.5 text-ink no-underline hover:bg-soft">
        <span className="font-medium">{display(order.orderId)}<span className="ml-2 font-normal text-mute">{display(customer.name)}</span></span>
        <span className="text-right text-[13px] font-semibold tabular-nums">AED {display(customer.totalAmount)}</span>
        <span className="text-xs text-mute">{stamp(order.createdAt)}</span><span className="justify-self-end"><Badge tone={orderStatusTone(status)} dot>{status}</Badge></span>
      </Link></li>;
    })}</ul>
    <div className="hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Recent orders">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Recent orders</caption>
        <thead><tr className="bg-soft text-xs font-semibold text-mute">{['Order', 'Customer', 'Total (AED)', 'Status', 'Received', ''].map((heading, index) => <th key={index} scope="col" className={cn('px-5 py-3', index === 2 && 'text-right')}>{heading || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
        <tbody>{orders.map((order, index) => {
          const customer = record(order.customer), status = display(order.status);
          return <tr key={display(order._id ?? index)} className="even:bg-soft hover:bg-soft">
            <td className={cn(cell, 'font-medium')}>{display(order.orderId)}{order.channel === 'wholesale' ? <Badge className="ml-2" tone="info">Wholesale</Badge> : null}</td>
            <td className={cell}>{display(customer.name)}</td>
            <td className={cn(cell, 'text-right tabular-nums')}>{display(customer.totalAmount)}</td>
            <td className={cell}><Badge tone={orderStatusTone(status)} dot>{status}</Badge></td>
            <td className={cn(cell, 'whitespace-nowrap text-mute')}>{stamp(order.createdAt)}</td>
            <td className={cn(cell, 'text-right')}><Link href={`/admin/orders/${display(order._id)}`} aria-label={`Open order ${display(order.orderId)}`} className="inline-flex h-8 items-center rounded-lg border border-line-strong bg-surface px-3.5 text-xs font-medium text-ink no-underline hover:bg-soft">View</Link></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </>;
}

export async function AdminDashboard({ user, days = 30 }: { user: Identity; days?: 7 | 30 | 90 }) {
  const admin = user.role === 'admin';
  const [orderData, report, attention] = await Promise.all([
    adminRead('orders', new URLSearchParams({ limit: '25' })),
    admin ? readDashboardReport(days).catch(() => null) : Promise.resolve(null),
    readAttention(admin),
  ]);
  const recent = rows(orderData);
  if (!admin) return <>
    <PageHeader title="Dashboard" description="Your recent orders and fulfilment queue." actions={<Button asChild variant="primary"><Link href="/admin/orders">Open orders</Link></Button>} />
    <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{['pending', 'confirmed', 'packed', 'dispatched'].map(status => <Link key={status} href={`/admin/orders?status=${status}`} className={cn(panel, 'grid gap-1 text-ink no-underline hover:bg-soft')}><span className="text-[13px] font-medium capitalize text-mute">{status}</span><span className="text-3xl font-semibold tabular-nums">{status === 'pending' && attention.pending !== null ? attention.pending : recent.filter(order => order.status === status).length}</span></Link>)}</div>
    <p className="mb-4 text-xs text-mute">Pending shows every order waiting for you. Other counts cover only your latest {recent.length} orders.</p>
    <Card title="Recent orders" flush><RecentOrders orders={recent.slice(0, 8)} /></Card>
  </>;
  const current = report?.current, previous = report?.previous;
  return <div>
    <PageHeader title="Dashboard" description={report ? `${reportDate(report.from)} – ${reportDate(report.to)} · online order performance` : `Last ${days} days`} actions={<DashboardControls report={report ? { days: report.days, daily: report.daily } : null} days={days} />} />
    <NeedsAttention data={attention} />
    {!report ? <p role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-warn-soft px-4 py-3 text-[13px] text-warn">Order reporting is unavailable. Recent orders remain below. <ReloadReport /></p> : null}
    <div className="mb-4 grid overflow-hidden rounded-lg bg-surface border border-line sm:grid-cols-2 xl:grid-cols-4 [&>article]:border-line max-xl:[&>article:nth-child(n+3)]:border-t sm:max-xl:[&>article:nth-child(even)]:border-l xl:[&>article+article]:border-l max-sm:[&>article+article]:border-t">
      <Metric label="Gross order value" currency value={current ? minorMoney(current.revenueMinor) : '—'} current={current?.revenueMinor} previous={previous?.revenueMinor} />
      <Metric label="Orders placed" value={current?.orders.toLocaleString() ?? '—'} current={current?.orders} previous={previous?.orders} />
      <Metric label="Average order" currency value={current ? minorMoney(current.averageOrderMinor) : '—'} current={current?.averageOrderMinor} previous={previous?.averageOrderMinor} />
      <Metric label="Dispatched" value={current?.completed.toLocaleString() ?? '—'} current={current?.completed} previous={previous?.completed} />
    </div>
    <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(260px,0.8fr)]">
      <Card title="Sales overview" aside={<Badge tone="neutral">{days} days</Badge>} className="mb-0">
        <p className="m-0 flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums"><span className="text-sm font-medium text-mute">AED</span>{current ? minorMoney(current.revenueMinor) : '—'}</p>
        <p className="mb-4 mt-0.5 text-xs text-mute">Gross value of online orders placed</p>
        {report ? <DailySalesChart daily={report.daily} /> : <EmptyState title="Chart unavailable">Reload the report to try again.</EmptyState>}
      </Card>
      <Fulfilment report={report} />
    </div>
    <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card title="Recent orders" description="The latest orders across all dates" className="mb-0" flush aside={<Link href="/admin/orders" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fill px-4 text-[13px] font-medium text-ink no-underline hover:bg-line">View all <ArrowRightIcon className="size-3.5" aria-hidden="true" /></Link>}><RecentOrders orders={recent.slice(0, 5)} /></Card>
      <TopProducts report={report} />
    </div>
    <p className="text-xs text-mute">Period reporting includes online orders recorded with the current order system. Legacy orders remain in Recent orders. Values are before cancellation or refund adjustments; dates use UTC.</p>
  </div>;
}
