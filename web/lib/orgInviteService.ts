import { prisma } from '@/lib/prisma';

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

export async function acceptPendingInviteForUser(userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!userId || !normalizedEmail) return;

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    const invite = await tx.orgInvite.findFirst({
      where: {
        email: normalizedEmail,
        status: 'PENDING',
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orgId: true,
        role: true,
      },
    });

    if (!invite) return;

    const existingMembership = await tx.orgMember.findFirst({
      where: { userId },
      select: { orgId: true },
    });

    if (existingMembership && existingMembership.orgId !== invite.orgId) {
      return;
    }

    if (!existingMembership) {
      const subscription = await tx.subscription.findUnique({
        where: { orgId: invite.orgId },
        select: { seatsAllowed: true, seatsUsed: true },
      });

      if (subscription && subscription.seatsUsed >= subscription.seatsAllowed) {
        return;
      }

      await tx.orgMember.create({
        data: {
          orgId: invite.orgId,
          userId,
          role: invite.role,
        },
      });

      if (subscription) {
        await tx.subscription.update({
          where: { orgId: invite.orgId },
          data: { seatsUsed: { increment: 1 } },
        });
      }
    }

    await tx.orgInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });
  });
}
