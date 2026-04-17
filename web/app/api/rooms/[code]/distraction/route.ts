import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await params;
  const body = (await req.json()) as { isDistracted: boolean; distractedSite?: string };

  const room = await prisma.focusRoom.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });

  const member = await prisma.focusRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: 'Not a member of this room.' }, { status: 403 });

  await prisma.focusRoomMember.update({
    where: { roomId_userId: { roomId: room.id, userId: session.user.id } },
    data: {
      isDistracted: body.isDistracted,
      distractedSite: body.isDistracted ? (body.distractedSite ?? null) : null,
      lastSeen: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
