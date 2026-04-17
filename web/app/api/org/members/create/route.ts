import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CreateMemberBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'MEMBER';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateMemberBody;
  try {
    body = (await req.json()) as CreateMemberBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const name = body.name?.trim() || '';
  const email = body.email?.trim().toLowerCase() || '';
  const password = body.password || '';
  const role = body.role ?? 'MEMBER';

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid work email.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
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
              seatsUsed: true,
            },
          },
        },
      },
    },
  });

  if (!adminMembership) {
    return NextResponse.json({ error: 'Only org admins can create members.' }, { status: 403 });
  }

  const orgId = adminMembership.orgId;
  const seatsAllowed = adminMembership.org.subscription?.seatsAllowed ?? 20;
  const seatsUsed = adminMembership.org.subscription?.seatsUsed
    ?? (await prisma.orgMember.count({ where: { orgId } }));

  if (seatsUsed >= seatsAllowed) {
    return NextResponse.json(
      { error: 'No seats available. Upgrade your plan before adding more members.' },
      { status: 409 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    const existingOrgMembership = await prisma.orgMember.findFirst({
      where: { userId: existingUser.id },
      select: { orgId: true },
    });

    if (existingOrgMembership?.orgId === orgId) {
      return NextResponse.json({ error: 'This user is already in your organization.' }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'A user with this email already exists. Ask them to sign in and use invite flow.' },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    await tx.orgMember.create({
      data: {
        orgId,
        userId: user.id,
        role,
      },
    });

    if (adminMembership.org.subscription) {
      await tx.subscription.update({
        where: { orgId },
        data: { seatsUsed: { increment: 1 } },
      });
    }

    await tx.orgInvite.updateMany({
      where: {
        orgId,
        email,
        status: 'PENDING',
      },
      data: {
        status: 'ACCEPTED',
      },
    });

    return user;
  });

  return NextResponse.json({ ok: true, member: created }, { status: 201 });
}
