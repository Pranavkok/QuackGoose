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

const PLANT_META: Record<PlantType, { label: string; icon: string }> = {
  SMALL_FLOWER: { label: 'Small Flower', icon: '🌼' },
  MEDIUM_FLOWER: { label: 'Medium Flower', icon: '🌸' },
  SMALL_TREE: { label: 'Small Tree', icon: '🌱' },
  LARGE_TREE: { label: 'Large Tree', icon: '🌳' },
  GOLDEN_PLANT: { label: 'Golden Plant', icon: '✨' },
};

function hashOffset(seed: string, spread: number) {
  let total = 0;
  for (let i = 0; i < seed.length; i++) total += seed.charCodeAt(i);
  return (total % (spread * 2 + 1)) - spread;
}

function plantAsset(plant: GardenPlant) {
  if (plant.status === 'DEAD') return '/garden-assets/stump.svg';
  const m: Record<PlantType, string> = {
    SMALL_FLOWER:  '/garden-assets/flower-small.svg',
    MEDIUM_FLOWER: '/garden-assets/flower-medium.svg',
    SMALL_TREE:    '/garden-assets/tree-small.svg',
    LARGE_TREE:    '/garden-assets/tree-large.svg',
    GOLDEN_PLANT:  '/garden-assets/plant-golden.svg',
  };
  return m[plant.plantType];
}

function plantSize(plant: GardenPlant) {
  if (plant.status === 'DEAD') return { w: 48, h: 48 };
  const m: Record<PlantType, { w: number; h: number }> = {
    SMALL_FLOWER:  { w: 40, h: 40 },
    MEDIUM_FLOWER: { w: 56, h: 56 },
    SMALL_TREE:    { w: 80, h: 80 },
    LARGE_TREE:    { w: 106, h: 106 },
    GOLDEN_PLANT:  { w: 72, h: 72 },
  };
  return m[plant.plantType];
}

