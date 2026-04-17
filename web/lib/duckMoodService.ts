import type { DuckMood, SiteCategory } from '@/app/generated/prisma/enums';

type MoodInput = {
  isCurrentlyProductive: boolean;
  distractionUsedMinutes: number;
  distractionLimitMinutes: number;
  productiveDayComplete: boolean;
  currentSiteCategory: SiteCategory;
};

export async function computeDuckMood(_userId: string, input: MoodInput): Promise<DuckMood> {
  const pct = input.distractionLimitMinutes > 0
    ? input.distractionUsedMinutes / input.distractionLimitMinutes
    : 0;

  if (input.productiveDayComplete) return 'PROUD';
  if (input.isCurrentlyProductive) return 'HAPPY';
  if (pct >= 1.0) return 'CHAOS';
  if (pct >= 0.8) return 'ANGRY';
  if (pct >= 0.5) return 'WARNING';
  if (input.currentSiteCategory === 'NEUTRAL') return 'WATCHING';
  return 'IDLE';
}
