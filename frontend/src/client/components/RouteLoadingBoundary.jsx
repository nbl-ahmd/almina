import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';

class ChunkErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) return <div className="container py-5" role="alert"><h1>Unable to load this page</h1><p>Please reload to get the latest version.</p><button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button></div>;
    return this.props.children;
  }
}
export function RouteLoadingBoundary({ children }) {
  const location = useLocation();
  return <ChunkErrorBoundary resetKey={location.pathname}><Suspense fallback={<div className="container py-5" role="status" aria-live="polite">Loading page…</div>}>{children}</Suspense></ChunkErrorBoundary>;
}
