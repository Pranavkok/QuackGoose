import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  if (!settings) return Response.json({ error: 'Settings not found' }, { status: 404 });
  return Response.json(settings);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Whitelist updatable fields
  const {
    distractionLimitMode,
    distractionLimitMinutes,
    dailyFocusGoalMinutes,
    enforcementLevel,
    workStartTime,
    workEndTime,
    duckEnabled,
    duckMessagesEnabled,
    weeklyEmailEnabled,
  } = body;

  const updated = await prisma.userSettings.update({
    where: { userId: session.user.id },
    data: {
      ...(distractionLimitMode !== undefined && { distractionLimitMode }),
      ...(distractionLimitMinutes !== undefined && { distractionLimitMinutes: parseInt(distractionLimitMinutes) }),
      ...(dailyFocusGoalMinutes !== undefined && { dailyFocusGoalMinutes: parseInt(dailyFocusGoalMinutes) }),
      ...(enforcementLevel !== undefined && { enforcementLevel }),
      ...(workStartTime !== undefined && { workStartTime }),
      ...(workEndTime !== undefined && { workEndTime }),
      ...(duckEnabled !== undefined && { duckEnabled }),
      ...(duckMessagesEnabled !== undefined && { duckMessagesEnabled }),
      ...(weeklyEmailEnabled !== undefined && { weeklyEmailEnabled }),
    },
  });
  return Response.json(updated);
}
