import { authFetch, getAuthState } from './auth.js';
import { getClassification } from './classification.js';

let currentTab = null;
let debounceTimer = null;
const DEBOUNCE_MS = 5000;
const HEARTBEAT_ALARM = 'heartbeat';
const PAUSE_KEY = 'qf_paused_until';
const PAUSE_DURATION_MS = 15 * 60 * 1000;

console.log('[QuackFocus] Service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[QuackFocus] Extension installed');
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
});

chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });

async function getPauseUntil() {
  const stored = await chrome.storage.local.get(PAUSE_KEY);
  const pauseUntil = Number(stored[PAUSE_KEY]) || 0;
  return pauseUntil > Date.now() ? pauseUntil : 0;
}

async function setPauseFor15Minutes() {
  const pauseUntil = Date.now() + PAUSE_DURATION_MS;
  await chrome.storage.local.set({ [PAUSE_KEY]: pauseUntil });
  return pauseUntil;
}

async function clearPause() {
  await chrome.storage.local.remove(PAUSE_KEY);
}

function parseTimeToMinutes(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const [h, m] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
  return h * 60 + m;
}

function isWithinActiveWindow(activeTimeWindow) {
  if (!activeTimeWindow) return true;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(activeTimeWindow.start, 0);
  const endMinutes = parseTimeToMinutes(activeTimeWindow.end, 24 * 60 - 1);

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}

function applyEnforcementPolicy(statusData, pauseUntil) {
  const paused = pauseUntil > Date.now();
  const outsideActiveTimeWindow = !isWithinActiveWindow(statusData?.activeTimeWindow);

  const baseStatus = { ...(statusData || {}) };
  if (paused || outsideActiveTimeWindow) {
    baseStatus.duckMood = 'IDLE';
    baseStatus.limitReached = false;
    baseStatus.enforceMode = 'WARN_ONLY';
  }

  baseStatus.isPaused = paused;
  baseStatus.pausedUntil = paused ? pauseUntil : null;
  baseStatus.outsideActiveTimeWindow = outsideActiveTimeWindow;

  return baseStatus;
}

async function getCachedStatus() {
  const stored = await chrome.storage.local.get('qf_status');
  return stored.qf_status || null;
}

async function fetchStatusFromApi() {
  const { token } = await getAuthState();
  if (!token) return null;

  try {
    const res = await authFetch('/api/extension/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function buildEffectiveStatus(preferredStatus = null) {
  const pauseUntil = await getPauseUntil();
  const statusData = preferredStatus || await getCachedStatus() || await fetchStatusFromApi();
  return applyEnforcementPolicy(statusData, pauseUntil);
}

async function onTabChange(tabId, url, title) {
  const hostname = tryHostname(url);
  if (!hostname) return;

  await finalizePreviousTab();

  clearTimeout(debounceTimer);
  currentTab = null;

  debounceTimer = setTimeout(async () => {
    currentTab = {
      tabId,
      url,
      hostname,
      title: title || hostname,
      startedAt: Date.now(),
    };

    await handleActiveTab(tabId, hostname, title);
  }, DEBOUNCE_MS);
}

async function finalizePreviousTab() {
  if (!currentTab) return;

  const endedAt = Date.now();
  const durationSeconds = Math.floor((endedAt - currentTab.startedAt) / 1000);
  if (durationSeconds < 5) {
    currentTab = null;
    return;
  }

  const { token } = await getAuthState();
  if (!token) {
    currentTab = null;
    return;
  }

  const classification = await getClassification(
    currentTab.hostname,
    currentTab.title,
    currentTab.tabId,
  );

  try {
    const res = await authFetch('/api/extension/activity', {
      method: 'POST',
      body: JSON.stringify({
        domain: currentTab.hostname,
        pageTitle: currentTab.title,
        category: classification.category,
        subcategory: classification.subcategory,
        isProductive: classification.category === 'PRODUCTIVE',
        durationSeconds,
        startedAt: new Date(currentTab.startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
      }),
    });

    if (!res.ok) {
      throw new Error(`Activity API failed (${res.status})`);
    }

    const data = await res.json();
    const latestStatus = await fetchStatusFromApi();
    const effectiveStatus = await buildEffectiveStatus(latestStatus || data);
    await chrome.storage.local.set({ qf_status: effectiveStatus });
    await broadcastState(effectiveStatus);
  } catch (error) {
    console.error('[QuackFocus] Activity report failed', error);
  } finally {
    currentTab = null;
  }
}

async function handleActiveTab(tabId, hostname, title) {
  const classification = await getClassification(hostname, title, tabId);
  const effectiveStatus = await buildEffectiveStatus();
  const paused = Boolean(effectiveStatus.isPaused || effectiveStatus.outsideActiveTimeWindow);

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'PAGE_CLASSIFIED',
      payload: {
        category: classification.category,
        hostname,
        paused,
      },
    });

    if (paused) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'STATE_UPDATE',
        payload: effectiveStatus,
      });
    }
  } catch {
    // The tab may not have a content script (e.g. chrome:// pages).
  }
}

function tryHostname(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.hostname;
  } catch {
    return null;
  }
}

async function broadcastState(statusData) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (typeof tab.id !== 'number') continue;
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'STATE_UPDATE',
        payload: statusData,
      });
    } catch {
      // Ignore tabs where script isn't injected.
    }
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) await onTabChange(tabId, tab.url, tab.title || '');
  } catch {
    // Ignore races where tab disappears.
  }
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active && tab.url) {
    void onTabChange(tabId, tab.url, tab.title || '');
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentTab?.tabId === tabId) {
    void finalizePreviousTab();
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    void finalizePreviousTab();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== HEARTBEAT_ALARM) return;

  const statusData = await fetchStatusFromApi();
  if (!statusData) return;

  const effectiveStatus = await buildEffectiveStatus(statusData);
  await chrome.storage.local.set({ qf_status: effectiveStatus });
  await broadcastState(effectiveStatus);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'GET_EFFECTIVE_STATUS') {
    void (async () => {
      try {
        const latestStatus = await fetchStatusFromApi();
        const effectiveStatus = await buildEffectiveStatus(latestStatus);
        const pauseUntil = await getPauseUntil();
        await chrome.storage.local.set({ qf_status: effectiveStatus });
        sendResponse({ ok: true, status: effectiveStatus, pauseUntil });
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Failed to fetch status';
        sendResponse({ ok: false, error: errMessage });
      }
    })();
    return true;
  }

  if (message.type === 'TOGGLE_PAUSE_15M') {
    void (async () => {
      try {
        const currentlyPausedUntil = await getPauseUntil();
        let pauseUntil = currentlyPausedUntil;

        if (currentlyPausedUntil > Date.now()) {
          await clearPause();
          pauseUntil = 0;
        } else {
          pauseUntil = await setPauseFor15Minutes();
        }

        const latestStatus = await fetchStatusFromApi();
        const effectiveStatus = await buildEffectiveStatus(latestStatus);
        await chrome.storage.local.set({ qf_status: effectiveStatus });
        await broadcastState(effectiveStatus);

        sendResponse({ ok: true, pauseUntil, status: effectiveStatus });
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Failed to toggle pause';
        sendResponse({ ok: false, error: errMessage });
      }
    })();
    return true;
  }
});

async function bootstrap() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.url && typeof tab.id === 'number') {
      await onTabChange(tab.id, tab.url, tab.title || '');
    }
  } catch {
    // Ignore startup failures.
  }
}

void bootstrap();
