import { prisma } from '@/lib/prisma';
import { computeDuckMood } from '@/lib/duckMoodService';
import { killPlantsIfOverLimit, spawnPlantIfEarned } from '@/lib/gardenService';
import type {
  DistractionLimitMode,
  SiteCategory,
  SiteSubcategory,
} from '@/app/generated/prisma/enums';

type ActivityInput = {
  domain: string;
  pageTitle: string;
  category: SiteCategory;
  subcategory: SiteSubcategory;
  isProductive: boolean;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
};

function toUtcDateStart(d: Date) {
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  ));
}

function parseActivityInput(raw: ActivityInput) {
  const startedAt = new Date(raw.startedAt);
  const endedAt = new Date(raw.endedAt);

  if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(endedAt.getTime())) {
    throw new Error('Invalid startedAt/endedAt');
  }

  const durationSeconds = Math.max(0, Math.floor(Number(raw.durationSeconds) || 0));
  if (durationSeconds <= 0) {
    throw new Error('durationSeconds must be > 0');
  }

  return {
    ...raw,
    domain: String(raw.domain || '').trim().toLowerCase(),
    pageTitle: String(raw.pageTitle || '').trim().slice(0, 500),
    durationSeconds,
    startedAt,
    endedAt,
  };
}

export async function recordActivity(userId: string, rawInput: ActivityInput) {
  const input = parseActivityInput(rawInput);
  const date = toUtcDateStart(input.startedAt);

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) throw new Error('Settings missing');

  await prisma.activityLog.create({
    data: {
      userId,
      domain: input.domain,
      pageTitle: input.pageTitle,
      category: input.category,
      subcategory: input.subcategory,
      isProductive: input.isProductive,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds: input.durationSeconds,
      date,
    },
  });

  const durationMinutes = Math.round(input.durationSeconds / 60);

  const summary = await prisma.dailySummary.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      distractionLimitMinutes: settings.distractionLimitMinutes,
      totalFocusMinutes: input.category === 'PRODUCTIVE' ? durationMinutes : 0,
      totalDistractionMinutes: input.category === 'DISTRACTION' ? durationMinutes : 0,
      totalNeutralMinutes: input.category === 'NEUTRAL' ? durationMinutes : 0,
    },
    update: {
      distractionLimitMinutes: settings.distractionLimitMinutes,
      totalFocusMinutes: {
        increment: input.category === 'PRODUCTIVE' ? durationMinutes : 0,
      },
      totalDistractionMinutes: {
        increment: input.category === 'DISTRACTION' ? durationMinutes : 0,
      },
      totalNeutralMinutes: {
        increment: input.category === 'NEUTRAL' ? durationMinutes : 0,
      },
    },
  });

  const limitMode = settings.distractionLimitMode as DistractionLimitMode;
  const limitReached = limitMode === 'TIME_BASED'
    ? summary.totalDistractionMinutes >= settings.distractionLimitMinutes
    : summary.totalFocusMinutes < settings.dailyFocusGoalMinutes && input.category === 'DISTRACTION';

  const productiveDayComplete = summary.totalFocusMinutes >= settings.dailyFocusGoalMinutes;

  const focusRatio = settings.dailyFocusGoalMinutes > 0
    ? Math.min(summary.totalFocusMinutes / settings.dailyFocusGoalMinutes, 1)
    : 1;

  const distractionPenalty = settings.distractionLimitMinutes > 0
    ? Math.min(summary.totalDistractionMinutes / settings.distractionLimitMinutes, 1)
    : 0;

  const productivityScore = Math.round(focusRatio * 100 * (1 - distractionPenalty * 0.3));

  await prisma.dailySummary.update({
    where: { userId_date: { userId, date } },
    data: {
      limitReached,
      productiveDayComplete,
      productivityScore,
    },
  });

  let gardenEvent: 'plant_added' | 'plant_removed' | null = null;

  if (input.category === 'PRODUCTIVE') {
    const added = await spawnPlantIfEarned(userId, summary.totalFocusMinutes, date);
    if (added) gardenEvent = 'plant_added';
  } else if (input.category === 'DISTRACTION' && limitReached) {
    const killed = await killPlantsIfOverLimit(
      userId,
      summary.totalDistractionMinutes,
      settings.distractionLimitMinutes,
    );
    if (killed) gardenEvent = 'plant_removed';
  }

  const duckMood = await computeDuckMood(userId, {
    isCurrentlyProductive: input.category === 'PRODUCTIVE',
    distractionUsedMinutes: summary.totalDistractionMinutes,
    distractionLimitMinutes: settings.distractionLimitMinutes,
    productiveDayComplete,
    currentSiteCategory: input.category,
  });

  return {
    gardenEvent,
    duckMood,
    distractionUsedPercent: Math.min(
      (summary.totalDistractionMinutes / Math.max(settings.distractionLimitMinutes, 1)) * 100,
      100,
    ),
    limitReached,
    productiveDayComplete,
    totalFocusMinutes: summary.totalFocusMinutes,
    totalDistractionMinutes: summary.totalDistractionMinutes,
  };
}
