import Link from '../../components/app-link';
export default function NotFound() {
  return <section className="empty-state"><h1>Page not found</h1><p>This page may have moved. Explore the pharmacy to find what you need.</p><Link className="button" href="/">Return home</Link></section>;
}
