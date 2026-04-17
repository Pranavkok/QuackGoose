import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_EXPIRY_DAYS = 7;

type InviteBody = {
  email?: string;
  role?: 'ADMIN' | 'MEMBER';
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const normalizedEmail = body.email?.trim().toLowerCase();
  const role = body.role ?? 'MEMBER';

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Please enter a valid work email.' }, { status: 400 });
  }

  if (role !== 'ADMIN' && role !== 'MEMBER') {
    return NextResponse.json({ error: 'Role must be ADMIN or MEMBER.' }, { status: 400 });
  }

  const adminMembership = await prisma.orgMember.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    select: {
      orgId: true,
      org: {
        select: {
          subscription: {
            select: {
              seatsAllowed: true,
            },
          },
        },
      },
    },
  });

  if (!adminMembership) {
    return NextResponse.json({ error: 'Only org admins can invite members.' }, { status: 403 });
  }

  const orgId = adminMembership.orgId;
  const seatsAllowed = adminMembership.org.subscription?.seatsAllowed ?? 20;
  const now = new Date();

  await prisma.orgInvite.updateMany({
    where: {
      orgId,
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  const [existingMember, existingInvite, memberCount, pendingInviteCount] = await Promise.all([
    prisma.orgMember.findFirst({
      where: {
        orgId,
        user: { email: normalizedEmail },
      },
      select: { id: true },
    }),
    prisma.orgInvite.findFirst({
      where: {
        orgId,
        email: normalizedEmail,
        status: 'PENDING',
      },
      select: { id: true },
    }),
    prisma.orgMember.count({ where: { orgId } }),
    prisma.orgInvite.count({ where: { orgId, status: 'PENDING' } }),
  ]);

  if (existingMember) {
    return NextResponse.json({ error: 'This user is already in your organization.' }, { status: 409 });
  }

  if (existingInvite) {
    return NextResponse.json({ error: 'An active invite already exists for this email.' }, { status: 409 });
  }

  if (memberCount + pendingInviteCount >= seatsAllowed) {
    return NextResponse.json(
      { error: 'No seats available. Upgrade your plan before sending more invites.' },
      { status: 409 },
    );
  }

  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.orgInvite.create({
    data: {
      orgId,
      email: normalizedEmail,
      role,
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ ok: true, invite }, { status: 201 });
}
