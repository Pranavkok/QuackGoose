import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsResponse } from '@/lib/cors';

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

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const secret = getSecret();
  if (!secret) {
    return corsResponse({ error: 'Missing EXTENSION_JWT_SECRET' }, 500);
  }

  const { googleAccessToken } = (await req.json()) as { googleAccessToken?: string };
  if (!googleAccessToken) return corsResponse({ error: 'Missing token' }, 400);

  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
    cache: 'no-store',
  });

  if (!userinfoRes.ok) return corsResponse({ error: 'Invalid token' }, 401);
  const userinfo = (await userinfoRes.json()) as GoogleUserInfo;

  if (!userinfo.sub || !userinfo.email) {
    return corsResponse({ error: 'Invalid Google user info response' }, 401);
  }

  const existingByGoogle = await prisma.user.findUnique({ where: { googleId: userinfo.sub } });
  const existingByEmail = existingByGoogle
    ? null
    : await prisma.user.findUnique({ where: { email: userinfo.email } });

  const user = existingByGoogle
    ? await prisma.user.update({
        where: { id: existingByGoogle.id },
        data: {
          name: userinfo.name ?? existingByGoogle.name,
          image: userinfo.picture ?? existingByGoogle.image,
        },
      })
    : existingByEmail
      ? await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: userinfo.sub,
            name: userinfo.name ?? existingByEmail.name,
            image: userinfo.picture ?? existingByEmail.image,
          },
        })
      : await prisma.user.create({
          data: {
            googleId: userinfo.sub,
            email: userinfo.email,
            name: userinfo.name || userinfo.email,
            image: userinfo.picture,
          },
        });

  const token = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(secret);

  return corsResponse({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.image,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
}
