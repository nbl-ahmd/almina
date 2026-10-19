import { UnsubscribeReminder } from '../../../components/customer-reminders';
export const metadata = { title: 'Cancel reminder', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? <UnsubscribeReminder token={token} /> : <section><h1 className="text-2xl">Reminder link unavailable</h1><p>Use the link in your reminder email, or manage reminders in your account.</p></section>;
}
