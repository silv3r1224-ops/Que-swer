import { Link } from 'react-router-dom';
import { Page } from '@/components/Page';

export function NotFound() {
  return (
    <Page>
      <div className="card-surface mx-auto max-w-md p-10 text-center">
        <p className="font-display text-6xl font-bold text-accent">404</p>
        <h1 className="mt-3 text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          The page you're looking for doesn't exist or was moved.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back home
        </Link>
      </div>
    </Page>
  );
}
