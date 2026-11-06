"use client";
import Link from '../../../components/app-link';
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="admin-card admin-login" role="alert">
      <span className="admin-empty__icon" aria-hidden="true">
        <ExclamationTriangleIcon />
      </span>
      <h1>Administration unavailable</h1>
      <p>
        Your request could not be completed. No order, stock or catalogue values
        were changed by this screen. Please try again.
      </p>
      <div className="admin-actions">
        <button onClick={reset}>Try again</button>
        <Link className="admin-btn--secondary" href="/admin/login">
          Sign in
        </Link>
      </div>
    </main>
  );
}
