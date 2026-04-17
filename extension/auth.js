const API_BASE = 'http://localhost:3000';

function getRuntimeErrorMessage(defaultMessage) {
  const raw = chrome.runtime.lastError;
  const message = raw?.message ? String(raw.message) : '';
  return message || defaultMessage;
}

function toError(message, detail) {
  if (!detail) return new Error(message);
  return new Error(`${message}: ${detail}`);
}

export async function signIn() {
  await new Promise((resolve) => {
    chrome.identity.clearAllCachedAuthTokens(() => resolve(undefined));
  });

  const googleAccessToken = await new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (!token) {
        reject(toError('Google sign-in failed', getRuntimeErrorMessage('Missing Google auth token')));
        return;
      }
      resolve(token);
    });
  });

  return _exchangeToken({ googleAccessToken });
}

export async function signInWithEmail(email, password) {
  return _exchangeToken({ email, password });
}

async function _exchangeToken(payload) {
  const res = await fetch(`${API_BASE}/api/auth/extension-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const json = await res.json();
      detail = String(json?.error || '');
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }

    throw toError(`Token exchange failed (${res.status})`, detail);
  }

  const data = await res.json();
  await chrome.storage.local.set({
    qf_token: data.token,
    qf_user: data.user,
  });

  return data.user;
}

export async function getAuthState() {
  const { qf_token, qf_user } = await chrome.storage.local.get(['qf_token', 'qf_user']);
  return { token: qf_token, user: qf_user };
}

export async function signOut() {
  await chrome.storage.local.remove(['qf_token', 'qf_user']);
  chrome.identity.clearAllCachedAuthTokens(() => undefined);
}

export async function authFetch(path, options = {}) {
  const { qf_token } = await chrome.storage.local.get('qf_token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${qf_token}`,
    },
  });
}
