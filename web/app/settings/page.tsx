'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

type Settings = {
  distractionLimitMode: 'TIME_BASED' | 'GOAL_BASED';
  distractionLimitMinutes: number;
  dailyFocusGoalMinutes: number;
  enforcementLevel: 'WARN_ONLY' | 'BLUR' | 'BLOCK' | 'SHAME_AND_BLOCK';
  workStartTime: string;
  workEndTime: string;
  duckEnabled: boolean;
  duckMessagesEnabled: boolean;
  weeklyEmailEnabled: boolean;
};

type OverrideCategory = 'PRODUCTIVE' | 'DISTRACTION' | 'NEUTRAL';

type WebsiteOverride = {
  id: string;
  domain: string;
  category: OverrideCategory;
  createdAt: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [overrides, setOverrides] = useState<WebsiteOverride[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const [newDomain, setNewDomain] = useState('');
  const [newCategory, setNewCategory] = useState<OverrideCategory>('DISTRACTION');
  const [addingOverride, setAddingOverride] = useState(false);

  async function loadPageData() {
    try {
      setLoadError('');
      const [settingsRes, overridesRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/overrides'),
      ]);

      if (!settingsRes.ok) throw new Error('Failed to load settings');
      if (!overridesRes.ok) throw new Error('Failed to load overrides');

      const settingsData = (await settingsRes.json()) as Settings;
      const overridesData = (await overridesRes.json()) as WebsiteOverride[];

      setSettings(settingsData);
      setOverrides(overridesData);
    } catch {
      setLoadError('Could not load settings. Refresh and try again.');
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPageData();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    setLoadError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setLoadError('Failed to save settings. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addOverride() {
    if (!newDomain.trim()) return;

    setAddingOverride(true);
    setOverrideError('');

    try {
      const res = await fetch('/api/settings/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, category: newCategory }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Could not add override');
      }

      setNewDomain('');
      const updatedList = await fetch('/api/settings/overrides').then(r => r.json()) as WebsiteOverride[];
      setOverrides(updatedList);
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : 'Could not add override');
    } finally {
      setAddingOverride(false);
    }
  }

  async function deleteOverride(domain: string) {
    setOverrideError('');

    try {
      const res = await fetch('/api/settings/overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!res.ok) throw new Error('Could not delete override');
      setOverrides(prev => prev.filter(override => override.domain !== domain));
    } catch {
      setOverrideError('Could not delete override. Try again.');
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
  }

  if (!settings) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-52 w-full" />
        {loadError && <p className="text-sm text-red-500">{loadError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Section title="Focus Goals">
        <Field label="Daily focus goal">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={12}
              step={0.5}
              value={settings.dailyFocusGoalMinutes / 60}
              onChange={event => {
                const nextHours = parseFloat(event.target.value);
                if (!Number.isFinite(nextHours)) return;
                update('dailyFocusGoalMinutes', Math.round(nextHours * 60));
              }}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-black"
            />
            <span className="text-sm text-gray-500">hours per day</span>
          </div>
        </Field>
        <Field label="Work hours">
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={settings.workStartTime}
              onChange={event => update('workStartTime', event.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <span className="text-gray-400">to</span>
            <input
              type="time"
              value={settings.workEndTime}
              onChange={event => update('workEndTime', event.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </Field>
      </Section>

      <Section title="Distraction Limits">
        <Field label="Limit type">
          <select
            value={settings.distractionLimitMode}
            onChange={event => update('distractionLimitMode', event.target.value as Settings['distractionLimitMode'])}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="TIME_BASED">Time-based (X minutes/day)</option>
            <option value="GOAL_BASED">Goal-based (no distraction until focus goal met)</option>
          </select>
        </Field>

        {settings.distractionLimitMode === 'TIME_BASED' && (
          <Field label="Daily distraction budget">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={settings.distractionLimitMinutes}
                onChange={event => {
                  const nextMinutes = parseInt(event.target.value, 10);
                  if (!Number.isFinite(nextMinutes)) return;
                  update('distractionLimitMinutes', nextMinutes);
                }}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-black"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          </Field>
        )}
      </Section>

      <Section title="Duck Enforcement">
        <Field label="When limit is reached">
          <select
            value={settings.enforcementLevel}
            onChange={event => update('enforcementLevel', event.target.value as Settings['enforcementLevel'])}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="WARN_ONLY">Warn only</option>
            <option value="BLUR">Blur page</option>
            <option value="BLOCK">Blur + cursor block</option>
            <option value="SHAME_AND_BLOCK">Shame and block</option>
          </select>
        </Field>
        <Field label="Duck overlay">
          <Toggle
            checked={settings.duckEnabled}
            onChange={value => update('duckEnabled', value)}
            label="Show duck on all pages"
          />
        </Field>
        <Field label="Duck messages">
          <Toggle
            checked={settings.duckMessagesEnabled}
            onChange={value => update('duckMessagesEnabled', value)}
            label="Show duck messages and roasts"
          />
        </Field>
      </Section>

      <Section title="Notifications">
        <Field label="Weekly summary email">
          <Toggle
            checked={settings.weeklyEmailEnabled}
            onChange={value => update('weeklyEmailEnabled', value)}
            label="Send weekly garden summary"
          />
        </Field>
      </Section>

      <Section title="Website Overrides">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Force a site to be classified as productive, distraction, or neutral.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <input
              value={newDomain}
              onChange={event => setNewDomain(event.target.value)}
              placeholder="example.com"
              className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />

            <select
              value={newCategory}
              onChange={event => setNewCategory(event.target.value as OverrideCategory)}
              className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="PRODUCTIVE">Productive</option>
              <option value="DISTRACTION">Distraction</option>
              <option value="NEUTRAL">Neutral</option>
            </select>

            <button
              type="button"
              onClick={addOverride}
              disabled={addingOverride || !newDomain.trim()}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {addingOverride ? 'Adding...' : 'Add'}
            </button>
          </div>

          {overrideError && <p className="text-sm text-red-500">{overrideError}</p>}

          {overrides.length === 0 ? (
            <p className="text-sm text-gray-500">No custom overrides yet.</p>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Domain</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map(override => (
                    <tr key={override.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{override.domain}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryStyles[override.category]}`}>
                          {override.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => deleteOverride(override.domain)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
        {loadError && <span className="text-sm text-red-500">{loadError}</span>}
      </div>
    </div>
  );
}

const categoryStyles: Record<OverrideCategory, string> = {
  PRODUCTIVE: 'bg-green-50 text-green-700',
  DISTRACTION: 'bg-red-50 text-red-700',
  NEUTRAL: 'bg-gray-100 text-gray-700',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm font-medium text-gray-700 shrink-0 w-44">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-black' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  );
}
