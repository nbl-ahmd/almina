import Link from '../../../../components/app-link';
import { redirect } from "next/navigation";
import { CheckIcon, ShieldCheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { currentIdentity } from "../../../../lib/server/admin/gateway";
import { LoginForm } from "../../../../components/admin/controls";

const assurances = [
  { icon: ShieldCheckIcon, text: "Server-authoritative stock, pricing and order state" },
  { icon: SparklesIcon, text: "Reviewed catalogue publishing, never silent edits" },
  { icon: CheckIcon, text: "Role-scoped access with session revocation" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-ink text-lg font-bold text-white">A</span>
      <span className="grid leading-tight"><span className="text-base font-semibold text-ink">Al Mina</span><span className="text-xs text-mute">Administration</span></span>
    </div>
  );
}

export default async function LoginPage() {
  // An unreachable API must not turn the sign-in page into an error page: show the form and let sign-in report the outage.
  const signedIn = await currentIdentity().then((identity) => Boolean(identity), () => false);
  if (signedIn) redirect("/admin");
  return (
    <main className="grid min-h-dvh gap-3 p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between rounded-lg bg-ink p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-fill text-lg font-bold text-ink">A</span>
          <span className="text-base font-semibold">Al Mina</span>
        </div>
        <div className="grid max-w-md gap-5">
          <p className="m-0 text-4xl font-semibold leading-tight tracking-tight">The pharmacy, run with clarity.</p>
          <p className="m-0 text-base leading-7 text-white/70">One calm workspace for orders, inventory, catalogue review and customer conversations across every Al Mina branch.</p>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {assurances.map((item) => { const Icon = item.icon; return (
              <li key={item.text} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-sm"><Icon aria-hidden="true" className="size-5 shrink-0 text-white/70" />{item.text}</li>
            ); })}
          </ul>
        </div>
        <p className="m-0 text-xs text-white/50">Al Mina Pharmacy · Ras al-Khaimah · Authorised staff only</p>
      </aside>
      <div className="grid place-items-center rounded-xl bg-surface p-6 border border-line">
        <div className="w-full max-w-sm">
          <Brand />
          <h1 className="mb-1 mt-8 text-3xl font-semibold tracking-tight">Staff sign in</h1>
          <p className="m-0 text-sm text-mute">Use your Al Mina staff account to continue.</p>
          <LoginForm />
          <p className="mt-6 text-[13px] leading-5 text-mute">Forgot your password or need access? Ask an administrator to reset your account. Staff order access follows the branch assigned to your account.</p>
          <p className="m-0"><Link href="/" className="text-[13px] font-medium text-ink underline underline-offset-4">Return to the storefront</Link></p>
        </div>
      </div>
    </main>
  );
}
