import { prisma } from '@/lib/prisma';
import { PlantStatus } from '@/app/generated/prisma/enums';
import type { PlantType } from '@/app/generated/prisma/enums';

const PLANT_TIERS: Array<{ minutes: number; plant: PlantType }> = [
  { minutes: 15, plant: 'SMALL_FLOWER' },
  { minutes: 30, plant: 'MEDIUM_FLOWER' },
  { minutes: 60, plant: 'SMALL_TREE' },
  { minutes: 120, plant: 'LARGE_TREE' },
];

function randGrid() {
  return Math.floor(Math.random() * 10);
}

export async function spawnPlantIfEarned(userId: string, totalFocusToday: number, date: Date) {
  const eligible = PLANT_TIERS.filter(tier => totalFocusToday >= tier.minutes);
  if (eligible.length === 0) return false;

  const garden = await prisma.garden.findUnique({ where: { userId } });
  if (!garden) return false;

  for (const tier of eligible) {
    const existing = await prisma.gardenPlant.findFirst({
      where: {
        gardenId: garden.id,
        plantType: tier.plant,
        sourceDate: date,
      },
    });

    if (existing) continue;

    await prisma.gardenPlant.create({
      data: {
        gardenId: garden.id,
        plantType: tier.plant,
        positionX: randGrid(),
        positionY: randGrid(),
        sourceDate: date,
      },
    });

    await prisma.garden.update({
      where: { id: garden.id },
      data: {
        totalPlants: { increment: 1 },
        alivePlants: { increment: 1 },
      },
    });

    return true;
  }

  return false;
}

export async function killPlantsIfOverLimit(
  userId: string,
  distractionUsed: number,
  limit: number,
) {
  const over = distractionUsed - limit;
  if (over < 30) return false;

  const expectedDeaths = Math.floor(over / 30);

  const garden = await prisma.garden.findUnique({
    where: { userId },
    include: {
      plants: {
        where: { status: PlantStatus.ALIVE },
        orderBy: { spawnedAt: 'asc' },
      },
    },
  });

  if (!garden || garden.plants.length === 0) return false;

  const today = new Date();
  const todayStartUtc = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ));

  const alreadyKilledToday = await prisma.gardenPlant.count({
    where: {
      gardenId: garden.id,
      status: PlantStatus.DEAD,
      diedAt: { gte: todayStartUtc },
    },
  });

  const toKill = Math.min(expectedDeaths - alreadyKilledToday, garden.plants.length);
  if (toKill <= 0) return false;

  const victims = garden.plants.slice(0, toKill);
  await Promise.all(
    victims.map(plant =>
      prisma.gardenPlant.update({
        where: { id: plant.id },
        data: {
          status: PlantStatus.DEAD,
          diedAt: new Date(),
        },
      }),
    ),
  );

  await prisma.garden.update({
    where: { id: garden.id },
    data: {
      alivePlants: { decrement: toKill },
    },
  });

  return true;
}
