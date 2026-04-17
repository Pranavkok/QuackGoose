import { NextResponse } from 'next/server';
import { SiteCategory } from '@/app/generated/prisma/enums';
import { auth } from '@/lib/auth';
import { computeDuckMood } from '@/lib/duckMoodService';
import { prisma } from '@/lib/prisma';

const PRODUCTIVE_WINDOW_LOOKBACK_DAYS = 30;

type ProductiveHourBucket = {
  productiveSeconds: number;
  distractionSeconds: number;
  neutralSeconds: number;
  totalSeconds: number;
  sessionCount: number;
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const timezone = normalizeTimezone(new URL(req.url).searchParams.get('tz'));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [summary, settings, garden, topSites, peakProductiveWindow] = await Promise.all([
    prisma.dailySummary.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.garden.findUnique({ where: { userId } }),
    prisma.activityLog.groupBy({
      by: ['domain', 'category'],
      where: { userId, date: today },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 10,
    }),
    calculatePeakProductiveWindow(userId, timezone),
  ]);

  const streak = await calculateStreak(userId);

  const duckMood = settings
    ? await computeDuckMood(userId, {
        isCurrentlyProductive: false,
        distractionUsedMinutes: summary?.totalDistractionMinutes || 0,
        distractionLimitMinutes: settings.distractionLimitMinutes,
        productiveDayComplete: Boolean(summary?.productiveDayComplete),
        currentSiteCategory: SiteCategory.NEUTRAL,
      })
    : 'IDLE';

  return NextResponse.json({
    user: {
      id: userId,
      name: session.user.name || null,
      image: session.user.image || null,
      email: session.user.email || null,
    },
    summary,
    settings,
    garden,
    topSites: topSites.map(site => ({
      domain: site.domain,
      category: site.category,
      minutes: Math.round((site._sum.durationSeconds || 0) / 60),
    })),
    peakProductiveWindow,
    streak,
    duckMood,
  });
}

async function calculateStreak(userId: string): Promise<number> {
  const summaries = await prisma.dailySummary.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 60,
  });

  let streak = 0;
  for (const day of summaries) {
    if (day.productiveDayComplete) streak += 1;
    else break;
  }

  return streak;
}

async function calculatePeakProductiveWindow(userId: string, timezone: string) {
  const from = new Date(Date.now() - PRODUCTIVE_WINDOW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      startedAt: { gte: from },
    },
    select: {
      startedAt: true,
      durationSeconds: true,
      category: true,
    },
  });

  if (!logs.length) {
    return null;
  }

  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });

  const hourlyBuckets: ProductiveHourBucket[] = Array.from({ length: 24 }, () => ({
    productiveSeconds: 0,
    distractionSeconds: 0,
    neutralSeconds: 0,
    totalSeconds: 0,
    sessionCount: 0,
  }));
  const activeDayKeys = new Set<string>();

  for (const log of logs) {
    const durationSeconds = Math.max(0, log.durationSeconds || 0);
    if (durationSeconds <= 0) continue;

    const hour = readHourFromFormatter(hourFormatter, log.startedAt);
    const dayKey = readDayKeyFromFormatter(dayFormatter, log.startedAt);
    activeDayKeys.add(dayKey);

    const bucket = hourlyBuckets[hour];
    bucket.totalSeconds += durationSeconds;
    bucket.sessionCount += 1;

    if (log.category === SiteCategory.PRODUCTIVE) {
      bucket.productiveSeconds += durationSeconds;
    } else if (log.category === SiteCategory.DISTRACTION) {
      bucket.distractionSeconds += durationSeconds;
    } else {
      bucket.neutralSeconds += durationSeconds;
    }
  }

  let bestHour = -1;
  let bestScore = -1;
  let bestProductiveRatio = -1;
  let bestTotalSeconds = -1;

  for (let hour = 0; hour < hourlyBuckets.length; hour += 1) {
    const bucket = hourlyBuckets[hour];
    if (bucket.productiveSeconds <= 0) continue;

    const ratio = bucket.totalSeconds > 0 ? bucket.productiveSeconds / bucket.totalSeconds : 0;
    const score = bucket.productiveSeconds;

    const shouldReplace = score > bestScore
      || (score === bestScore && ratio > bestProductiveRatio)
      || (score === bestScore && ratio === bestProductiveRatio && bucket.totalSeconds > bestTotalSeconds)
      || (score === bestScore && ratio === bestProductiveRatio && bucket.totalSeconds === bestTotalSeconds && hour < bestHour);

    if (shouldReplace) {
      bestHour = hour;
      bestScore = score;
      bestProductiveRatio = ratio;
      bestTotalSeconds = bucket.totalSeconds;
    }
  }

  if (bestHour < 0) {
    return null;
  }

  const bestBucket = hourlyBuckets[bestHour];
  const endHour = (bestHour + 1) % 24;

  return {
    label: `${formatHourLabel(bestHour)} - ${formatHourLabel(endHour)}`,
    startHour: bestHour,
    endHour,
    productiveMinutes: Math.round(bestBucket.productiveSeconds / 60),
    trackedMinutes: Math.round(bestBucket.totalSeconds / 60),
    productivityPercent: Math.round(bestProductiveRatio * 100),
    sampleSessions: bestBucket.sessionCount,
    activeDays: activeDayKeys.size,
    lookbackDays: PRODUCTIVE_WINDOW_LOOKBACK_DAYS,
    timezone,
  };
}

function normalizeTimezone(raw: string | null) {
  if (!raw) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw });
    return raw;
  } catch {
    return 'UTC';
  }
}

function readHourFromFormatter(formatter: Intl.DateTimeFormat, date: Date) {
  const hourPart = formatter.formatToParts(date).find((part) => part.type === 'hour')?.value;
  const hour = Number.parseInt(hourPart ?? '0', 10);
  if (!Number.isFinite(hour)) return 0;
  return hour % 24;
}

function readDayKeyFromFormatter(formatter: Intl.DateTimeFormat, date: Date) {
  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  return `${year}-${month}-${day}`;
}

function formatHourLabel(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const isPm = normalized >= 12;
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}:00 ${isPm ? 'PM' : 'AM'}`;
}
