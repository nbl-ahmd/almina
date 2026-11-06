import Link from '../app-link';
import { ArrowRightIcon, ArrowUpRightIcon, ArrowTrendingUpIcon, CubeIcon, InboxIcon, ShoppingBagIcon, TruckIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { adminRead } from '../../lib/server/admin/gateway';
import { readDashboardReport } from '../../lib/server/admin/reporting';
import type { Identity } from '../../lib/admin/policy';
import { changePercent, minorMoney, reportDate, type DashboardReport } from '../../lib/admin/dashboard';
import { display, record, rows } from './views';
import { Badge, Button, Card, EmptyState, PageHeader, orderStatusTone } from './ui';
import { DailySalesChart, DashboardControls, ReloadReport } from './dashboard-charts';

function stamp(value: unknown) {
  const raw = display(value), date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' });
}

function Metric({ label, value, previous, current, currency = false, icon, inverse = false }: {
  label: string; value: string; previous?: number | undefined; current?: number | undefined; currency?: boolean;
  icon: React.ReactNode; inverse?: boolean;
}) {
  const delta = previous === undefined || current === undefined ? null : changePercent(current, previous);
  return <article className="commerce-metric">
    <div className="commerce-metric__head"><h2>{label}</h2>{icon}</div>
    <p className="commerce-metric__value">{currency ? <span>AED</span> : null}{value}</p>
    <div className="commerce-metric__foot">
      {delta === null ? <span>{current === undefined ? 'Report unavailable' : 'No previous-period baseline'}</span> : <><Badge tone={delta === 0 ? 'neutral' : (delta > 0) !== inverse ? 'success' : 'danger'}>{delta > 0 ? '+' : ''}{delta}%</Badge><span>vs previous period</span></>}
    </div>
  </article>;
}

function Fulfilment({ report }: { report: DashboardReport | null }) {
  const total = report?.current.orders ?? 0;
  const completed = report?.current.completed ?? 0;
  const cancelled = report?.current.cancelled ?? 0;
  const other = Math.max(0, total - completed - cancelled);
  const percentage = total ? Math.round(completed / total * 100) : 0;
  const stages = [
    { label: 'Dispatched', count: completed, color: 'var(--admin-chart)', href: '/admin/orders?status=dispatched' },
    { label: 'Cancelled', count: cancelled, color: 'var(--admin-danger)', href: '/admin/orders?status=cancelled' },
    { label: 'Other stages', count: other, color: 'var(--admin-border-strong)', href: '/admin/orders' },
  ];
  let offset = 0;
  return <Card title="Fulfilment" className="commerce-fulfilment" aside={<TruckIcon width={18} height={18} aria-hidden="true" />}>
    <figure className="commerce-ring" aria-label={report ? `${completed} of ${total} orders dispatched in this period` : 'Fulfilment report unavailable'}>
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="46" className="commerce-ring__track" />
        {stages.map(stage => { const length = total ? stage.count / total * 289.027 : 0, start = offset; offset += length; return <circle key={stage.label} cx="60" cy="60" r="46" fill="none" stroke={stage.color} strokeWidth="9" strokeDasharray={`${Math.max(0, length - (length > 4 ? 3 : 0))} 289.027`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />; })}
      </svg>
      <figcaption><strong>{report ? `${percentage}%` : '—'}</strong><span>dispatched</span></figcaption>
    </figure>
    <ul className="commerce-status-list">{stages.map(stage => <li key={stage.label}><Link href={stage.href}><span className="commerce-legend-dot" style={{ background: stage.color }} /><span>{stage.label}</span><strong>{report ? stage.count : '—'}</strong><ArrowUpRightIcon width={13} height={13} aria-hidden="true" /></Link></li>)}</ul>
    <p className="commerce-panel-foot">{report ? `${total} online orders in the selected period` : 'Try reloading the order report.'}</p>
  </Card>;
}

function TopProducts({ report }: { report: DashboardReport | null }) {
  return <Card title="Most ordered products" description="Ranked by units placed in this period" className="commerce-products" aside={<Link href="/admin/products" className="commerce-icon-link" aria-label="View all products"><ArrowUpRightIcon width={16} height={16} /></Link>}>
    {report?.topProducts.length ? <ol className="commerce-top-products">{report.topProducts.slice(0, 5).map((product, index) => <li key={`${product.productId}-${index}`}>
      <span className="commerce-product-rank">{index + 1}</span><span className="commerce-product-icon"><CubeIcon width={19} height={19} aria-hidden="true" /></span>
      <div>{/^[a-f0-9]{24}$/i.test(product.productId) ? <Link href={`/admin/products/${product.productId}`}>{product.name}</Link> : <strong>{product.name}</strong>}<span>{product.quantity.toLocaleString()} units ordered</span></div>
      <span className="commerce-product-amount"><small>AED</small>{minorMoney(product.revenueMinor)}</span>
    </li>)}</ol> : <EmptyState icon={<CubeIcon />} title={report ? 'No products ordered yet' : 'Product report unavailable'}>{report ? 'Products will appear as orders arrive in this period.' : 'Reload to try again.'}</EmptyState>}
    <p className="commerce-panel-foot">Order snapshots; cancellations and refunds are included.</p>
  </Card>;
}

export async function AdminDashboard({ user, days = 30 }: { user: Identity; days?: 7 | 30 | 90 }) {
  const admin = user.role === 'admin';
  const [orderData, report] = await Promise.all([
    adminRead('orders', new URLSearchParams({ limit: '25' })),
    admin ? readDashboardReport(days).catch(() => null) : Promise.resolve(null),
  ]);
  const recent = rows(orderData);
  if (!admin) return <>
    <PageHeader title="Dashboard" description="Your recent orders and fulfilment queue." actions={<Button asChild variant="primary"><Link href="/admin/orders">Open orders</Link></Button>} />
    <div className="commerce-staff-metrics">{['pending', 'confirmed', 'packed', 'dispatched'].map(status => <article className="commerce-metric" key={status}><Link href={`/admin/orders?status=${status}`}><h2>{status}</h2><p className="commerce-metric__value">{recent.filter(order => order.status === status).length}</p></Link></article>)}</div>
    <p className="commerce-scope">Counts cover the latest {recent.length} orders permitted by your role and city assignments.</p>
    <Card title="Recent orders" flush><RecentOrders orders={recent.slice(0, 8)} /></Card>
  </>;
  const current = report?.current, previous = report?.previous;
  return <div className="commerce-overview">
    <PageHeader title="Dashboard" description="Your store performance, at a glance." actions={<DashboardControls report={report ? { days: report.days, daily: report.daily } : null} days={days} />} />
    <div className="commerce-overview__intro"><span>{report ? `${reportDate(report.from)} – ${reportDate(report.to)}` : `Last ${days} days`}</span><span className="commerce-live-dot" />Online order performance<Link href="/admin/operations">View operations <ArrowUpRightIcon width={13} height={13} aria-hidden="true" /></Link></div>
    {!report ? <div className="admin-note admin-note--warning" role="status">Order reporting is unavailable. Recent orders remain below. <ReloadReport /></div> : null}
    <div className="commerce-bento">
      <div className="commerce-kpis">
        <Metric label="Gross order value" currency value={current ? minorMoney(current.revenueMinor) : '—'} current={current?.revenueMinor} previous={previous?.revenueMinor} icon={<BanknotesIcon />} />
        <Metric label="Orders placed" value={current?.orders.toLocaleString() ?? '—'} current={current?.orders} previous={previous?.orders} icon={<ShoppingBagIcon />} />
        <Metric label="Average order" currency value={current ? minorMoney(current.averageOrderMinor) : '—'} current={current?.averageOrderMinor} previous={previous?.averageOrderMinor} icon={<ArrowTrendingUpIcon />} />
        <Metric label="Dispatched" value={current?.completed.toLocaleString() ?? '—'} current={current?.completed} previous={previous?.completed} icon={<TruckIcon />} />
      </div>
      <Card title="Sales overview" className="commerce-sales" aside={<Badge tone="neutral">{days} days</Badge>}>
        <p className="commerce-sales__reading"><span>AED</span>{current ? minorMoney(current.revenueMinor) : '—'}</p>
        <p className="commerce-sales__hint">Gross value of online orders placed</p>
        {report ? <DailySalesChart daily={report.daily} /> : <EmptyState icon={<ArrowTrendingUpIcon />} title="Chart unavailable">Reload the report to try again.</EmptyState>}
      </Card>
      <Fulfilment report={report} />
    </div>
    <div className="commerce-detail-grid">
      <Card title="Recent orders" description="The latest orders across all dates" className="commerce-recent" aside={<Link href="/admin/orders" className="commerce-view-all">View all <ArrowRightIcon width={14} height={14} aria-hidden="true" /></Link>} flush><RecentOrders orders={recent.slice(0, 6)} /></Card>
      <TopProducts report={report} />
    </div>
    <p className="commerce-scope">Period reporting includes online orders recorded with the current order system. Legacy orders remain in Recent orders. Values are before cancellation or refund adjustments; dates use UTC.</p>
  </div>;
}

function RecentOrders({ orders }: { orders: Record<string, unknown>[] }) {
  if (!orders.length)
    return (
      <EmptyState icon={<InboxIcon />} title="No orders yet">
        Orders permitted by your role and city assignments will appear here.
      </EmptyState>
    );
  return (
    <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Recent orders">
      <table role="table">
        <caption>Recent orders</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Order</th>
            <th scope="col" role="columnheader">Customer</th>
            <th scope="col" role="columnheader" className="admin-num">Total (AED)</th>
            <th scope="col" role="columnheader">Status</th>
            <th scope="col" role="columnheader">Received</th>
            <th scope="col" role="columnheader">Actions</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {orders.map((order, index) => {
            const customer = record(order.customer);
            const status = display(order.status);
            return (
              <tr key={display(order._id ?? index)} role="row">
                <td role="cell">
                  {display(order.orderId)}
                  {order.channel === 'wholesale' ? (
                    <span className="admin-inline-flag">Wholesale</span>
                  ) : null}
                </td>
                <td role="cell" data-label="Customer">{display(customer.name)}</td>
                <td role="cell" data-label="Total (AED)" className="admin-num">{display(customer.totalAmount)}</td>
                <td role="cell" data-label="Status">
                  <Badge tone={orderStatusTone(status)} dot>
                    {status}
                  </Badge>
                </td>
                <td role="cell" data-label="Received" className="admin-nowrap">{stamp(order.createdAt)}</td>
                <td role="cell" data-label="Actions">
                  <div className="admin-row-actions">
                    <Link href={`/admin/orders/${display(order._id)}`} aria-label={`Open order ${display(order.orderId)}`}>
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
