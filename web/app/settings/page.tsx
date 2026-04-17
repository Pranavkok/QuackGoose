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
type WebsiteOverride = { id: string; domain: string; category: OverrideCategory; createdAt: string };

const ENFORCEMENT_OPTIONS: { value: Settings['enforcementLevel']; label: string; description: string; icon: string }[] = [
  { value: 'WARN_ONLY',       label: 'Warn only',      description: 'Show a friendly warning',         icon: '💬' },
  { value: 'BLUR',            label: 'Blur page',       description: 'Blur the site with a warning',    icon: '🌫️' },
  { value: 'BLOCK',           label: 'Block',           description: 'Fully block access',              icon: '🚫' },
  { value: 'SHAME_AND_BLOCK', label: 'Shame & Block',   description: 'Block with a shame message',      icon: '🫣' },
];

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

  async function load() {
    try {
      const [sr, or] = await Promise.all([fetch('/api/settings'), fetch('/api/settings/overrides')]);
      if (!sr.ok || !or.ok) throw new Error();
      setSettings((await sr.json()) as Settings);
      setOverrides((await or.json()) as WebsiteOverride[]);
    } catch {
      setLoadError('Could not load settings. Refresh and try again.');
    }
  }

  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setLoadError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addOverride() {
    if (!newDomain.trim()) return;
    setAddingOverride(true);
    setOverrideError('');
    try {
      const res = await fetch('/api/settings/overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: newDomain, category: newCategory }) });
      if (!res.ok) { const b = (await res.json().catch(() => null)) as { error?: string } | null; throw new Error(b?.error ?? 'Could not add'); }
      setNewDomain('');
      setOverrides((await fetch('/api/settings/overrides').then(r => r.json())) as WebsiteOverride[]);
    } catch (e) {
      setOverrideError(e instanceof Error ? e.message : 'Could not add override');
    } finally {
      setAddingOverride(false);
    }
  }

  async function deleteOverride(domain: string) {
    try {
      await fetch('/api/settings/overrides', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) });
      setOverrides(prev => prev.filter(o => o.domain !== domain));
    } catch {
      setOverrideError('Could not delete. Try again.');
    }
  }

  function upd<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-8 w-36" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        {loadError && <p className="text-sm text-red-500">{loadError}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {loadError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{loadError}</p>}

      {/* Focus Goals */}
      <Card title="Focus Goals" desc="Set your daily targets and work schedule.">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Daily focus goal</label>
              <span className="text-sm font-bold text-blue-600">
                {Math.floor(settings.dailyFocusGoalMinutes / 60)}h {settings.dailyFocusGoalMinutes % 60}m
              </span>
            </div>
            <input
              type="range" min={60} max={720} step={30}
              value={settings.dailyFocusGoalMinutes}
              onChange={e => upd('dailyFocusGoalMinutes', Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400"><span>1h</span><span>12h</span></div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Work hours</label>
            <div className="flex items-center gap-3">
              <input type="time" value={settings.workStartTime} onChange={e => upd('workStartTime', e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" />
              <span className="text-gray-400 font-medium">→</span>
              <input type="time" value={settings.workEndTime} onChange={e => upd('workEndTime', e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" />
            </div>
          </div>
        </div>
      </Card>

      {/* Distraction Limits */}
      <Card title="Distraction Limits" desc="Control how much time you allow for non-work browsing.">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Limit type</label>
            <select
              value={settings.distractionLimitMode}
              onChange={e => upd('distractionLimitMode', e.target.value as Settings['distractionLimitMode'])}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="TIME_BASED">Time-based (X minutes/day)</option>
              <option value="GOAL_BASED">Goal-based (no distraction until focus goal met)</option>
            </select>
          </div>
          {settings.distractionLimitMode === 'TIME_BASED' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Daily distraction budget</label>
                <span className="text-sm font-bold text-red-500">{settings.distractionLimitMinutes}m</span>
              </div>
              <input
                type="range" min={15} max={240} step={15}
                value={settings.distractionLimitMinutes}
                onChange={e => upd('distractionLimitMinutes', Number(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400"><span>15m</span><span>4h</span></div>
            </div>
          )}
        </div>
      </Card>

      {/* Enforcement */}
      <Card title="Duck Enforcement" desc="Choose how the duck handles your distraction limit.">
        <div className="grid grid-cols-2 gap-3">
          {ENFORCEMENT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                settings.enforcementLevel === opt.value
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio" name="enforcement" value={opt.value}
                checked={settings.enforcementLevel === opt.value}
                onChange={() => upd('enforcementLevel', opt.value)}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">{opt.icon} {opt.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
          <Toggle
            checked={settings.duckEnabled}
            onChange={v => upd('duckEnabled', v)}
            label="Show duck overlay on all pages"
          />
          <Toggle
            checked={settings.duckMessagesEnabled}
            onChange={v => upd('duckMessagesEnabled', v)}
            label="Show duck messages and roasts"
          />
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" desc="Control how QuackFocus communicates with you.">
        <Toggle
          checked={settings.weeklyEmailEnabled}
          onChange={v => upd('weeklyEmailEnabled', v)}
          label="Send weekly garden & productivity summary email"
        />
      </Card>

      {/* Website Overrides */}
      <Card title="Website Overrides" desc="Force a site to be classified as productive, distraction, or neutral.">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={newDomain} onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void addOverride()}
              placeholder="example.com"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />
            <select
              value={newCategory} onChange={e => setNewCategory(e.target.value as OverrideCategory)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="PRODUCTIVE">Productive</option>
              <option value="DISTRACTION">Distraction</option>
              <option value="NEUTRAL">Neutral</option>
            </select>
            <button
              onClick={() => void addOverride()}
              disabled={addingOverride || !newDomain.trim()}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {addingOverride ? '…' : 'Add'}
            </button>
          </div>

          {overrideError && <p className="text-sm text-red-600">{overrideError}</p>}

          {overrides.length === 0 ? (
            <p className="text-sm text-gray-400">No custom overrides yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              {overrides.map((o, i) => (
                <div
                  key={o.id}
                  className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50/60 transition-colors`}
                >
                  <span className="text-sm font-medium text-gray-700">{o.domain}</span>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      o.category === 'PRODUCTIVE' ? 'bg-green-50 text-green-700'
                      : o.category === 'DISTRACTION' ? 'bg-red-50 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {o.category.toLowerCase()}
                    </span>
                    <button
                      onClick={() => void deleteOverride(o.domain)}
                      className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Bottom save */}
      <div className="flex items-center justify-end gap-3 pb-4">
        {saved && <span className="text-sm font-semibold text-green-600">✓ Settings saved</span>}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
