'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const params = useSearchParams();
  const error = params.get('error');

  const messages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The sign-in link is no longer valid.',
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4 max-w-md p-8">
        <h1 className="text-2xl font-semibold">Sign-in error</h1>
        <p className="text-muted-foreground">
          {(error && messages[error]) ?? 'An unexpected error occurred during sign-in.'}
        </p>
        <Link href="/" className="inline-block underline text-sm">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
