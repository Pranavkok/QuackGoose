import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OrgMembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const membership = await prisma.orgMember.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    include: {
      org: {
        include: {
          subscription: { select: { seatsAllowed: true, seatsUsed: true, plan: true } },
          members: {
            orderBy: { joinedAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  createdAt: true,
                  dailySummaries: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { productivityScore: true, focusStreak: true },
                  },
                },
              },
            },
          },
          invites: {
            where: { status: 'PENDING' },
            select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!membership) redirect('/dashboard');

  const org = membership.org;
  const seatsUsed = org.subscription?.seatsUsed ?? org.members.length;
  const seatsAllowed = org.subscription?.seatsAllowed ?? 20;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-1 text-sm text-gray-500">
            {seatsUsed} of {seatsAllowed} seats used
          </p>
        </div>
        <InviteButton />
      </div>

      {/* Seats usage bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Seat usage</p>
          <p className="text-sm text-gray-500">
            {seatsUsed}/{seatsAllowed} seats
            {org.subscription && (
              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {org.subscription.plan}
              </span>
            )}
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              seatsUsed / seatsAllowed > 0.9 ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min((seatsUsed / seatsAllowed) * 100, 100)}%` }}
          />
        </div>
        {seatsUsed >= seatsAllowed && (
          <p className="mt-2 text-xs text-red-600">
            You&apos;ve reached your seat limit.{' '}
            <Link href="/org/billing" className="font-semibold underline">
              Upgrade your plan
            </Link>{' '}
            to invite more employees.
          </p>
        )}
      </div>

      {/* Active members */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Active Members ({org.members.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {org.members.map((m) => {
            const score = m.user.dailySummaries[0]?.productivityScore ?? null;
            const streak = m.user.dailySummaries[0]?.focusStreak ?? 0;
            return (
              <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-sm font-bold text-white">
                  {m.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.user.name ?? 'Unknown'}</p>
                    <RoleBadge role={m.role} />
                  </div>
                  <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                </div>
                <div className="hidden items-center gap-6 sm:flex text-center">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {score !== null ? `${score}/100` : '—'}
                    </p>
                    <p className="text-xs text-gray-400">Score</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{streak}d</p>
                    <p className="text-xs text-gray-400">Streak</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(m.joinedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-400">Joined</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {org.invites.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 shadow-sm">
          <div className="border-b border-amber-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-amber-900">Pending Invites ({org.invites.length})</h2>
          </div>
          <div className="divide-y divide-amber-100/60">
            {org.invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{invite.email}</p>
                  <p className="text-xs text-gray-500">
                    Invited {new Date(invite.createdAt).toLocaleDateString('en-IN')} ·
                    Expires {new Date(invite.expiresAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={invite.role} />
                  <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {org.members.length === 0 && org.invites.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="text-5xl">👥</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No employees yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Invite your team to start tracking and improving their focus.
          </p>
          <InviteButton className="mt-6 inline-flex" />
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: 'bg-amber-100 text-amber-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    MEMBER: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[role] ?? styles.MEMBER}`}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

function InviteButton({ className }: { className?: string }) {
  return (
    <Link
      href="/org/invite"
      className={`rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 transition-colors ${className ?? ''}`}
    >
      + Invite Employee
    </Link>
  );
}
