import type { z } from 'zod';
import type { growthMetricsResponseSchema } from '@almina/contracts';

export type DashboardReport = z.infer<typeof growthMetricsResponseSchema>;
export function reportDays(value: unknown): 7 | 30 | 90 {
  return value === '7' ? 7 : value === '90' ? 90 : 30;
}
export function changePercent(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}
export function minorMoney(value: number): string {
  return new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
}
export function reportDate(value: string): string {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
export function dailyReportCsv(report: Pick<DashboardReport, 'daily'>): string {
  return ['Date (UTC),Orders,Gross order value (AED)', ...report.daily.map(day => `${day.date},${day.orders},${(day.revenueMinor / 100).toFixed(2)}`)].join('\r\n');
}
