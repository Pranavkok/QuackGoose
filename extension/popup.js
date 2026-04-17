import { getAuthState, signIn, signInWithEmail, signOut } from './auth.js';

const WEB_BASE = 'http://localhost:3000';

const DUCK_ASSETS = {
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

function buildSessionBridgeUrl(path, token) {
  if (!token) return `${WEB_BASE}${path}`;
  const url = new URL('/api/auth/extension-bridge', WEB_BASE);
  url.searchParams.set('token', token);
  url.searchParams.set('next', path);
  return url.toString();
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

function bindCommonActions(token) {
  const openDashboardBtn = document.getElementById('open-dashboard');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: buildSessionBridgeUrl('/dashboard', token) });
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

  const { user, token } = await getAuthState();

  if (!user) {
    root.innerHTML = `
      <div class="card stack">
        <div class="header">
          <h1 class="brand">🦆 QuackFocus</h1>
        </div>
        <p class="line">Sign in to sync tracking with your dashboard.</p>
        <div class="single-action">
          <button id="sign-in-google" class="btn">Sign in with Google</button>
        </div>
        <div class="divider"><span>or</span></div>
        <form id="email-form" class="stack" style="gap:8px">
          <input id="email-input" type="email" placeholder="you@company.com" class="input" required />
          <input id="password-input" type="password" placeholder="Password" class="input" required />
          <p id="email-error" class="error" style="display:none"></p>
          <button type="submit" class="btn">Sign in with Email</button>
        </form>
        <p class="muted" style="text-align:center;font-size:11px">
          Don't have an account? <a href="${WEB_BASE}/signup" target="_blank" rel="noreferrer" class="link-inline">Sign up</a>
        </p>
      </div>
    `;

    const googleBtn = document.getElementById('sign-in-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        try {
          await signIn();
          await render();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          alert(`Sign-in failed: ${message}`);
        }
      });
    }

    const emailForm = document.getElementById('email-form');
    if (emailForm) {
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input')?.value?.trim() || '';
        const password = document.getElementById('password-input')?.value || '';
        const errorEl = document.getElementById('email-error');
        if (errorEl) errorEl.style.display = 'none';
        try {
          await signInWithEmail(email, password);
          await render();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (errorEl) {
            errorEl.textContent = message.includes('401') ? 'Invalid email or password.' : message;
            errorEl.style.display = 'block';
          }
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
        <a class="link" href="${buildSessionBridgeUrl('/onboarding', token)}" target="_blank" rel="noreferrer">
          Open Onboarding
        </a>
      </div>
    `;
    bindCommonActions(token);
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
        <img class="avatar" src="${escapeHtml(user.image || 'duck-assets/idle.png')}" alt="avatar" />
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

  bindCommonActions(token);

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
