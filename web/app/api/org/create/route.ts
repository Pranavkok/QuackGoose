import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    slug?: string;
    industry?: string;
    teamSize?: string;
  };

  const { name, slug, industry, teamSize } = body;

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
  if (cleanSlug.length < 2) {
    return NextResponse.json({ error: 'Slug must be at least 2 characters' }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({ where: { slug: cleanSlug } });
  if (existing) {
    return NextResponse.json({ error: 'This slug is already taken. Try another.' }, { status: 409 });
  }

  const alreadyInOrg = await prisma.orgMember.findFirst({
    where: { userId: session.user.id },
  });
  if (alreadyInOrg) {
    return NextResponse.json({ error: 'You already belong to an organization.' }, { status: 400 });
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug: cleanSlug,
      industry: industry ?? null,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        },
      },
      policy: {
        create: {
          blockedDomains: [],
          allowedDomains: [],
          enforcementLevel: 'BLUR',
          workStartTime: '09:00',
          workEndTime: '18:00',
          dailyFocusGoalMinutes: 240,
          distractionLimitMinutes: 60,
        },
      },
      subscription: {
        create: {
          plan: 'STARTER',
          status: 'TRIAL',
          seatsAllowed: 20,
          seatsUsed: 1,
          trialEndsAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
      },
    },
  });

  return NextResponse.json({ orgId: org.id, slug: org.slug }, { status: 201 });
}
