import { redirect } from "next/navigation";
import { currentIdentity } from "../../../../lib/server/admin/gateway";
import { LoginForm } from "../../../../components/admin/controls";
export default async function LoginPage() {
  if (await currentIdentity()) redirect("/admin");
  return (
    <main className="admin-login">
      <h1>Staff sign in</h1>
      <p>Use your Al Mina staff account.</p>
      <LoginForm />
    </main>
  );
}
