import { getAuthState, signIn, signOut } from './auth.js';

const WEB_BASE = 'http://localhost:3000';

const DUCK_ASSETS = {
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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMinutes(minutes) {
  const n = Math.max(0, Number(minutes) || 0);
  if (n >= 60) {
    const h = Math.floor(n / 60);
    const m = n % 60;
    return `${h}h ${m}m`;
  }
  return `${n}m`;
}

function formatRemaining(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function progressColor(percent) {
  if (percent >= 100) return '#dc2626';
  if (percent >= 80) return '#ea580c';
  if (percent >= 50) return '#ca8a04';
  return '#2563eb';
}

function duckAssetForMood(mood) {
  return DUCK_ASSETS[String(mood || 'IDLE').toUpperCase()] || DUCK_ASSETS.IDLE;
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function fetchEffectiveStatus() {
  try {
    const response = await sendMessage({ type: 'GET_EFFECTIVE_STATUS' });
    if (response?.ok && response.status) {
      return {
        status: response.status,
        pauseUntil: Number(response.pauseUntil) || 0,
      };
    }
  } catch {
    // Fallback to local cache.
  }

  const { qf_status, qf_paused_until } = await chrome.storage.local.get([
    'qf_status',
    'qf_paused_until',
  ]);
  return {
    status: qf_status || null,
    pauseUntil: Number(qf_paused_until) || 0,
  };
}

function bindCommonActions() {
  const openDashboardBtn = document.getElementById('open-dashboard');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${WEB_BASE}/dashboard` });
      window.close();
    });
  }

  const signOutBtn = document.getElementById('sign-out');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await signOut();
      await render();
    });
  }
}

async function render() {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = '<div class="muted">Loading...</div>';

  const { user } = await getAuthState();

  if (!user) {
    root.innerHTML = `
      <div class="card stack">
        <div class="header">
          <h1 class="brand">🦆 QuackFocus</h1>
        </div>
        <p class="line">Sign in to sync extension tracking with your dashboard.</p>
        <div class="single-action">
          <button id="sign-in" class="btn">Sign in with Google</button>
        </div>
      </div>
    `;

    const signInBtn = document.getElementById('sign-in');
    if (signInBtn) {
      signInBtn.addEventListener('click', async () => {
        try {
          await signIn();
          await render();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          alert(`Sign-in failed: ${message}`);
        }
      });
    }
    return;
  }

  if (!user.onboardingCompleted) {
    root.innerHTML = `
      <div class="card stack">
        <div class="header">
          <h1 class="brand">🦆 QuackFocus</h1>
          <button id="sign-out" class="btn secondary">Sign out</button>
        </div>
        <p class="line">Welcome, ${escapeHtml(user.name || 'there')}.</p>
        <p class="line">Complete onboarding to enable focus enforcement.</p>
        <a class="link" href="${WEB_BASE}/onboarding" target="_blank" rel="noreferrer">
          Open Onboarding
        </a>
      </div>
    `;
    bindCommonActions();
    return;
  }

  const { status, pauseUntil } = await fetchEffectiveStatus();

  const focusMinutes = Number(status?.totalFocusMinutes || 0);
  const distractionMinutes = Number(status?.distractionUsedMinutes || 0);
  const distractionLimit = Number(status?.distractionLimitMinutes || 0);
  const duckMood = String(status?.duckMood || 'IDLE').toUpperCase();
  const paused = Number(pauseUntil) > Date.now();
  const remainingMs = Math.max(0, Number(pauseUntil) - Date.now());

  const budgetPercent = distractionLimit > 0
    ? Math.min(Math.round((distractionMinutes / distractionLimit) * 100), 100)
    : 0;
  const budgetColor = progressColor(budgetPercent);

  root.innerHTML = `
    <div class="card stack">
      <div class="header">
        <h1 class="brand">🦆 QuackFocus</h1>
        <button id="sign-out" class="btn secondary">Sign out</button>
      </div>

      <div class="user">
        <img class="avatar" src="${escapeHtml(user.image || 'duck-assets/idle.PNG')}" alt="avatar" />
        <div class="stack" style="gap:2px">
          <p class="name">${escapeHtml(user.name || 'Focus Goose')}</p>
          <p class="muted">${paused ? `Paused: ${formatRemaining(remainingMs)} left` : 'Tracking active'}</p>
        </div>
      </div>

      <div class="row">
        <p class="line">Focus today</p>
        <p class="line"><strong>${formatMinutes(focusMinutes)}</strong></p>
      </div>
      <div class="row">
        <p class="line">Distraction</p>
        <p class="line"><strong>${formatMinutes(distractionMinutes)}</strong> / ${formatMinutes(distractionLimit)}</p>
      </div>

      <div class="stack" style="gap:4px">
        <div class="row">
          <span class="muted">Distraction budget</span>
          <span class="muted">${budgetPercent}%</span>
        </div>
        <div class="bar">
          <span style="width:${budgetPercent}%; background:${budgetColor}"></span>
        </div>
      </div>

      <div class="mood">
        <img src="${duckAssetForMood(duckMood)}" alt="duck mood" />
        <div class="stack" style="gap:1px">
          <p class="line"><strong>Duck Mood: ${escapeHtml(duckMood)}</strong></p>
          <p class="muted">${status?.outsideActiveTimeWindow ? 'Outside work hours (enforcement off)' : 'Real-time status'}</p>
        </div>
      </div>

      <div class="actions">
        <button id="pause-toggle" class="btn secondary">${paused ? 'Resume now' : 'Pause 15 min'}</button>
        <button id="open-dashboard" class="btn">Open Dashboard</button>
      </div>
    </div>
  `;

  bindCommonActions();

  const pauseBtn = document.getElementById('pause-toggle');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', async () => {
      const result = await sendMessage({ type: 'TOGGLE_PAUSE_15M' });
      if (!result?.ok) {
        alert(result?.error || 'Pause action failed');
        return;
      }
      await render();
    });
  }
}

void render();
