console.log('[QuackFocus] Content script loaded on', window.location.hostname);

const pageState = {
  classification: null,
  status: null,
};

let enforcementActive = false;
let enforcementOverlay = null;
let duckElement = null;
let currentMood = 'IDLE';

function getDuckAssetFilename(mood) {
  const assets = {
    HAPPY: 'duck-assets/happy.png',
    IDLE: 'duck-assets/idle.PNG',
    SLEEPY: 'duck-assets/sleeping.PNG',
    WATCHING: 'duck-assets/watching.PNG',
    WARNING: 'duck-assets/warning.PNG',
    ANGRY: 'duck-assets/angry.PNG',
    CHAOS: 'duck-assets/chaos.PNG',
    PROUD: 'duck-assets/proud.PNG',
    DISAPPOINTED: 'duck-assets/dissapointed.PNG',
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
    const tip = document.getElementById('qf-duck-tooltip');
    if (!tip) return;

    tip.classList.toggle('qf-show');
    tip.textContent = getDuckMessage(currentMood);
    setTimeout(() => tip.classList.remove('qf-show'), 5000);
  });
}

function updateDuckMood(mood) {
  const normalizedMood = String(mood || 'IDLE').toUpperCase();
  currentMood = normalizedMood;

  if (!duckElement) injectDuck();

  const img = document.getElementById('qf-duck-img');
  if (img) {
    img.src = chrome.runtime.getURL(getDuckAssetFilename(normalizedMood));
  }
}

async function handleStateUpdate(data) {
  const isDistractionSite = await isCurrentPageDistraction();
  if (!isDistractionSite) {
    enforcementActive = false;
    applyBlur(0);
    removeBlockOverlay();
    return;
  }

  const pct = computeDistractionPercent(data);
  const mode = data?.enforceMode || 'BLUR';
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
    const category = msg.payload?.category;
    const paused = Boolean(msg.payload?.paused || pageState.status?.isPaused || pageState.status?.outsideActiveTimeWindow);
    if (paused) {
      updateDuckMood('IDLE');
    } else {
      updateDuckMood(category === 'DISTRACTION' ? 'WARNING' : 'WATCHING');
    }
    window.dispatchEvent(new CustomEvent('qf:page_classified', { detail: pageState.classification }));
    return;
  }

  if (msg.type === 'STATE_UPDATE') {
    pageState.status = msg.payload || null;
    void handleStateUpdate(msg.payload || {});
    if (msg.payload?.duckMood) {
      updateDuckMood(msg.payload.duckMood);
    }
    window.dispatchEvent(new CustomEvent('qf:state_update', { detail: pageState.status }));
    return;
  }
});

if (document.readyState === 'complete') {
  injectDuck();
} else {
  window.addEventListener('load', injectDuck);
}
