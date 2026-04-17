import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from '@/lib/auth';

const orgNavLinks = [
  { href: '/org/dashboard', label: 'Overview', icon: '📊' },
  { href: '/org/members', label: 'Members', icon: '👥' },
  { href: '/org/settings', label: 'Policies', icon: '🛡️' },
  { href: '/dashboard', label: 'My Dashboard', icon: '🦆' },
];

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      email: true,
      orgMemberships: {
        select: {
          role: true,
          org: { select: { id: true, name: true, subscription: { select: { plan: true, seatsUsed: true, seatsAllowed: true } } } },
        },
        take: 1,
      },
    },
  });

  const membership = user?.orgMemberships?.[0];
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    redirect('/setup');
  }

  const org = membership.org;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/org/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <div>
                <p className="text-sm font-bold leading-tight text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-400 leading-tight">Admin Panel</p>
              </div>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {orgNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {org.subscription && (
              <div className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1 md:block">
                <span className="text-xs font-semibold text-blue-700">
                  {org.subscription.plan} · {org.subscription.seatsUsed}/{org.subscription.seatsAllowed} seats
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? 'Admin'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-2 ring-gray-100"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {user?.name?.charAt(0) ?? '?'}
                </div>
              )}
              <span className="hidden text-sm font-medium text-gray-700 md:block">{user?.name}</span>
            </div>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
