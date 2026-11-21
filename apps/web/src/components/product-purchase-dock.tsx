'use client';

import type { ReactNode } from 'react';
import { useFixedDockClearance } from './use-fixed-dock-clearance';
import styles from './product-detail.module.css';

export function ProductPurchaseDock({ children }: { children: ReactNode }) {
  const ref = useFixedDockClearance('--pdp-dock-clearance');
  return <div className={`pdp-purchase ${styles.dock}`} ref={ref}>{children}</div>;
}
