import Link from '../../../../components/app-link';
import { redirect } from "next/navigation";
import {
  CheckIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { currentIdentity } from "../../../../lib/server/admin/gateway";
import { LoginForm } from "../../../../components/admin/controls";

const assurances = [
  {
    icon: ShieldCheckIcon,
    text: "Server-authoritative stock, pricing and order state",
  },
  {
    icon: SparklesIcon,
    text: "Reviewed catalogue publishing, never silent edits",
  },
  {
    icon: CheckIcon,
    text: "Role-scoped access with session revocation",
  },
];

export default async function LoginPage() {
  if (await currentIdentity()) redirect("/admin");
  return (
    <main className="admin-login-shell">
      <aside className="admin-login-aside">
        <div className="admin-login__brand">
          <span className="admin-brand__logo" aria-hidden="true">
            A
          </span>
          <span className="admin-brand__text">
            Al Mina
            <span className="admin-brand__sub">Administration</span>
          </span>
        </div>

        <div className="admin-login-aside__body">
          <p className="admin-login-aside__title">
            The pharmacy, run with clarity.
          </p>
          <p className="admin-login-aside__copy">
            One calm workspace for orders, inventory, catalogue review and
            customer conversations across every Al Mina branch.
          </p>
          <ul className="admin-login-aside__list">
            {assurances.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text}>
                  <Icon aria-hidden="true" />
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="admin-login-aside__foot">
          Al Mina Pharmacy · Ras al-Khaimah · Authorised staff only
        </p>
      </aside>

      <div className="admin-login-main">
        <div className="admin-login">
          <div className="admin-login__brand">
            <span className="admin-brand__logo" aria-hidden="true">
              A
            </span>
            <span className="admin-brand__text">
              Al Mina
              <span className="admin-brand__sub">Administration</span>
            </span>
          </div>
          <h1>Staff sign in</h1>
          <p>Use your Al Mina staff account to continue.</p>
          <LoginForm />
          <p className="admin-login__meta">
            Forgot your password or need access? Ask an administrator to reset
            your account. Access is limited to the cities assigned to you.
          </p>
          <p className="admin-login__switch">
            <Link href="/">Return to the storefront</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
