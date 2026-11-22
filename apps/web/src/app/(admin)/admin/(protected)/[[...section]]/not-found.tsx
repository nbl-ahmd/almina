import Link from '../../../../../components/app-link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '../../../../../components/admin/ui';

export default function AdminNotFound() {
  return (
    <section className="rounded-xl bg-surface p-6 border border-line">
      <EmptyState icon={<MagnifyingGlassIcon />} title="Admin page not found">
        This page or record is unavailable. It may have been archived, or the
        address may be incomplete.
      </EmptyState>
      <div className="flex flex-wrap justify-center gap-2">
        <Link className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-white no-underline hover:bg-ink-2" href="/admin">
          Return to dashboard
        </Link>
        <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-ink no-underline hover:bg-soft" href="/admin/orders">
          Open orders
        </Link>
      </div>
    </section>
  );
}
