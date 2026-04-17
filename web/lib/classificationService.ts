import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import {
  ProductivityType,
  SiteCategory,
  SiteSubcategory,
} from '@/app/generated/prisma/enums';
import { checkPreset } from '@/lib/presetClassifications';

type ScrapeInput = {
  domain: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  h2s?: string[];
  ogType?: string;
};

type ClassificationResult = {
  category: SiteCategory;
  subcategory: SiteSubcategory;
  confidence: number;
  cached: boolean;
  reasoning?: string;
};

type ModelResult = Omit<ClassificationResult, 'cached'>;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const VALID_CATEGORIES = new Set(Object.values(SiteCategory));
const VALID_SUBCATEGORIES = new Set(Object.values(SiteSubcategory));

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

function normalizePolicyDomain(input: string) {
  const trimmed = String(input || '').trim().toLowerCase();
  if (!trimmed) return '';

  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0] || '';
  const withoutPort = withoutPath.split(':')[0] || '';
  const withoutWildcard = withoutPort.replace(/^\*\./, '');
  return withoutWildcard.replace(/^www\./, '');
}

function matchesDomainRule(domain: string, rule: string) {
  if (!rule) return false;
  return domain === rule || domain.endsWith(`.${rule}`);
}

function matchesAnyRule(domain: string, rules: string[]) {
  return rules.some((rule) => matchesDomainRule(domain, rule));
}

