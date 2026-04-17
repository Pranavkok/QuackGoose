import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OrgDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const params = await searchParams;
  const isWelcome = params.welcome === '1';

  const membership = await prisma.orgMember.findFirst({
    where: { userId: session.user.id, role: { in: ['OWNER', 'ADMIN'] } },
    include: {
      org: {
        include: {
          subscription: true,
          policy: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  email: true,
                  dailySummaries: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: {
                      productivityScore: true,
                      totalFocusMinutes: true,
                      totalDistractionMinutes: true,
                      limitReached: true,
                      focusStreak: true,
                    },
                  },
                },
              },
            },
          },
          invites: {
            where: { status: 'PENDING' },
            select: { id: true, email: true },
          },
        },
      },
    },
  });

  if (!membership) redirect('/setup');

  const org = membership.org;
  const members = org.members;

  const totalMembers    = members.length;
  const hasData         = members.some(m => m.user.dailySummaries.length > 0);
  const membersWithData = members.filter(m => m.user.dailySummaries.length > 0);

  const avgScore = membersWithData.length > 0
    ? Math.round(membersWithData.reduce((s, m) => s + (m.user.dailySummaries[0]?.productivityScore ?? 0), 0) / membersWithData.length)
    : 0;

  const focusedToday    = members.filter(m => (m.user.dailySummaries[0]?.productivityScore ?? 0) >= 60).length;
  const distractedToday = members.filter(m => m.user.dailySummaries[0]?.limitReached === true).length;
  const totalFocusMin   = members.reduce((s, m) => s + (m.user.dailySummaries[0]?.totalFocusMinutes ?? 0), 0);
  const pendingInvites  = org.invites.length;

  const teamRows = members
    .map(m => {
      const s = m.user.dailySummaries[0];
      return {
        id:         m.user.id,
        name:       m.user.name ?? 'Unknown',
        email:      m.user.email ?? '',
        role:       m.role,
        score:      s?.productivityScore ?? 0,
        focusMin:   s?.totalFocusMinutes ?? 0,
        distractMin:s?.totalDistractionMinutes ?? 0,
        streak:     s?.focusStreak ?? 0,
        limitHit:   s?.limitReached ?? false,
        hasData:    !!s,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">

      {/* ── Welcome banner (only shown once after org creation) ── */}
      {isWelcome && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-blue-200">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-white/5 [clip-path:ellipse(70%_100%_at_100%_50%)]" />
          <div className="relative">
            <div className="text-4xl">🎉</div>
            <h2 className="mt-3 text-2xl font-black">Welcome to {org.name}!</h2>
            <p className="mt-2 max-w-xl text-blue-100">
              Your workspace is ready. Complete these 3 steps to get your team up and running.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { n: '1', title: 'Configure policies', desc: 'Set blocked sites & work hours', href: '/org/settings', done: !!org.policy?.blockedDomains.length },
                { n: '2', title: 'Invite employees', desc: 'Add your first team members', href: '/org/members', done: totalMembers > 1 },
                { n: '3', title: 'Deploy extension', desc: 'Share install link with IT team', href: '/org/members', done: false },
              ].map(step => (
                <Link key={step.n} href={step.href}
                  className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4 transition-all hover:bg-white/20"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${step.done ? 'bg-green-400 text-green-900' : 'bg-white/20 text-white'}`}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{step.title}</p>
                    <p className="mt-0.5 text-xs text-blue-200">{step.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{org.name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Team overview ·{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/org/members"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            + Invite employee
          </Link>
          <Link href="/org/settings"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700"
          >
            ⚙️ Policies
          </Link>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon="📊" label="Team Avg Score" value={hasData ? `${avgScore}/100` : '—'} sub="Today's productivity" color="blue" />
        <KpiCard icon="🎯" label="Focused Today" value={`${focusedToday}/${totalMembers}`} sub="Score ≥ 60" color="green" />
        <KpiCard icon="⚠️" label="Limit Breaches" value={String(distractedToday)} sub="Hit distraction limit" color={distractedToday > 0 ? 'red' : 'green'} />
        <KpiCard icon="⏱️" label="Team Focus" value={fmt(totalFocusMin)} sub="Combined today" color="amber" />
      </div>

      {/* ── Subscription + quick actions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Plan card */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Current Plan</p>
              <p className="mt-1 text-2xl font-black text-blue-900">
                {org.subscription?.plan ?? 'STARTER'}
              </p>
              {org.subscription?.status === 'TRIAL' && org.subscription.trialEndsAt && (
                <p className="mt-1 text-xs font-medium text-blue-600">
                  Trial ends {new Date(org.subscription.trialEndsAt).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-blue-200 bg-white px-3 py-1">
              <p className="text-xs font-bold text-blue-700">
                {org.subscription?.seatsUsed ?? totalMembers}/{org.subscription?.seatsAllowed ?? 20} seats
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
              style={{ width: `${Math.min(((org.subscription?.seatsUsed ?? totalMembers) / (org.subscription?.seatsAllowed ?? 20)) * 100, 100)}%` }}
            />
          </div>
          <Link href="/org/billing" className="mt-4 block text-xs font-bold text-blue-600 hover:text-blue-800">
            Manage billing →
          </Link>
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map(a => (
            <Link key={a.label} href={a.href}
              className="group flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
            >
              <span className="text-2xl">{a.icon}</span>
              <p className="mt-2 text-xs font-bold text-gray-700 group-hover:text-blue-700">{a.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Employee table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="font-bold text-gray-900">Employee Productivity</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {totalMembers} member{totalMembers !== 1 ? 's' : ''}{pendingInvites > 0 ? ` · ${pendingInvites} invite${pendingInvites !== 1 ? 's' : ''} pending` : ''}
            </p>
          </div>
          <Link href="/org/members"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Manage →
          </Link>
        </div>

        {teamRows.length === 0 ? (
          <EmptyTeam />
        ) : (
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 border-b border-gray-50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 lg:grid-cols-[auto_1fr_auto_auto_auto_auto]">
              <span className="w-6 text-center">#</span>
              <span>Employee</span>
              <span className="hidden text-right lg:block">Focus</span>
              <span className="hidden text-right lg:block">Distracted</span>
              <span className="hidden text-right lg:block">Streak</span>
              <span className="text-right">Status</span>
            </div>

            <div className="divide-y divide-gray-50/80">
              {teamRows.map((m, i) => {
                const statusLabel = !m.hasData ? 'No data'
                  : m.score >= 70 ? 'Focused'
                  : m.score >= 40 ? 'Moderate'
                  : 'Distracted';
                const statusClass = !m.hasData ? 'bg-gray-50 text-gray-400'
                  : m.score >= 70 ? 'bg-green-50 text-green-700'
                  : m.score >= 40 ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700';
                const barClass = m.score >= 70 ? 'from-green-400 to-emerald-500'
                  : m.score >= 40 ? 'from-amber-400 to-orange-500'
                  : 'from-red-400 to-red-600';

                return (
                  <div key={m.id}
                    className="group grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60 lg:grid-cols-[auto_1fr_auto_auto_auto_auto]"
                  >
                    {/* Rank */}
                    <span className="flex w-6 items-center justify-center text-sm font-black text-gray-200 group-hover:text-gray-300">
                      {i + 1}
                    </span>

                    {/* Name + email */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-sm font-black text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-gray-900">{m.name}</p>
                          {m.role !== 'MEMBER' && <RoleBadge role={m.role} />}
                        </div>
                        <p className="truncate text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>

                    {/* Focus */}
                    <div className="hidden items-center justify-end text-right lg:flex">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{fmt(m.focusMin)}</p>
                        <p className="text-xs text-gray-400">focus</p>
                      </div>
                    </div>

                    {/* Distracted */}
                    <div className="hidden items-center justify-end text-right lg:flex">
                      <div>
                        <p className={`text-sm font-bold ${m.limitHit ? 'text-red-600' : 'text-gray-900'}`}>
                          {fmt(m.distractMin)} {m.limitHit && '⚠️'}
                        </p>
                        <p className="text-xs text-gray-400">distracted</p>
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="hidden items-center justify-end text-right lg:flex">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{m.streak}d</p>
                        <p className="text-xs text-gray-400">streak</p>
                      </div>
                    </div>

                    {/* Score bar + status */}
                    <div className="flex items-center gap-3">
                      {m.hasData && (
                        <div className="hidden w-24 lg:block">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-1.5">
                              <div className={`h-full rounded-full bg-gradient-to-r ${barClass}`} style={{ width: `${m.score}%` }} />
                            </div>
                            <span className="w-8 text-right text-xs font-black text-gray-600">{m.score}</span>
                          </div>
                        </div>
                      )}
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Policy snapshot ── */}
      {org.policy ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PolicyCard icon="🛡️" label="Enforcement" value={org.policy.enforcementLevel.replace('_', ' ')} />
          <PolicyCard icon="🕐" label="Work Hours" value={`${org.policy.workStartTime} – ${org.policy.workEndTime}`} />
          <PolicyCard icon="🚫" label="Blocked Sites" value={`${org.policy.blockedDomains.length} domain${org.policy.blockedDomains.length !== 1 ? 's' : ''}`} />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="font-bold text-gray-900">No policies configured yet</p>
              <p className="text-sm text-gray-500">Set org-wide blocked sites, work hours, and enforcement rules.</p>
            </div>
          </div>
          <Link href="/org/settings"
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
          >
            Configure →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(min: number) {
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${min}m`;
}

const quickActions = [
  { icon: '👥', label: 'Invite Members',    href: '/org/members'  },
  { icon: '🚫', label: 'Block Sites',       href: '/org/settings' },
  { icon: '📈', label: 'View Analytics',    href: '/analytics'    },
  { icon: '💳', label: 'Billing & Plan',    href: '/org/billing'  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: 'blue' | 'green' | 'red' | 'amber' }) {
  const cls = {
    blue:  'from-blue-50 to-indigo-50 border-blue-100 text-blue-900',
    green: 'from-green-50 to-emerald-50 border-green-100 text-green-900',
    red:   'from-red-50 to-rose-50 border-red-100 text-red-900',
    amber: 'from-amber-50 to-orange-50 border-amber-100 text-amber-900',
  }[color];
  const sub_cls = { blue: 'text-blue-500', green: 'text-green-500', red: 'text-red-500', amber: 'text-amber-500' }[color];
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${cls}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className={`mt-1 text-xs ${sub_cls}`}>{sub}</p>
    </div>
  );
}

function PolicyCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{icon} {label}</p>
      <p className="mt-2 text-base font-bold capitalize text-gray-900">{value.toLowerCase()}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const s: Record<string, string> = {
    OWNER: 'bg-amber-100 text-amber-700',
    ADMIN: 'bg-blue-100 text-blue-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s[role] ?? ''}`}>{role.charAt(0) + role.slice(1).toLowerCase()}</span>;
}

function EmptyTeam() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-4xl">👥</div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">No employees yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-gray-500">
        Invite your team to start tracking and improving their focus. Each member gets their own dashboard and garden.
      </p>
      <Link href="/org/members"
        className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all"
      >
        Invite your first employee →
      </Link>
    </div>
  );
}
