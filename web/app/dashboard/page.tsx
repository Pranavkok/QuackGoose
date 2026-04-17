'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';

type DashboardResponse = {
  summary: {
    totalFocusMinutes: number;
    totalDistractionMinutes: number;
    totalNeutralMinutes: number;
    productivityScore: number;
    limitReached: boolean;
    productiveDayComplete: boolean;
  } | null;
  settings: {
    dailyFocusGoalMinutes: number;
    distractionLimitMinutes: number;
    enforcementLevel: string;
    workStartTime: string;
    workEndTime: string;
  } | null;
  garden: {
    totalPlants: number;
    alivePlants: number;
  } | null;
  topSites: Array<{
    domain: string;
    category: 'PRODUCTIVE' | 'DISTRACTION' | 'NEUTRAL';
    minutes: number;
  }>;
  peakProductiveWindow: {
    label: string;
    startHour: number;
    endHour: number;
    productiveMinutes: number;
    trackedMinutes: number;
    productivityPercent: number;
    sampleSessions: number;
    activeDays: number;
    lookbackDays: number;
    timezone: string;
  } | null;
  streak: number;
  duckMood: string;
  user?: { id: string; name: string | null; image: string | null; email: string | null };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSummary() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/dashboard/summary?tz=${tz}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setData((await res.json()) as DashboardResponse);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void loadSummary(), 0);
    const iv = setInterval(() => void loadSummary(), 30_000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const focusMin      = data?.summary?.totalFocusMinutes ?? 0;
  const distractMin   = data?.summary?.totalDistractionMinutes ?? 0;
  const goalMin       = data?.settings?.dailyFocusGoalMinutes ?? 240;
  const limitMin      = data?.settings?.distractionLimitMinutes ?? 60;
  const score         = data?.summary?.productivityScore ?? 0;
  const streak        = data?.streak ?? 0;
  const duckMood      = data?.duckMood ?? 'IDLE';
  const peak          = data?.peakProductiveWindow ?? null;

  const focusPct      = Math.min(Math.round((focusMin / Math.max(goalMin, 1)) * 100), 100);
  const distractPct   = Math.min(Math.round((distractMin / Math.max(limitMin, 1)) * 100), 100);

  const ringData = useMemo(
    () => [{ name: 'Focus', value: focusPct, fill: focusPct >= 100 ? '#10b981' : '#3b82f6' }],
    [focusPct],
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="text-5xl">😵</div>
        <p className="mt-4 font-semibold text-gray-900">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => void loadSummary()}
          className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greet()}{data?.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => void loadSummary()}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">{error}</p>}

      {/* ── Row 1: Ring + Stats ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Focus ring */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Daily Focus</p>
          <div className="relative h-52 w-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={ringData}
                cx="50%" cy="50%"
                innerRadius="68%" outerRadius="92%"
                startAngle={90} endAngle={-270}
                barSize={16}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-4xl font-black text-gray-900">{focusPct}%</p>
              <p className="mt-1 text-xs text-gray-400">
                {fmt(focusMin)} / {fmt(goalMin)}
              </p>
            </div>
          </div>
          {data?.summary?.productiveDayComplete && (
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
              🏆 Goal complete!
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <GradCard
            icon="🎯"
            label="Productive"
            value={fmt(focusMin)}
            sub={`Goal: ${fmt(goalMin)}`}
            from="from-blue-500" to="to-indigo-600"
          />
          <GradCard
            icon="😵"
            label="Distracted"
            value={fmt(distractMin)}
            sub={`Limit: ${fmt(limitMin)}`}
            from={distractPct >= 80 ? 'from-red-500' : 'from-orange-400'}
            to={distractPct >= 80 ? 'to-rose-700' : 'to-amber-500'}
          />
          <GradCard
            icon="🔥"
            label="Streak"
            value={`${streak}d`}
            sub="Productive days"
            from="from-amber-400" to="to-orange-500"
          />
          <GradCard
            icon="⭐"
            label="Score"
            value={`${score}`}
            sub="Out of 100"
            from={score >= 70 ? 'from-emerald-500' : score >= 40 ? 'from-yellow-500' : 'from-red-500'}
            to={score >= 70 ? 'to-green-600' : score >= 40 ? 'to-orange-500' : 'to-rose-600'}
          />
        </div>
      </div>

      {/* ── Row 2: Distraction budget + Duck + Peak ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">

        {/* Distraction budget */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Distraction Budget</h2>
              <p className="mt-0.5 text-sm text-gray-500">{fmt(distractMin)} used of {fmt(limitMin)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              distractPct >= 100 ? 'bg-red-50 text-red-700'
              : distractPct >= 80 ? 'bg-orange-50 text-orange-700'
              : 'bg-green-50 text-green-700'
            }`}>
              {distractPct}%
            </span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                distractPct >= 100 ? 'bg-gradient-to-r from-red-500 to-rose-600'
                : distractPct >= 80 ? 'bg-gradient-to-r from-orange-400 to-red-500'
                : distractPct >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${distractPct}%` }}
            />
          </div>
          {data?.summary?.limitReached && (
            <p className="mt-3 text-xs font-semibold text-red-600">⚠️ Distraction limit reached today</p>
          )}
        </div>

        {/* Duck mood */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Duck Mood</p>
          <div className="mt-3 text-5xl">{moodEmoji(duckMood)}</div>
          <p className="mt-2 text-base font-bold text-gray-900">{duckMood}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{moodMsg(duckMood)}</p>
        </div>

        {/* Peak productivity */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Peak Hours</p>
          {peak ? (
            <>
              <p className="mt-3 text-2xl font-black text-gray-900">{peak.label}</p>
              <p className="mt-1 text-xs text-gray-500">
                {fmt(peak.productiveMinutes)} productive · {peak.productivityPercent}% rate
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {peak.activeDays}d of data · {peak.timezone.replace(/_/g, ' ')}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-gray-500">Not enough data yet</p>
              <p className="mt-1 text-xs text-gray-400">Browse with the extension to unlock this insight.</p>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Top sites + Garden ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Top sites */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-bold text-gray-900">Top Sites Today</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(data?.topSites ?? []).length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No activity tracked yet today.</div>
            ) : (
              data?.topSites.slice(0, 8).map((site) => (
                <div key={`${site.domain}-${site.category}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                    {site.domain.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-gray-700">{site.domain}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${catBadge(site.category)}`}>
                    {site.category.toLowerCase()}
                  </span>
                  <span className="w-12 text-right text-sm font-bold text-gray-900">{site.minutes}m</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Garden card */}
        <Link href="/garden" className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-bold text-gray-900">Your Garden 🌱</h2>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-green-100 px-6 py-8">
            <div className="absolute inset-0 bg-gradient-to-t from-green-200/60 to-transparent" />
            <div className="relative text-center">
              <p className="text-4xl font-black text-green-800">{data?.garden?.alivePlants ?? 0}</p>
              <p className="text-sm font-semibold text-green-700">alive plants</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {Array.from({ length: Math.min(data?.garden?.alivePlants ?? 0, 10) }).map((_, i) => (
                  <span key={i} className="inline-block h-4 w-4 rounded-full bg-green-500 shadow-sm ring-1 ring-green-300" />
                ))}
                {(data?.garden?.alivePlants ?? 0) === 0 && (
                  <p className="text-xs text-green-700/60">Focus to grow your first plant!</p>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-3.5">
            <p className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
              Open full garden →
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmt(min: number) {
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${min}m`;
}

function catBadge(cat: 'PRODUCTIVE' | 'DISTRACTION' | 'NEUTRAL') {
  if (cat === 'PRODUCTIVE') return 'bg-green-50 text-green-700';
  if (cat === 'DISTRACTION') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function moodEmoji(m: string) {
  const map: Record<string, string> = {
    HAPPY: '😄', IDLE: '😐', SLEEPY: '😴', WATCHING: '👀',
    WARNING: '⚠️', ANGRY: '😠', CHAOS: '🔥', PROUD: '🏆', DISAPPOINTED: '💔',
  };
  return map[m] ?? '🦆';
}

function moodMsg(m: string) {
  const map: Record<string, string> = {
    HAPPY: 'Strong productive flow detected.',
    WATCHING: 'Neutral browsing right now.',
    WARNING: 'Distraction time is climbing.',
    ANGRY: 'Getting close to daily limit.',
    CHAOS: 'Distraction limit reached!',
    PROUD: 'Daily focus goal complete. 🎉',
    DISAPPOINTED: 'Focus dropped below pace.',
    IDLE: 'Low activity. Keep momentum.',
    SLEEPY: 'Not much activity detected.',
  };
  return map[m] ?? 'Monitoring your session.';
}

// ── Components ────────────────────────────────────────────────────────────────

function GradCard({
  icon, label, value, sub, from, to,
}: {
  icon: string; label: string; value: string; sub: string;
  from: string; to: string;
}) {
  return (
    <div className={`flex flex-col justify-between rounded-2xl bg-gradient-to-br ${from} ${to} p-5 text-white shadow-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="mt-3 text-3xl font-black leading-none">{value}</p>
        <p className="mt-1 text-xs text-white/70">{sub}</p>
      </div>
    </div>
  );
}
