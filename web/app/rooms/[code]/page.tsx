'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RoomMember {
  id: string;
  userId: string;
  isDistracted: boolean;
  distractedSite: string | null;
  lastSeen: string;
  user: { id: string; name: string | null; image: string | null };
}

interface Room {
  id: string;
  code: string;
  name: string;
  durationMin: number;
  allowedSites: string[];
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  startedAt: string | null;
  endsAt: string | null;
  creatorId: string;
  members: RoomMember[];
}

function Avatar({ user }: { user: { name: string | null; image: string | null } }) {
  if (user.image) {
    return <img src={user.image} alt={user.name ?? ''} className="h-12 w-12 rounded-full ring-2 ring-white" />;
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white ring-2 ring-white">
      {user.name?.charAt(0) ?? '?'}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RoomSessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [notif, setNotif] = useState<string | null>(null);
  const [prevDistracted, setPrevDistracted] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    if (res.status === 401) { router.push('/login'); return; }
    if (!res.ok) { router.push('/rooms'); return; }
    const data = await res.json() as Room;
    setRoom(data);
    return data;
  }, [code, router]);

  // Get current user id from session once
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then((d: { user?: { id?: string } }) => { if (d?.user?.id) setCurrentUserId(d.user.id); });
  }, []);

  // Initial load
  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // Polling every 4s
  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await fetchRoom();
      if (!updated) return;

      // Detect partner distraction changes → show notification
      updated.members.forEach(m => {
        if (m.userId === currentUserId) return;
        const wasDistracted = prevDistracted[m.userId] ?? false;
        if (!wasDistracted && m.isDistracted) {
          const name = m.user.name ?? 'Your partner';
          setNotif(`🦆 ${name} got distracted${m.distractedSite ? ` (${m.distractedSite})` : ''}!`);
          setTimeout(() => setNotif(null), 5000);
        } else if (wasDistracted && !m.isDistracted) {
          const name = m.user.name ?? 'Your partner';
          setNotif(`✅ ${name} is back on track!`);
          setTimeout(() => setNotif(null), 3000);
        }
      });

      const newPrev: Record<string, boolean> = {};
      updated.members.forEach(m => { newPrev[m.userId] = m.isDistracted; });
      setPrevDistracted(newPrev);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchRoom, currentUserId, prevDistracted]);

  // Countdown timer
  useEffect(() => {
    if (!room?.endsAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(room.endsAt!).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [room?.endsAt]);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-400">Loading room…</p>
        </div>
      </div>
    );
  }

  const me = room.members.find(m => m.userId === currentUserId);
  const partner = room.members.find(m => m.userId !== currentUserId);
  const totalSeconds = room.durationMin * 60;
  const progress = room.status === 'ACTIVE' ? Math.max(0, Math.min(1, 1 - secondsLeft / totalSeconds)) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Notification toast */}
      {notif && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-bounce rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-2xl">
          {notif}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🦆</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{room.name}</p>
              <p className="text-xs text-gray-400">{room.durationMin}min focus session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:border-blue-300 hover:text-blue-600"
            >
              {copied ? '✓ Copied!' : `📋 ${code}`}
            </button>
            <Link
              href="/rooms"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
            >
              Leave
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {/* Status banner */}
        {room.status === 'WAITING' && (
          <div className="mb-8 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-8 text-center">
            <div className="mb-3 text-4xl animate-bounce">🦆</div>
            <h2 className="text-lg font-black text-blue-900">Waiting for your partner…</h2>
            <p className="mt-1 text-sm text-blue-600">Share this code with them:</p>
            <button
              onClick={copyCode}
              className="mt-3 rounded-xl bg-blue-600 px-6 py-2 text-xl font-black tracking-widest text-white hover:bg-blue-700"
            >
              {copied ? 'Copied!' : code}
            </button>
            <p className="mt-3 text-xs text-blue-400">Session starts automatically when they join.</p>
          </div>
        )}

        {room.status === 'ENDED' && (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center border border-green-100">
            <div className="mb-3 text-4xl">🎉</div>
            <h2 className="text-xl font-black text-green-900">Session Complete!</h2>
            <p className="mt-1 text-sm text-green-600">Great work staying focused together.</p>
            <Link
              href="/rooms"
              className="mt-4 inline-block rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700"
            >
              Start a new session
            </Link>
          </div>
        )}

        {/* Timer */}
        {room.status === 'ACTIVE' && (
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-4 h-40 w-40">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={secondsLeft < 60 ? '#ef4444' : '#3b82f6'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * progress}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-black tabular-nums ${secondsLeft < 60 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs text-gray-400">remaining</span>
              </div>
            </div>
            {secondsLeft < 60 && secondsLeft > 0 && (
              <p className="text-sm font-bold text-red-500 animate-pulse">Almost done — hold on!</p>
            )}
          </div>
        )}

        {/* Partners */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Me */}
          {me && (
            <div className={`rounded-2xl border-2 p-6 transition-all ${
              me.isDistracted
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar user={me.user} />
                  <div>
                    <p className="font-bold text-gray-900">{me.user.name ?? 'You'} <span className="text-xs text-gray-400">(you)</span></p>
                    <p className={`text-sm font-semibold ${me.isDistracted ? 'text-red-600' : 'text-green-600'}`}>
                      {me.isDistracted ? '😬 Distracted' : '✅ Focused'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl">{me.isDistracted ? '😬' : '🎯'}</span>
              </div>
              {me.isDistracted && me.distractedSite && (
                <p className="mt-3 rounded-xl bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 truncate">
                  {me.distractedSite}
                </p>
              )}
            </div>
          )}

          {/* Partner */}
          {partner ? (
            <div className={`rounded-2xl border-2 p-6 transition-all ${
              partner.isDistracted
                ? 'border-amber-200 bg-amber-50'
                : 'border-blue-100 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar user={partner.user} />
                  <div>
                    <p className="font-bold text-gray-900">{partner.user.name ?? 'Partner'}</p>
                    <p className={`text-sm font-semibold ${partner.isDistracted ? 'text-amber-600' : 'text-blue-600'}`}>
                      {partner.isDistracted ? '😬 Distracted' : '✅ Focused'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl">{partner.isDistracted ? '🦆' : '🎯'}</span>
              </div>
              {partner.isDistracted && partner.distractedSite && (
                <p className="mt-3 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 truncate">
                  {partner.distractedSite}
                </p>
              )}
              {partner.isDistracted && (
                <p className="mt-2 text-xs text-amber-600 font-medium animate-pulse">
                  🦆 Your duck is watching them…
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <span className="mb-2 text-3xl opacity-40">👤</span>
              <p className="text-sm font-semibold text-gray-400">Waiting for partner</p>
              <p className="mt-1 text-xs text-gray-300">Share code: <strong>{code}</strong></p>
            </div>
          )}
        </div>

        {/* Allowed sites */}
        {room.allowedSites.length > 0 && (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <p className="mb-3 text-sm font-bold text-gray-700">Allowed sites for this session</p>
            <div className="flex flex-wrap gap-2">
              {room.allowedSites.map(site => (
                <span key={site} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {site}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Extension note */}
        {room.status === 'ACTIVE' && (
          <div className="mt-6 rounded-2xl bg-gray-900 p-5 text-sm text-gray-300">
            <p className="font-bold text-white mb-1">🔌 Extension integration</p>
            <p>The QuackFocus extension will automatically report distractions to this room when you have it installed and signed in.</p>
          </div>
        )}
      </main>
    </div>
  );
}
