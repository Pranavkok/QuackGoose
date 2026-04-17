import { SiteCategory } from '@/app/generated/prisma/enums';
import { corsHeaders, corsResponse } from '@/lib/cors';
import { computeDuckMood } from '@/lib/duckMoodService';
import { verifyExtensionToken } from '@/lib/extensionAuth';
import { acceptPendingInviteForUser } from '@/lib/orgInviteService';
import { prisma } from '@/lib/prisma';

async function getUserStatusContext(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      settings: true,
      onboardingProfile: {
        select: {
          alwaysBlockedDomains: true,
        },
      },
      orgMemberships: {
        take: 1,
        select: {
          org: {
            select: {
              policy: {
                select: {
                  blockedDomains: true,
                  dailyFocusGoalMinutes: true,
                  distractionLimitMinutes: true,
                  enforcementLevel: true,
                  workStartTime: true,
                  workEndTime: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);

  let user = await getUserStatusContext(userId);

  if (user?.email && user.orgMemberships.length === 0) {
    await acceptPendingInviteForUser(userId, user.email);
    user = await getUserStatusContext(userId);
  }

  if (!user?.settings) return corsResponse({ error: 'No settings' }, 404);
  const settings = user.settings;

  const orgPolicy = user.orgMemberships?.[0]?.org?.policy;
  const blockedDomains = Array.from(
    new Set([
      ...(user.onboardingProfile?.alwaysBlockedDomains ?? []),
      ...(orgPolicy?.blockedDomains ?? []),
    ]),
  );

  const dailyFocusGoalMinutes = orgPolicy?.dailyFocusGoalMinutes ?? settings.dailyFocusGoalMinutes;
  const distractionLimitMinutes = orgPolicy?.distractionLimitMinutes ?? settings.distractionLimitMinutes;
  const enforcementLevel = orgPolicy?.enforcementLevel ?? settings.enforcementLevel;
  const workStartTime = orgPolicy?.workStartTime ?? settings.workStartTime;
  const workEndTime = orgPolicy?.workEndTime ?? settings.workEndTime;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const summary = await prisma.dailySummary.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const distractionUsedMinutes = summary?.totalDistractionMinutes || 0;
  const totalFocusMinutes = summary?.totalFocusMinutes || 0;

  const limitReached = settings.distractionLimitMode === 'TIME_BASED'
    ? distractionUsedMinutes >= distractionLimitMinutes
    : totalFocusMinutes < dailyFocusGoalMinutes;

  const productiveDayComplete = totalFocusMinutes >= dailyFocusGoalMinutes;

  const duckMood = await computeDuckMood(userId, {
    isCurrentlyProductive: false,
    distractionUsedMinutes,
    distractionLimitMinutes,
    productiveDayComplete,
    currentSiteCategory: SiteCategory.NEUTRAL,
  });

  return corsResponse({
    userId,
    duckMood,
    blockedDomains,
    distractionLimitMinutes,
    distractionUsedMinutes,
    totalFocusMinutes,
    dailyFocusGoalMinutes,
    limitReached,
    productiveDayComplete,
    enforceMode: enforcementLevel,
    activeTimeWindow: {
      start: workStartTime,
      end: workEndTime,
    },
  });
}
