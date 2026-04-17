import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsResponse } from '@/lib/cors';
import bcrypt from 'bcryptjs';
import { acceptPendingInviteForUser } from '@/lib/orgInviteService';

type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

function getSecret() {
  const secret = process.env.EXTENSION_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function issueToken(userId: string, email: string, secret: Uint8Array) {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(secret);
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const secret = getSecret();
  if (!secret) return corsResponse({ error: 'Missing EXTENSION_JWT_SECRET' }, 500);

  let body: { googleAccessToken?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: 'Invalid request body' }, 400);
  }

  // ── Email/password path ──────────────────────────────────────────────────────
  if (body.email && body.password) {
    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.password) return corsResponse({ error: 'Invalid email or password.' }, 401);
    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) return corsResponse({ error: 'Invalid email or password.' }, 401);

    await acceptPendingInviteForUser(user.id, user.email);

    const token = await issueToken(user.id, user.email, secret);
    return corsResponse({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.image, onboardingCompleted: user.onboardingCompleted },
    });
  }

  // ── Google OAuth path ────────────────────────────────────────────────────────
  const googleAccessToken = body?.googleAccessToken;
  if (!googleAccessToken) return corsResponse({ error: 'Missing token' }, 400);

  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
    cache: 'no-store',
  });

  if (!userinfoRes.ok) return corsResponse({ error: 'Invalid token' }, 401);
  const userinfo = (await userinfoRes.json()) as GoogleUserInfo;
  if (!userinfo.sub || !userinfo.email) return corsResponse({ error: 'Invalid Google user info response' }, 401);

  const existingByGoogle = await prisma.user.findUnique({ where: { googleId: userinfo.sub } });
  const existingByEmail = existingByGoogle
    ? null
    : await prisma.user.findUnique({ where: { email: userinfo.email } });

  const user = existingByGoogle
    ? await prisma.user.update({
        where: { id: existingByGoogle.id },
        data: { name: userinfo.name ?? existingByGoogle.name, image: userinfo.picture ?? existingByGoogle.image },
      })
    : existingByEmail
      ? await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId: userinfo.sub, name: userinfo.name ?? existingByEmail.name, image: userinfo.picture ?? existingByEmail.image },
        })
      : await prisma.user.create({
          data: { googleId: userinfo.sub, email: userinfo.email, name: userinfo.name || userinfo.email, image: userinfo.picture },
        });

  await acceptPendingInviteForUser(user.id, user.email);

  const token = await issueToken(user.id, user.email, secret);
  return corsResponse({
    token,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.image, onboardingCompleted: user.onboardingCompleted },
  });
}
