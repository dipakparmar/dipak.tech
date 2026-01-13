'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  routeGroup: string;
}

export function ErrorBoundary({ error, reset, routeGroup }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag('route_group', routeGroup);
      scope.setContext('error_boundary', {
        digest: error.digest,
        message: error.message
      });
      Sentry.captureException(error);
    });
  }, [error, routeGroup]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          We apologize for the inconvenience. An error has been reported.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
