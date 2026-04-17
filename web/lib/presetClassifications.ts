import { SiteCategory, SiteSubcategory } from '@/app/generated/prisma/enums';

type PresetMatch = {
  category: SiteCategory;
  subcategory: SiteSubcategory;
};

export const ALWAYS_PRODUCTIVE: Record<string, SiteSubcategory> = {
  'github.com': SiteSubcategory.CODING,
  'gitlab.com': SiteSubcategory.CODING,
  'stackoverflow.com': SiteSubcategory.CODING,
  'docs.google.com': SiteSubcategory.DOCUMENTATION,
  'notion.so': SiteSubcategory.PRODUCTIVITY_TOOL,
  'linear.app': SiteSubcategory.PRODUCTIVITY_TOOL,
  'figma.com': SiteSubcategory.DESIGN,
  'vercel.com': SiteSubcategory.CODING,
  'developer.mozilla.org': SiteSubcategory.DOCUMENTATION,
  'npmjs.com': SiteSubcategory.CODING,
  'claude.ai': SiteSubcategory.PRODUCTIVITY_TOOL,
  'chat.openai.com': SiteSubcategory.PRODUCTIVITY_TOOL,
};

export const ALWAYS_DISTRACTION: Record<string, SiteSubcategory> = {
  'youtube.com': SiteSubcategory.VIDEO_ENTERTAINMENT,
  'instagram.com': SiteSubcategory.SOCIAL_MEDIA,
  'twitter.com': SiteSubcategory.SOCIAL_MEDIA,
  'x.com': SiteSubcategory.SOCIAL_MEDIA,
  'facebook.com': SiteSubcategory.SOCIAL_MEDIA,
  'tiktok.com': SiteSubcategory.VIDEO_ENTERTAINMENT,
  'reddit.com': SiteSubcategory.SOCIAL_MEDIA,
  'netflix.com': SiteSubcategory.VIDEO_ENTERTAINMENT,
  'twitch.tv': SiteSubcategory.VIDEO_ENTERTAINMENT,
  'amazon.com': SiteSubcategory.SHOPPING,
};

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

export function checkPreset(domain: string): PresetMatch | null {
  const normalized = normalizeDomain(domain);

  const productive = ALWAYS_PRODUCTIVE[normalized];
  if (productive) {
    return {
      category: SiteCategory.PRODUCTIVE,
      subcategory: productive,
    };
  }

  const distraction = ALWAYS_DISTRACTION[normalized];
  if (distraction) {
    return {
      category: SiteCategory.DISTRACTION,
      subcategory: distraction,
    };
  }

  return null;
}
