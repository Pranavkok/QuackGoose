import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
    <div className="qf-admin-theme flex min-h-screen flex-col bg-gray-50">
      {/* Top nav */}
      <nav className="qf-admin-header sticky top-0 z-40 border-b shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/org/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <div>
                <p className="qf-admin-brand text-sm font-bold leading-tight">{org.name}</p>
                <p className="qf-admin-subtitle text-xs leading-tight">Admin Panel</p>
              </div>
            </Link>
            <div className="hidden min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap md:flex">
              {orgNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="qf-admin-navlink flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {org.subscription && (
              <div className="qf-admin-planpill hidden rounded-full border px-3 py-1 md:block">
                <span className="text-xs font-semibold">
                  {org.subscription.plan} · {org.subscription.seatsUsed}/{org.subscription.seatsAllowed} seats
                </span>
              </div>
            )}
            <ThemeToggle className="qf-admin-theme-toggle" />
            <div className="qf-admin-divider hidden h-5 w-px sm:block" />
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
              <span className="qf-admin-user hidden text-sm font-medium md:block">{user?.name}</span>
            </div>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="qf-admin-signout rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="qf-admin-footer border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs sm:flex-row sm:px-6 lg:px-8">
          <p>QuackFocus admin workspace</p>
          <p>Policy-first focus operations.</p>
        </div>
      </footer>
    </div>
  );
}
