import { corsHeaders, corsResponse } from '@/lib/cors';
import { verifyExtensionToken } from '@/lib/extensionAuth';
import { recordActivity } from '@/lib/productivityEngine';
import type { SiteCategory, SiteSubcategory } from '@/app/generated/prisma/enums';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);

  try {
    const body = (await req.json()) as {
      domain: string;
      pageTitle: string;
      category: SiteCategory;
      subcategory: SiteSubcategory;
      isProductive: boolean;
      durationSeconds: number;
      startedAt: string;
      endedAt: string;
    };

    const result = await recordActivity(userId, body);
    return corsResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return corsResponse({ error: message }, 400);
  }
}
