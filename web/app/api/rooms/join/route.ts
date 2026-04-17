import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Room code is required.' }, { status: 400 });

  const room = await prisma.focusRoom.findUnique({
    where: { code },
    include: { members: true },
  });

  if (!room) return NextResponse.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 });
  if (room.status === 'ENDED') return NextResponse.json({ error: 'This session has already ended.' }, { status: 410 });

  const alreadyMember = room.members.some(m => m.userId === session.user!.id);
  if (!alreadyMember) {
    await prisma.focusRoomMember.create({
      data: { roomId: room.id, userId: session.user.id },
    });
  }

  if (room.status === 'WAITING' && room.members.length >= 1) {
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + room.durationMin * 60 * 1000);
    await prisma.focusRoom.update({
      where: { id: room.id },
      data: { status: 'ACTIVE', startedAt, endsAt },
    });
  }

  return NextResponse.json({ code: room.code });
}
