import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await params;

  const room = await prisma.focusRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });

  const isMember = room.members.some(m => m.userId === session.user!.id);
  if (!isMember) return NextResponse.json({ error: 'You are not in this room.' }, { status: 403 });

  const now = new Date();
  if (room.status === 'ACTIVE' && room.endsAt && now > room.endsAt) {
    await prisma.focusRoom.update({ where: { id: room.id }, data: { status: 'ENDED' } });
    room.status = 'ENDED';
  }

  return NextResponse.json(room);
}
