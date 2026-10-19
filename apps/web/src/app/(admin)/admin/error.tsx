"use client";
import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="admin-card admin-login">
      <span className="admin-empty__icon" aria-hidden="true">
        <ExclamationTriangleIcon />
      </span>
      <h1>Administration unavailable</h1>
      <p role="alert">Your request could not be completed. Please try again.</p>
      <div className="admin-actions">
        <button onClick={reset}>Try again</button>
        <Link className="admin-btn--secondary" href="/admin/login">
          Sign in
        </Link>
      </div>
    </main>
  );
}
