import Link from "next/link";
import type { ReactNode } from "react";
import { requireIdentity } from "../../../../lib/server/admin/gateway";
import { canVisit, sections } from "../../../../lib/admin/policy";
import {
  SessionControls,
  OrderMonitor,
} from "../../../../components/admin/controls";
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireIdentity();
  return (
    <>
      <a className="admin-skip" href="#admin-main">
        Skip to content
      </a>
      <header className="admin-header">
        <Link href="/admin">Al Mina / Administration</Link>
        <span>
          {user.name} · {user.role}
        </span>
        <SessionControls />
      </header>
      <div className="admin-shell">
        <nav aria-label="Admin navigation">
          {sections
            .filter((section) => canVisit(user.role, section))
            .map((section) => (
              <Link
                key={section}
                href={`/admin/${section === "dashboard" ? "" : section}`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </Link>
            ))}
          <Link href="/">View storefront</Link>
        </nav>
        <main id="admin-main" tabIndex={-1}>
          <OrderMonitor />
          {children}
        </main>
      </div>
    </>
  );
}
