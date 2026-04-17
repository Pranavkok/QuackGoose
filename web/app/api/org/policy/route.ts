import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EnforcementLevel } from '@/app/generated/prisma/enums';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeDomainRule(value: string) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0] || '';
  const withoutPort = withoutPath.split(':')[0] || '';
  return withoutPort.replace(/^www\./, '').replace(/^\*\./, '');
}

function toDomainArray(input: unknown) {
  const values = Array.isArray(input) ? input : [];
  return Array.from(
    new Set(
      values
        .map((value) => normalizeDomainRule(String(value)))
        .filter(Boolean),
    ),
  );
}

async function getAdminMembership(userId: string) {
  return prisma.orgMember.findFirst({
    where: {
      userId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    select: {
      orgId: true,
    },
  });
}

type PolicyBody = {
  blockedDomains?: unknown;
  allowedDomains?: unknown;
  enforcementLevel?: string;
  workStartTime?: string;
  workEndTime?: string;
  dailyFocusGoalMinutes?: unknown;
  distractionLimitMinutes?: unknown;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await getAdminMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const policy = await prisma.orgPolicy.findUnique({
    where: { orgId: membership.orgId },
  });
  if (!policy) {
    return NextResponse.json({ error: 'Organization policy not found' }, { status: 404 });
  }

  return NextResponse.json(policy);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await getAdminMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: PolicyBody;

  try {
    body = (await req.json()) as PolicyBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const blockedDomains = toDomainArray(body.blockedDomains);
  const allowedDomains = toDomainArray(body.allowedDomains);

  const enforcementLevel = body.enforcementLevel as EnforcementLevel | undefined;
  if (enforcementLevel && !Object.values(EnforcementLevel).includes(enforcementLevel)) {
    return NextResponse.json({ error: 'Invalid enforcement level.' }, { status: 400 });
  }

  const workStartTime = body.workStartTime ?? '09:00';
  const workEndTime = body.workEndTime ?? '18:00';
  if (!TIME_PATTERN.test(workStartTime) || !TIME_PATTERN.test(workEndTime)) {
    return NextResponse.json({ error: 'Work hours must be in HH:MM format.' }, { status: 400 });
  }

  const dailyFocusGoalMinutes = Number(body.dailyFocusGoalMinutes);
  const distractionLimitMinutes = Number(body.distractionLimitMinutes);
  if (!Number.isFinite(dailyFocusGoalMinutes) || dailyFocusGoalMinutes < 30 || dailyFocusGoalMinutes > 720) {
    return NextResponse.json({ error: 'Daily focus goal must be between 30 and 720 minutes.' }, { status: 400 });
  }
  if (!Number.isFinite(distractionLimitMinutes) || distractionLimitMinutes < 5 || distractionLimitMinutes > 480) {
    return NextResponse.json({ error: 'Distraction limit must be between 5 and 480 minutes.' }, { status: 400 });
  }

  const policy = await prisma.orgPolicy.update({
    where: { orgId: membership.orgId },
    data: {
      blockedDomains,
      allowedDomains,
      enforcementLevel: enforcementLevel ?? 'BLUR',
      workStartTime,
      workEndTime,
      dailyFocusGoalMinutes: Math.round(dailyFocusGoalMinutes),
      distractionLimitMinutes: Math.round(distractionLimitMinutes),
    },
  });

  return NextResponse.json(policy);
}
