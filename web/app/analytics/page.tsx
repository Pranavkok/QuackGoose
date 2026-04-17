'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';

type SiteCategory = 'PRODUCTIVE' | 'DISTRACTION' | 'NEUTRAL';

type AnalyticsResponse = {
  range: {
    from: string;
    to: string;
  };
  summaries: Array<{
    date: string;
    totalFocusMinutes: number;
    totalDistractionMinutes: number;
    totalNeutralMinutes: number;
    productivityScore: number;
    limitReached: boolean;
    productiveDayComplete: boolean;
  }>;
  topProductive: Array<{ domain: string; minutes: number }>;
  topDistraction: Array<{ domain: string; minutes: number }>;
  categoryBreakdown: Array<{ subcategory: string; minutes: number }>;
  topAll: Array<{ domain: string; category: SiteCategory; minutes: number }>;
};

type SavedView = {
  id: string;
  name: string;
  domainContains: string;
  category: 'ALL' | SiteCategory;
  minMinutes: number;
};

const SAVED_VIEWS_KEY = 'qf_saved_analytics_views_v1';
const PALETTE = {
  productive: '#16a34a',
  distraction: '#ef4444',
  neutral: '#0ea5e9',
  score: '#2563eb',
  accent: '#14b8a6',
  warning: '#f59e0b',
  violet: '#6366f1',
  rose: '#db2777',
};
const PIE_COLORS = [
  PALETTE.neutral,
  PALETTE.productive,
  PALETTE.warning,
  PALETTE.distraction,
  PALETTE.violet,
  PALETTE.accent,
  PALETTE.rose,
  '#334155',
];

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shortDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#65a30d';
  if (score >= 40) return '#d97706';
  if (score >= 20) return '#ea580c';
  return '#dc2626';
}

