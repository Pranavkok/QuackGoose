import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateCode(): string {
  const adjectives = ['DUCK', 'QUACK', 'FOCUS', 'WORK', 'DEEP'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${num}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { name?: string; durationMin?: number; allowedSites?: string[] };
  const { name = 'Focus Session', durationMin = 25, allowedSites = [] } = body;

  if (durationMin < 1 || durationMin > 180) {
    return NextResponse.json({ error: 'Duration must be between 1 and 180 minutes.' }, { status: 400 });
  }

  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.focusRoom.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const room = await prisma.focusRoom.create({
    data: {
      code,
      name: name.trim() || 'Focus Session',
      creatorId: session.user.id,
      durationMin,
      allowedSites,
      members: {
        create: { userId: session.user.id },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, image: true } } } } },
  });

  return NextResponse.json(room, { status: 201 });
}
