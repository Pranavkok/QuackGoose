import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function startOfSevenDayWindowUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 6);
  return start;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const garden = await prisma.garden.findUnique({
    where: { userId: session.user.id },
    include: {
      plants: {
        orderBy: { spawnedAt: 'asc' },
      },
    },
  });

  if (!garden) {
    return NextResponse.json({
      totalPlants: 0,
      alivePlants: 0,
      plantsThisWeek: 0,
      plants: [],
    });
  }

  const weekStart = startOfSevenDayWindowUtc();
  const plantsThisWeek = garden.plants.filter((plant) => plant.spawnedAt >= weekStart).length;

  return NextResponse.json({
    id: garden.id,
    userId: garden.userId,
    totalPlants: garden.totalPlants,
    alivePlants: garden.alivePlants,
    updatedAt: garden.updatedAt,
    plantsThisWeek,
    plants: garden.plants,
  });
}
