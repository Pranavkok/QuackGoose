import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ProductivityType, DistractionLimitMode, EnforcementLevel } from '@/app/generated/prisma/client';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: session.user.id },
  });
  return Response.json(profile);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();

  const isGoalBased = body.distractionLimit === 'goal_based';
  const distractionLimitMode: DistractionLimitMode = isGoalBased ? 'GOAL_BASED' : 'TIME_BASED';
  const distractionLimitMinutes = isGoalBased ? 0 : parseInt(body.distractionLimit, 10);

  const parseDomains = (s: string) =>
    (s || '').split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);

  const dailyFocusGoalMinutes = Math.round(parseFloat(body.dailyFocusGoalHours || '4') * 60);

  await prisma.$transaction([
    prisma.onboardingProfile.upsert({
      where: { userId },
      create: {
        userId,
        productivityType: body.productivityType as ProductivityType,
        distractionTypes: body.distractionTypes || [],
        strictnessLevel: parseInt(body.strictnessLevel, 10) || 3,
        dailyFocusGoalMinutes,
        workStartTime: body.workStartTime || '09:00',
        workEndTime: body.workEndTime || '18:00',
        distractionLimitMode,
        distractionLimitMinutes,
        alwaysBlockedDomains: parseDomains(body.alwaysBlockedDomains),
        alwaysProductiveDomains: parseDomains(body.alwaysProductiveDomains),
        enforcementLevel: body.enforcementLevel as EnforcementLevel,
      },
      update: {
        productivityType: body.productivityType as ProductivityType,
        distractionTypes: body.distractionTypes || [],
        strictnessLevel: parseInt(body.strictnessLevel, 10) || 3,
        dailyFocusGoalMinutes,
        workStartTime: body.workStartTime || '09:00',
        workEndTime: body.workEndTime || '18:00',
        distractionLimitMode,
        distractionLimitMinutes,
        alwaysBlockedDomains: parseDomains(body.alwaysBlockedDomains),
        alwaysProductiveDomains: parseDomains(body.alwaysProductiveDomains),
        enforcementLevel: body.enforcementLevel as EnforcementLevel,
      },
    }),
    prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        distractionLimitMode,
        distractionLimitMinutes,
        dailyFocusGoalMinutes,
        enforcementLevel: body.enforcementLevel as EnforcementLevel,
        workStartTime: body.workStartTime || '09:00',
        workEndTime: body.workEndTime || '18:00',
      },
      update: {
        distractionLimitMode,
        distractionLimitMinutes,
        dailyFocusGoalMinutes,
        enforcementLevel: body.enforcementLevel as EnforcementLevel,
        workStartTime: body.workStartTime || '09:00',
        workEndTime: body.workEndTime || '18:00',
      },
    }),
    prisma.garden.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    }),
  ]);

  return Response.json({ success: true });
}
