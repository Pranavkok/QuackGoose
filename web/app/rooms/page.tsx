'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RoomsLobbyPage() {
  const router = useRouter();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('Focus Session');
  const [duration, setDuration] = useState(25);
  const [allowedSites, setAllowedSites] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const sites = allowedSites
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, durationMin: duration, allowedSites: sites }),
    });
    const data = await res.json() as { code?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Failed to create room.');
      setLoading(false);
      return;
    }
    router.push(`/rooms/${data.code}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) { setError('Enter a room code.'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
    });
    const data = await res.json() as { code?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Failed to join room.');
      setLoading(false);
      return;
    }
    router.push(`/rooms/${data.code}`);
  }

  const presets = [15, 25, 45, 60];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 mb-4 text-sm text-gray-400 hover:text-gray-600">
            ← Back to dashboard
          </Link>
          <div className="mt-2 flex flex-col items-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl shadow-lg">
              🦆
            </div>
            <h1 className="text-2xl font-black text-gray-900">Focus Rooms</h1>
            <p className="mt-1 text-gray-500 text-sm">Stay accountable with a partner. If you drift, they&apos;ll know.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['create', 'join'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-all ${
                  tab === t
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'create' ? '✨ Create Room' : '🔑 Join Room'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {tab === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Session name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Deep Work Sprint"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Duration</label>
                  <div className="mb-3 flex gap-2">
                    {presets.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDuration(p)}
                        className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${
                          duration === p
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-600'
                        }`}
                      >
                        {p}m
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={duration}
                      onChange={e => setDuration(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="w-16 rounded-xl border border-gray-200 py-1.5 text-center text-sm font-bold text-gray-900">
                      {duration}m
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Allowed sites <span className="font-normal text-gray-400">(optional, comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={allowedSites}
                    onChange={e => setAllowedSites(e.target.value)}
                    placeholder="github.com, docs.google.com, notion.so"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                  <p className="mt-1 text-xs text-gray-400">Leave blank to allow all sites. Partner gets notified if either of you visits anything else.</p>
                </div>

                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : '🚀'}
                  {loading ? 'Creating room…' : 'Create Room'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-5">
                <div className="rounded-2xl bg-blue-50 p-5 text-center">
                  <p className="text-sm text-blue-700">Ask your partner to share their room code, then enter it below.</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Room code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="DUCK1234"
                    maxLength={10}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-lg font-black tracking-widest text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : '🔑'}
                  {loading ? 'Joining…' : 'Join Room'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Both partners must be logged in to QuackFocus for real-time alerts to work.
        </p>
      </div>
    </div>
  );
}