export default function AnalyticsPage() {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [fromInput, setFromInput] = useState(dateInputValue(defaultFrom));
  const [toInput, setToInput] = useState(dateInputValue(now));
  const [fromDate, setFromDate] = useState(dateInputValue(defaultFrom));
  const [toDate, setToDate] = useState(dateInputValue(now));

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewName, setViewName] = useState('');
  const [domainContains, setDomainContains] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SiteCategory>('ALL');
  const [minMinutes, setMinMinutes] = useState(5);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedView[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const loadAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/analytics?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);

      const json = (await res.json()) as AnalyticsResponse;
      setData(json);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadAnalytics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const dailyStackedData = useMemo(
    () =>
      (data?.summaries || []).map((item) => ({
        date: shortDateLabel(item.date),
        productive: item.totalFocusMinutes,
        distraction: item.totalDistractionMinutes,
        neutral: item.totalNeutralMinutes,
      })),
    [data],
  );

  const trendData = useMemo(
    () =>
      (data?.summaries || []).map((item) => ({
        date: shortDateLabel(item.date),
        score: item.productivityScore,
      })),
    [data],
  );

  const distractionOverPeriodData = useMemo(
    () =>
      (data?.summaries || []).map((item) => {
        return {
          date: shortDateLabel(item.date),
          distractionMinutes: item.totalDistractionMinutes,
        };
      }),
    [data],
  );

  const averageDistractionMinutes = useMemo(() => {
    if (!distractionOverPeriodData.length) return 0;
    const total = distractionOverPeriodData.reduce((sum, item) => sum + item.distractionMinutes, 0);
    return Number((total / distractionOverPeriodData.length).toFixed(1));
  }, [distractionOverPeriodData]);

  const weeklyHeatmapData = useMemo(() => {
    const source = data?.summaries || [];
    const byDate = new Map(source.map((item) => [item.date.slice(0, 10), item.productivityScore]));

    const days: Array<{ day: string; score: number }> = [];
    const end = new Date(toDate);

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = dateInputValue(d);
      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        score: byDate.get(key) ?? 0,
      });
    }

    return days;
  }, [data, toDate]);

  const customViewData = useMemo(() => {
    const source = data?.topAll || [];
    return source
      .filter((item) => {
        const matchesDomain = domainContains.trim().length === 0
          || item.domain.toLowerCase().includes(domainContains.trim().toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
        const matchesMinutes = item.minutes >= minMinutes;

        return matchesDomain && matchesCategory && matchesMinutes;
      })
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 12);
  }, [data, domainContains, categoryFilter, minMinutes]);

  function applyLastDays(days: number) {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    setFromInput(dateInputValue(start));
    setToInput(dateInputValue(end));
    setFromDate(dateInputValue(start));
    setToDate(dateInputValue(end));
  }

  function saveCurrentView() {
    const name = viewName.trim() || `View ${savedViews.length + 1}`;

    const next: SavedView = {
      id: `${Date.now()}`,
      name,
      domainContains,
      category: categoryFilter,
      minMinutes,
    };

    setSavedViews((prev) => [next, ...prev].slice(0, 12));
    setViewName('');
  }

  function applySavedView(view: SavedView) {
    setDomainContains(view.domainContains);
    setCategoryFilter(view.category);
    setMinMinutes(view.minMinutes);
  }

  function removeSavedView(id: string) {
    setSavedViews((prev) => prev.filter((view) => view.id !== id));
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-16 w-80" />
        </div>
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Find your productivity patterns and distraction hotspots.</p>
        </div>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setFromDate(fromInput);
            setToDate(toInput);
          }}
        >
          <label className="text-xs font-medium text-gray-500">
            From
            <input
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-500">
            To
            <input
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => applyLastDays(7)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            7D
          </button>
          <button
            type="button"
            onClick={() => applyLastDays(30)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            30D
          </button>
          <button
            type="button"
            onClick={() => applyLastDays(90)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            90D
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-amber-700">Background refresh failed: {error}</p>}

      <ChartCard title="User Distraction Over Period">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={distractionOverPeriodData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine
              y={averageDistractionMinutes}
              stroke={PALETTE.warning}
              strokeDasharray="6 6"
              ifOverflow="extendDomain"
              label={{ value: `Avg ${averageDistractionMinutes}m`, position: 'insideTopRight' }}
            />
            <Line
              type="monotone"
              dataKey="distractionMinutes"
              stroke={PALETTE.distraction}
              strokeWidth={2}
              dot={false}
              name="Distraction (min)"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Daily Focus vs Distraction (Stacked)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyStackedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="productive" stackId="a" fill={PALETTE.productive} name="Productive" />
              <Bar dataKey="neutral" stackId="a" fill={PALETTE.neutral} name="Neutral" />
              <Bar dataKey="distraction" stackId="a" fill={PALETTE.distraction} name="Distraction" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly Heatmap (Productivity Score)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyHeatmapData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" name="Score">
                {weeklyHeatmapData.map((entry) => (
                  <Cell key={entry.day} fill={scoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Productivity Score Trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke={PALETTE.score} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Subcategory Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={(data?.categoryBreakdown || []).filter((entry) => entry.minutes > 0).slice(0, 8)}
                dataKey="minutes"
                nameKey="subcategory"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label
              >
                {(data?.categoryBreakdown || []).filter((entry) => entry.minutes > 0).slice(0, 8).map((entry, index) => (
                  <Cell
                    key={`${entry.subcategory}-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Productive Sites">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data?.topProductive || []}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="domain" type="category" width={130} />
              <Tooltip />
              <Bar dataKey="minutes" fill={PALETTE.productive} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Distraction Sites">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data?.topDistraction || []}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="domain" type="category" width={130} />
              <Tooltip />
              <Bar dataKey="minutes" fill={PALETTE.distraction} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Custom Views</h2>
        <p className="mt-1 text-sm text-gray-500">
          Filter by domain substring, category, and minimum minutes. Save frequently used filters locally.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <input
            value={domainContains}
            onChange={(event) => setDomainContains(event.target.value)}
            placeholder="Domain contains..."
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | SiteCategory)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All categories</option>
            <option value="PRODUCTIVE">Productive</option>
            <option value="DISTRACTION">Distraction</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
          <input
            type="number"
            min={1}
            value={minMinutes}
            onChange={(event) => setMinMinutes(Math.max(1, parseInt(event.target.value || '1', 10)))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            placeholder="View name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={saveCurrentView}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Save Current View
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {savedViews.map((view) => (
            <div key={view.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{view.name}</p>
                <p className="text-xs text-gray-500">
                  {view.category} · {view.minMinutes}+ min · {view.domainContains || 'any domain'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applySavedView(view)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => removeSavedView(view.id)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {savedViews.length === 0 && (
            <p className="text-sm text-gray-500">No saved views yet.</p>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <h3 className="text-sm font-semibold text-gray-800">Filtered Result</h3>
          <div className="mt-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={customViewData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="domain" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="minutes" name="Minutes">
                  {customViewData.map((item, index) => (
                    <Cell
                      key={`${item.domain}-${item.category}-${index}`}
                      fill={item.category === 'PRODUCTIVE'
                        ? PALETTE.productive
                        : item.category === 'DISTRACTION'
                          ? PALETTE.distraction
                          : PALETTE.neutral}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
