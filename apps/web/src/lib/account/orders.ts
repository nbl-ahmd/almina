import type { CustomerOrderDto } from '@almina/contracts';

/** An order as the account screens receive it (dates arrive as ISO strings). */
export type AccountOrder = Omit<CustomerOrderDto, 'createdAt' | 'timeline'> & { createdAt: string; timeline?: { status: string; at: string }[] | undefined };
export const orderFilters = ['all', 'active', 'dispatched', 'cancelled'] as const;
export type OrderFilter = typeof orderFilters[number];
export const orderFilterLabels: Record<OrderFilter, string> = { all: 'All orders', active: 'In progress', dispatched: 'Dispatched', cancelled: 'Cancelled' };

export function orderGroup(order: Pick<AccountOrder, 'status'>): Exclude<OrderFilter, 'all'> {
  if (order.status === 'cancelled' || order.status === 'refunded') return 'cancelled';
  return order.status === 'dispatched' ? 'dispatched' : 'active';
}
/** Filter by progress, and search order numbers and product names. */
export function filterOrders(orders: AccountOrder[], filter: OrderFilter, query: string): AccountOrder[] {
  const needle = query.trim().toLowerCase();
  return orders.filter(order => (filter === 'all' || orderGroup(order) === filter)
    && (!needle || order.orderId.toLowerCase().includes(needle) || order.totals.lines.some(line => line.name.toLowerCase().includes(needle))));
}

export type OrderState = { tone: 'progress' | 'done' | 'stopped' | 'attention'; label: string; note: string };
/** Plain statements of what the pharmacy has recorded. There is no delivery confirmation, so nothing claims delivery. */
export function orderState(order: Pick<AccountOrder, 'status' | 'paymentState'>): OrderState {
  if (order.status === 'cancelled') return order.paymentState === 'expired' ? { tone: 'stopped', label: 'Payment expired', note: 'The online payment was not completed, so this order was cancelled.' }
    : { tone: 'stopped', label: 'Cancelled', note: 'This order was cancelled.' };
  if (order.status === 'refunded') return { tone: 'stopped', label: 'Refunded', note: 'This order was refunded.' };
  if (order.paymentState === 'refund_pending') return { tone: 'attention', label: 'Refund in progress', note: 'A refund for this order is being processed.' };
  if (order.status === 'pending' && order.paymentState === 'awaiting_payment') return { tone: 'attention', label: 'Awaiting payment', note: 'The online payment for this order is not complete yet.' };
  if (order.status === 'dispatched') return { tone: 'done', label: 'Dispatched', note: 'Your order has left the pharmacy.' };
  if (order.status === 'packed') return { tone: 'progress', label: 'Packed', note: 'Your order is packed and waiting to be dispatched.' };
  if (order.status === 'confirmed') return { tone: 'progress', label: 'Confirmed', note: 'The pharmacy has confirmed your order.' };
  if (order.status === 'pending') return { tone: 'progress', label: 'Order received', note: 'The pharmacy will confirm your order.' };
  return { tone: 'attention', label: 'Contact the pharmacy', note: 'Contact the pharmacy for the latest update on this order.' };
}

const stepLabels = { pending: 'Order received', confirmed: 'Confirmed', packed: 'Packed', dispatched: 'Dispatched', cancelled: 'Cancelled', refunded: 'Refunded' } as const;
export type OrderStep = { status: string; label: string; at?: string | undefined; state: 'done' | 'current' | 'upcoming' | 'stopped' };
/** The order's progress. A stopped order shows only what actually happened, then how it ended. Older orders may have no times. */
export function orderSteps(order: Pick<AccountOrder, 'status' | 'createdAt' | 'timeline'>): OrderStep[] {
  const path = ['pending', 'confirmed', 'packed', 'dispatched'] as const;
  const at = (status: string) => order.timeline?.filter(entry => entry.status === status).at(-1)?.at ?? (status === 'pending' ? order.createdAt : undefined);
  if (order.status === 'cancelled' || order.status === 'refunded') {
    const reached = path.filter(status => status === 'pending' || order.timeline?.some(entry => entry.status === status));
    return [...reached.map(status => ({ status, label: stepLabels[status], at: at(status), state: 'done' as const })), { status: order.status, label: stepLabels[order.status], at: at(order.status), state: 'stopped' as const }];
  }
  const current = path.indexOf(order.status as typeof path[number]);
  if (current < 0) return [];
  return path.map((status, index) => ({ status, label: stepLabels[status], at: index <= current ? at(status) : undefined,
    state: index < current ? 'done' as const : index === current ? (status === 'dispatched' ? 'done' as const : 'current' as const) : 'upcoming' as const }));
}

/** Mirrors the API's review rule; the server still decides. Business orders do not review retail products. */
export function canReview(order: Pick<AccountOrder, 'status' | 'channel'>) {
  return order.channel !== 'wholesale' && ['confirmed', 'packed', 'dispatched'].includes(order.status);
}
export function canReorder(order: Pick<AccountOrder, 'status' | 'channel'>) {
  return order.channel !== 'wholesale' && !['cancelled', 'refunded'].includes(order.status);
}
export const itemCount = (order: Pick<AccountOrder, 'totals'>) => order.totals.lines.reduce((sum, line) => sum + line.quantity, 0);
export const paymentLabels = { cash: 'Cash on delivery', card: 'Card on delivery', stripe: 'Online card payment' } as const;
export const ratingLabels = ['Terrible', 'Bad', 'Okay', 'Good', 'Great'] as const;
export const reviewStateLabels = { pending: 'Waiting for pharmacy review', approved: 'Published', rejected: 'Not published' } as const;

export function orderDate(value: string, locale: 'en' | 'ar', time = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}), timeZone: 'Asia/Dubai' }).format(date);
}
export function reviewErrorMessage(status: number) {
  return status === 401 ? 'Your session has expired. Refresh the page and sign in again.'
    : status === 403 ? 'This purchase does not qualify for a review.'
      : status === 404 ? 'This product is no longer listed, so it cannot be reviewed.'
        : status === 429 ? 'Too many attempts. Please wait before trying again.'
          : 'Unable to submit the review. Please try again.';
}
