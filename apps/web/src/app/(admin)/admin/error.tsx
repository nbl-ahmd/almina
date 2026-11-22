"use client";
import Link from '../../../components/app-link';
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto mt-24 grid max-w-md gap-3 rounded-xl bg-surface p-8 text-center border border-line [&_h1]:m-0 [&_h1]:text-2xl [&_h1]:font-semibold [&_p]:m-0 [&_p]:text-sm [&_p]:text-mute" role="alert">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-warn-soft text-warn [&>svg]:size-6" aria-hidden="true">
        <ExclamationTriangleIcon />
      </span>
      <h1>Administration unavailable</h1>
      <p>
        Your request could not be completed. No order, stock or catalogue values
        were changed by this screen. Please try again.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2">Try again</button>
        <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-ink no-underline hover:bg-soft" href="/admin/login">
          Sign in
        </Link>
      </div>
    </main>
  );
}
