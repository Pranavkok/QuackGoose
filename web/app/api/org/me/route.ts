import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ orgId: null });

  const membership = await prisma.orgMember.findFirst({
    where: { userId: session.user.id, role: { in: ['OWNER', 'ADMIN'] } },
    select: { orgId: true, role: true },
  });

  return NextResponse.json({ orgId: membership?.orgId ?? null, role: membership?.role ?? null });
}
