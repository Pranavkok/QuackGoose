import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/garden', label: 'Garden', icon: '🌱' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/rooms', label: 'Rooms', icon: '🦆' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export async function EmployeeShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      name: true,
      image: true,
      email: true,
      orgMemberships: { select: { role: true }, take: 1 },
    },
  });

  if (!user?.onboardingCompleted) redirect('/onboarding');

  const isAdmin = user.orgMemberships?.[0]?.role === 'OWNER' || user.orgMemberships?.[0]?.role === 'ADMIN';

  return (
    <div className="qf-employee-theme flex min-h-screen flex-col bg-gray-50">
      <nav className="qf-employee-header sticky top-0 z-40 border-b shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1">
            <Link href="/dashboard" className="mr-2 flex items-center gap-2 py-2">
              <span className="text-xl">🦆</span>
              <span className="qf-employee-brand hidden text-base font-bold tracking-tight sm:block">QuackFocus</span>
            </Link>

            <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="qf-employee-navlink flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                >
                  <span className="text-sm">{link.icon}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/org/dashboard"
                  className="qf-employee-admin-link ml-1 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-all"
                >
                  <span className="text-sm">🏢</span>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <ThemeToggle className="qf-employee-theme-toggle" />
            <div className="qf-employee-divider hidden h-5 w-px sm:block" />
            <div className="hidden items-center gap-2 md:flex">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? 'User'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-2 ring-gray-100"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {user.name?.charAt(0) ?? '?'}
                </div>
              )}
              <div>
                <p className="qf-employee-user-name text-sm font-semibold leading-tight">{user.name}</p>
                <p className="qf-employee-user-email text-xs leading-tight">{user.email}</p>
              </div>
            </div>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="qf-employee-signout rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-gray-200 bg-white/90">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <p>QuackFocus employee workspace</p>
          <p>Focused work. Healthy habits.</p>
        </div>
      </footer>
    </div>
  );
}
