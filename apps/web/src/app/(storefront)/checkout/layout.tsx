import type { ReactNode } from 'react';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <div className="checkout-page">{children}</div>;
}
