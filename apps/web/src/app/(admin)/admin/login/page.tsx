import { redirect } from "next/navigation";
import { currentIdentity } from "../../../../lib/server/admin/gateway";
import { LoginForm } from "../../../../components/admin/controls";
export default async function LoginPage() {
  if (await currentIdentity()) redirect("/admin");
  return (
    <main className="admin-login">
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
      <p>Use your Al Mina staff account.</p>
      <LoginForm />
    </main>
  );
}
