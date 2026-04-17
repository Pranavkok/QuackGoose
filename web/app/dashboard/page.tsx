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
  streak: number;
  duckMood: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSummary() {
    try {
      const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);

      const json = (await res.json()) as DashboardResponse;
      setData(json);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSummary();
    }, 0);

    const interval = setInterval(() => {
      void loadSummary();
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const focusMinutes = data?.summary?.totalFocusMinutes ?? 0;
  const distractionMinutes = data?.summary?.totalDistractionMinutes ?? 0;
  const goalMinutes = data?.settings?.dailyFocusGoalMinutes ?? 240;
  const distractionLimitMinutes = data?.settings?.distractionLimitMinutes ?? 60;
  const score = data?.summary?.productivityScore ?? 0;
  const streak = data?.streak ?? 0;
  const duckMood = data?.duckMood || 'IDLE';

  const focusPercent = Math.min(Math.round((focusMinutes / Math.max(goalMinutes, 1)) * 100), 100);
  const distractionPercent = Math.min(
    Math.round((distractionMinutes / Math.max(distractionLimitMinutes, 1)) * 100),
    100,
  );

  const ringData = useMemo(
    () => [
      {
        name: 'Focus',
        value: focusPercent,
        fill: focusPercent >= 100 ? '#16a34a' : '#3b82f6',
      },
    ],
    [focusPercent],
  );

  const cardClass = 'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm';

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 w-full" />
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-40 w-full lg:col-span-2" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void loadSummary()}
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
          <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Dashboard</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-amber-700">Background refresh failed: {error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${cardClass} lg:col-span-1`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Focus Ring</h2>
          <div className="relative mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={ringData}
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                barSize={18}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={18} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-3xl font-bold text-gray-900">{focusPercent}%</p>
              <p className="text-sm text-gray-500">
                {formatMinutes(focusMinutes)} / {formatMinutes(goalMinutes)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            label="Productive"
            value={formatMinutes(focusMinutes)}
            sub={`Goal ${formatMinutes(goalMinutes)}`}
            tone="green"
          />
          <StatCard
            label="Distracted"
            value={formatMinutes(distractionMinutes)}
            sub={`Limit ${formatMinutes(distractionLimitMinutes)}`}
            tone="red"
          />
          <StatCard
            label="Streak"
            value={`${streak} day${streak === 1 ? '' : 's'}`}
            sub="Productive days"
            tone="amber"
          />
          <StatCard
            label="Score"
            value={`${score}/100`}
            sub="Productivity score"
            tone="blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${cardClass} lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-gray-900">Distraction Budget</h2>
          <p className="mt-1 text-sm text-gray-500">
            {formatMinutes(distractionMinutes)} used of {formatMinutes(distractionLimitMinutes)}
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                distractionPercent >= 100
                  ? 'bg-red-600'
                  : distractionPercent >= 80
                    ? 'bg-orange-500'
                    : distractionPercent >= 50
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
              }`}
              style={{ width: `${distractionPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {distractionPercent}% of daily distraction budget consumed
          </p>
        </div>

        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-gray-900">Duck Mood</h2>
          <p className="mt-2 text-3xl">{duckMoodEmoji(duckMood)}</p>
          <p className="mt-2 font-semibold text-gray-800">{duckMood}</p>
          <p className="mt-1 text-sm text-gray-500">{duckMoodMessage(duckMood)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${cardClass} lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-gray-900">Top 10 Sites Today</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-2 font-medium">Domain</th>
                  <th className="pb-2 pr-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Minutes</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topSites || []).map(site => (
                  <tr
                    key={`${site.domain}-${site.category}`}
                    className="border-b border-gray-50 text-gray-700"
                  >
                    <td className="py-2 pr-2 font-medium">{site.domain}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${categoryBadge(site.category)}`}
                      >
                        {site.category}
                      </span>
                    </td>
                    <td className="py-2 text-right">{site.minutes}</td>
                  </tr>
                ))}
                {(data?.topSites || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-500">
                      No activity tracked yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Link
          href="/garden"
          className="block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-green-200"
        >
          <h2 className="text-lg font-semibold text-gray-900">Garden Preview</h2>
          <div className="mt-4 rounded-xl bg-gradient-to-b from-sky-100 via-green-50 to-green-100 p-4">
            <p className="text-sm text-gray-700">
              Alive plants: <span className="font-semibold">{data?.garden?.alivePlants ?? 0}</span>
            </p>
            <p className="text-sm text-gray-700">
              Total grown: <span className="font-semibold">{data?.garden?.totalPlants ?? 0}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: Math.min(data?.garden?.alivePlants ?? 0, 12) }).map((_, i) => (
                <span key={i} className="inline-block h-3 w-3 rounded-full bg-green-500" />
              ))}
              {(data?.garden?.alivePlants ?? 0) === 0 && (
                <span className="text-xs text-gray-500">No alive plants yet</span>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-green-700">Open full garden →</p>
        </Link>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  }

  return `${minutes}m`;
}

function categoryBadge(category: DashboardResponse['topSites'][number]['category']) {
  if (category === 'PRODUCTIVE') return 'bg-green-100 text-green-700';
  if (category === 'DISTRACTION') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

function duckMoodEmoji(mood: string) {
  const map: Record<string, string> = {
    HAPPY: '😀',
    IDLE: '😐',
    SLEEPY: '😴',
    WATCHING: '👀',
    WARNING: '⚠️',
    ANGRY: '😠',
    CHAOS: '🔥',
    PROUD: '🏆',
    DISAPPOINTED: '💔',
  };

  return map[mood] || '🦆';
}

function duckMoodMessage(mood: string) {
  const map: Record<string, string> = {
    HAPPY: 'You are in a strong productive flow.',
    WATCHING: 'Neutral browsing right now.',
    WARNING: 'Distraction usage is climbing.',
    ANGRY: 'You are close to your daily limit.',
    CHAOS: 'Distraction limit reached.',
    PROUD: 'Daily focus goal complete.',
    DISAPPOINTED: 'Focus dropped below target pace.',
    IDLE: 'Stand by and keep momentum.',
    SLEEPY: 'Low activity detected.',
  };

  return map[mood] || 'Duck is monitoring your session.';
}

type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  tone: 'green' | 'red' | 'amber' | 'blue';
};

function StatCard({ label, value, sub, tone }: StatCardProps) {
  const tones: Record<StatCardProps['tone'], string> = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className={`rounded-2xl border border-white/50 p-6 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{sub}</p>
    </div>
  );
}
