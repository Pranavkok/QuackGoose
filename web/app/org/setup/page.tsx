'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const INDUSTRIES = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Education', 'E-commerce',
  'Media & Entertainment', 'Consulting', 'Manufacturing', 'Real Estate', 'Other',
];

const TEAM_SIZES = ['1–10', '11–50', '51–100', '101–500', '500+'];

export default function OrgSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleNameChange(val: string) {
    setName(val);
    setSlug(
      val.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32),
    );
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim() || !industry || !teamSize) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/org/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug, industry, teamSize }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? 'Failed to create organization');
      }
      router.push('/org/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-lg">

        {/* Logo */}
        <div className="mb-10 flex items-center justify-center gap-2">
          <span className="text-2xl">🦆</span>
          <span className="text-lg font-bold text-gray-900">QuackFocus</span>
        </div>

        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-center gap-0">
          {[1, 2].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  step > s
                    ? 'bg-green-500 text-white'
                    : step === s
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                      : 'border-2 border-gray-200 text-gray-400'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {i < 1 && (
                <div className={`h-0.5 w-16 mx-1 rounded-full transition-all ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">

          {/* Step 1 */}
          {step === 1 && (
            <div className="p-8">
              <div className="mb-8">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl shadow-lg shadow-blue-200">
                  🏢
                </div>
                <h1 className="text-2xl font-black text-gray-900">Set up your organization</h1>
                <p className="mt-1.5 text-gray-500">
                  Create your team&apos;s workspace and start boosting productivity.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Organization name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Acme Technologies"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Workspace URL</label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
                    <span className="border-r border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-400 shrink-0">
                      quackfocus.com/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32))}
                      placeholder="acme-technologies"
                      className="flex-1 px-3 py-3 text-sm text-gray-900 outline-none bg-white"
                    />
                  </div>
                  {slug && (
                    <p className="mt-1 text-xs text-gray-400">
                      Your admin URL: <span className="font-medium text-gray-600">quackfocus.com/{slug}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => name.trim() && slug.trim() && setStep(2)}
                disabled={!name.trim() || !slug.trim()}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="p-8">
              <div className="mb-8">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-3xl shadow-lg shadow-violet-200">
                  📋
                </div>
                <h1 className="text-2xl font-black text-gray-900">Tell us about your team</h1>
                <p className="mt-1.5 text-gray-500">We&apos;ll personalize your setup and recommend the right plan.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Industry</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map(ind => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setIndustry(ind)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                          industry === ind
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Team size</label>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_SIZES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTeamSize(s)}
                        className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all ${
                          teamSize === s
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !industry || !teamSize}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating workspace…
                    </>
                  ) : (
                    'Launch workspace 🚀'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}