function normalizeConfidence(value: unknown) {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeModelResult(input: unknown): ModelResult {
  const parsed = (input ?? {}) as {
    category?: string;
    subcategory?: string;
    confidence?: number | string;
    reasoning?: string;
  };

  const category = VALID_CATEGORIES.has(parsed.category as SiteCategory)
    ? (parsed.category as SiteCategory)
    : SiteCategory.NEUTRAL;

  const subcategory = VALID_SUBCATEGORIES.has(parsed.subcategory as SiteSubcategory)
    ? (parsed.subcategory as SiteSubcategory)
    : SiteSubcategory.OTHER;

  const confidence = normalizeConfidence(parsed.confidence);
  const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';

  return {
    category: confidence < 0.6 ? SiteCategory.NEUTRAL : category,
    subcategory,
    confidence,
    reasoning,
  };
}

function extractFirstJsonObject(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  return match?.[0] || '';
}

function createPrompt(productivityType: ProductivityType, input: ScrapeInput) {
  return `You are classifying a website for a productivity tracking app.

User's work type: ${productivityType}

Website info:
- Domain: ${input.domain}
- Page title: ${input.title || 'N/A'}
- Meta description: ${input.metaDescription || 'N/A'}
- Main heading: ${input.h1 || 'N/A'}
- Sub-headings: ${input.h2s?.join(' | ') || 'N/A'}
- OG type: ${input.ogType || 'N/A'}

Classify this page. Return ONLY a JSON object, no prose:
{
  "category": "PRODUCTIVE" | "DISTRACTION" | "NEUTRAL",
  "subcategory": one of [CODING, DOCUMENTATION, RESEARCH, WRITING, DESIGN, LEARNING, SOCIAL_MEDIA, VIDEO_ENTERTAINMENT, NEWS, SHOPPING, GAMING, COMMUNICATION, PRODUCTIVITY_TOOL, OTHER],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}`;
}

async function callAnthropic(prompt: string): Promise<ModelResult | null> {
  if (!anthropic) return null;

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
  const response = await anthropic.messages.create({
    model,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(item => item.type === 'text');
  const raw = textBlock?.type === 'text' ? textBlock.text : '';
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) return null;

  return normalizeModelResult(JSON.parse(jsonText));
}

async function callGemini(prompt: string): Promise<ModelResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonText = extractFirstJsonObject(text) || text;
  if (!jsonText) return null;

  return normalizeModelResult(JSON.parse(jsonText));
}

async function callModel(productivityType: ProductivityType, input: ScrapeInput): Promise<ModelResult> {
  const prompt = createPrompt(productivityType, input);

  try {
    const anthropicResult = await callAnthropic(prompt);
    if (anthropicResult) return anthropicResult;
  } catch {
    // Fall through to Gemini if Anthropic fails.
  }

  try {
    const geminiResult = await callGemini(prompt);
    if (geminiResult) return geminiResult;
  } catch {
    // Fall through to default response.
  }

  return {
    category: SiteCategory.NEUTRAL,
    subcategory: SiteSubcategory.OTHER,
    confidence: 0,
    reasoning: 'No model provider configured',
  };
}

export async function classifyPage(userId: string, input: ScrapeInput): Promise<ClassificationResult> {
  const normalizedDomain = normalizeDomain(input.domain || '');
  if (!normalizedDomain) {
    return {
      category: SiteCategory.NEUTRAL,
      subcategory: SiteSubcategory.OTHER,
      confidence: 0,
      cached: true,
      reasoning: 'Missing domain',
    };
  }

  const [orgMembership, override, profile] = await Promise.all([
    prisma.orgMember.findFirst({
      where: { userId },
      select: {
        org: {
          select: {
            policy: {
              select: {
                blockedDomains: true,
                allowedDomains: true,
              },
            },
          },
        },
      },
    }),
    prisma.userWebsiteOverride.findUnique({
      where: { userId_domain: { userId, domain: normalizedDomain } },
    }),
    prisma.onboardingProfile.findUnique({
      where: { userId },
      select: {
        productivityType: true,
        alwaysProductiveDomains: true,
        alwaysBlockedDomains: true,
      },
    }),
  ]);

  const orgPolicy = orgMembership?.org?.policy;
  const orgBlockedDomains = (orgPolicy?.blockedDomains ?? [])
    .map(normalizePolicyDomain)
    .filter(Boolean);
  const orgAllowedDomains = (orgPolicy?.allowedDomains ?? [])
    .map(normalizePolicyDomain)
    .filter(Boolean);

  if (matchesAnyRule(normalizedDomain, orgBlockedDomains)) {
    return {
      category: SiteCategory.DISTRACTION,
      subcategory: SiteSubcategory.OTHER,
      confidence: 1,
      cached: true,
      reasoning: 'Matched organization blocked list',
    };
  }

  if (matchesAnyRule(normalizedDomain, orgAllowedDomains)) {
    return {
      category: SiteCategory.PRODUCTIVE,
      subcategory: SiteSubcategory.OTHER,
      confidence: 1,
      cached: true,
      reasoning: 'Matched organization allowed list',
    };
  }

  if (override) {
    return {
      category: override.category,
      subcategory: SiteSubcategory.OTHER,
      confidence: 1,
      cached: true,
      reasoning: 'Matched user override',
    };
  }

  if (profile?.alwaysProductiveDomains.includes(normalizedDomain)) {
    return {
      category: SiteCategory.PRODUCTIVE,
      subcategory: SiteSubcategory.OTHER,
      confidence: 1,
      cached: true,
      reasoning: 'Matched onboarding always-productive list',
    };
  }

  if (profile?.alwaysBlockedDomains.includes(normalizedDomain)) {
    return {
      category: SiteCategory.DISTRACTION,
      subcategory: SiteSubcategory.OTHER,
      confidence: 1,
      cached: true,
      reasoning: 'Matched onboarding always-blocked list',
    };
  }

  const preset = checkPreset(normalizedDomain);
  if (preset) {
    return {
      ...preset,
      confidence: 1,
      cached: true,
      reasoning: 'Matched preset list',
    };
  }

  const cached = await prisma.websiteClassification.findUnique({
    where: { domain: normalizedDomain },
  });
  if (cached && cached.expiresAt > new Date()) {
    return {
      category: cached.category,
      subcategory: cached.subcategory,
      confidence: cached.confidence,
      cached: true,
      reasoning: 'Matched classification cache',
    };
  }

  const modelResult = await callModel(profile?.productivityType || ProductivityType.OTHER, {
    ...input,
    domain: normalizedDomain,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.websiteClassification.upsert({
    where: { domain: normalizedDomain },
    create: {
      domain: normalizedDomain,
      category: modelResult.category,
      subcategory: modelResult.subcategory,
      confidence: modelResult.confidence,
      aiClassified: true,
      expiresAt,
    },
    update: {
      category: modelResult.category,
      subcategory: modelResult.subcategory,
      confidence: modelResult.confidence,
      classifiedAt: new Date(),
      expiresAt,
    },
  });

  return {
    ...modelResult,
    cached: false,
  };
}
