import type { ReactNode } from "react";
import { requireIdentity } from "../../../../lib/server/admin/gateway";
import { canVisit, sections } from "../../../../lib/admin/policy";
import { AdminShell } from "../../../../components/admin/shell";
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireIdentity();
  return (
    <AdminShell
      user={{ name: user.name, role: user.role, branchId:user.branchId??null }}
      allowed={sections.filter((section) => canVisit(user.role, section))}
    >
      {children}
    </AdminShell>
  );
}
