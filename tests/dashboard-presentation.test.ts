import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changePercent, dailyReportCsv, minorMoney, reportDays } from '../apps/web/src/lib/admin/dashboard';

test('dashboard periods and comparisons do not invent a missing baseline', () => {
  assert.equal(reportDays('7'), 7); assert.equal(reportDays('90'), 90);
  for (const value of ['30', 'all', '365', undefined, ['7']]) assert.equal(reportDays(value), 30);
  assert.equal(changePercent(4, 0), null); assert.equal(changePercent(0, 4), -100);
  assert.equal(changePercent(6, 4), 50); assert.equal(changePercent(4, 4), 0);
});
test('daily export retains zero days and recorded minor-unit precision', () => {
  assert.equal(minorMoney(1005), '10.05');
  assert.equal(dailyReportCsv({ daily: [{ date: '2026-10-23', orders: 0, revenueMinor: 0 }, { date: '2026-10-24', orders: 2, revenueMinor: 1005 }] }),
    'Date (UTC),Orders,Gross order value (AED)\r\n2026-10-23,0,0.00\r\n2026-10-24,2,10.05');
});
