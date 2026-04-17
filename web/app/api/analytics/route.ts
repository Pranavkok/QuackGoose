import { NextResponse } from 'next/server';
import { SiteCategory } from '@/app/generated/prisma/enums';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function toUtcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toUtcDayEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function parseDateParam(value: string | null, fallback: Date, isEnd: boolean) {
  if (!value) return isEnd ? toUtcDayEnd(fallback) : toUtcDayStart(fallback);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return isEnd ? toUtcDayEnd(fallback) : toUtcDayStart(fallback);
  }
  return isEnd ? toUtcDayEnd(parsed) : toUtcDayStart(parsed);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = parseDateParam(url.searchParams.get('from'), defaultFrom, false);
  const to = parseDateParam(url.searchParams.get('to'), defaultTo, true);

  if (from > to) {
    return NextResponse.json({ error: 'Invalid date range: from must be before to' }, { status: 400 });
  }

  const userId = session.user.id;

  const [summaries, topProductive, topDistraction, categoryBreakdown, topAll] = await Promise.all([
    prisma.dailySummary.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    }),
    prisma.activityLog.groupBy({
      by: ['domain'],
      where: {
        userId,
        category: SiteCategory.PRODUCTIVE,
        date: { gte: from, lte: to },
      },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 10,
    }),
    prisma.activityLog.groupBy({
      by: ['domain'],
      where: {
        userId,
        category: SiteCategory.DISTRACTION,
        date: { gte: from, lte: to },
      },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 10,
    }),
    prisma.activityLog.groupBy({
      by: ['subcategory'],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { durationSeconds: true },
    }),
    prisma.activityLog.groupBy({
      by: ['domain', 'category'],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { durationSeconds: true },
      orderBy: { _sum: { durationSeconds: 'desc' } },
      take: 60,
    }),
  ]);

  return NextResponse.json({
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    summaries: summaries.map((summary) => ({
      date: summary.date.toISOString(),
      totalFocusMinutes: summary.totalFocusMinutes,
      totalDistractionMinutes: summary.totalDistractionMinutes,
      totalNeutralMinutes: summary.totalNeutralMinutes,
      productivityScore: summary.productivityScore,
      limitReached: summary.limitReached,
      productiveDayComplete: summary.productiveDayComplete,
    })),
    topProductive: topProductive.map((item) => ({
      domain: item.domain,
      minutes: Math.round((item._sum.durationSeconds || 0) / 60),
    })),
    topDistraction: topDistraction.map((item) => ({
      domain: item.domain,
      minutes: Math.round((item._sum.durationSeconds || 0) / 60),
    })),
    categoryBreakdown: categoryBreakdown
      .map((item) => ({
        subcategory: item.subcategory,
        minutes: Math.round((item._sum.durationSeconds || 0) / 60),
      }))
      .sort((a, b) => b.minutes - a.minutes),
    topAll: topAll.map((item) => ({
      domain: item.domain,
      category: item.category,
      minutes: Math.round((item._sum.durationSeconds || 0) / 60),
    })),
  });
}
