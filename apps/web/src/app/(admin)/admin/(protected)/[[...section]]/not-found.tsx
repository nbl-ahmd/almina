import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '../../../../../components/admin/ui';

export default function AdminNotFound() {
  return (
    <section className="admin-card" data-motion="rise">
      <EmptyState icon={<MagnifyingGlassIcon />} title="Admin page not found">
        This page or record is unavailable. It may have been archived, or the
        address may be incomplete.
      </EmptyState>
      <div className="admin-actions admin-actions--center">
        <Link className="admin-btn--primary" href="/admin">
          Return to dashboard
        </Link>
        <Link className="admin-btn--secondary" href="/admin/orders">
          Open orders
        </Link>
      </div>
    </section>
  );
}
