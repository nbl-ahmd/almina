'use client';
import { useSyncExternalStore } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from '../app-link';
import { Badge, buttonVariants, orderStatusTone } from './ui';
import { DataTable } from './shadcn/data-table';

export type OrderRow = {
  _id: string; orderId: string; status: string; createdAt?: string;
  customer: { name?: string; city?: string; totalAmount?: number | string };
  routing?: { branchName?: string; areaLabel?: string; needsReview?: boolean };
};

/** When the order arrived; open orders also say how long they have waited. */
function Received({ order }: { order: OrderRow }) {
  const time = Date.parse(order.createdAt ?? '');
  // The age depends on the reader's clock, so it is added after the page is interactive.
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!Number.isFinite(time)) return <>—</>;
  const when = new Date(time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
  const open = ['pending', 'confirmed', 'packed'].includes(order.status);
  const minutes = ready ? Math.max(0, Math.floor((new Date().getTime() - time) / 60000)) : null;
  const age = minutes === null ? '' : minutes < 60 ? `${minutes} min` : minutes < 1440 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 1440)} d`;
  return <span className="grid whitespace-nowrap leading-tight"><span>{when}</span>{open && age ? <span className="text-xs text-warn">waiting {age}</span> : null}</span>;
}

const columns: ColumnDef<OrderRow, unknown>[] = [
  { accessorKey: 'orderId', header: 'Order', meta: { label: 'Order' }, cell: ({ row }) => <span className="font-medium">{row.original.orderId}</span> },
  { id: 'received', accessorFn: row => Date.parse(row.createdAt ?? '') || 0, header: 'Received', meta: { label: 'Received' }, cell: ({ row }) => <Received order={row.original} /> },
  { id: 'customer', accessorFn: row => row.customer?.name ?? '', header: 'Customer', meta: { label: 'Customer' } },
  { id: 'area', accessorFn: row => row.customer?.city ?? '', header: 'Customer area', meta: { label: 'Area' } },
  { id: 'branch', accessorFn: row => row.routing?.branchName ?? '', header: 'Receiving branch', meta: { label: 'Branch' } },
  { id: 'delivery', accessorFn: row => row.routing?.areaLabel ?? '', header: 'Delivery area', meta: { label: 'Delivery area' },
    cell: ({ row }) => <>{row.original.routing?.areaLabel ?? '—'}{row.original.routing?.needsReview ? <Badge className="ml-2" tone="warning">Review address</Badge> : null}</> },
  { id: 'total', accessorFn: row => Number(row.customer?.totalAmount ?? 0), header: 'Total (AED)', meta: { label: 'Total', align: 'end' } },
  { accessorKey: 'status', header: 'Status', meta: { label: 'Status' }, cell: ({ row }) => <Badge tone={orderStatusTone(row.original.status)} dot>{row.original.status}</Badge> },
  { id: 'actions', header: () => <span className="sr-only">Actions</span>, enableSorting: false, enableHiding: false, meta: { align: 'end' },
    cell: ({ row }) => <Link href={`/admin/orders/${row.original._id}`} aria-label={`Open order ${row.original.orderId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View</Link> },
];

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  return <DataTable caption="Orders" data={orders} columns={columns} getRowId={row => row._id} empty={{ title: 'No orders in this view', description: 'Try another status filter, or wait for new orders to arrive.' }} />;
}
