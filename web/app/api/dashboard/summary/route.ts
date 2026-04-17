import { NextResponse } from 'next/server';
import { SiteCategory } from '@/app/generated/prisma/enums';
import { auth } from '@/lib/auth';
import { computeDuckMood } from '@/lib/duckMoodService';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [summary, settings, garden, topSites] = await Promise.all([
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
