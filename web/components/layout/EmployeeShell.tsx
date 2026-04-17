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
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1">
            <Link href="/dashboard" className="mr-2 flex items-center gap-2 py-2">
              <span className="text-xl">🦆</span>
              <span className="hidden text-base font-bold tracking-tight text-gray-900 sm:block">QuackFocus</span>
            </Link>

            <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="text-sm">{link.icon}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/org/dashboard"
                  className="ml-1 flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100"
                >
                  <span className="text-sm">🏢</span>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <ThemeToggle />
            <div className="hidden h-5 w-px bg-gray-200 sm:block" />
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
                <p className="text-sm font-semibold leading-tight text-gray-900">{user.name}</p>
                <p className="text-xs leading-tight text-gray-400">{user.email}</p>
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
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-gray-300 hover:text-gray-700"
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
