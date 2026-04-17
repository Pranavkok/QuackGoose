import { classifyPage } from '@/lib/classificationService';
import { corsHeaders, corsResponse } from '@/lib/cors';
import { verifyExtensionToken } from '@/lib/extensionAuth';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const userId = await verifyExtensionToken(req);
  if (!userId) return corsResponse({ error: 'Unauthorized' }, 401);

  const body = (await req.json()) as {
    domain?: string;
    title?: string;
    metaDescription?: string;
    h1?: string;
    h2s?: string[];
    ogType?: string;
  };

  if (!body?.domain || typeof body.domain !== 'string') {
    return corsResponse({ error: 'Missing domain' }, 400);
  }

  const result = await classifyPage(userId, {
    domain: body.domain,
    title: body.title,
    metaDescription: body.metaDescription,
    h1: body.h1,
    h2s: body.h2s,
    ogType: body.ogType,
  });
  return corsResponse(result);
}
