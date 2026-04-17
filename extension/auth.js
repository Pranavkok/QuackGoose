const API_BASE = 'http://localhost:3000';

export async function signIn() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError || new Error('Missing Google auth token'));
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/extension-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleAccessToken: token }),
        });

        if (!res.ok) {
          throw new Error(`Token exchange failed (${res.status})`);
        }

        const data = await res.json();
        await chrome.storage.local.set({
          qf_token: data.token,
          qf_user: data.user,
        });

        resolve(data.user);
      } catch (error) {
        reject(error);
      }
    });
  });
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
