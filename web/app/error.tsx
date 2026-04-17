'use client';

import { useEffect } from 'react';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[QuackFocus] UI error boundary', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <div className="w-full rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Something Broke</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">We hit an unexpected issue.</h1>
            <p className="mt-3 text-sm text-gray-600">
              Your data is still safe. Try reloading this view.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-xl bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
