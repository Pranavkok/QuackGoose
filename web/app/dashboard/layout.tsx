import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true, name: true, image: true },
  });

  if (!user?.onboardingCompleted) redirect('/onboarding');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold">🦆 QuackFocus</Link>
          <div className="flex gap-4 text-sm font-medium text-gray-600">
            <Link href="/dashboard" className="hover:text-black transition-colors">Dashboard</Link>
            <Link href="/garden" className="hover:text-black transition-colors">Garden</Link>
            <Link href="/analytics" className="hover:text-black transition-colors">Analytics</Link>
            <Link href="/settings" className="hover:text-black transition-colors">Settings</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user.image && (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-600">{user.name}</span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
