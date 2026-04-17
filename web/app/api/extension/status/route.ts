import { SiteCategory } from '@/app/generated/prisma/enums';
import { corsHeaders, corsResponse } from '@/lib/cors';
import { computeDuckMood } from '@/lib/duckMoodService';
import { verifyExtensionToken } from '@/lib/extensionAuth';
import { prisma } from '@/lib/prisma';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) return corsResponse({ error: 'No settings' }, 404);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const summary = await prisma.dailySummary.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const distractionUsedMinutes = summary?.totalDistractionMinutes || 0;
  const totalFocusMinutes = summary?.totalFocusMinutes || 0;

  const limitReached = settings.distractionLimitMode === 'TIME_BASED'
    ? distractionUsedMinutes >= settings.distractionLimitMinutes
    : totalFocusMinutes < settings.dailyFocusGoalMinutes;

  const productiveDayComplete = totalFocusMinutes >= settings.dailyFocusGoalMinutes;

  const duckMood = await computeDuckMood(userId, {
    isCurrentlyProductive: false,
    distractionUsedMinutes,
    distractionLimitMinutes: settings.distractionLimitMinutes,
    productiveDayComplete,
    currentSiteCategory: SiteCategory.NEUTRAL,
  });

  return corsResponse({
    userId,
    duckMood,
    distractionLimitMinutes: settings.distractionLimitMinutes,
    distractionUsedMinutes,
    totalFocusMinutes,
    dailyFocusGoalMinutes: settings.dailyFocusGoalMinutes,
    limitReached,
    productiveDayComplete,
    enforceMode: settings.enforcementLevel,
    activeTimeWindow: {
      start: settings.workStartTime,
      end: settings.workEndTime,
    },
  });
}
