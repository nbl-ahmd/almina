"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="admin-panel">
      <h1>Administration unavailable</h1>
      <p role="alert">Your request could not be completed. Please try again.</p>
      <button onClick={reset}>Try again</button>
      <Link href="/admin/login">Sign in</Link>
    </main>
  );
}
