import Link from 'next/link';
export default function AdminNotFound() {
  return <section className="admin-panel"><h1>Admin page not found</h1><p>This page or record is unavailable.</p><Link href="/admin">Return to dashboard</Link></section>;
}
