import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import QuestionWizard from '@/components/onboarding/QuestionWizard';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });

  if (user?.onboardingCompleted) redirect('/dashboard');

  return <QuestionWizard />;
}
