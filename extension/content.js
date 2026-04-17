console.log('[QuackFocus] Content script loaded on', window.location.hostname);

const pageState = {
  classification: null,
  status: null,
};

let enforcementActive = false;
let enforcementOverlay = null;
let duckElement = null;
let currentMood = 'IDLE';
let tooltipHideTimer = null;
let companionInterval = null;
let lastGuidanceAt = 0;
let lastGuidanceKey = '';

const TOOLTIP_AUTO_HIDE_MS = 5000;
const COMPANION_PING_MS = 120000;
const MIN_GUIDANCE_GAP_MS = 12000;

function getDuckAssetFilename(mood) {
  const assets = {
    HAPPY: 'duck-assets/happy.png',
    IDLE: 'duck-assets/idle.png',
    SLEEPY: 'duck-assets/sleeping.png',
    WATCHING: 'duck-assets/watching.png',
    WARNING: 'duck-assets/warning.png',
    ANGRY: 'duck-assets/angry.png',
    CHAOS: 'duck-assets/chaos.png',
    PROUD: 'duck-assets/proud.png',
    DISAPPOINTED: 'duck-assets/dissapointed.png',
  };

  return assets[String(mood || 'IDLE').toUpperCase()] || assets.IDLE;
}

function getText(selector, maxLen = 200) {
  const node = document.querySelector(selector);
  if (!node) return '';
  return (node.textContent || '').trim().slice(0, maxLen);
}

function getMeta(nameOrProperty) {
  const byName = document.querySelector(`meta[name="${nameOrProperty}"]`);
  if (byName?.content) return byName.content.trim();

  const byProperty = document.querySelector(`meta[property="${nameOrProperty}"]`);
  return byProperty?.content?.trim() || '';
}

function normalizeHost(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/^www\./, '');
}

function normalizeDomainRule(value) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0] || '';
  const withoutPort = withoutPath.split(':')[0] || '';
  const withoutWildcard = withoutPort.replace(/^\*\./, '');
  return withoutWildcard.replace(/^www\./, '');
}

function isDomainMatch(hostname, rule) {
  if (!rule) return false;
  return hostname === rule || hostname.endsWith(`.${rule}`);
}

function isHardBlockedDomain(hostname, rules) {
  const normalizedHost = normalizeHost(hostname);
  if (!normalizedHost || !Array.isArray(rules)) return false;
  return rules
    .map(normalizeDomainRule)
    .filter(Boolean)
    .some((rule) => isDomainMatch(normalizedHost, rule));
}

function applyBlur(level) {
  const filters = {
    0: '',
    1: 'blur(3px) saturate(0.7)',
    2: 'blur(8px) grayscale(0.5)',
    3: 'blur(12px) grayscale(0.8)',
  };

  if (!document.body) return;
  document.body.style.transition = 'filter 0.3s';
  document.body.style.filter = filters[level] || '';
}

