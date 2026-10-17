import type { AdminRecord } from './policy';

// Presentation only: never recalculate or reconstruct historical commerce amounts.
export function orderLinePresentation(line: AdminRecord, snapshotAvailable: boolean): AdminRecord {
  const product = line._id && typeof line._id === 'object' ? line._id as AdminRecord : {};
  const unit = product.sale === true && typeof product.salePrice === 'number' ? product.salePrice : product.price;
  const total = line.lineTotalMinor;
  return { ...line,
    displayedUnitPrice: typeof unit === 'number' && Number.isFinite(unit) && unit >= 0 ? unit.toFixed(2) : null,
    recordedLineTotal: snapshotAvailable && typeof total === 'number' && Number.isSafeInteger(total) && total >= 0
      ? `${BigInt(total) / 100n}.${String(BigInt(total) % 100n).padStart(2, '0')}` : null,
  };
}
