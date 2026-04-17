import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SiteCategory } from '@/app/generated/prisma/client';

const VALID_CATEGORIES: SiteCategory[] = ['PRODUCTIVE', 'DISTRACTION', 'NEUTRAL'];

function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) return '';

  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const host = withoutProtocol.split('/')[0].split('?')[0].split('#')[0];
  return host.replace(/^www\./, '').replace(/:\d+$/, '');
}

function parseCategory(value: string): SiteCategory | null {
  const normalized = value.toUpperCase() as SiteCategory;
  return VALID_CATEGORIES.includes(normalized) ? normalized : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const overrides = await prisma.userWebsiteOverride.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(overrides);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const domain = normalizeDomain(body?.domain ?? '');
  const category = parseCategory(body?.category ?? '');

  if (!domain) return Response.json({ error: 'Domain is required' }, { status: 400 });
  if (!category) {
    return Response.json(
      { error: 'Category must be PRODUCTIVE, DISTRACTION, or NEUTRAL' },
      { status: 400 },
    );
  }

  const override = await prisma.userWebsiteOverride.upsert({
    where: {
      userId_domain: {
        userId: session.user.id,
        domain,
      },
    },
    create: {
      userId: session.user.id,
      domain,
      category,
    },
    update: { category },
  });

  return Response.json(override);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const domain = normalizeDomain(body?.domain ?? '');
  if (!domain) return Response.json({ error: 'Domain is required' }, { status: 400 });

  await prisma.userWebsiteOverride.deleteMany({
    where: {
      userId: session.user.id,
      domain,
    },
  });

  return Response.json({ success: true });
}
