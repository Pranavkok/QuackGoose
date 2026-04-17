import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: false,
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_SEED_EMAIL = 'pranavkokoff@gmail.com';

function parseSeedEmail() {
  const cliArg = process.argv.find((arg) => arg.startsWith('--email='));
  const argValue = cliArg ? cliArg.split('=').slice(1).join('=') : '';
  const value = (process.env.SEED_EMAIL || argValue || DEFAULT_SEED_EMAIL).trim().toLowerCase();
  return value;
}

function nameFromEmail(email: string) {
  const username = email.split('@')[0] || 'QuackFocus User';
  return username.replace(/[._-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

async function getOrCreateUserByEmail(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name: nameFromEmail(email),
      onboardingCompleted: true,
    },
  });
}

// Today at midnight UTC
function dayUTC(offsetDays = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

function time(h: number, m: number, offsetDays = 0): Date {
  const d = dayUTC(offsetDays);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

async function main() {
  const targetEmail = parseSeedEmail();
  const targetUser = await getOrCreateUserByEmail(targetEmail);
  const userId = targetUser.id;

  console.log(`Seeding for user: ${userId} (${targetEmail})`);

  // 1. Mark onboarding complete + create profile + settings
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });

  await prisma.onboardingProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      productivityType: 'DEVELOPER',
      distractionTypes: ['social_media', 'video'],
      strictnessLevel: 4,
      dailyFocusGoalMinutes: 240,
      workStartTime: '09:00',
      workEndTime: '18:00',
      distractionLimitMode: 'TIME_BASED',
      distractionLimitMinutes: 60,
      alwaysBlockedDomains: ['instagram.com', 'tiktok.com'],
      alwaysProductiveDomains: ['github.com', 'vercel.com'],
      enforcementLevel: 'BLUR',
    },
  });

  await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      distractionLimitMode: 'TIME_BASED',
      distractionLimitMinutes: 60,
      dailyFocusGoalMinutes: 240,
      enforcementLevel: 'BLUR',
      workStartTime: '09:00',
      workEndTime: '18:00',
      duckEnabled: true,
      duckMessagesEnabled: true,
      weeklyEmailEnabled: true,
    },
  });

  // 2. Today's activity logs (5-hour session, 10am–3pm)
  const todayLogs: Array<{
    domain: string;
    title: string;
    cat: 'PRODUCTIVE' | 'DISTRACTION' | 'NEUTRAL';
    sub:
      | 'CODING'
      | 'DOCUMENTATION'
      | 'RESEARCH'
      | 'VIDEO_ENTERTAINMENT'
      | 'SOCIAL_MEDIA'
      | 'PRODUCTIVITY_TOOL';
    start: Date;
    end: Date;
    dur: number;
  }> = [
    // --- Productive stretch 10:00–11:30 (90 min) ---
    { domain: 'github.com',        title: 'QuackFocus / QuackGoose — Pull requests',       cat: 'PRODUCTIVE', sub: 'CODING',         start: time(10,0),  end: time(10,28), dur: 28*60 },
    { domain: 'github.com',        title: 'QuackFocus / web — Commits',                    cat: 'PRODUCTIVE', sub: 'CODING',         start: time(10,28), end: time(10,55), dur: 27*60 },
    { domain: 'nextjs.org',        title: 'Next.js App Router Docs',                       cat: 'PRODUCTIVE', sub: 'DOCUMENTATION',  start: time(10,55), end: time(11,18), dur: 23*60 },
    { domain: 'prisma.io',         title: 'Prisma Client API Reference',                   cat: 'PRODUCTIVE', sub: 'DOCUMENTATION',  start: time(11,18), end: time(11,30), dur: 12*60 },

    // --- Distraction break 11:30–12:00 (30 min) ---
    { domain: 'youtube.com',       title: 'YouTube — Lo-fi coding beats',                  cat: 'DISTRACTION', sub: 'VIDEO_ENTERTAINMENT', start: time(11,30), end: time(11,52), dur: 22*60 },
    { domain: 'x.com',             title: 'X / Twitter',                                   cat: 'DISTRACTION', sub: 'SOCIAL_MEDIA',  start: time(11,52), end: time(12,0),  dur: 8*60  },

    // --- Productive stretch 12:00–13:30 (90 min) ---
    { domain: 'stackoverflow.com', title: 'Next.js 16 Turbopack hydration mismatch fix',   cat: 'PRODUCTIVE', sub: 'RESEARCH',       start: time(12,0),  end: time(12,22), dur: 22*60 },
    { domain: 'github.com',        title: 'auth.js / next-auth — Issues',                  cat: 'PRODUCTIVE', sub: 'CODING',         start: time(12,22), end: time(12,50), dur: 28*60 },
    { domain: 'vercel.com',        title: 'Vercel Dashboard — QuackGoose deployment',      cat: 'PRODUCTIVE', sub: 'PRODUCTIVITY_TOOL', start: time(12,50), end: time(13,10), dur: 20*60 },
    { domain: 'docs.anthropic.com',title: 'Claude API — Tool use reference',               cat: 'PRODUCTIVE', sub: 'DOCUMENTATION',  start: time(13,10), end: time(13,30), dur: 20*60 },

    // --- Distraction 13:30–14:00 (30 min) ---
    { domain: 'reddit.com',        title: 'r/webdev — Show HN: built a focus tracker',     cat: 'DISTRACTION', sub: 'SOCIAL_MEDIA',  start: time(13,30), end: time(13,52), dur: 22*60 },
    { domain: 'youtube.com',       title: 'YouTube — Fireship: Turbopack in 100 seconds',  cat: 'DISTRACTION', sub: 'VIDEO_ENTERTAINMENT', start: time(13,52), end: time(14,0), dur: 8*60 },

    // --- Final productive push 14:00–15:00 (60 min) ---
    { domain: 'github.com',        title: 'QuackFocus — Seed script & demo prep',          cat: 'PRODUCTIVE', sub: 'CODING',         start: time(14,0),  end: time(14,35), dur: 35*60 },
    { domain: 'tailwindcss.com',   title: 'Tailwind CSS — Utility class reference',        cat: 'PRODUCTIVE', sub: 'DOCUMENTATION',  start: time(14,35), end: time(14,50), dur: 15*60 },
    { domain: 'stackoverflow.com', title: 'Prisma upsert with relations — Stack Overflow', cat: 'PRODUCTIVE', sub: 'RESEARCH',       start: time(14,50), end: time(15,0),  dur: 10*60 },
  ];

  await prisma.activityLog.deleteMany({ where: { userId, date: dayUTC(0) } });
  await prisma.activityLog.createMany({
    data: todayLogs.map(l => ({
      userId,
      domain:          l.domain,
      pageTitle:       l.title,
      category:        l.cat,
      subcategory:     l.sub,
      isProductive:    l.cat === 'PRODUCTIVE',
      startedAt:       l.start,
      endedAt:         l.end,
      durationSeconds: l.dur,
      date:            dayUTC(0),
    })),
  });
  console.log('✓ Today activity logs');

  // 3. DailySummary for today
  // productive: 90+90+60 = 240 min, distraction: 30+30 = 60 min
  await prisma.dailySummary.upsert({
    where: { userId_date: { userId, date: dayUTC(0) } },
    update: {
      totalFocusMinutes:       240,
      totalDistractionMinutes: 60,
      totalNeutralMinutes:     0,
      distractionLimitMinutes: 60,
      limitReached:            true,
      productiveDayComplete:   true,
      productivityScore:       82,
      plantsGrown:             3,
      plantsLost:              0,
      focusStreak:             8,
    },
    create: {
      userId,
      date:                    dayUTC(0),
      totalFocusMinutes:       240,
      totalDistractionMinutes: 60,
      totalNeutralMinutes:     0,
      distractionLimitMinutes: 60,
      limitReached:            true,
      productiveDayComplete:   true,
      productivityScore:       82,
      plantsGrown:             3,
      plantsLost:              0,
      focusStreak:             8,
    },
  });
  console.log('✓ Today summary');

  // 4. Past 7 days of summaries (to show a streak)
  const pastDays = [
    { offset: -1, focus: 268, dist: 45, score: 91, plants: 4, streak: 7 },
    { offset: -2, focus: 195, dist: 72, score: 73, plants: 2, streak: 6 },
    { offset: -3, focus: 310, dist: 38, score: 95, plants: 5, streak: 5 },
    { offset: -4, focus: 244, dist: 55, score: 85, plants: 3, streak: 4 },
    { offset: -5, focus: 180, dist: 80, score: 69, plants: 2, streak: 3 },
    { offset: -6, focus: 290, dist: 42, score: 89, plants: 4, streak: 2 },
    { offset: -7, focus: 255, dist: 60, score: 80, plants: 3, streak: 1 },
  ];

  for (const d of pastDays) {
    await prisma.dailySummary.upsert({
      where: { userId_date: { userId, date: dayUTC(d.offset) } },
      update: {},
      create: {
        userId,
        date:                    dayUTC(d.offset),
        totalFocusMinutes:       d.focus,
        totalDistractionMinutes: d.dist,
        totalNeutralMinutes:     10,
        distractionLimitMinutes: 60,
        limitReached:            d.dist >= 60,
        productiveDayComplete:   d.focus >= 240,
        productivityScore:       d.score,
        plantsGrown:             d.plants,
        plantsLost:              0,
        focusStreak:             d.streak,
      },
    });
  }
  console.log('✓ Past 7 day summaries');

  // 5. Garden + plants
  const garden = await prisma.garden.upsert({
    where: { userId },
    update: { totalPlants: 26, alivePlants: 26 },
    create: { userId, totalPlants: 26, alivePlants: 26 },
  });

  await prisma.gardenPlant.deleteMany({ where: { gardenId: garden.id } });

  const plantTypes = ['SMALL_FLOWER', 'MEDIUM_FLOWER', 'SMALL_TREE', 'LARGE_TREE', 'GOLDEN_PLANT'] as const;

  // Pre-generate 80 unique positions shuffled deterministically
  const allPositions: [number, number][] = [];
  for (let x = 0; x < 10; x++) for (let y = 0; y < 8; y++) allPositions.push([x, y]);
  // Fisher-Yates with seed
  for (let i = allPositions.length - 1; i > 0; i--) {
    const j = (i * 1664525 + 1013904223) % (i + 1);
    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
  }

  const plants: { plantType: typeof plantTypes[number]; positionX: number; positionY: number; sourceDate: Date }[] = [];
  const perDayCounts = [4, 2, 5, 3, 2, 4, 3, 3]; // days -7 to 0
  let posIdx = 0;
  for (let d = 0; d < 8; d++) {
    const dayOff = d - 7;
    for (let i = 0; i < perDayCounts[d]; i++) {
      const [x, y] = allPositions[posIdx++];
      plants.push({ plantType: plantTypes[posIdx % 5], positionX: x, positionY: y, sourceDate: dayUTC(dayOff) });
    }
  }

  await prisma.gardenPlant.createMany({
    data: plants.map(p => ({ gardenId: garden.id, ...p, status: 'ALIVE' })),
  });
  console.log('✓ Garden with', plants.length, 'plants');

  console.log('\nDone! Dashboard ready for pitch 🦆');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