export default function GardenPage() {
  const [data, setData] = useState<GardenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/garden', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setData((await res.json()) as GardenResponse);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load garden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, []);

  const renderedPlants = useMemo(() => {
    return (data?.plants ?? []).map((plant) => {
      const cx = Math.max(0, Math.min(10, plant.positionX));
      const cy = Math.max(0, Math.min(10, plant.positionY));
      const gx = 70 + (cx / 10) * 860;
      const gy = 410 + (cy / 10) * 170;
      const { w, h } = plantSize(plant);
      return {
        ...plant,
        x: gx + hashOffset(`${plant.id}:x`, 10) - w / 2,
        y: gy + hashOffset(`${plant.id}:y`, 6) - h,
        w, h,
        asset: plantAsset(plant),
      };
    });
  }, [data]);

  const recentPlants = useMemo(
    () =>
      [...(data?.plants ?? [])]
        .sort((a, b) => new Date(b.spawnedAt).getTime() - new Date(a.spawnedAt).getTime())
        .slice(0, 5),
    [data],
  );

  const aliveByType = useMemo(() => {
    const counts: Record<PlantType, number> = {
      SMALL_FLOWER: 0,
      MEDIUM_FLOWER: 0,
      SMALL_TREE: 0,
      LARGE_TREE: 0,
      GOLDEN_PLANT: 0,
    };

    for (const plant of data?.plants ?? []) {
      if (plant.status === 'ALIVE') counts[plant.plantType] += 1;
    }
    return counts;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-52" />
          <div className="flex gap-2"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-24" /></div>
        </div>
        <Skeleton className="h-[560px]" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="text-5xl">🌧️</div>
        <p className="mt-4 font-semibold text-gray-900">Couldn&apos;t load your garden</p>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button onClick={() => void load()} className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const healthPercent = data && data.totalPlants > 0
    ? Math.round((data.alivePlants / data.totalPlants) * 100)
    : 0;
  const deadPlants = Math.max(0, (data?.totalPlants ?? 0) - (data?.alivePlants ?? 0));
  const lastUpdated = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'just now';

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Employee Garden</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">Your Focus Garden 🌱</h1>
            <p className="mt-1 text-sm text-gray-600">
              Plants grow when you focus. Distractions can harm them.
            </p>
            <p className="mt-1 text-xs text-emerald-800/70">Last synced: {lastUpdated}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="rounded-xl border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-white">
              ← Dashboard
            </Link>
            <button onClick={() => void load()} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800">
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Alive" value={String(data?.alivePlants ?? 0)} />
          <MiniStat label="Total" value={String(data?.totalPlants ?? 0)} />
          <MiniStat label="This Week" value={String(data?.plantsThisWeek ?? 0)} />
          <MiniStat label="Health" value={`${healthPercent}%`} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">{error}</p>}

      {/* Garden SVG */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">
        <svg viewBox="0 0 1000 620" className="h-[540px] w-full" role="img" aria-label="Focus garden">
          <defs>
            <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5e3ff" />
              <stop offset="58%" stopColor="#e9f8ff" />
              <stop offset="100%" stopColor="#f0fff4" />
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

          {renderedPlants.map((p) => (
            <image
              key={p.id}
              href={p.asset}
              x={p.x} y={p.y}
              width={p.w} height={p.h}
              preserveAspectRatio="xMidYMax meet"
              className="qf-garden-plant"
            />
          ))}

          {renderedPlants.length === 0 && (
            <text x="500" y="530" textAnchor="middle" fill="#365314" fontSize="18" fontWeight="600">
              No plants yet — focus for 15+ minutes to grow your first one 🌱
            </text>
          )}
        </svg>

        {/* Floating stat chips */}
        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 sm:flex-row">
          <Chip label="Total Plants" value={String(data?.totalPlants ?? 0)} color="green" />
          <Chip label="Alive" value={String(data?.alivePlants ?? 0)} color="emerald" />
          <Chip label="This Week" value={String(data?.plantsThisWeek ?? 0)} color="amber" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          icon="🌱"
          label="Alive Plants"
          value={String(data?.alivePlants ?? 0)}
          sub="Currently thriving"
          color="green"
        />
        <StatCard
          icon="📊"
          label="Total Ever Grown"
          value={String(data?.totalPlants ?? 0)}
          sub="All time"
          color="blue"
        />
        <StatCard
          icon="❤️"
          label="Garden Health"
          value={`${healthPercent}%`}
          sub="Alive / total ratio"
          color={healthPercent >= 70 ? 'green' : healthPercent >= 40 ? 'amber' : 'red'}
        />
        <StatCard
          icon="🪵"
          label="Lost Plants"
          value={String(deadPlants)}
          sub="Need focus to recover"
          color={deadPlants > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Plant Breakdown</h2>
          <p className="mt-1 text-sm text-gray-500">Alive plants by type</p>
          <div className="mt-4 space-y-3">
            {(Object.keys(PLANT_META) as PlantType[]).map((type) => {
              const count = aliveByType[type];
              const totalAlive = Math.max(1, data?.alivePlants ?? 0);
              const width = Math.round((count / totalAlive) * 100);
              return (
                <div key={type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <p className="font-medium text-gray-700">{PLANT_META[type].icon} {PLANT_META[type].label}</p>
                    <p className="font-bold text-gray-900">{count}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Recent Growth Activity</h2>
          <p className="mt-1 text-sm text-gray-500">Latest plants added to your garden</p>
          <div className="mt-4 space-y-2">
            {recentPlants.length === 0 && (
              <p className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-500">
                No growth activity yet. Complete focused sessions to start growing.
              </p>
            )}
            {recentPlants.map((plant) => (
              <div key={plant.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {PLANT_META[plant.plantType].icon} {PLANT_META[plant.plantType].label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(plant.spawnedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  plant.status === 'ALIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {plant.status === 'ALIVE' ? 'Alive' : 'Lost'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-blue-50 bg-blue-50 px-5 py-3 text-sm text-blue-700">
        💡 Keep your focus sessions going to unlock <strong>Golden Plants</strong> — rare and only grown by streak days.
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{label}</p>
      <p className="mt-0.5 text-xl font-black text-emerald-900">{value}</p>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: 'green' | 'emerald' | 'amber' }) {
  const c = { green: 'bg-green-50/90 border-green-200 text-green-800', emerald: 'bg-emerald-50/90 border-emerald-200 text-emerald-800', amber: 'bg-amber-50/90 border-amber-200 text-amber-800' }[color];
  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm backdrop-blur-sm ${c}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-black">{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: 'green' | 'blue' | 'amber' | 'red' }) {
  const c = {
    green: 'from-green-500 to-emerald-600',
    blue:  'from-blue-500 to-indigo-600',
    amber: 'from-amber-400 to-orange-500',
    red:   'from-red-500 to-rose-600',
  }[color];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${c} p-6 text-white shadow-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-white/70">{sub}</p>
    </div>
  );
}
