import { randomUUID } from 'crypto';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
  const raw = process.env.EXTENSION_JWT_SECRET;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard';
  if (value.startsWith('//')) return '/dashboard';
  return value;
}

function withCookieRedirect(origin: string, path: string, sessionToken: string, expires: Date) {
  const response = NextResponse.redirect(new URL(path, origin));
  const secure = origin.startsWith('https://');

  response.cookies.set('authjs.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires,
  });

  // Backward compatibility with middleware checks and older naming.
  response.cookies.set('next-auth.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires,
  });

  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const requestedPath = normalizeNextPath(url.searchParams.get('next'));
  const secret = getSecret();

  if (!token || !secret) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    if (!userId) {
      return NextResponse.redirect(new URL('/login', url.origin));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, onboardingCompleted: true },
    });
    if (!user) {
      return NextResponse.redirect(new URL('/login', url.origin));
    }

    const now = Date.now();
    const expires = new Date(now + SESSION_MAX_AGE_MS);
    const sessionToken = `${randomUUID()}${randomUUID()}`;

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    const finalPath = user.onboardingCompleted
      ? requestedPath === '/onboarding'
        ? '/dashboard'
        : requestedPath
      : requestedPath === '/dashboard'
        ? '/onboarding'
        : requestedPath;

    return withCookieRedirect(url.origin, finalPath, sessionToken, expires);
  } catch {
    return NextResponse.redirect(new URL('/login', url.origin));
  }
}