function injectBlockOverlay(message, mood) {
  if (enforcementOverlay) return;

  enforcementOverlay = document.createElement('div');
  enforcementOverlay.id = '__quackfocus_block__';
  enforcementOverlay.innerHTML = `
    <div class="qf-block-content">
      <img src="${chrome.runtime.getURL(getDuckAssetFilename(mood || 'CHAOS'))}" />
      <h1>${message}</h1>
      <button id="qf-back-to-work">Back to Work →</button>
    </div>
  `;

  enforcementOverlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483646;
    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
  `;

  document.documentElement.appendChild(enforcementOverlay);

  const backToWork = document.getElementById('qf-back-to-work');
  if (backToWork) {
    backToWork.onclick = () => {
      window.location.href = 'http://localhost:3000/dashboard';
    };
  }
}

function removeBlockOverlay() {
  if (!enforcementOverlay) return;
  enforcementOverlay.remove();
  enforcementOverlay = null;
}

async function isCurrentPageDistraction() {
  const currentHost = window.location.hostname;
  const normalizedHost = normalizeHost(currentHost);

  const keyRaw = `cls_${currentHost}`;
  const keyNormalized = `cls_${normalizedHost}`;

  const stored = await chrome.storage.local.get([keyRaw, keyNormalized]);
  const rawCategory = stored[keyRaw]?.data?.category;
  const normalizedCategory = stored[keyNormalized]?.data?.category;

  return rawCategory === 'DISTRACTION' || normalizedCategory === 'DISTRACTION';
}

function computeDistractionPercent(data) {
  if (typeof data?.distractionUsedPercent === 'number') {
    return data.distractionUsedPercent;
  }

  const used = Number(data?.distractionUsedMinutes || 0);
  const limit = Number(data?.distractionLimitMinutes || 0);
  if (limit <= 0) return 0;

  return Math.min((used / limit) * 100, 100);
}

function getDuckMessage(mood) {
  const messages = {
    HAPPY: "You're on fire! Keep going.",
    IDLE: "I'm watching. Always.",
    SLEEPY: 'Hey, wake up. Work time.',
    WATCHING: 'Hmm... what are we doing?',
    WARNING: "Careful. You're close to the edge.",
    ANGRY: 'Really? On THIS site? Again?',
    CHAOS: "That's it. You've earned this blur.",
    PROUD: 'Daily goal crushed. Take a break.',
    DISAPPOINTED: 'Your garden is dying.',
  };

  return messages[mood] || '';
}

function getCompanionMessage(reason) {
  const status = pageState.status || {};
  const category = pageState.classification?.category;
  const outsideWorkHours = Boolean(status.outsideActiveTimeWindow);

  if (status.isPaused) {
    return 'Pause is active. I will guide you again once it ends.';
  }

  if (reason === 'classified') {
    if (category === 'DISTRACTION') return 'Distraction site detected. Let us get back on track.';
    if (category === 'PRODUCTIVE') return 'Great choice. This is a productive page.';
    if (category === 'NEUTRAL') return 'Neutral page. Keep your intent clear.';
  }

  let baseMessage = '';
  if (currentMood === 'HAPPY') baseMessage = 'Strong focus. Keep this momentum.';
  else if (currentMood === 'PROUD') baseMessage = 'Goal completed. You earned this win.';
  else if (currentMood === 'WARNING') baseMessage = 'You are drifting. Shift to a productive tab.';
  else if (currentMood === 'ANGRY') baseMessage = 'Distraction detected. Time to correct course.';
  else if (currentMood === 'CHAOS') baseMessage = 'Limit reached. Back to work mode now.';
  else if (currentMood === 'WATCHING') baseMessage = 'I am here. Let us stay intentional.';
  else if (currentMood === 'IDLE') baseMessage = "I'm here with you. Let's focus.";
  else baseMessage = getDuckMessage(currentMood);

  if (outsideWorkHours) {
    return `${baseMessage} (Outside work hours: enforcement is off.)`;
  }

  return baseMessage;
}

function resolveMoodFromContext() {
  const status = pageState.status || {};
  const category = String(pageState.classification?.category || '').toUpperCase();
  const distractionPct = computeDistractionPercent(status);

  if (status.isPaused) return 'IDLE';
  if (category === 'PRODUCTIVE') return 'HAPPY';
  if (category === 'DISTRACTION') {
    if (status.limitReached) return 'CHAOS';
    if (distractionPct >= 80) return 'ANGRY';
    return 'ANGRY';
  }
  if (category === 'NEUTRAL') return 'WATCHING';

  return String(status.duckMood || 'WATCHING').toUpperCase();
}

function syncDuckMoodFromContext() {
  updateDuckMood(resolveMoodFromContext());
}

function showDuckTooltip(message, durationMs = TOOLTIP_AUTO_HIDE_MS) {
  if (!message) return;
  if (!duckElement) injectDuck();

  const tip = document.getElementById('qf-duck-tooltip');
  if (!tip) return;

  tip.textContent = message;
  tip.classList.add('qf-show');
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  tooltipHideTimer = setTimeout(() => tip.classList.remove('qf-show'), durationMs);
}

function maybeSpeak(reason, force = false) {
  const message = getCompanionMessage(reason);
  if (!message) return;

  const key = [
    reason,
    currentMood,
    pageState.classification?.category || 'NONE',
    pageState.status?.isPaused ? 'PAUSED' : 'RUNNING',
    pageState.status?.outsideActiveTimeWindow ? 'OFF_HOURS' : 'ACTIVE_HOURS',
  ].join('|');

  const now = Date.now();
  if (!force && now - lastGuidanceAt < MIN_GUIDANCE_GAP_MS) return;
  if (!force && key === lastGuidanceKey && now - lastGuidanceAt < COMPANION_PING_MS) return;

  lastGuidanceAt = now;
  lastGuidanceKey = key;
  showDuckTooltip(message);
}

function startCompanionGuidance() {
  if (companionInterval) return;

  companionInterval = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    maybeSpeak('interval');
  }, COMPANION_PING_MS);
}

function injectDuck() {
  if (duckElement) return;

  duckElement = document.createElement('div');
  duckElement.id = '__quackfocus_duck__';
  duckElement.innerHTML = `
    <img id="qf-duck-img" src="${chrome.runtime.getURL(getDuckAssetFilename('IDLE'))}" />
    <div id="qf-duck-tooltip"></div>
  `;

  document.documentElement.appendChild(duckElement);

  duckElement.addEventListener('click', () => {
    showDuckTooltip(getCompanionMessage('click'));
  });

  startCompanionGuidance();
  maybeSpeak('loaded', true);
}

function updateDuckMood(mood) {
  const prevMood = currentMood;
  const normalizedMood = String(mood || 'IDLE').toUpperCase();
  currentMood = normalizedMood;

  if (!duckElement) injectDuck();

  const img = document.getElementById('qf-duck-img');
  if (img) {
    img.src = chrome.runtime.getURL(getDuckAssetFilename(normalizedMood));
  }

  if (normalizedMood !== prevMood) {
    maybeSpeak('mood_change');
  }
}

async function handleStateUpdate(data) {
  if (data?.isPaused || data?.outsideActiveTimeWindow) {
    enforcementActive = false;
    applyBlur(0);
    removeBlockOverlay();
    return;
  }

  const mode = data?.enforceMode || 'BLUR';
  const isBlockedByPolicy = isHardBlockedDomain(window.location.hostname, data?.blockedDomains);
  if (isBlockedByPolicy) {
    enforcementActive = true;

    if (mode === 'WARN_ONLY') {
      applyBlur(1);
      removeBlockOverlay();
      return;
    }

    applyBlur(3);
    injectBlockOverlay(
      'This site is blocked by your organization policy.',
      data?.duckMood || 'CHAOS',
    );
    return;
  }

  const isDistractionSite = await isCurrentPageDistraction();
  if (!isDistractionSite) {
    enforcementActive = false;
    applyBlur(0);
    removeBlockOverlay();
    return;
  }

  const pct = computeDistractionPercent(data);
  const reached = Boolean(data?.limitReached);

  if (!reached && pct < 50) {
    enforcementActive = false;
    applyBlur(0);
    removeBlockOverlay();
    return;
  }

  if (!reached && pct < 80) {
    enforcementActive = true;
    applyBlur(1);
    removeBlockOverlay();
    return;
  }

  if (!reached) {
    enforcementActive = true;
    applyBlur(2);
    removeBlockOverlay();
    return;
  }

  enforcementActive = true;

  if (mode === 'WARN_ONLY') {
    applyBlur(1);
    removeBlockOverlay();
    return;
  }

  if (mode === 'BLUR') {
    applyBlur(3);
    removeBlockOverlay();
    return;
  }

  applyBlur(3);
  injectBlockOverlay(
    mode === 'SHAME_AND_BLOCK'
      ? 'You failed. Back to work.'
      : 'Daily distraction limit reached.',
    data?.duckMood || 'CHAOS',
  );
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'SCRAPE_PAGE') {
    const h2s = Array.from(document.querySelectorAll('h2'))
      .slice(0, 5)
      .map((h2) => (h2.textContent || '').trim().slice(0, 100))
      .filter(Boolean);

    sendResponse({
      domain: window.location.hostname,
      title: document.title || '',
      metaDescription: getMeta('description'),
      h1: getText('h1', 200),
      h2s,
      ogType: getMeta('og:type'),
    });

    return true;
  }

  if (msg.type === 'PAGE_CLASSIFIED') {
    pageState.classification = msg.payload || null;
    syncDuckMoodFromContext();
    maybeSpeak('classified');
    window.dispatchEvent(new CustomEvent('qf:page_classified', { detail: pageState.classification }));
    return;
  }

  if (msg.type === 'STATE_UPDATE') {
    pageState.status = msg.payload || null;
    void handleStateUpdate(msg.payload || {});
    syncDuckMoodFromContext();
    maybeSpeak('status_update');
    window.dispatchEvent(new CustomEvent('qf:state_update', { detail: pageState.status }));
    return;
  }
});

if (document.readyState === 'complete') {
  injectDuck();
} else {
  window.addEventListener('load', injectDuck);
}
