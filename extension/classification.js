import { authFetch, getAuthState } from './auth.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const VALID_CATEGORIES = ['PRODUCTIVE', 'DISTRACTION', 'NEUTRAL'];

function normalizeHost(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/^www\./, '');
}

function normalizeClassification(data) {
  const category = VALID_CATEGORIES.includes(data?.category)
    ? data.category
    : 'NEUTRAL';

  const subcategory = typeof data?.subcategory === 'string' && data.subcategory.trim()
    ? data.subcategory
    : 'OTHER';

  const confidence = Number.isFinite(data?.confidence)
    ? Number(data.confidence)
    : 0;

  return {
    category,
    subcategory,
    confidence,
  };
}

export async function getClassification(hostname, title = '', tabId) {
  const domain = normalizeHost(hostname);
  if (!domain) {
    return { category: 'NEUTRAL', subcategory: 'OTHER', confidence: 0 };
  }

  const cacheKey = `cls_${domain}`;
  const cached = (await chrome.storage.local.get(cacheKey))[cacheKey];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pageData = (await requestScrape(tabId)) || { title, domain };
  const requestBody = {
    domain,
    title: pageData.title || title || domain,
    metaDescription: pageData.metaDescription || '',
    h1: pageData.h1 || '',
    h2s: Array.isArray(pageData.h2s) ? pageData.h2s : [],
    ogType: pageData.ogType || '',
  };

  const { token } = await getAuthState();
  if (!token) {
    return { category: 'NEUTRAL', subcategory: 'OTHER', confidence: 0 };
  }

  try {
    const res = await authFetch('/api/extension/classify', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      throw new Error(`Classify API failed (${res.status})`);
    }

    const responseData = await res.json();
    const classification = normalizeClassification(responseData);

    await chrome.storage.local.set({
      [cacheKey]: {
        data: classification,
        expiresAt: Date.now() + CACHE_TTL_MS,
      },
    });

    return classification;
  } catch (error) {
    console.error('[QuackFocus] classify failed', error);
    return { category: 'NEUTRAL', subcategory: 'OTHER', confidence: 0 };
  }
}

async function requestScrape(tabId) {
  let targetTabId = tabId;

  if (typeof targetTabId !== 'number') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTabId = activeTab?.id;
  }

  if (typeof targetTabId !== 'number') return null;

  try {
    return await chrome.tabs.sendMessage(targetTabId, { type: 'SCRAPE_PAGE' });
  } catch {
    return null;
  }
}
