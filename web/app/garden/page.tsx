'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

type PlantType = 'SMALL_FLOWER' | 'MEDIUM_FLOWER' | 'SMALL_TREE' | 'LARGE_TREE' | 'GOLDEN_PLANT';
type PlantStatus = 'ALIVE' | 'DEAD';

type GardenPlant = {
  id: string;
  plantType: PlantType;
  status: PlantStatus;
  positionX: number;
  positionY: number;
  spawnedAt: string;
  diedAt: string | null;
  sourceDate: string;
};

type GardenResponse = {
  id?: string;
  userId?: string;
  totalPlants: number;
  alivePlants: number;
  plantsThisWeek: number;
  updatedAt?: string;
  plants: GardenPlant[];
};

function hashOffset(seed: string, spread: number) {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) {
    total += seed.charCodeAt(i);
  }
  return (total % (spread * 2 + 1)) - spread;
}

function plantAsset(plant: GardenPlant) {
  if (plant.status === 'DEAD') return '/garden-assets/stump.svg';

  const assetMap: Record<PlantType, string> = {
    SMALL_FLOWER: '/garden-assets/flower-small.svg',
    MEDIUM_FLOWER: '/garden-assets/flower-medium.svg',
    SMALL_TREE: '/garden-assets/tree-small.svg',
    LARGE_TREE: '/garden-assets/tree-large.svg',
    GOLDEN_PLANT: '/garden-assets/plant-golden.svg',
  };

  return assetMap[plant.plantType];
}

function plantSize(plant: GardenPlant) {
  if (plant.status === 'DEAD') return { w: 48, h: 48 };

  const sizeMap: Record<PlantType, { w: number; h: number }> = {
    SMALL_FLOWER: { w: 40, h: 40 },
    MEDIUM_FLOWER: { w: 56, h: 56 },
    SMALL_TREE: { w: 80, h: 80 },
    LARGE_TREE: { w: 106, h: 106 },
    GOLDEN_PLANT: { w: 72, h: 72 },
  };

  return sizeMap[plant.plantType];
}

export default function GardenPage() {
  const [data, setData] = useState<GardenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGarden() {
    try {
      const res = await fetch('/api/garden', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);

      const json = (await res.json()) as GardenResponse;
      setData(json);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load garden';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadGarden();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const renderedPlants = useMemo(() => {
    const plants = data?.plants || [];

    return plants.map((plant) => {
      const clampedX = Math.max(0, Math.min(10, plant.positionX));
      const clampedY = Math.max(0, Math.min(10, plant.positionY));

      const groundX = 70 + (clampedX / 10) * 860;
      const groundY = 410 + (clampedY / 10) * 170;

      const xJitter = hashOffset(`${plant.id}:x`, 10);
      const yJitter = hashOffset(`${plant.id}:y`, 6);
      const { w, h } = plantSize(plant);

      return {
        ...plant,
        x: groundX + xJitter - w / 2,
        y: groundY + yJitter - h,
        w,
        h,
        asset: plantAsset(plant),
      };
    });
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-[560px] w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void loadGarden()}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Focus Garden</h1>
          <p className="text-sm text-gray-500">Plants grow when you focus. Distraction can kill them.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void loadGarden()}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-amber-700">Background refresh failed: {error}</p>}

      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <svg viewBox="0 0 1000 620" className="h-[560px] w-full" role="img" aria-label="2D productivity garden">
          <defs>
            <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5e3ff" />
              <stop offset="58%" stopColor="#e9f8ff" />
              <stop offset="100%" stopColor="#f7ffed" />
            </linearGradient>
            <linearGradient id="garden-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#4d7c0f" />
            </linearGradient>
            <linearGradient id="garden-hill-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="garden-hill-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1000" height="620" fill="url(#garden-sky)" />
          <circle cx="870" cy="96" r="44" fill="#fde047" opacity="0.95" className="qf-garden-sun" />

          <path d="M0 390 C120 290 250 320 370 390 C520 470 690 430 800 360 C890 310 950 318 1000 346 L1000 620 L0 620 Z" fill="url(#garden-hill-1)" />
          <path d="M0 440 C140 360 260 385 420 450 C580 515 760 475 900 420 C950 400 980 404 1000 414 L1000 620 L0 620 Z" fill="url(#garden-hill-2)" />
          <rect x="0" y="420" width="1000" height="200" fill="url(#garden-ground)" opacity="0.75" />

          {renderedPlants.map((plant) => (
            <image
              key={plant.id}
              href={plant.asset}
              x={plant.x}
              y={plant.y}
              width={plant.w}
              height={plant.h}
              preserveAspectRatio="xMidYMax meet"
              className="qf-garden-plant"
            />
          ))}

          {renderedPlants.length === 0 && (
            <text x="500" y="520" textAnchor="middle" fill="#365314" fontSize="20" fontWeight="600">
              No plants yet. Focus for 15+ minutes to grow your first one.
            </text>
          )}
        </svg>

        <div className="pointer-events-none absolute left-4 top-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatChip label="Total Plants" value={String(data?.totalPlants ?? 0)} tone="green" />
          <StatChip label="Alive Plants" value={String(data?.alivePlants ?? 0)} tone="emerald" />
          <StatChip label="Plants This Week" value={String(data?.plantsThisWeek ?? 0)} tone="amber" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600">
        <p>
          Alive plants: <span className="font-semibold text-gray-800">{data?.alivePlants ?? 0}</span> of{' '}
          <span className="font-semibold text-gray-800">{data?.totalPlants ?? 0}</span>
        </p>
      </div>
    </div>
  );
}

type StatChipProps = {
  label: string;
  value: string;
  tone: 'green' | 'emerald' | 'amber';
};

function StatChip({ label, value, tone }: StatChipProps) {
  const tones: Record<StatChipProps['tone'], string> = {
    green: 'border-green-200 bg-green-50 text-green-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm backdrop-blur ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
