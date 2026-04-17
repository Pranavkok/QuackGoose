'use client';

import { useEffect, useState } from 'react';

const ENFORCEMENT_OPTIONS = [
  { value: 'WARN_ONLY', label: 'Warn Only', description: 'Show a warning message, no blocking' },
  { value: 'BLUR', label: 'Blur', description: 'Blur the page and warn the employee' },
  { value: 'BLOCK', label: 'Block', description: 'Fully block access to the site' },
  { value: 'SHAME_AND_BLOCK', label: 'Shame & Block', description: 'Block with a shame message' },
] as const;

type EnforcementValue = (typeof ENFORCEMENT_OPTIONS)[number]['value'];

type OrgPolicyResponse = {
  blockedDomains: string[];
  allowedDomains: string[];
  enforcementLevel: EnforcementValue;
  workStartTime: string;
  workEndTime: string;
  dailyFocusGoalMinutes: number;
  distractionLimitMinutes: number;
};

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const raw = await res.text();
    if (!raw.trim()) return fallback;
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0] || '';
  const withoutPort = withoutPath.split(':')[0] || '';
  return withoutPort.replace(/^www\./, '').replace(/^\*\./, '');
}

export default function OrgSettingsPage() {
  const [enforcement, setEnforcement] = useState<EnforcementValue>('BLUR');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [focusGoal, setFocusGoal] = useState(240);
  const [distractLimit, setDistractLimit] = useState(60);
  const [blockedInput, setBlockedInput] = useState('');
  const [allowedInput, setAllowedInput] = useState('');
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingPolicy(true);
      setError('');

      const res = await fetch('/api/org/policy', { cache: 'no-store' });
      if (!res.ok) {
        if (!active) return;
        setError(await readErrorMessage(res, 'Could not load organization policy.'));
        setLoadingPolicy(false);
        return;
      }

      const policy = (await res.json()) as OrgPolicyResponse;
      if (!active) return;

      setEnforcement(policy.enforcementLevel ?? 'BLUR');
      setWorkStart(policy.workStartTime ?? '09:00');
      setWorkEnd(policy.workEndTime ?? '18:00');
      setFocusGoal(policy.dailyFocusGoalMinutes ?? 240);
      setDistractLimit(policy.distractionLimitMinutes ?? 60);
      setBlockedDomains(Array.isArray(policy.blockedDomains) ? policy.blockedDomains : []);
      setAllowedDomains(Array.isArray(policy.allowedDomains) ? policy.allowedDomains : []);
      setLoadingPolicy(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  function addBlocked() {
    const d = normalizeDomain(blockedInput);
    if (!d || blockedDomains.includes(d)) return;
    setBlockedDomains([...blockedDomains, d]);
    setBlockedInput('');
  }

  function addAllowed() {
    const d = normalizeDomain(allowedInput);
    if (!d || allowedDomains.includes(d)) return;
    setAllowedDomains([...allowedDomains, d]);
    setAllowedInput('');
  }

  function removeBlocked(domain: string) {
    setBlockedDomains(blockedDomains.filter((d) => d !== domain));
  }

  function removeAllowed(domain: string) {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError('');

    const res = await fetch('/api/org/policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockedDomains,
        allowedDomains,
        enforcementLevel: enforcement,
        workStartTime: workStart,
        workEndTime: workEnd,
        dailyFocusGoalMinutes: focusGoal,
        distractionLimitMinutes: distractLimit,
      }),
    });

    if (!res.ok) {
      setError(await readErrorMessage(res, 'Could not save policies.'));
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loadingPolicy) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading organization policy…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Policies</h1>
          <p className="mt-1 text-sm text-gray-500">
            These settings apply to all employees in your organization.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Policies'}
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <Section title="Enforcement Level" description="How strictly should distracting sites be handled?">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ENFORCEMENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                enforcement === opt.value
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="enforcement"
                value={opt.value}
                checked={enforcement === opt.value}
                onChange={() => setEnforcement(opt.value)}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Work Hours" description="Only activity within these hours is tracked and enforced.">
        <div className="flex items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Start time</label>
            <input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="mt-4 font-medium text-gray-400">to</span>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">End time</label>
            <input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </Section>

      <Section title="Daily Limits" description="Default focus goal and distraction budget for all employees.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Daily Focus Goal
              <span className="ml-2 font-bold text-blue-600">{Math.floor(focusGoal / 60)}h {focusGoal % 60}m</span>
            </label>
            <input
              type="range"
              min={60}
              max={480}
              step={30}
              value={focusGoal}
              onChange={(e) => setFocusGoal(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>1h</span><span>8h</span>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Distraction Limit
              <span className="ml-2 font-bold text-red-500">{distractLimit}m</span>
            </label>
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={distractLimit}
              onChange={(e) => setDistractLimit(Number(e.target.value))}
              className="w-full accent-red-500"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>15m</span><span>3h</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Blocked Domains" description="These sites are blocked for all employees during work hours.">
        <div className="flex gap-2">
          <input
            type="text"
            value={blockedInput}
            onChange={(e) => setBlockedInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBlocked()}
            placeholder="e.g. youtube.com"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addBlocked}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            Add
          </button>
        </div>
        {blockedDomains.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {blockedDomains.map((domain) => (
              <span
                key={domain}
                className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
              >
                🚫 {domain}
                <button
                  type="button"
                  onClick={() => removeBlocked(domain)}
                  className="ml-0.5 leading-none font-bold text-red-400 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {blockedDomains.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">No sites blocked yet.</p>
        )}
      </Section>

      <Section title="Allowed Domains" description="Mark domains that should stay productive for your team.">
        <div className="flex gap-2">
          <input
            type="text"
            value={allowedInput}
            onChange={(e) => setAllowedInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllowed()}
            placeholder="e.g. docs.company.com"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addAllowed}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            Add
          </button>
        </div>
        {allowedDomains.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {allowedDomains.map((domain) => (
              <span
                key={domain}
                className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
              >
                ✅ {domain}
                <button
                  type="button"
                  onClick={() => removeAllowed(domain)}
                  className="ml-0.5 leading-none font-bold text-emerald-400 hover:text-emerald-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {allowedDomains.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">No allowed domains added.</p>
        )}
      </Section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Policies'}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
