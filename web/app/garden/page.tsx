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
        <p className="mt-4 font-semibold text-gray-900">Couldn't load your garden</p>
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Focus Garden 🌱</h1>
          <p className="mt-0.5 text-sm text-gray-500">Plants grow when you focus. Distractions can harm them.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">
            ← Dashboard
          </Link>
          <button onClick={() => void load()} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">
            Refresh
          </button>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

      <p className="rounded-2xl border border-blue-50 bg-blue-50 px-5 py-3 text-sm text-blue-700">
        💡 Keep your focus sessions going to unlock <strong>Golden Plants</strong> — rare and only grown by streak days.
      </p>
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
