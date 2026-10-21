import Link from 'next/link';
import type { ComponentProps } from 'react';
import type { z } from 'zod';
import {
  BellAlertIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  InboxIcon,
  ShoppingBagIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { operationsSnapshotSchema } from '@almina/contracts';
import { adminRead } from '../../lib/server/admin/gateway';
import type { Identity } from '../../lib/admin/policy';
import { display, record, rows } from './views';
import {
  Badge,
  BarList,
  Card,
  EmptyState,
  Note,
  PageHeader,
  StatGrid,
  StatTile,
  TrendChart,
  orderStatusTone,
} from './ui';

const statuses = [
  'pending',
  'confirmed',
  'packed',
  'dispatched',
  'cancelled',
  'refunded',
] as const;

function shortDay(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso.slice(0, 10)
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function money(value: number) {
  return `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function AdminDashboard({ user }: { user: Identity }) {
  const recent = rows(
    await adminRead('orders', new URLSearchParams({ limit: '25' })),
  );
  const admin = user.role === 'admin';

  const counts = new Map<string, number>();
  let sampleValue = 0;
  const days = new Map<string, number>();
  for (const order of recent) {
    const status = display(order.status);
    counts.set(status, (counts.get(status) ?? 0) + 1);
    const total = Number(record(order.customer).totalAmount);
    if (Number.isFinite(total)) sampleValue += total;
    const createdAt = display(order.createdAt);
    if (/^\d{4}-\d{2}-\d{2}/.test(createdAt)) {
      const key = createdAt.slice(0, 10);
      days.set(key, (days.get(key) ?? 0) + 1);
    }
  }
  const awaiting = counts.get('pending') ?? 0;
  const inProgress = (counts.get('confirmed') ?? 0) + (counts.get('packed') ?? 0);

  let needsAction: number | null = null;
  let storeStatus: string | null = null;
  let snapshot: z.infer<typeof operationsSnapshotSchema> | null = null;
  if (admin) {
    try {
      const data = record(
        await adminRead(
          'products/needs-action',
          new URLSearchParams({ limit: '1', offset: '0' }),
        ),
      );
      const total = Number(data.total);
      needsAction = Number.isFinite(total) ? total : null;
    } catch {
      needsAction = null;
    }
    try {
      const status = record(await adminRead('store/status')).status;
      storeStatus = typeof status === 'string' ? status : null;
    } catch {
      storeStatus = null;
    }
    try {
      snapshot = operationsSnapshotSchema.parse(await adminRead('operations'));
    } catch {
      snapshot = null;
    }
  }

  const trend = [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, value]) => ({ label: shortDay(key), value }));
  const statusBars = statuses
    .map((status) => ({ label: status, value: counts.get(status) ?? 0 }))
    .filter((item) => item.value > 0)
    .map((item) => ({ ...item, tone: orderStatusTone(item.label) }));

  const tiles: ComponentProps<typeof StatTile>[] = [
    {
      href: '/admin/orders',
      label: 'Orders in view',
      countTo: recent.length,
      meta:
        recent.length === 0
          ? 'No orders within your permissions'
          : `Awaiting ${awaiting} · in progress ${inProgress}`,
      icon: <ShoppingBagIcon />,
    },
    {
      href: '/admin/orders?status=pending',
      label: 'Awaiting confirmation',
      countTo: awaiting,
      meta: 'Pending orders in this view',
      icon: <SignalIcon />,
      tone: awaiting > 0 ? 'warning' : 'brand',
      active: awaiting > 0,
    },
    admin
      ? {
          href: '/admin/needs-action',
          label: 'Needs action',
          ...(needsAction === null
            ? { value: '—' }
            : { countTo: needsAction }),
          meta: 'Products waiting for review',
          icon: <ClipboardDocumentCheckIcon />,
          tone: needsAction ? 'warning' : 'brand',
        }
      : {
          href: '/admin/orders',
          label: 'In progress',
          countTo: inProgress,
          meta: 'Confirmed or packed orders',
          icon: <CubeIcon />,
        },
    admin
      ? {
          href: '/admin/settings',
          label: 'Store',
          value: (
            <Badge tone={storeStatus === 'open' ? 'success' : 'danger'} dot>
              {storeStatus ?? 'Unknown'}
            </Badge>
          ),
          meta: 'Current storefront availability',
          icon: <CubeIcon />,
          tone: storeStatus === 'open' ? 'success' : 'danger',
        }
      : {
          href: '/admin/notifications',
          label: 'Order value',
          value: money(sampleValue),
          meta: 'Within this recent-order view',
          icon: <SignalIcon />,
        },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={
          recent.length === 1
            ? 'Recent orders within your current permissions. Figures reflect the single most recent order you can access unless stated otherwise.'
            : `Recent orders within your current permissions. Figures are based on the ${recent.length} most recent orders you can access unless stated otherwise.`
        }
        actions={<Link href="/admin/orders">Open orders</Link>}
      />

      <StatGrid>
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </StatGrid>

      <div className="admin-grid admin-grid--2">
        <Card
          title="Order status"
          description="Distribution across the recent-order view."
        >
          {statusBars.length ? (
            <BarList items={statusBars} />
          ) : (
            <p className="admin-card__hint admin-hint--tight">
              No orders are visible to this account yet.
            </p>
          )}
        </Card>
        <Card
          title="Order volume"
          description="Orders received per day in the recent-order view."
        >
          <TrendChart points={trend} label="Orders received per day" />
        </Card>
      </div>

      {admin ? (
        <Card
          title="System health"
          description="Measured on one API process. Collect every deployed instance before making a release decision."
          aside={<Link href="/admin/operations">Open operations</Link>}
        >
          {snapshot ? (
            <>
              {snapshot.alerts.length ? (
                <Note tone="warning" icon={<BellAlertIcon />}>
                  <p>
                    <strong>
                      {snapshot.alerts.length} signal
                      {snapshot.alerts.length === 1 ? '' : 's'} to investigate:
                    </strong>{' '}
                    {snapshot.alerts.map((alert) => alert.replaceAll('_', ' ')).join(', ')}.
                  </p>
                </Note>
              ) : (
                <Note tone="brand">
                  <p>No thresholds triggered in this sample.</p>
                </Note>
              )}
              <div className="admin-mt">
                <BarList
                  items={(['catalog', 'checkout', 'other'] as const).map(
                    (group) => ({
                      label: group,
                      value: snapshot.http.groups[group].count,
                      hint: snapshot.http.groups[group].failureRate
                        ? `${snapshot.http.groups[group].count} · ${(snapshot.http.groups[group].failureRate! * 100).toFixed(2)}% 5xx`
                        : String(snapshot.http.groups[group].count),
                      tone:
                        snapshot.http.groups[group].failureRate &&
                        snapshot.http.groups[group].failureRate! > 0
                          ? ('warning' as const)
                          : ('brand' as const),
                    }),
                  )}
                />
              </div>
              <p className="admin-hint admin-hint--tight">
                Measured {snapshot.http.measuredAt} · source {snapshot.http.source}
              </p>
            </>
          ) : (
            <p className="admin-card__hint admin-hint--tight">
              Operations measurements are unavailable from this process right
              now.
            </p>
          )}
        </Card>
      ) : null}

      <Card
        title="Recent orders"
        description="Open an order to review its details and recorded lines."
        flush
      >
        <RecentOrders orders={recent} />
      </Card>
    </>
  );
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
      <table>
        <caption>Recent orders</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">City</th>
            <th scope="col" className="admin-num">Total (AED)</th>
            <th scope="col">Status</th>
            <th scope="col">Received</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const customer = record(order.customer);
            const status = display(order.status);
            return (
              <tr key={display(order._id ?? index)}>
                <td>{display(order.orderId)}{order.channel==='wholesale'?<span className="mt-1 block text-xs font-semibold">Wholesale</span>:null}</td>
                <td>{display(customer.name)}</td>
                <td>{display(customer.city)}</td>
                <td className="admin-num">{display(customer.totalAmount)}</td>
                <td>
                  <Badge tone={orderStatusTone(status)} dot>
                    {status}
                  </Badge>
                </td>
                <td>{display(order.createdAt)}</td>
                <td>
                  <div className="admin-row-actions">
                    <Link href={`/admin/orders/${display(order._id)}`}>
                      Open order {display(order.orderId)}
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
